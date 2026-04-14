"""
コンテンツカレンダーエンドポイント（Pro/Team限定）
"""
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.dependencies import get_db, get_current_user
from app.models.salon import Salon
from app.models.calendar import ContentCalendar
from app.services.usage_service import get_user_plan

router = APIRouter()


class CalendarItemCreate(BaseModel):
    stylist_id: Optional[str] = None
    content_type: str
    scheduled_date: date
    notes: Optional[str] = Field(None, max_length=500)


class CalendarItemUpdate(BaseModel):
    stylist_id: Optional[str] = None
    content_type: Optional[str] = None
    scheduled_date: Optional[date] = None
    status: Optional[str] = None
    generated_content_id: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=500)


def get_user_salon_id(db: Session, user_id: str) -> str:
    salon = db.query(Salon).filter(Salon.user_id == user_id).first()
    if not salon:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="サロンが登録されていません")
    return salon.id


async def require_premium(db: Session, user_id: str):
    plan = await get_user_plan(db, user_id)
    if plan == "free":
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="コンテンツカレンダーはProプラン以上で利用できます"
        )


@router.get("")
async def list_calendar_items(
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """カレンダーアイテム一覧取得（月単位）"""
    await require_premium(db, current_user["id"])
    salon_id = get_user_salon_id(db, current_user["id"])

    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, month + 1, 1)

    items = db.query(ContentCalendar).filter(
        ContentCalendar.salon_id == salon_id,
        ContentCalendar.scheduled_date >= start_date,
        ContentCalendar.scheduled_date < end_date,
    ).order_by(ContentCalendar.scheduled_date).all()

    return {"items": [item.to_dict() for item in items]}


@router.post("")
async def create_calendar_item(
    request: CalendarItemCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """カレンダーアイテム作成"""
    await require_premium(db, current_user["id"])
    salon_id = get_user_salon_id(db, current_user["id"])

    item = ContentCalendar(
        salon_id=salon_id,
        stylist_id=request.stylist_id,
        content_type=request.content_type,
        scheduled_date=request.scheduled_date,
        notes=request.notes,
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return item.to_dict()


@router.put("/{item_id}")
async def update_calendar_item(
    item_id: str,
    request: CalendarItemUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """カレンダーアイテム更新"""
    await require_premium(db, current_user["id"])
    salon_id = get_user_salon_id(db, current_user["id"])

    item = db.query(ContentCalendar).filter(
        ContentCalendar.id == item_id,
        ContentCalendar.salon_id == salon_id,
    ).first()

    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="アイテムが見つかりません")

    if request.stylist_id is not None:
        item.stylist_id = request.stylist_id
    if request.content_type is not None:
        item.content_type = request.content_type
    if request.scheduled_date is not None:
        item.scheduled_date = request.scheduled_date
    if request.status is not None:
        item.status = request.status
    if request.generated_content_id is not None:
        item.generated_content_id = request.generated_content_id
    if request.notes is not None:
        item.notes = request.notes

    db.commit()
    db.refresh(item)

    return item.to_dict()


@router.delete("/{item_id}")
async def delete_calendar_item(
    item_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """カレンダーアイテム削除"""
    await require_premium(db, current_user["id"])
    salon_id = get_user_salon_id(db, current_user["id"])

    item = db.query(ContentCalendar).filter(
        ContentCalendar.id == item_id,
        ContentCalendar.salon_id == salon_id,
    ).first()

    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="アイテムが見つかりません")

    db.delete(item)
    db.commit()

    return {"message": "カレンダーアイテムを削除しました"}
