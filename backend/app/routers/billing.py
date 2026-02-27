"""
決済・サブスクリプション管理ルーター
"""
import logging

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.dependencies import get_current_user, get_db
from app.schemas.billing import (
    CreateCheckoutRequest,
    CreateCheckoutResponse,
    CreatePortalRequest,
    CreatePortalResponse,
    SubscriptionResponse,
    WebhookResponse,
)
from app.services import stripe_service

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter()


@router.post("/create-checkout", response_model=CreateCheckoutResponse)
async def create_checkout(
    request: CreateCheckoutRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Stripe Checkout Session を作成"""
    try:
        result = await stripe_service.create_checkout_session(
            db=db,
            user_id=current_user["id"],
            email=current_user["email"],
            price_id=request.price_id,
            success_url=request.success_url,
            cancel_url=request.cancel_url,
        )
        return CreateCheckoutResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except stripe.StripeError as e:
        logger.error(f"Stripe Checkout作成エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="決済サービスとの通信に失敗しました",
        )


@router.post("/portal", response_model=CreatePortalResponse)
async def create_portal(
    request: CreatePortalRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Stripe Customer Portal セッションを作成"""
    try:
        portal_url = await stripe_service.create_portal_session(
            db=db,
            user_id=current_user["id"],
            email=current_user["email"],
            return_url=request.return_url,
        )
        return CreatePortalResponse(portal_url=portal_url)
    except stripe.StripeError as e:
        logger.error(f"Stripe Portal作成エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="決済サービスとの通信に失敗しました",
        )


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """現在のサブスクリプション情報を取得"""
    info = await stripe_service.get_subscription_info(
        db=db,
        user_id=current_user["id"],
    )
    return SubscriptionResponse(**info)


@router.post("/webhook", response_model=WebhookResponse)
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Stripe Webhookエンドポイント

    認証不要 — Stripe署名検証で保護
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="stripe-signature ヘッダーがありません",
        )

    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            settings.stripe_webhook_secret,
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="無効なペイロードです",
        )
    except stripe.SignatureVerificationError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="署名検証に失敗しました",
        )

    await stripe_service.handle_webhook_event(db, event)

    return WebhookResponse(received=True)
