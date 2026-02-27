"""
利用量管理エンドポイント
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.schemas.content import UsageSummaryResponse
from app.services.usage_service import get_usage_summary

router = APIRouter()


@router.get("", response_model=UsageSummaryResponse)
async def get_usage(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    利用量サマリーを取得
    """
    summary = await get_usage_summary(
        db=db,
        user_id=current_user["id"],
    )

    return UsageSummaryResponse(**summary)
