"""
共通依存関係モジュール
"""
import os
from typing import Generator, Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.config import get_settings, Settings

settings = get_settings()

# DATABASE_URLが設定されていれば本番モード（mock_auth無効）
_use_real_auth = bool(os.getenv("DATABASE_URL", ""))
security = HTTPBearer(auto_error=_use_real_auth)


# ====================
# Database Dependencies
# ====================

def get_db() -> Generator[Session, None, None]:
    """DBセッションを取得する依存関係"""
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ====================
# Supabase (for supabase mode)
# ====================

def get_supabase_client():
    """Supabaseクライアントを取得（Service Role権限）"""
    if not _use_real_auth:
        return None
    from supabase import create_client, Client
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key
    )


def get_supabase_anon_client():
    """Supabaseクライアントを取得（Anon権限 - RLS適用）"""
    if not _use_real_auth:
        return None
    from supabase import create_client, Client
    return create_client(
        settings.supabase_url,
        settings.supabase_anon_key
    )


# ====================
# Authentication
# ====================

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """
    JWTトークンからユーザー情報を取得
    mock_authモード時は固定ユーザーを返す
    """
    # モックモード: DATABASE_URLが未設定の場合は固定ユーザーを返す
    if not _use_real_auth:
        return {
            "id": settings.mock_user_id,
            "email": settings.mock_user_email,
            "created_at": "2024-01-01T00:00:00Z",
        }

    # 本番モード: Supabaseで認証
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証が必要です"
        )

    token = credentials.credentials
    supabase = get_supabase_client()

    try:
        user_response = supabase.auth.get_user(token)

        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="無効なトークンです"
            )

        return {
            "id": user_response.user.id,
            "email": user_response.user.email,
            "created_at": user_response.user.created_at
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証に失敗しました"
        )


async def get_current_user_organization(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Optional[Dict[str, Any]]:
    """
    ユーザーの所属組織を取得（NoneならFree/Pro）
    """
    from app.services.organization_service import get_user_organization
    return await get_user_organization(db, current_user["id"])


async def require_team_plan(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Teamプラン必須。非Teamは403。
    組織情報を返す。
    """
    from app.services.organization_service import get_user_organization
    from app.services.usage_service import get_effective_plan

    plan = await get_effective_plan(db, current_user["id"])
    if plan != "team":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この機能はTeamプラン専用です",
        )

    org = await get_user_organization(db, current_user["id"])
    if not org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="組織に所属していません",
        )

    return org


async def require_org_admin(
    org_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> str:
    """
    owner/admin権限必須。ロールを返す。
    """
    from app.services.organization_service import get_member_role

    role = await get_member_role(db, org_id, current_user["id"])
    if not role or role not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この操作にはオーナーまたは管理者権限が必要です",
        )

    return role


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
) -> Optional[dict]:
    """
    認証オプショナル - ログインしていなくてもOK
    """
    # モックモード: DATABASE_URLが未設定の場合は固定ユーザーを返す
    if not _use_real_auth:
        return {
            "id": settings.mock_user_id,
            "email": settings.mock_user_email,
            "created_at": "2024-01-01T00:00:00Z",
        }

    if not credentials:
        return None

    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
