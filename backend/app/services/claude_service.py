"""
Claude API連携サービス
テキスト生成のメインモデルとしてClaude 4.5 Haikuを使用
"""
import math
import anthropic
from typing import AsyncGenerator, Dict, Optional, Tuple
import asyncio

from app.config import get_settings

MAX_TOKENS_CAP = 16000


def compute_max_tokens(target_char_count: int) -> int:
    """
    目標文字数からmax_tokensを動的算出。
    日本語全角1文字 ≈ 1〜1.5 tokens、2.5倍 + バッファ300
    """
    return min(MAX_TOKENS_CAP, math.ceil(target_char_count * 2.5) + 300)

# Claude 4.5 Haiku モデルID
MODEL_ID = "claude-haiku-4-5-20251001"


_claude_client: Optional[anthropic.Anthropic] = None


def get_claude_client() -> anthropic.Anthropic:
    """Claudeクライアントを取得（シングルトン）"""
    global _claude_client
    if _claude_client is None:
        settings = get_settings()
        _claude_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _claude_client


async def generate_content_stream(
    prompt: str,
    max_tokens: int = 2000,
    temperature: float = 0.7,
    system: Optional[str] = None,
) -> AsyncGenerator[Dict, None]:
    """
    ストリーミングでコンテンツを生成

    Args:
        prompt: ユーザーメッセージ
        max_tokens: 最大トークン数
        temperature: 生成の温度パラメータ（0.0-1.0）
        system: システムプロンプト（指定時はsystem parameterとして送信）

    Yields:
        {"type": "text", "content": str} or {"type": "usage", "input_tokens": int, "output_tokens": int}
    """
    try:
        client = get_claude_client()

        kwargs = dict(
            model=MODEL_ID,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[{"role": "user", "content": prompt}],
        )
        if system:
            kwargs["system"] = system

        # 同期ストリーミングをasyncでラップ
        with client.messages.stream(**kwargs) as stream:
            for text in stream.text_stream:
                yield {"type": "text", "content": text}
                # イベントループに制御を戻す
                await asyncio.sleep(0)

            # ストリーム終了後にusage情報を取得
            final_message = stream.get_final_message()
            yield {
                "type": "usage",
                "input_tokens": final_message.usage.input_tokens,
                "output_tokens": final_message.usage.output_tokens,
            }

    except anthropic.APIError as e:
        raise Exception(f"Claude API エラー: {str(e)}")


async def generate_content(
    prompt: str,
    max_tokens: int = 2000,
    temperature: float = 0.7,
    system: Optional[str] = None,
) -> Tuple[str, Dict[str, int]]:
    """
    コンテンツを一括生成（非ストリーミング）

    Args:
        prompt: ユーザーメッセージ
        max_tokens: 最大トークン数
        temperature: 生成の温度パラメータ（0.0-1.0）
        system: システムプロンプト（指定時はsystem parameterとして送信）

    Returns:
        (生成されたテキスト, {"input_tokens": N, "output_tokens": N})
    """
    try:
        client = get_claude_client()

        kwargs = dict(
            model=MODEL_ID,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[{"role": "user", "content": prompt}],
        )
        if system:
            kwargs["system"] = system

        message = client.messages.create(**kwargs)

        usage_info = {
            "input_tokens": message.usage.input_tokens,
            "output_tokens": message.usage.output_tokens,
        }

        return message.content[0].text, usage_info

    except anthropic.APIError as e:
        raise Exception(f"Claude API エラー: {str(e)}")


async def generate_chat_response(
    messages: list,
    system_prompt: Optional[str] = None,
    max_tokens: int = 2000,
) -> Tuple[str, Dict[str, int]]:
    """
    チャット形式でコンテンツを生成

    Args:
        messages: チャット履歴 [{"role": "user"/"assistant", "content": "text"}]
        system_prompt: システムプロンプト
        max_tokens: 最大トークン数

    Returns:
        (生成されたテキスト, {"input_tokens": N, "output_tokens": N})
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

        usage_info = {
            "input_tokens": message.usage.input_tokens,
            "output_tokens": message.usage.output_tokens,
        }

        return message.content[0].text, usage_info

    except anthropic.APIError as e:
        raise Exception(f"Claude API エラー: {str(e)}")
