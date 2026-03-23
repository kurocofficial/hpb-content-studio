"""
コンテンツ生成エンドポイント
"""
import json
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.schemas.content import GenerateRequest, GenerateResponse, UsageLimitResponse
from app.services.content_service import (
    generate_text_content_stream,
    save_generated_content,
    get_salon_by_user_id,
)
from app.services.usage_service import check_usage_limit, increment_usage
from app.services.prompt_engine import build_full_prompt
from app.utils.char_counter import get_char_limit
from app.models.stylist import Stylist

router = APIRouter()


@router.post("/check-limit", response_model=UsageLimitResponse)
async def check_generation_limit(
    request: GenerateRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    生成前に利用制限をチェック
    """
    limit_check = await check_usage_limit(
        db=db,
        user_id=current_user["id"],
        content_type=request.content_type,
    )

    return UsageLimitResponse(**limit_check)


@router.post("/text")
async def generate_text(
    request: GenerateRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    テキストコンテンツを生成（SSEストリーミング）
    """
    # 利用制限チェック
    limit_check = await check_usage_limit(
        db=db,
        user_id=current_user["id"],
        content_type=request.content_type,
    )

    if not limit_check["allowed"]:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=limit_check.get("message", "利用制限に達しました")
        )

    # サロン情報を事前に取得
    salon = await get_salon_by_user_id(db, current_user["id"])
    if not salon:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="サロン情報が登録されていません"
        )

    async def event_stream():
        full_content = ""
        content_type = request.content_type

        try:
            async for event in generate_text_content_stream(
                db=db,
                user_id=current_user["id"],
                content_type=content_type,
                stylist_id=request.stylist_id,
                additional_instructions=request.additional_instructions,
                blog_theme=request.blog_theme,
                review_text=request.review_text,
                consultation_text=request.consultation_text,
                star_rating=request.star_rating,
            ):
                event_type = event.get("type")

                if event_type == "error":
                    yield f"data: {json.dumps({'type': 'error', 'content': event['content']})}\n\n"
                    return

                elif event_type == "start":
                    yield f"data: {json.dumps({'type': 'start'})}\n\n"

                elif event_type == "chunk":
                    full_content += event["content"]
                    yield f"data: {json.dumps({'type': 'chunk', 'content': event['content']})}\n\n"

                elif event_type == "complete":
                    input_tokens = event.get("input_tokens", 0)
                    output_tokens = event.get("output_tokens", 0)

                    # 利用量をインクリメント（トークン数込み）
                    await increment_usage(
                        db=db,
                        user_id=current_user["id"],
                        content_type=content_type,
                        input_tokens=input_tokens,
                        output_tokens=output_tokens,
                    )

                    # コンテンツを保存
                    # スタイリスト情報を取得してプロンプトを再構築
                    stylist = None
                    if request.stylist_id:
                        stylist_obj = db.query(Stylist).filter(Stylist.id == request.stylist_id).first()
                        if stylist_obj:
                            stylist = stylist_obj.to_dict()

                    prompt = build_full_prompt(
                        content_type=content_type,
                        salon=salon,
                        stylist=stylist,
                        additional_instructions=request.additional_instructions,
                        blog_theme=request.blog_theme,
                        review_text=request.review_text,
                        consultation_text=request.consultation_text,
                        star_rating=request.star_rating,
                    )

                    saved = await save_generated_content(
                        db=db,
                        salon_id=salon["id"],
                        stylist_id=request.stylist_id,
                        content_type=content_type,
                        content=full_content,
                        prompt_used=prompt,
                        input_tokens=input_tokens,
                        output_tokens=output_tokens,
                    )

                    yield f"data: {json.dumps({'type': 'complete', 'content_id': saved['id'], 'char_count': event['char_count'], 'max_chars': event['max_chars'], 'is_over_limit': event['is_over_limit']})}\n\n"

            yield "data: [DONE]\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
