"""
公開統計情報サービス
"""
from datetime import date, datetime, timedelta, timezone
from typing import Dict, Any
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.salon import Salon
from app.models.usage import UsageTracking


def _get_weekly_signups_via_supabase() -> int:
    """Supabase Admin APIで過去7日の新規登録数を取得"""
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return 0

    try:
        from supabase import create_client
        client = create_client(settings.supabase_url, settings.supabase_service_role_key)
        users = client.auth.admin.list_users()
        cutoff = datetime.now(timezone.utc) - timedelta(days=7)
        count = sum(
            1 for u in users
            if u.created_at and u.created_at >= cutoff
        )
        return count
    except Exception:
        return 0


async def get_public_stats(db: Session) -> Dict[str, Any]:
    """
    LP表示用の公開統計データを取得

    Returns:
        registered_salons: 登録サロン数
        total_tokens: 累計トークン数
        weekly_signups: 今週の新規登録数
        last_updated: 最終更新日
    """
    # 登録サロン数
    registered_salons = db.query(func.count(Salon.id)).scalar() or 0

    # 累計トークン数
    try:
        total_tokens = db.query(
            func.coalesce(
                func.sum(UsageTracking.total_input_tokens + UsageTracking.total_output_tokens),
                0
            )
        ).scalar() or 0
    except Exception:
        total_tokens = 0

    # 今週の新規登録数（Supabase Admin API経由 — db_modeに関係なく取得可能）
    weekly_signups = _get_weekly_signups_via_supabase()

    return {
        "weekly_signups": weekly_signups,
        "total_tokens": int(total_tokens),
        "registered_salons": registered_salons,
        "last_updated": date.today().isoformat(),
    }
