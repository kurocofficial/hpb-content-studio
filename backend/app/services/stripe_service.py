"""
Stripe決済サービス
"""
import logging
from datetime import datetime
from typing import Dict, Any, Optional

import stripe
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.usage import Subscription

logger = logging.getLogger(__name__)
settings = get_settings()

# Stripe APIキー設定
stripe.api_key = settings.stripe_secret_key


async def get_or_create_customer(
    db: Session,
    user_id: str,
    email: str,
) -> str:
    """
    StripeカスタマーIDを取得、なければ新規作成

    Args:
        db: DBセッション
        user_id: ユーザーID
        email: ユーザーメール

    Returns:
        Stripe Customer ID
    """
    # 既存のサブスクリプションからcustomer_idを探す
    subscription = db.query(Subscription).filter(
        Subscription.user_id == user_id
    ).first()

    if subscription and subscription.stripe_customer_id:
        return subscription.stripe_customer_id

    # Stripe Customer新規作成
    customer = stripe.Customer.create(
        email=email,
        metadata={"user_id": user_id},
    )

    # DBに保存
    if not subscription:
        subscription = Subscription(
            user_id=user_id,
            plan="free",
            status="active",
        )
        db.add(subscription)

    subscription.stripe_customer_id = customer.id
    db.commit()

    return customer.id


async def create_checkout_session(
    db: Session,
    user_id: str,
    email: str,
    price_id: Optional[str] = None,
    success_url: Optional[str] = None,
    cancel_url: Optional[str] = None,
) -> Dict[str, str]:
    """
    Stripe Checkout Session を作成

    Args:
        db: DBセッション
        user_id: ユーザーID
        email: ユーザーメール
        price_id: Stripe Price ID（省略時は環境変数から取得）
        success_url: 決済完了後のリダイレクトURL
        cancel_url: キャンセル時のリダイレクトURL

    Returns:
        {"checkout_url": str, "session_id": str}
    """
    customer_id = await get_or_create_customer(db, user_id, email)

    resolved_price_id = price_id or settings.stripe_pro_price_id
    if not resolved_price_id:
        raise ValueError("STRIPE_PRO_PRICE_ID が設定されていません")

    resolved_success_url = success_url or f"{settings.frontend_url}/billing/success?session_id={{CHECKOUT_SESSION_ID}}"
    resolved_cancel_url = cancel_url or f"{settings.frontend_url}/billing"

    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{
            "price": resolved_price_id,
            "quantity": 1,
        }],
        success_url=resolved_success_url,
        cancel_url=resolved_cancel_url,
        subscription_data={
            "trial_period_days": 14,
            "metadata": {"user_id": user_id},
        },
        metadata={"user_id": user_id},
    )

    return {
        "checkout_url": session.url,
        "session_id": session.id,
    }


async def create_portal_session(
    db: Session,
    user_id: str,
    email: str,
    return_url: Optional[str] = None,
) -> str:
    """
    Stripe Customer Portal セッションを作成

    Args:
        db: DBセッション
        user_id: ユーザーID
        email: ユーザーメール
        return_url: Portal終了後のリダイレクトURL

    Returns:
        Portal URL
    """
    customer_id = await get_or_create_customer(db, user_id, email)

    resolved_return_url = return_url or f"{settings.frontend_url}/billing"

    portal_session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=resolved_return_url,
    )

    return portal_session.url


async def get_subscription_info(
    db: Session,
    user_id: str,
) -> Dict[str, Any]:
    """
    ユーザーのサブスクリプション情報を取得

    Args:
        db: DBセッション
        user_id: ユーザーID

    Returns:
        サブスクリプション情報
    """
    subscription = db.query(Subscription).filter(
        Subscription.user_id == user_id
    ).first()

    if not subscription or subscription.plan == "free":
        return {
            "plan": subscription.plan if subscription else "free",
            "status": "active",
            "stripe_customer_id": subscription.stripe_customer_id if subscription else None,
            "current_period_start": None,
            "current_period_end": None,
            "trial_end": None,
            "cancel_at_period_end": False,
        }

    # Stripeからリアルタイム情報を取得（subscription_idがある場合）
    cancel_at_period_end = False
    if subscription.stripe_subscription_id:
        try:
            stripe_sub = stripe.Subscription.retrieve(
                subscription.stripe_subscription_id
            )
            cancel_at_period_end = stripe_sub.cancel_at_period_end
        except Exception as e:
            logger.warning(f"Stripeサブスク取得失敗: {e}")

    return {
        "plan": subscription.plan,
        "status": subscription.status,
        "stripe_customer_id": subscription.stripe_customer_id,
        "current_period_start": subscription.current_period_start.isoformat() if subscription.current_period_start else None,
        "current_period_end": subscription.current_period_end.isoformat() if subscription.current_period_end else None,
        "trial_end": subscription.trial_end.isoformat() if subscription.trial_end else None,
        "cancel_at_period_end": cancel_at_period_end,
    }


async def handle_webhook_event(
    db: Session,
    event: stripe.Event,
) -> None:
    """
    Stripe Webhookイベントを処理

    Args:
        db: DBセッション
        event: Stripe Event
    """
    event_type = event.type
    data = event.data.object

    logger.info(f"Webhook受信: {event_type}")

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(db, data)
    elif event_type == "customer.subscription.updated":
        await _handle_subscription_updated(db, data)
    elif event_type == "customer.subscription.deleted":
        await _handle_subscription_deleted(db, data)
    elif event_type == "invoice.payment_succeeded":
        await _handle_payment_succeeded(db, data)
    elif event_type == "invoice.payment_failed":
        await _handle_payment_failed(db, data)
    else:
        logger.info(f"未処理のイベント: {event_type}")


async def _handle_checkout_completed(db: Session, session: Any) -> None:
    """checkout.session.completed の処理"""
    user_id = session.get("metadata", {}).get("user_id")
    if not user_id:
        logger.warning("checkout.session.completed: user_id がメタデータにありません")
        return

    customer_id = session.get("customer")
    subscription_id = session.get("subscription")

    subscription = db.query(Subscription).filter(
        Subscription.user_id == user_id
    ).first()

    if not subscription:
        subscription = Subscription(user_id=user_id)
        db.add(subscription)

    subscription.plan = "pro"
    subscription.status = "active"
    subscription.stripe_customer_id = customer_id
    subscription.stripe_subscription_id = subscription_id

    # Stripeサブスクリプションから期間情報を取得
    if subscription_id:
        try:
            stripe_sub = stripe.Subscription.retrieve(subscription_id)
            subscription.current_period_start = datetime.fromtimestamp(
                stripe_sub.current_period_start
            )
            subscription.current_period_end = datetime.fromtimestamp(
                stripe_sub.current_period_end
            )
            if stripe_sub.trial_end:
                subscription.trial_end = datetime.fromtimestamp(
                    stripe_sub.trial_end
                )
                subscription.status = "trialing"
        except Exception as e:
            logger.warning(f"サブスク詳細取得失敗: {e}")

    db.commit()
    logger.info(f"ユーザー {user_id} をProプランに更新しました")


async def _handle_subscription_updated(db: Session, stripe_sub: Any) -> None:
    """customer.subscription.updated の処理"""
    customer_id = stripe_sub.get("customer")

    subscription = db.query(Subscription).filter(
        Subscription.stripe_customer_id == customer_id
    ).first()

    if not subscription:
        logger.warning(f"subscription.updated: customer {customer_id} のサブスクがDBにありません")
        return

    stripe_status = stripe_sub.get("status")

    # ステータスマッピング
    if stripe_status in ("active",):
        subscription.status = "active"
        subscription.plan = "pro"
    elif stripe_status in ("trialing",):
        subscription.status = "trialing"
        subscription.plan = "pro"
    elif stripe_status in ("past_due",):
        subscription.status = "past_due"
    elif stripe_status in ("canceled", "unpaid"):
        subscription.status = "canceled"
        subscription.plan = "free"
        subscription.stripe_subscription_id = None

    # 期間情報の更新
    if stripe_sub.get("current_period_start"):
        subscription.current_period_start = datetime.fromtimestamp(
            stripe_sub["current_period_start"]
        )
    if stripe_sub.get("current_period_end"):
        subscription.current_period_end = datetime.fromtimestamp(
            stripe_sub["current_period_end"]
        )
    if stripe_sub.get("trial_end"):
        subscription.trial_end = datetime.fromtimestamp(
            stripe_sub["trial_end"]
        )

    db.commit()
    logger.info(f"サブスク更新: customer={customer_id}, status={stripe_status}")


async def _handle_subscription_deleted(db: Session, stripe_sub: Any) -> None:
    """customer.subscription.deleted の処理"""
    customer_id = stripe_sub.get("customer")

    subscription = db.query(Subscription).filter(
        Subscription.stripe_customer_id == customer_id
    ).first()

    if not subscription:
        logger.warning(f"subscription.deleted: customer {customer_id} のサブスクがDBにありません")
        return

    subscription.plan = "free"
    subscription.status = "canceled"
    subscription.stripe_subscription_id = None

    db.commit()
    logger.info(f"サブスク削除: customer={customer_id} → Freeプランに戻しました")


async def _handle_payment_succeeded(db: Session, invoice: Any) -> None:
    """invoice.payment_succeeded の処理"""
    customer_id = invoice.get("customer")

    subscription = db.query(Subscription).filter(
        Subscription.stripe_customer_id == customer_id
    ).first()

    if subscription:
        subscription.status = "active"
        db.commit()
        logger.info(f"支払い成功: customer={customer_id}")


async def _handle_payment_failed(db: Session, invoice: Any) -> None:
    """invoice.payment_failed の処理"""
    customer_id = invoice.get("customer")

    subscription = db.query(Subscription).filter(
        Subscription.stripe_customer_id == customer_id
    ).first()

    if subscription:
        subscription.status = "past_due"
        db.commit()
        logger.warning(f"支払い失敗: customer={customer_id}")
