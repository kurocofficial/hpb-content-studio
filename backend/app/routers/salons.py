"""
サロン管理のエンドポイント
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, get_current_user_organization
from app.schemas.salon import SalonCreate, SalonUpdate, SalonResponse
from app.models.salon import Salon

router = APIRouter()


@router.post("", response_model=SalonResponse)
async def create_salon(
    request: SalonCreate,
    organization_id: Optional[str] = Query(None, description="組織ID（Teamプラン用）"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    サロンを作成
    - Free/Pro: 1ユーザー1サロン
    - Team: organization_idを指定して複数サロン可能
    """
    user_id = current_user["id"]

    if organization_id:
        # Teamプラン: 組織メンバーかチェック
        from app.services.organization_service import get_member_role
        role = await get_member_role(db, organization_id, user_id)
        if not role or role not in ("owner", "admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="サロンを追加するにはオーナーまたは管理者権限が必要です",
            )

        salon = Salon(
            user_id=user_id,
            organization_id=organization_id,
            name=request.name,
            area=request.area,
            concept=request.concept,
            target_customer=request.target_customer,
            strength=request.strength,
        )
    else:
        # Free/Pro: 既存サロンチェック（組織なしのサロンのみ）
        existing = db.query(Salon).filter(
            Salon.user_id == user_id,
            Salon.organization_id == None,  # noqa: E711
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="既にサロンが登録されています。更新する場合はPUTを使用してください。"
            )

        salon = Salon(
            user_id=user_id,
            name=request.name,
            area=request.area,
            concept=request.concept,
            target_customer=request.target_customer,
            strength=request.strength,
        )

    db.add(salon)
    db.commit()
    db.refresh(salon)

    return SalonResponse(**salon.to_dict())


@router.get("/me", response_model=SalonResponse)
async def get_my_salon(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    自分のサロン情報を取得
    """
    user_id = current_user["id"]

    salon = db.query(Salon).filter(Salon.user_id == user_id).first()

    if not salon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="サロンが登録されていません"
        )

    return SalonResponse(**salon.to_dict())


@router.put("/me", response_model=SalonResponse)
async def update_my_salon(
    request: SalonUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    自分のサロン情報を更新
    """
    user_id = current_user["id"]

    # 既存のサロンを取得
    salon = db.query(Salon).filter(Salon.user_id == user_id).first()

    if not salon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="サロンが登録されていません"
        )

    # 更新データを適用（Noneでないフィールドのみ）
    update_data = {}
    if request.name is not None:
        salon.name = request.name
        update_data["name"] = request.name
    if request.area is not None:
        salon.area = request.area
        update_data["area"] = request.area
    if request.concept is not None:
        salon.concept = request.concept
        update_data["concept"] = request.concept
    if request.target_customer is not None:
        salon.target_customer = request.target_customer
        update_data["target_customer"] = request.target_customer
    if request.strength is not None:
        salon.strength = request.strength
        update_data["strength"] = request.strength

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="更新するデータがありません"
        )

    db.commit()
    db.refresh(salon)

    return SalonResponse(**salon.to_dict())
