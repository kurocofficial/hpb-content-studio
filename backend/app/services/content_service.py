"""
コンテンツ生成サービス
"""
from typing import Optional, Dict, Any, List, AsyncGenerator
from sqlalchemy.orm import Session

from app.models.salon import Salon
from app.models.stylist import Stylist
from app.models.content import GeneratedContent
from app.services.prompt_engine import build_full_prompt, build_prompt_parts, get_prompt_for_chat_modification
from app.services.claude_service import generate_content_stream, generate_content, compute_max_tokens
from app.utils.char_counter import count_hpb_characters, count_characters, get_char_limit, get_target_range

# 過去コンテンツ参照数（コンテンツタイプ別）
PAST_CONTENT_LIMITS = {
    "salon_catch": 3,
    "salon_intro": 2,
    "stylist_profile": 2,
    "blog_article": 1,
    "review_reply": 2,
    "consultation": 1,
    "google_review_reply": 2,
}


async def get_salon_by_user_id(db: Session, user_id: str) -> Optional[Dict[str, Any]]:
    """ユーザーIDからサロン情報を取得"""
    salon = db.query(Salon).filter(Salon.user_id == user_id).first()
    return salon.to_dict() if salon else None


async def get_stylist_by_id(db: Session, stylist_id: str, salon_id: str) -> Optional[Dict[str, Any]]:
    """スタイリストIDからスタイリスト情報を取得（サロンID検証付き）"""
    stylist = db.query(Stylist).filter(
        Stylist.id == stylist_id,
        Stylist.salon_id == salon_id
    ).first()
    return stylist.to_dict() if stylist else None


async def get_past_contents(
    db: Session,
    salon_id: str,
    stylist_id: Optional[str],
    content_type: str,
) -> List[Dict[str, Any]]:
    """過去の生成コンテンツを取得（Pro/Team向け）"""
    limit = PAST_CONTENT_LIMITS.get(content_type, 2)
    query = db.query(GeneratedContent).filter(
        GeneratedContent.salon_id == salon_id,
        GeneratedContent.content_type == content_type,
    )
    if stylist_id:
        query = query.filter(GeneratedContent.stylist_id == stylist_id)
    results = query.order_by(GeneratedContent.created_at.desc()).limit(limit).all()
    return [{"content": r.content, "created_at": str(r.created_at)} for r in results]


async def generate_text_content_stream(
    db: Session,
    user_id: str,
    content_type: str,
    stylist_id: Optional[str] = None,
    additional_instructions: Optional[str] = None,
    blog_theme: Optional[str] = None,
    review_text: Optional[str] = None,
    consultation_text: Optional[str] = None,
    star_rating: Optional[int] = None,
    plan: str = "free",
    use_past_contents: bool = False,
    target_char_count: Optional[int] = None,
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    テキストコンテンツをストリーミングで生成

    Args:
        db: DBセッション
        user_id: ユーザーID
        content_type: コンテンツタイプ
        stylist_id: スタイリストID（オプション）
        additional_instructions: 追加指示（オプション）
        blog_theme: ブログテーマ（blog_articleの場合）
        review_text: お客様の口コミ文（review_reply/google_review_replyの場合）
        consultation_text: 悩み・相談内容（consultationの場合）
        star_rating: 口コミの星評価（google_review_replyの場合、1-5）
        plan: ユーザーのプラン（'free', 'pro', 'team'）
        use_past_contents: 過去コンテンツを参照するか（Pro/Team限定）

    Yields:
        生成状態と生成されたテキストのチャンク
    """
    # サロン情報を取得
    salon = await get_salon_by_user_id(db, user_id)
    if not salon:
        yield {"type": "error", "content": "サロン情報が登録されていません"}
        return

    # スタイリスト情報を取得（指定されている場合）
    stylist = None
    if stylist_id:
        stylist = await get_stylist_by_id(db, stylist_id, salon["id"])
        if not stylist:
            yield {"type": "error", "content": "スタイリストが見つかりません"}
            return

    # 過去コンテンツを取得（Pro/Team + トグルONの場合）
    past_contents = None
    if use_past_contents and plan in ("pro", "team"):
        past_contents = await get_past_contents(db, salon["id"], stylist_id, content_type) or None

    # 目標文字数を確定
    max_chars = get_char_limit(content_type)
    target = target_char_count or max_chars
    max_tokens = compute_max_tokens(target)
    min_c, max_c = get_target_range(target, tolerance=0.04)

    # system/userに分割してプロンプトを構築（system parameterで文字数制約の遵守率向上）
    system_prompt, user_message = build_prompt_parts(
        content_type=content_type,
        salon=salon,
        stylist=stylist,
        additional_instructions=additional_instructions,
        blog_theme=blog_theme,
        review_text=review_text,
        consultation_text=consultation_text,
        star_rating=star_rating,
        plan=plan,
        past_contents=past_contents,
        target_char_count=target,
    )

    # 開始通知
    yield {"type": "start", "content": ""}

    # ストリーミング生成
    full_text = ""
    usage_info = {"input_tokens": 0, "output_tokens": 0}
    retried = False
    try:
        async for event in generate_content_stream(user_message, max_tokens=max_tokens, system=system_prompt):
            if event["type"] == "text":
                full_text += event["content"]
                yield {"type": "chunk", "content": event["content"]}
            elif event["type"] == "usage":
                usage_info = event

        # 帯域チェック → 1回だけリトライ
        char_count = count_characters(full_text, content_type)
        needs_retry = char_count < min_c or char_count > max_c

        if needs_retry:
            yield {"type": "retry_start", "actual_chars": char_count, "min": min_c, "max": max_c}

            direction = "内容を充実させ" if char_count < min_c else "内容を簡潔にまとめ"
            retry_system = (
                f"あなたはテキスト調整の専門家です。\n"
                f"与えられたテキストを指定された文字数（{min_c}〜{max_c}文字）に厳密に収めてください。\n"
                f"文字数制約を最優先し、内容の質を保ちながら調整してください。\n"
                f"修正後のテキストのみを出力し、説明は不要です。"
            )
            retry_user = (
                f"以下のテキストは{char_count}文字です。{direction}、{min_c}〜{max_c}文字に調整してください。\n\n"
                f"## テキスト\n{full_text}"
            )
            retry_text, retry_usage = await generate_content(
                retry_user, max_tokens=max_tokens, temperature=0.1, system=retry_system
            )
            full_text = retry_text
            char_count = count_characters(full_text, content_type)
            usage_info["input_tokens"] = usage_info.get("input_tokens", 0) + retry_usage.get("input_tokens", 0)
            usage_info["output_tokens"] = usage_info.get("output_tokens", 0) + retry_usage.get("output_tokens", 0)
            retried = True
            yield {"type": "retry_replace", "content": full_text}

        yield {
            "type": "complete",
            "content": full_text,
            "char_count": char_count,
            "max_chars": max_chars,
            "target_char_count": target,
            "min_char_count": min_c,
            "max_char_count_range": max_c,
            "is_over_limit": char_count > max_chars,
            "is_in_target_range": min_c <= char_count <= max_c,
            "retried": retried,
            "input_tokens": usage_info.get("input_tokens", 0),
            "output_tokens": usage_info.get("output_tokens", 0),
        }

    except Exception as e:
        yield {"type": "error", "content": str(e)}


async def save_generated_content(
    db: Session,
    salon_id: str,
    stylist_id: Optional[str],
    content_type: str,
    content: str,
    prompt_used: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
) -> Dict[str, Any]:
    """
    生成されたコンテンツをDBに保存

    Args:
        db: DBセッション
        salon_id: サロンID
        stylist_id: スタイリストID（オプション）
        content_type: コンテンツタイプ
        content: 生成されたコンテンツ
        prompt_used: 使用したプロンプト
        input_tokens: 入力トークン数
        output_tokens: 出力トークン数

    Returns:
        保存されたコンテンツ
    """
    char_count = count_characters(content, content_type)

    generated_content = GeneratedContent(
        salon_id=salon_id,
        stylist_id=stylist_id,
        content_type=content_type,
        content=content,
        char_count=char_count,
        prompt_used=prompt_used,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
    )

    db.add(generated_content)
    db.commit()
    db.refresh(generated_content)

    return generated_content.to_dict()


async def generate_and_save_content(
    db: Session,
    user_id: str,
    content_type: str,
    stylist_id: Optional[str] = None,
    additional_instructions: Optional[str] = None,
    blog_theme: Optional[str] = None,
    review_text: Optional[str] = None,
    consultation_text: Optional[str] = None,
) -> Dict[str, Any]:
    """
    コンテンツを生成して保存（非ストリーミング）

    Args:
        db: DBセッション
        user_id: ユーザーID
        content_type: コンテンツタイプ
        stylist_id: スタイリストID（オプション）
        additional_instructions: 追加指示（オプション）
        blog_theme: ブログテーマ（blog_articleの場合）
        review_text: お客様の口コミ文（review_replyの場合）
        consultation_text: 悩み・相談内容（consultationの場合）

    Returns:
        保存されたコンテンツ
    """
    # サロン情報を取得
    salon = await get_salon_by_user_id(db, user_id)
    if not salon:
        raise Exception("サロン情報が登録されていません")

    # スタイリスト情報を取得
    stylist = None
    if stylist_id:
        stylist = await get_stylist_by_id(db, stylist_id, salon["id"])
        if not stylist:
            raise Exception("スタイリストが見つかりません")

    # プロンプトを構築
    prompt = build_full_prompt(
        content_type=content_type,
        salon=salon,
        stylist=stylist,
        additional_instructions=additional_instructions,
        blog_theme=blog_theme,
        review_text=review_text,
        consultation_text=consultation_text,
    )

    # 生成
    content, usage_info = await generate_content(prompt)

    # 保存
    saved = await save_generated_content(
        db=db,
        salon_id=salon["id"],
        stylist_id=stylist_id,
        content_type=content_type,
        content=content,
        prompt_used=prompt,
        input_tokens=usage_info.get("input_tokens", 0),
        output_tokens=usage_info.get("output_tokens", 0),
    )

    return saved


async def modify_content_with_chat(
    db: Session,
    content_id: str,
    user_instruction: str,
) -> str:
    """
    チャットでコンテンツを修正

    Args:
        db: DBセッション
        content_id: コンテンツID
        user_instruction: ユーザーからの修正指示

    Returns:
        修正されたコンテンツ
    """
    # 元のコンテンツを取得
    original_content = db.query(GeneratedContent).filter(
        GeneratedContent.id == content_id
    ).first()

    if not original_content:
        raise Exception("コンテンツが見つかりません")

    # 修正用プロンプトを構築
    prompt = get_prompt_for_chat_modification(
        original_content=original_content.content,
        user_instruction=user_instruction,
        content_type=original_content.content_type,
    )

    # 生成
    modified_content, _usage_info = await generate_content(prompt)

    return modified_content
