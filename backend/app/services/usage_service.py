"""
利用量管理サービス
"""
from datetime import datetime
from typing import Dict, Any
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.usage import UsageTracking, Subscription


def get_current_year_month() -> str:
    """現在の年月をYYYY-MM形式で取得"""
    return datetime.now().strftime("%Y-%m")


async def get_or_create_usage_tracking(
    db: Session,
    user_id: str,
) -> Dict[str, Any]:
    """
    当月の利用量レコードを取得または作成

    Args:
        db: DBセッション
        user_id: ユーザーID

    Returns:
        利用量レコード
    """
    year_month = get_current_year_month()

    # 既存レコードを検索
    usage = db.query(UsageTracking).filter(
        UsageTracking.user_id == user_id,
        UsageTracking.year_month == year_month
    ).first()

    if usage:
        return usage.to_dict()

    # 新規作成
    new_usage = UsageTracking(
        user_id=user_id,
        year_month=year_month,
        text_generation_count=0,
        blog_generation_count=0,
        image_generation_count=0,
    )

    db.add(new_usage)
    db.commit()
    db.refresh(new_usage)

    return new_usage.to_dict()


async def get_user_plan(db: Session, user_id: str) -> str:
    """
    ユーザーのプランを取得

    Args:
        db: DBセッション
        user_id: ユーザーID

    Returns:
        プラン名（'free', 'pro', 'team'）
    """
    subscription = db.query(Subscription).filter(
        Subscription.user_id == user_id,
        Subscription.status.in_(["active", "trialing"])
    ).first()

    if subscription:
        return subscription.plan

    return "free"


async def check_usage_limit(
    db: Session,
    user_id: str,
    content_type: str,
) -> Dict[str, Any]:
    """
    利用制限をチェック

    Args:
        db: DBセッション
        user_id: ユーザーID
        content_type: コンテンツタイプ

    Returns:
        制限チェック結果
    """
    settings = get_settings()
    plan = await get_user_plan(db, user_id)
    usage = await get_or_create_usage_tracking(db, user_id)

    # Pro/Teamプランは無制限
    if plan in ("pro", "team"):
        return {
            "allowed": True,
            "plan": plan,
            "usage": usage,
            "limit": None,
            "remaining": None,
        }

    # Freeプランの制限チェック（テキスト・ブログ合算）
    limit = settings.free_monthly_generations
    used = usage.get("text_generation_count", 0)

    remaining = max(0, limit - used)
    allowed = remaining > 0

    return {
        "allowed": allowed,
        "plan": plan,
        "usage": usage,
        "limit": limit,
        "used": used,
        "remaining": remaining,
        "message": None if allowed else f"今月の生成回数上限（{limit}回）に達しました。Proプランにアップグレードすると無制限で利用できます。",
    }


async def increment_usage(
    db: Session,
    user_id: str,
    content_type: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
) -> Dict[str, Any]:
    """
    利用量をインクリメント

    Args:
        db: DBセッション
        user_id: ユーザーID
        content_type: コンテンツタイプ
        input_tokens: 入力トークン数
        output_tokens: 出力トークン数

    Returns:
        更新後の利用量レコード
    """
    year_month = get_current_year_month()

    # 既存レコードを取得
    usage = db.query(UsageTracking).filter(
        UsageTracking.user_id == user_id,
        UsageTracking.year_month == year_month
    ).first()

    if not usage:
        # なければ作成
        usage = UsageTracking(
            user_id=user_id,
            year_month=year_month,
            text_generation_count=0,
            blog_generation_count=0,
            image_generation_count=0,
            total_input_tokens=0,
            total_output_tokens=0,
        )
        db.add(usage)

    # 更新（テキスト・ブログ合算カウント）
    usage.text_generation_count = (usage.text_generation_count or 0) + 1

    # トークン数を加算
    usage.total_input_tokens = (usage.total_input_tokens or 0) + input_tokens
    usage.total_output_tokens = (usage.total_output_tokens or 0) + output_tokens

    db.commit()
    db.refresh(usage)

    return usage.to_dict()


async def get_usage_summary(
    db: Session,
    user_id: str,
) -> Dict[str, Any]:
    """
    利用量サマリーを取得

    Args:
        db: DBセッション
        user_id: ユーザーID

    Returns:
        利用量サマリー
    """
    settings = get_settings()
    plan = await get_user_plan(db, user_id)
    usage = await get_or_create_usage_tracking(db, user_id)

    total_used = usage.get("text_generation_count", 0)
    image_used = usage.get("image_generation_count", 0)

    if plan in ("pro", "team"):
        return {
            "plan": plan,
            "generation": {
                "used": total_used,
                "limit": None,
                "remaining": None,
            },
            "image_generation": {
                "used": image_used,
                "limit": None,
                "remaining": None,
            },
        }

    return {
        "plan": plan,
        "generation": {
            "used": total_used,
            "limit": settings.free_monthly_generations,
            "remaining": max(0, settings.free_monthly_generations - total_used),
        },
        "image_generation": {
            "used": image_used,
            "limit": 0,  # Freeプランは画像生成なし
            "remaining": 0,
        },
    }
