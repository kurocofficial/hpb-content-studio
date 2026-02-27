"""
組織管理のエンドポイント
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, require_org_admin
from app.schemas.organization import (
    OrganizationUpdate,
    OrganizationResponse,
    OrgMemberCreate,
    OrgMemberResponse,
    OrgMemberListResponse,
)
from app.schemas.salon import SalonResponse
from app.services import organization_service

router = APIRouter()


@router.get("/me", response_model=OrganizationResponse)
async def get_my_organization(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """自分の所属組織を取得"""
    org = await organization_service.get_user_organization(db, current_user["id"])
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="組織に所属していません",
        )
    return OrganizationResponse(**org)


@router.put("/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: str,
    request: OrganizationUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """組織情報を更新（owner/admin）"""
    await require_org_admin(org_id, current_user, db)

    update_data = request.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="更新するデータがありません",
        )

    org = await organization_service.update_organization(db, org_id, **update_data)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="組織が見つかりません",
        )
    return OrganizationResponse(**org)


@router.get("/{org_id}/members", response_model=OrgMemberListResponse)
async def get_members(
    org_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """メンバー一覧を取得"""
    from app.services.organization_service import get_member_role
    role = await get_member_role(db, org_id, current_user["id"])
    if not role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この組織のメンバーではありません",
        )

    members = await organization_service.get_org_members(db, org_id)
    member_responses = [OrgMemberResponse(**m) for m in members]
    return OrgMemberListResponse(items=member_responses, total=len(member_responses))


@router.post("/{org_id}/members", response_model=OrgMemberResponse)
async def add_member(
    org_id: str,
    request: OrgMemberCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """メンバーを追加（owner/admin）"""
    await require_org_admin(org_id, current_user, db)

    # メールからユーザーIDを取得（Supabase or モック）
    from app.config import get_settings
    settings = get_settings()

    if settings.mock_auth:
        # モック: メールからダミーIDを生成
        user_id = f"user-{request.email.replace('@', '-').replace('.', '-')}"
    else:
        # Supabase: Service Roleでユーザー検索
        from app.dependencies import get_supabase_client
        supabase = get_supabase_client()
        try:
            users = supabase.auth.admin.list_users()
            target_user = None
            for u in users:
                if u.email == request.email:
                    target_user = u
                    break
            if not target_user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"メールアドレス {request.email} のユーザーが見つかりません",
                )
            user_id = target_user.id
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="ユーザーの検索に失敗しました",
            )

    if request.role not in ("admin", "member"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ロールはadminまたはmemberを指定してください",
        )

    try:
        member = await organization_service.add_member(db, org_id, user_id, request.role)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    member["email"] = request.email
    return OrgMemberResponse(**member)


@router.delete("/{org_id}/members/{user_id}")
async def remove_member(
    org_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """メンバーを削除（owner/admin）"""
    await require_org_admin(org_id, current_user, db)

    try:
        removed = await organization_service.remove_member(db, org_id, user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="メンバーが見つかりません",
        )

    return {"message": "メンバーを削除しました"}


@router.get("/{org_id}/salons")
async def get_org_salons(
    org_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """組織配下のサロン一覧"""
    from app.services.organization_service import get_member_role
    role = await get_member_role(db, org_id, current_user["id"])
    if not role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この組織のメンバーではありません",
        )

    salons = await organization_service.get_org_salons(db, org_id)
    return {
        "items": [SalonResponse(**s) for s in salons],
        "total": len(salons),
    }
