"""
HPB制約・ガイドライン
"""
from typing import Dict, List


# コンテンツタイプの定義
CONTENT_TYPES = {
    "salon_catch": {
        "label": "サロンキャッチ",
        "platform": "hpb",
        "char_count_mode": "hpb",
        "description": "HPBトップに表示される短いキャッチコピー",
        "max_chars": 45,
        "guidelines": [
            "45文字以内で簡潔に",
            "サロンの特徴が一目でわかるように",
            "ターゲット層に響く言葉を選ぶ",
        ]
    },
    "salon_intro": {
        "label": "サロン紹介文",
        "platform": "hpb",
        "char_count_mode": "hpb",
        "description": "サロンの魅力を伝える紹介文",
        "max_chars": 500,
        "guidelines": [
            "500文字以内",
            "サロンのコンセプト・特徴を明確に",
            "来店を促す内容に",
        ]
    },
    "stylist_profile": {
        "label": "スタイリストプロフィール",
        "platform": "hpb",
        "char_count_mode": "hpb",
        "description": "スタイリストの個性が伝わる自己紹介",
        "max_chars": 200,
        "guidelines": [
            "200文字以内",
            "得意なスタイルや施術を記載",
            "人柄が伝わる内容に",
        ]
    },
    "blog_article": {
        "label": "ブログ記事",
        "platform": "hpb",
        "char_count_mode": "hpb",
        "description": "季節のスタイル提案やサロン情報を発信",
        "max_chars": 10000,
        "guidelines": [
            "読みやすい段落構成",
            "具体的なスタイル提案や情報を含める",
            "来店につながるCTAを入れる",
        ]
    },
    "review_reply": {
        "label": "口コミ返信",
        "platform": "hpb",
        "char_count_mode": "hpb",
        "description": "お客様の口コミに対する返信文",
        "max_chars": 500,
        "guidelines": [
            "500文字以内",
            "お客様の口コミ内容に具体的に言及",
            "感謝の気持ちを丁寧に表現",
            "次回来店への期待を込める",
        ]
    },
    "consultation": {
        "label": "悩み相談",
        "platform": "hpb",
        "char_count_mode": "hpb",
        "description": "スタイリストの悩みに対するAIアドバイス",
        "max_chars": 2000,
        "guidelines": [
            "実用的で具体的なアドバイス",
            "美容業界のプロとしての視点",
            "スタイリストの得意分野を活かした提案",
        ]
    },
    "google_review_reply": {
        "label": "Google口コミ返信",
        "platform": "google",
        "char_count_mode": "standard",
        "description": "Googleマップのお客様口コミに対する返信文",
        "max_chars": 500,
        "guidelines": [
            "500文字程度を推奨（Googleの実際の上限は4096文字）",
            "Google検索に公開されるためSEO・公共性を意識",
            "お客様の口コミ内容に具体的に言及",
            "感謝の気持ちを丁寧に表現",
            "低評価の場合は誠実にお詫びし改善姿勢を示す",
        ],
    },
}


# 禁止表現リスト（HPB規約に基づく）
PROHIBITED_EXPRESSIONS = [
    # 誇大表現
    "日本一", "No.1", "ナンバーワン", "最高", "最強", "完璧",
    # 医療表現
    "治療", "治る", "医療", "効果が保証",
    # 価格表現の不適切な使用
    "激安", "破格", "0円",
]


# 推奨表現
RECOMMENDED_EXPRESSIONS = {
    "salon_catch": [
        "あなたらしさを引き出す",
        "理想のスタイルを叶える",
        "髪質改善",
        "完全個室",
        "マンツーマン",
    ],
    "stylist_profile": [
        "カウンセリング重視",
        "お客様に寄り添う",
        "丁寧な施術",
    ],
    "review_reply": [
        "ご来店ありがとうございます",
        "嬉しいお言葉",
        "またのご来店をお待ちしております",
    ],
    "google_review_reply": [
        "ご来店いただきありがとうございます",
        "口コミをお寄せいただき",
        "またのお越しをお待ちしております",
        "貴重なご意見をありがとうございます",
    ],
}


def check_prohibited_expressions(text: str) -> List[str]:
    """
    禁止表現をチェック

    Args:
        text: チェック対象のテキスト

    Returns:
        見つかった禁止表現のリスト
    """
    found = []
    for expression in PROHIBITED_EXPRESSIONS:
        if expression in text:
            found.append(expression)
    return found


def get_content_type_config(content_type: str) -> Dict:
    """
    コンテンツタイプの設定を取得

    Args:
        content_type: コンテンツタイプ

    Returns:
        コンテンツタイプの設定辞書
    """
    return CONTENT_TYPES.get(content_type, {
        "label": content_type,
        "description": "",
        "max_chars": 500,
        "guidelines": []
    })


# AI画像に関する警告
AI_IMAGE_WARNING = """
【重要】AI生成画像はホットペッパービューティーへの掲載が禁止されています。
SNSやカウンセリング資料としてのみご使用ください。
"""
