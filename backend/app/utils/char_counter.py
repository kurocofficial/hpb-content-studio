"""
文字数カウントユーティリティ
HPB基準: 全角=1文字、半角=0.5文字
標準: len(text)ベース
"""
import math

from app.utils.hpb_constraints import CONTENT_TYPES


def count_hpb_characters(text: str) -> int:
    """
    HPB基準の文字数をカウント

    Args:
        text: カウント対象のテキスト

    Returns:
        HPB基準の文字数（切り上げ）
    """
    if not text:
        return 0

    count = 0.0
    for char in text:
        # ASCII文字（半角）は0.5文字
        if ord(char) <= 127:
            count += 0.5
        else:
            # 全角文字は1文字
            count += 1.0

    return math.ceil(count)


def is_within_limit(text: str, max_chars: int) -> bool:
    """
    テキストが文字数制限内かチェック

    Args:
        text: チェック対象のテキスト
        max_chars: 最大文字数（HPB基準）

    Returns:
        制限内ならTrue
    """
    return count_hpb_characters(text) <= max_chars


def get_char_info(text: str, max_chars: int) -> dict:
    """
    文字数情報を取得

    Args:
        text: チェック対象のテキスト
        max_chars: 最大文字数（HPB基準）

    Returns:
        文字数情報の辞書
    """
    current = count_hpb_characters(text)
    return {
        "current": current,
        "max": max_chars,
        "remaining": max(0, max_chars - current),
        "is_over": current > max_chars,
        "percentage": min(100, (current / max_chars * 100)) if max_chars > 0 else 0
    }


def count_standard_characters(text: str) -> int:
    """
    標準の文字数カウント（len(text)ベース）

    Args:
        text: カウント対象のテキスト

    Returns:
        文字数
    """
    if not text:
        return 0
    return len(text)


def count_characters(text: str, content_type: str) -> int:
    """
    コンテンツタイプに応じた文字数カウント

    Args:
        text: カウント対象のテキスト
        content_type: コンテンツタイプ

    Returns:
        カウントモードに応じた文字数
    """
    config = CONTENT_TYPES.get(content_type, {})
    mode = config.get("char_count_mode", "hpb")

    if mode == "standard":
        return count_standard_characters(text)
    return count_hpb_characters(text)


# HPBコンテンツタイプ別の文字数上限
HPB_CHAR_LIMITS = {
    "salon_catch": 45,
    "salon_intro": 500,
    "stylist_profile": 200,
    "blog_article": 10000,
    "menu_description": 200,
    "coupon_description": 100,
    "review_reply": 500,
    "consultation": 2000,
    "google_review_reply": 500,
}


def get_char_limit(content_type: str) -> int:
    """
    コンテンツタイプの文字数上限を取得

    Args:
        content_type: コンテンツタイプ

    Returns:
        文字数上限
    """
    return HPB_CHAR_LIMITS.get(content_type, 500)
