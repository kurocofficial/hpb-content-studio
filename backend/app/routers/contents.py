"""
コンテンツ管理エンドポイント
"""
import csv
import io
import math
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.schemas.content import ContentResponse, ContentListResponse
from app.models.salon import Salon
from app.models.stylist import Stylist
from app.models.content import GeneratedContent
from app.services.usage_service import get_user_plan

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


@router.get("/export")
async def export_contents(
    content_type: str = Query(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    コンテンツをCSVエクスポート（Pro/Team限定）
    """
    # プランチェック
    plan = await get_user_plan(db, current_user["id"])
    if plan == "free":
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="CSVエクスポートはProプラン以上で利用できます"
        )

    salon_id = get_user_salon_id(db, current_user["id"])

    # クエリを構築
    query = db.query(GeneratedContent).filter(GeneratedContent.salon_id == salon_id)
    if content_type:
        query = query.filter(GeneratedContent.content_type == content_type)

    contents = query.order_by(GeneratedContent.created_at.desc()).all()

    # スタイリスト名のマップを構築
    stylist_ids = set(c.stylist_id for c in contents if c.stylist_id)
    stylist_map = {}
    if stylist_ids:
        stylists = db.query(Stylist).filter(Stylist.id.in_(stylist_ids)).all()
        stylist_map = {str(s.id): s.name for s in stylists}

    # コンテンツタイプのラベルマップ
    type_labels = {
        "salon_catch": "サロンキャッチ",
        "salon_intro": "サロン紹介文",
        "stylist_profile": "スタイリストプロフィール",
        "blog_article": "ブログ記事",
        "review_reply": "口コミ返信",
        "consultation": "悩み相談",
        "google_review_reply": "Google口コミ返信",
    }

    # CSV生成
    output = io.StringIO()
    # BOM付きUTF-8でExcel対応
    output.write('\ufeff')
    writer = csv.writer(output)
    writer.writerow(["スタイリスト名", "コンテンツ種別", "本文", "文字数", "生成日時"])

    for c in contents:
        writer.writerow([
            stylist_map.get(str(c.stylist_id), "―") if c.stylist_id else "―",
            type_labels.get(c.content_type, c.content_type),
            c.content,
            c.char_count,
            c.created_at.strftime("%Y-%m-%d %H:%M") if c.created_at else "",
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": "attachment; filename=hpb_contents_export.csv",
        }
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
