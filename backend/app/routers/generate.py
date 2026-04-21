"""
コンテンツ生成エンドポイント
"""
import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.schemas.content import GenerateRequest, GenerateResponse, UsageLimitResponse, BatchGenerateRequest
from app.services.content_service import (
    generate_text_content_stream,
    save_generated_content,
    get_salon_by_user_id,
    get_stylist_by_id,
    get_past_contents,
)
from app.services.usage_service import check_usage_limit, increment_usage, get_user_plan
from app.services.prompt_engine import build_full_prompt
from app.services.claude_service import generate_content, compute_max_tokens
from app.utils.char_counter import get_char_limit, count_characters
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

    # プラン情報を取得
    plan = await get_user_plan(db, current_user["id"])

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
                plan=plan,
                use_past_contents=request.use_past_contents,
                target_char_count=request.target_char_count,
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

                elif event_type == "retry_start":
                    yield f"data: {json.dumps({'type': 'retry_start', 'actual_chars': event['actual_chars'], 'min': event['min'], 'max': event['max']})}\n\n"

                elif event_type == "retry_replace":
                    full_content = event["content"]
                    yield f"data: {json.dumps({'type': 'retry_replace', 'content': event['content']})}\n\n"

                elif event_type == "complete":
                    input_tokens = event.get("input_tokens", 0)
                    output_tokens = event.get("output_tokens", 0)
                    # リトライ後のコンテンツで確定
                    final_content = event.get("content", full_content)

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
                        plan=plan,
                        target_char_count=request.target_char_count,
                    )

                    saved = await save_generated_content(
                        db=db,
                        salon_id=salon["id"],
                        stylist_id=request.stylist_id,
                        content_type=content_type,
                        content=final_content,
                        prompt_used=prompt,
                        input_tokens=input_tokens,
                        output_tokens=output_tokens,
                    )

                    yield f"data: {json.dumps({'type': 'complete', 'content_id': saved['id'], 'char_count': event['char_count'], 'max_chars': event['max_chars'], 'target_char_count': event.get('target_char_count'), 'is_over_limit': event['is_over_limit'], 'is_in_target_range': event.get('is_in_target_range', True), 'retried': event.get('retried', False)})}\n\n"

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


@router.post("/text/ab")
async def generate_ab_test(
    request: GenerateRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    ABテスト生成（2パターン生成、Pro/Team限定）
    """
    # プランチェック
    plan = await get_user_plan(db, current_user["id"])
    if plan == "free":
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="ABテスト生成はProプラン以上で利用できます"
        )

    # 利用制限チェック（2回分消費）
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

    # サロン情報を取得
    salon = await get_salon_by_user_id(db, current_user["id"])
    if not salon:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="サロン情報が登録されていません"
        )

    # スタイリスト情報を取得
    stylist = None
    if request.stylist_id:
        stylist = await get_stylist_by_id(db, request.stylist_id, salon["id"])
        if not stylist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="スタイリストが見つかりません"
            )

    # 過去コンテンツ取得
    past = await get_past_contents(db, salon["id"], request.stylist_id, request.content_type) or None if request.use_past_contents else None

    # プロンプトを構築
    prompt = build_full_prompt(
        content_type=request.content_type,
        salon=salon,
        stylist=stylist,
        additional_instructions=request.additional_instructions,
        blog_theme=request.blog_theme,
        review_text=request.review_text,
        consultation_text=request.consultation_text,
        star_rating=request.star_rating,
        plan=plan,
        past_contents=past,
        target_char_count=request.target_char_count,
    )

    # 2パターン同時生成（temperature違い）
    ab_max_tokens = compute_max_tokens(request.target_char_count or get_char_limit(request.content_type))
    (result_a, usage_a), (result_b, usage_b) = await asyncio.gather(
        generate_content(prompt, max_tokens=ab_max_tokens, temperature=0.5),
        generate_content(prompt, max_tokens=ab_max_tokens, temperature=0.9),
    )

    # 両方保存
    saved_a = await save_generated_content(
        db=db, salon_id=salon["id"], stylist_id=request.stylist_id,
        content_type=request.content_type, content=result_a, prompt_used=prompt,
        input_tokens=usage_a.get("input_tokens", 0), output_tokens=usage_a.get("output_tokens", 0),
    )
    saved_b = await save_generated_content(
        db=db, salon_id=salon["id"], stylist_id=request.stylist_id,
        content_type=request.content_type, content=result_b, prompt_used=prompt,
        input_tokens=usage_b.get("input_tokens", 0), output_tokens=usage_b.get("output_tokens", 0),
    )

    # パターンAとBそれぞれのトークンを個別にカウント（計2回分）
    await increment_usage(db=db, user_id=current_user["id"], content_type=request.content_type,
                          input_tokens=usage_a.get("input_tokens", 0), output_tokens=usage_a.get("output_tokens", 0))
    await increment_usage(db=db, user_id=current_user["id"], content_type=request.content_type,
                          input_tokens=usage_b.get("input_tokens", 0), output_tokens=usage_b.get("output_tokens", 0))

    max_chars = get_char_limit(request.content_type)
    char_count_a = count_characters(result_a, request.content_type)
    char_count_b = count_characters(result_b, request.content_type)

    return {
        "pattern_a": {
            "content_id": saved_a["id"],
            "content": result_a,
            "char_count": char_count_a,
            "max_chars": max_chars,
            "is_over_limit": char_count_a > max_chars,
        },
        "pattern_b": {
            "content_id": saved_b["id"],
            "content": result_b,
            "char_count": char_count_b,
            "max_chars": max_chars,
            "is_over_limit": char_count_b > max_chars,
        },
    }


@router.post("/batch")
async def generate_batch(
    request: BatchGenerateRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    一括生成（Pro/Team限定、SSEでプログレス通知）
    """
    # プランチェック
    plan = await get_user_plan(db, current_user["id"])
    if plan == "free":
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="一括生成はProプラン以上で利用できます"
        )

    # サロン情報を取得
    salon = await get_salon_by_user_id(db, current_user["id"])
    if not salon:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="サロン情報が登録されていません"
        )

    total = len(request.items)
    semaphore = asyncio.Semaphore(5)

    async def event_stream():
        yield f"data: {json.dumps({'type': 'start', 'total': total})}\n\n"

        completed = 0
        results = []

        async def process_item(item, index):
            nonlocal completed
            async with semaphore:
                try:
                    stylist = None
                    if item.stylist_id:
                        stylist = await get_stylist_by_id(db, item.stylist_id, salon["id"])

                    past = await get_past_contents(db, salon["id"], item.stylist_id, item.content_type) or None if request.use_past_contents else None

                    prompt = build_full_prompt(
                        content_type=item.content_type,
                        salon=salon,
                        stylist=stylist,
                        additional_instructions=item.additional_instructions,
                        blog_theme=item.blog_theme,
                        review_text=item.review_text,
                        consultation_text=item.consultation_text,
                        star_rating=item.star_rating,
                        plan=plan,
                        past_contents=past,
                        target_char_count=item.target_char_count,
                    )

                    batch_max_tokens = compute_max_tokens(item.target_char_count or get_char_limit(item.content_type))
                    content, usage_info = await generate_content(prompt, max_tokens=batch_max_tokens)

                    saved = await save_generated_content(
                        db=db, salon_id=salon["id"], stylist_id=item.stylist_id,
                        content_type=item.content_type, content=content, prompt_used=prompt,
                        input_tokens=usage_info.get("input_tokens", 0),
                        output_tokens=usage_info.get("output_tokens", 0),
                    )

                    await increment_usage(
                        db=db, user_id=current_user["id"], content_type=item.content_type,
                        input_tokens=usage_info.get("input_tokens", 0),
                        output_tokens=usage_info.get("output_tokens", 0),
                    )

                    stylist_name = stylist["name"] if stylist else "―"
                    completed += 1

                    return {
                        "index": index,
                        "status": "success",
                        "content_id": saved["id"],
                        "content": content,
                        "stylist_name": stylist_name,
                        "content_type": item.content_type,
                        "char_count": saved.get("char_count", 0),
                    }
                except Exception as e:
                    completed += 1
                    return {
                        "index": index,
                        "status": "error",
                        "error": str(e),
                        "content_type": item.content_type,
                    }

        # 順次実行して進捗をストリーミング（Semaphoreで並列数制御）
        for i, item in enumerate(request.items):
            result = await process_item(item, i)
            results.append(result)

            yield f"data: {json.dumps({'type': 'progress', 'completed': completed, 'total': total, 'result': result})}\n\n"

        yield f"data: {json.dumps({'type': 'complete', 'total': total, 'success_count': sum(1 for r in results if r['status'] == 'success'), 'error_count': sum(1 for r in results if r['status'] == 'error')})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
