"""
プロンプトエンジン - コンテンツ生成の中核
スタイリストのメタデータを自動的にプロンプトに合成する
"""
from typing import Optional, Dict, Any
from app.utils.hpb_constraints import CONTENT_TYPES, PROHIBITED_EXPRESSIONS


def build_system_prompt(content_type: str, stylist: Optional[Dict[str, Any]] = None) -> str:
    """
    コンテンツタイプ別のシステムプロンプトを構築

    Args:
        content_type: コンテンツタイプ
        stylist: スタイリスト情報（方言指示に使用）

    Returns:
        システムプロンプト
    """
    # 方言指示を構築
    dialect_instruction = _build_dialect_instruction(stylist)

    # 口コミ返信専用のシステムプロンプト
    if content_type == "review_reply":
        return f"""あなたはホットペッパービューティー（HPB）の口コミ返信のプロフェッショナルです。
お客様からの口コミに対して、丁寧で心のこもった返信文を作成します。

## ルール
- 最大500文字（HPB基準）
- お客様の口コミ内容に具体的に触れる
- 感謝の気持ちを自然に表現
- スタイリストの人柄・専門性が伝わるように
- 次回来店への期待を込める
- 禁止表現は使用しない
- 完成した返信文のみを出力{dialect_instruction}"""

    # Google口コミ返信専用のシステムプロンプト
    if content_type == "google_review_reply":
        return f"""あなたはGoogleビジネスプロフィールの口コミ返信のプロフェッショナルです。
Googleマップに投稿されたお客様の口コミに対して、丁寧で誠実な返信文を作成します。

## ルール
- 500文字程度を推奨（Googleの実際の上限は4096文字）
- Google検索に公開されるため、SEOと公共性を意識した文面にする
- お客様の口コミ内容に具体的に触れる
- 感謝の気持ちを丁寧に表現
- 高評価（★4-5）の場合: 具体的な感謝と再来店への期待を込める
- 低評価（★1-2）の場合: 誠実にお詫びし、具体的な改善姿勢を示す
- 中間評価（★3）の場合: 感謝を述べつつ改善点にも真摯に向き合う
- サロン名や地域名を自然に含めるとSEO効果あり
- 完成した返信文のみを出力{dialect_instruction}"""

    # 悩み相談専用のシステムプロンプト
    if content_type == "consultation":
        return f"""あなたは美容業界に精通したアドバイザーです。
スタイリストの悩みや相談に対して、プロフェッショナルな視点から
実用的で具体的なアドバイスを提供します。

## ルール
- スタイリストの得意分野・経験を踏まえた回答
- 具体的で実践可能なアドバイス
- 共感的で前向きなトーン
- 必要に応じて段階的なステップで説明
- 完成した回答のみを出力{dialect_instruction}"""

    # 既存のHPBコンテンツ用プロンプト
    config = CONTENT_TYPES.get(content_type, {})
    max_chars = config.get("max_chars", 500)
    guidelines = config.get("guidelines", [])
    label = config.get("label", content_type)

    guidelines_text = "\n".join([f"- {g}" for g in guidelines])

    return f"""あなたはホットペッパービューティー（HPB）のコンテンツ作成のプロフェッショナルです。
美容室の集客担当者を支援し、スタイリストの個性が伝わる魅力的なテキストを作成します。

## 作成するコンテンツ: {label}

## 文字数制限
- 最大{max_chars}文字（HPB基準: 全角1文字、半角0.5文字）
- 必ず制限内に収めてください

## ガイドライン
{guidelines_text}

## 禁止事項
- 以下の誇大表現は使用禁止: {', '.join(PROHIBITED_EXPRESSIONS[:5])}など
- 医療効果を示唆する表現は禁止
- 根拠のない「No.1」「最高」などの表現は禁止

## 出力形式
- 完成したテキストのみを出力してください
- 説明や補足は不要です
- 指定された文字数を厳守してください
{dialect_instruction}"""


def _build_dialect_instruction(stylist: Optional[Dict[str, Any]]) -> str:
    """方言指示を構築（システムプロンプトレベル）"""
    if not stylist:
        return ""
    language_style = stylist.get("language_style")
    if not language_style:
        return ""
    dialect = language_style.get("dialect")
    if not dialect or dialect == "標準語":
        return ""
    return f"\n\n## 言葉づかいの指示\n自然な{dialect}のニュアンスを適度に取り入れてください。全文を方言にする必要はなく、語尾や相槌に{dialect}らしさを感じられる程度に留めてください。"


def build_salon_context(salon: Dict[str, Any]) -> str:
    """
    サロン情報からコンテキストを構築

    Args:
        salon: サロン情報の辞書

    Returns:
        サロンコンテキスト文字列
    """
    parts = []

    if salon.get("name"):
        parts.append(f"サロン名: {salon['name']}")

    if salon.get("area"):
        parts.append(f"エリア: {salon['area']}")

    if salon.get("concept"):
        parts.append(f"コンセプト: {salon['concept']}")

    if salon.get("target_customer"):
        parts.append(f"ターゲット層: {salon['target_customer']}")

    if salon.get("strength"):
        parts.append(f"強み・特徴: {salon['strength']}")

    if not parts:
        return ""

    return "## サロン情報\n" + "\n".join(parts)


def build_stylist_context(stylist: Optional[Dict[str, Any]]) -> str:
    """
    スタイリスト情報からコンテキストを構築

    Args:
        stylist: スタイリスト情報の辞書（Noneの場合もある）

    Returns:
        スタイリストコンテキスト文字列
    """
    if not stylist:
        return ""

    parts = []

    if stylist.get("name"):
        parts.append(f"スタイリスト名: {stylist['name']}")

    if stylist.get("role"):
        parts.append(f"役職: {stylist['role']}")

    if stylist.get("years_experience"):
        parts.append(f"経験年数: {stylist['years_experience']}年")

    if stylist.get("specialties"):
        specialties = stylist["specialties"]
        if isinstance(specialties, list) and specialties:
            parts.append(f"得意メニュー: {', '.join(specialties)}")

    if stylist.get("style_features"):
        features = stylist["style_features"]
        if isinstance(features, list) and features:
            parts.append(f"得意スタイル・こだわり: {', '.join(features)}")

    if stylist.get("personality"):
        parts.append(f"人柄・性格: {stylist['personality']}")

    # 文体の好み
    writing_style = stylist.get("writing_style")
    if writing_style:
        style_parts = []
        tone_map = {
            "casual": "カジュアル",
            "formal": "フォーマル",
            "friendly": "フレンドリー",
            "professional": "プロフェッショナル"
        }
        emoji_map = {
            "none": "使用しない",
            "minimal": "控えめ",
            "moderate": "適度",
            "frequent": "多め"
        }
        sentence_map = {
            "short": "短め",
            "medium": "標準",
            "long": "長め"
        }

        if writing_style.get("tone"):
            style_parts.append(f"トーン: {tone_map.get(writing_style['tone'], writing_style['tone'])}")
        if writing_style.get("emoji_usage"):
            style_parts.append(f"絵文字: {emoji_map.get(writing_style['emoji_usage'], writing_style['emoji_usage'])}")
        if writing_style.get("sentence_style"):
            style_parts.append(f"文の長さ: {sentence_map.get(writing_style['sentence_style'], writing_style['sentence_style'])}")

        if style_parts:
            parts.append(f"文体の好み: {', '.join(style_parts)}")

    # 言葉づかい
    language_style = stylist.get("language_style")
    if language_style:
        lang_parts = []
        if language_style.get("dialect"):
            lang_parts.append(f"話し方の特徴: {language_style['dialect']}")
        if language_style.get("first_person"):
            lang_parts.append(f"一人称: {language_style['first_person']}")
        if language_style.get("customer_call"):
            lang_parts.append(f"お客様の呼び方: {language_style['customer_call']}")
        if language_style.get("catchphrase"):
            lang_parts.append(f"口癖: {language_style['catchphrase']}")
        if lang_parts:
            parts.append("言葉づかい: " + "、".join(lang_parts))

    # バックグラウンド
    background = stylist.get("background")
    if background:
        bg_parts = []
        if background.get("hobbies"):
            bg_parts.append(f"趣味: {background['hobbies']}")
        if background.get("motivation"):
            bg_parts.append(f"美容師になった理由: {background['motivation']}")
        if background.get("motto"):
            bg_parts.append(f"座右の銘: {background['motto']}")
        if background.get("fashion_style"):
            bg_parts.append(f"好きなファッション: {background['fashion_style']}")
        if bg_parts:
            parts.append("バックグラウンド: " + "、".join(bg_parts))

    # 接客スタイル
    service_info = stylist.get("service_info")
    if service_info:
        svc_parts = []
        if service_info.get("target_demographic"):
            svc_parts.append(f"得意な客層: {service_info['target_demographic']}")
        if service_info.get("service_style"):
            svc_parts.append(f"接客スタイル: {service_info['service_style']}")
        if service_info.get("counseling_approach"):
            svc_parts.append(f"カウンセリングの特徴: {service_info['counseling_approach']}")
        if svc_parts:
            parts.append("接客情報: " + "、".join(svc_parts))

    if not parts:
        return ""

    return "## スタイリスト情報\n" + "\n".join(parts)


def build_full_prompt(
    content_type: str,
    salon: Dict[str, Any],
    stylist: Optional[Dict[str, Any]] = None,
    additional_instructions: Optional[str] = None,
    blog_theme: Optional[str] = None,
    review_text: Optional[str] = None,
    consultation_text: Optional[str] = None,
    star_rating: Optional[int] = None,
) -> str:
    """
    完全なプロンプトを構築

    Args:
        content_type: コンテンツタイプ
        salon: サロン情報
        stylist: スタイリスト情報（オプション）
        additional_instructions: 追加指示（オプション）
        blog_theme: ブログのテーマ（blog_articleの場合）
        review_text: お客様の口コミ文（review_reply/google_review_replyの場合）
        consultation_text: 悩み・相談内容（consultationの場合）
        star_rating: 口コミの星評価（google_review_replyの場合、1-5）

    Returns:
        完全なプロンプト文字列
    """
    parts = []

    # システムプロンプト（方言指示はstylistから取得）
    parts.append(build_system_prompt(content_type, stylist))

    # サロンコンテキスト
    salon_context = build_salon_context(salon)
    if salon_context:
        parts.append(salon_context)

    # スタイリストコンテキスト
    stylist_context = build_stylist_context(stylist)
    if stylist_context:
        parts.append(stylist_context)

    # ブログテーマ（blog_articleの場合）
    if content_type == "blog_article" and blog_theme:
        parts.append(f"## ブログテーマ\n{blog_theme}")

    # 口コミ原文（review_replyの場合）
    if content_type == "review_reply" and review_text:
        parts.append(f"## お客様の口コミ\n{review_text}")

    # Google口コミ原文（google_review_replyの場合）
    if content_type == "google_review_reply" and review_text:
        star_display = ""
        if star_rating:
            star_display = f"\n評価: {'★' * star_rating}{'☆' * (5 - star_rating)}（{star_rating}/5）"
        parts.append(f"## Googleの口コミ{star_display}\n{review_text}")

    # 悩み相談内容（consultationの場合）
    if content_type == "consultation" and consultation_text:
        parts.append(f"## 相談内容\n{consultation_text}")

    # 追加指示
    if additional_instructions:
        parts.append(f"## 追加指示\n{additional_instructions}")

    # 生成リクエスト
    config = CONTENT_TYPES.get(content_type, {})
    max_chars = config.get("max_chars", 500)
    label = config.get("label", content_type)

    parts.append(f"""## リクエスト
上記の情報をもとに、{label}を作成してください。
文字数は{max_chars}文字以内に収めてください。
完成したテキストのみを出力してください。""")

    return "\n\n".join(parts)


def get_prompt_for_chat_modification(
    original_content: str,
    user_instruction: str,
    content_type: str,
) -> str:
    """
    チャット修正用のプロンプトを構築

    Args:
        original_content: 元のコンテンツ
        user_instruction: ユーザーからの修正指示
        content_type: コンテンツタイプ

    Returns:
        修正用プロンプト
    """
    config = CONTENT_TYPES.get(content_type, {})
    max_chars = config.get("max_chars", 500)

    # プラットフォームに応じた冒頭テキスト
    if content_type == "google_review_reply":
        role_text = "Google口コミ返信の修正アシスタント"
    else:
        role_text = "ホットペッパービューティーのコンテンツ修正アシスタント"

    return f"""あなたは{role_text}です。

## 現在のテキスト
{original_content}

## 修正指示
{user_instruction}

## ルール
- 文字数は{max_chars}文字以内に収めてください
- 修正後のテキストのみを出力してください
- 説明や補足は不要です

## 出力
修正後のテキストを出力してください。"""
