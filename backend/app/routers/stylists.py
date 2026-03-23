"""
スタイリスト管理のエンドポイント
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.schemas.stylist import (
    StylistCreate,
    StylistUpdate,
    StylistResponse,
    StylistListResponse,
)
from app.models.salon import Salon
from app.models.stylist import Stylist

router = APIRouter()


def get_user_salon_id(db: Session, user_id: str, salon_id: Optional[str] = None) -> str:
    """
    ユーザーのサロンIDを取得
    salon_idが指定された場合、そのサロンへのアクセス権をチェック
    """
    if salon_id:
        # 指定されたサロンIDのアクセス権をチェック
        salon = db.query(Salon).filter(Salon.id == salon_id).first()
        if not salon:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="サロンが見つかりません"
            )
        # 個人サロン or 組織メンバーかチェック
        if salon.user_id == user_id:
            return salon.id
        if salon.organization_id:
            from app.services.organization_service import get_member_role
            import asyncio
            # 同期コンテキストから非同期を呼ぶためのヘルパー
            from app.models.organization import OrganizationMember
            member = db.query(OrganizationMember).filter(
                OrganizationMember.organization_id == salon.organization_id,
                OrganizationMember.user_id == user_id,
            ).first()
            if member:
                return salon.id
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="このサロンへのアクセス権がありません"
        )

    # salon_id未指定: 個人サロンを取得（従来の動作）
    salon = db.query(Salon).filter(
        Salon.user_id == user_id,
        Salon.organization_id == None,  # noqa: E711
    ).first()

    if not salon:
        # 組織サロンも探す
        from app.models.organization import OrganizationMember
        member = db.query(OrganizationMember).filter(
            OrganizationMember.user_id == user_id,
        ).first()
        if member:
            salon = db.query(Salon).filter(
                Salon.organization_id == member.organization_id,
            ).first()

    if not salon:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="まずサロンを登録してください"
        )

    return salon.id


@router.post("", response_model=StylistResponse)
async def create_stylist(
    request: StylistCreate,
    salon_id: Optional[str] = Query(None, description="対象サロンID（Team用）"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    スタイリストを作成
    """
    salon_id = get_user_salon_id(db, current_user["id"], salon_id)

    stylist = Stylist(
        salon_id=salon_id,
        name=request.name,
        role=request.role,
        years_experience=request.years_experience,
        specialties=request.specialties,
        style_features=request.style_features,
        personality=request.personality,
        writing_style=request.writing_style.model_dump() if request.writing_style else None,
        language_style=request.language_style.model_dump(exclude_none=True) if request.language_style else None,
        background=request.background.model_dump(exclude_none=True) if request.background else None,
        service_info=request.service_info.model_dump(exclude_none=True) if request.service_info else None,
    )

    db.add(stylist)
    db.commit()
    db.refresh(stylist)

    return StylistResponse(**stylist.to_dict())


@router.get("", response_model=StylistListResponse)
async def list_stylists(
    salon_id: Optional[str] = Query(None, description="対象サロンID（Team用）"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    スタイリスト一覧を取得
    """
    salon_id = get_user_salon_id(db, current_user["id"], salon_id)

    stylists = db.query(Stylist).filter(Stylist.salon_id == salon_id).order_by(Stylist.created_at).all()

    stylist_responses = [StylistResponse(**s.to_dict()) for s in stylists]

    return StylistListResponse(items=stylist_responses, total=len(stylist_responses))


@router.get("/{stylist_id}", response_model=StylistResponse)
async def get_stylist(
    stylist_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    スタイリストを取得
    """
    salon_id = get_user_salon_id(db, current_user["id"])

    stylist = db.query(Stylist).filter(
        Stylist.id == stylist_id,
        Stylist.salon_id == salon_id
    ).first()

    if not stylist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="スタイリストが見つかりません"
        )

    return StylistResponse(**stylist.to_dict())


@router.put("/{stylist_id}", response_model=StylistResponse)
async def update_stylist(
    stylist_id: str,
    request: StylistUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    スタイリストを更新
    """
    salon_id = get_user_salon_id(db, current_user["id"])

    # 所有権チェック
    stylist = db.query(Stylist).filter(
        Stylist.id == stylist_id,
        Stylist.salon_id == salon_id
    ).first()

    if not stylist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="スタイリストが見つかりません"
        )

    # 更新データを適用
    update_data = {}
    if request.name is not None:
        stylist.name = request.name
        update_data["name"] = request.name
    if request.role is not None:
        stylist.role = request.role
        update_data["role"] = request.role
    if request.years_experience is not None:
        stylist.years_experience = request.years_experience
        update_data["years_experience"] = request.years_experience
    if request.specialties is not None:
        stylist.specialties = request.specialties
        update_data["specialties"] = request.specialties
    if request.style_features is not None:
        stylist.style_features = request.style_features
        update_data["style_features"] = request.style_features
    if request.personality is not None:
        stylist.personality = request.personality
        update_data["personality"] = request.personality
    if request.writing_style is not None:
        stylist.writing_style = request.writing_style.model_dump()
        update_data["writing_style"] = stylist.writing_style
    if request.language_style is not None:
        stylist.language_style = request.language_style.model_dump(exclude_none=True)
        update_data["language_style"] = stylist.language_style
    if request.background is not None:
        stylist.background = request.background.model_dump(exclude_none=True)
        update_data["background"] = stylist.background
    if request.service_info is not None:
        stylist.service_info = request.service_info.model_dump(exclude_none=True)
        update_data["service_info"] = stylist.service_info

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="更新するデータがありません"
        )

    db.commit()
    db.refresh(stylist)

    return StylistResponse(**stylist.to_dict())


@router.delete("/{stylist_id}")
async def delete_stylist(
    stylist_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    スタイリストを削除
    """
    salon_id = get_user_salon_id(db, current_user["id"])

    # 所有権チェック
    stylist = db.query(Stylist).filter(
        Stylist.id == stylist_id,
        Stylist.salon_id == salon_id
    ).first()

    if not stylist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="スタイリストが見つかりません"
        )

    db.delete(stylist)
    db.commit()

    return {"message": "スタイリストを削除しました"}
