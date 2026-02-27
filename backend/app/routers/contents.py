"""
コンテンツ管理エンドポイント
"""
import math
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.schemas.content import ContentResponse, ContentListResponse
from app.models.salon import Salon
from app.models.content import GeneratedContent

router = APIRouter()


def get_user_salon_id(db: Session, user_id: str) -> str:
    """ユーザーのサロンIDを取得"""
    salon = db.query(Salon).filter(Salon.user_id == user_id).first()

    if not salon:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="サロンが登録されていません"
        )

    return salon.id


@router.get("", response_model=ContentListResponse)
async def list_contents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    content_type: str = Query(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    コンテンツ一覧を取得
    """
    salon_id = get_user_salon_id(db, current_user["id"])

    # クエリを構築
    query = db.query(GeneratedContent).filter(GeneratedContent.salon_id == salon_id)

    if content_type:
        query = query.filter(GeneratedContent.content_type == content_type)

    # 総数を取得
    total = query.count()

    # ページネーション
    offset = (page - 1) * page_size
    contents = query.order_by(GeneratedContent.created_at.desc()).offset(offset).limit(page_size).all()

    items = [ContentResponse(**item.to_dict()) for item in contents]
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return ContentListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{content_id}", response_model=ContentResponse)
async def get_content(
    content_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    コンテンツを取得
    """
    salon_id = get_user_salon_id(db, current_user["id"])

    content = db.query(GeneratedContent).filter(
        GeneratedContent.id == content_id,
        GeneratedContent.salon_id == salon_id
    ).first()

    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="コンテンツが見つかりません"
        )

    return ContentResponse(**content.to_dict())


@router.put("/{content_id}")
async def update_content(
    content_id: str,
    content: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    コンテンツを更新（チャット修正後の保存）
    """
    salon_id = get_user_salon_id(db, current_user["id"])

    # 所有権チェック
    existing = db.query(GeneratedContent).filter(
        GeneratedContent.id == content_id,
        GeneratedContent.salon_id == salon_id
    ).first()

    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="コンテンツが見つかりません"
        )

    from app.utils.char_counter import count_hpb_characters

    existing.content = content
    existing.char_count = count_hpb_characters(content)

    db.commit()
    db.refresh(existing)

    return ContentResponse(**existing.to_dict())


@router.delete("/{content_id}")
async def delete_content(
    content_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    コンテンツを削除
    """
    salon_id = get_user_salon_id(db, current_user["id"])

    # 所有権チェック
    existing = db.query(GeneratedContent).filter(
        GeneratedContent.id == content_id,
        GeneratedContent.salon_id == salon_id
    ).first()

    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="コンテンツが見つかりません"
        )

    db.delete(existing)
    db.commit()

    return {"message": "コンテンツを削除しました"}
