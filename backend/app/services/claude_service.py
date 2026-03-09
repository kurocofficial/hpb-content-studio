"""
Claude API連携サービス
テキスト生成のメインモデルとしてClaude 4.5 Haikuを使用
"""
import anthropic
from typing import AsyncGenerator, Optional
import asyncio

from app.config import get_settings

# Claude 4.5 Haiku モデルID
MODEL_ID = "claude-haiku-4-5-20251001"


def get_claude_client() -> anthropic.Anthropic:
    """Claudeクライアントを初期化"""
    settings = get_settings()
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


async def generate_content_stream(
    prompt: str,
    max_tokens: int = 2000,
) -> AsyncGenerator[str, None]:
    """
    ストリーミングでコンテンツを生成

    Args:
        prompt: プロンプト（システムプロンプト+コンテキストの結合文字列）
        max_tokens: 最大トークン数

    Yields:
        生成されたテキストのチャンク
    """
    try:
        client = get_claude_client()

        # 同期ストリーミングをasyncでラップ
        with client.messages.stream(
            model=MODEL_ID,
            max_tokens=max_tokens,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            for text in stream.text_stream:
                yield text
                # イベントループに制御を戻す
                await asyncio.sleep(0)

    except anthropic.APIError as e:
        raise Exception(f"Claude API エラー: {str(e)}")


async def generate_content(
    prompt: str,
    max_tokens: int = 2000,
) -> str:
    """
    コンテンツを一括生成（非ストリーミング）

    Args:
        prompt: プロンプト
        max_tokens: 最大トークン数

    Returns:
        生成されたテキスト
    """
    try:
        client = get_claude_client()

        message = client.messages.create(
            model=MODEL_ID,
            max_tokens=max_tokens,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}],
        )

        return message.content[0].text

    except anthropic.APIError as e:
        raise Exception(f"Claude API エラー: {str(e)}")


async def generate_chat_response(
    messages: list,
    system_prompt: Optional[str] = None,
    max_tokens: int = 2000,
) -> str:
    """
    チャット形式でコンテンツを生成

    Args:
        messages: チャット履歴 [{"role": "user"/"assistant", "content": "text"}]
        system_prompt: システムプロンプト
        max_tokens: 最大トークン数

    Returns:
        生成されたテキスト
    """
    try:
        client = get_claude_client()

        # Claude形式のメッセージに変換
        claude_messages = []
        for msg in messages:
            role = msg.get("role", "user")
            # Gemini形式("model")からClaude形式("assistant")に変換
            if role == "model":
                role = "assistant"
            content = msg.get("parts", [msg.get("content", "")])[0] if "parts" in msg else msg.get("content", "")
            claude_messages.append({"role": role, "content": content})

        kwargs = {
            "model": MODEL_ID,
            "max_tokens": max_tokens,
            "temperature": 0.7,
            "messages": claude_messages,
        }

        if system_prompt:
            kwargs["system"] = system_prompt

        message = client.messages.create(**kwargs)

        return message.content[0].text

    except anthropic.APIError as e:
        raise Exception(f"Claude API エラー: {str(e)}")
