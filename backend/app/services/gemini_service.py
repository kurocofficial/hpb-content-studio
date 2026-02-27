"""
Gemini API連携サービス
"""
import google.generativeai as genai
from typing import AsyncGenerator, Optional
import asyncio

from app.config import get_settings


def get_gemini_client():
    """Geminiクライアントを初期化"""
    settings = get_settings()
    genai.configure(api_key=settings.gemini_api_key)
    return genai.GenerativeModel("gemini-2.0-flash")


async def generate_content_stream(
    prompt: str,
    max_tokens: int = 2000,
) -> AsyncGenerator[str, None]:
    """
    ストリーミングでコンテンツを生成

    Args:
        prompt: プロンプト
        max_tokens: 最大トークン数

    Yields:
        生成されたテキストのチャンク
    """
    try:
        model = get_gemini_client()

        generation_config = genai.GenerationConfig(
            max_output_tokens=max_tokens,
            temperature=0.7,
        )

        # 同期的なストリーミング生成をラップ
        response = model.generate_content(
            prompt,
            generation_config=generation_config,
            stream=True,
        )

        for chunk in response:
            if chunk.text:
                yield chunk.text
            # イベントループに制御を戻す
            await asyncio.sleep(0)

    except Exception as e:
        raise Exception(f"Gemini API エラー: {str(e)}")


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
        model = get_gemini_client()

        generation_config = genai.GenerationConfig(
            max_output_tokens=max_tokens,
            temperature=0.7,
        )

        response = model.generate_content(
            prompt,
            generation_config=generation_config,
        )

        return response.text

    except Exception as e:
        raise Exception(f"Gemini API エラー: {str(e)}")


async def generate_chat_response(
    messages: list,
    system_prompt: Optional[str] = None,
    max_tokens: int = 2000,
) -> str:
    """
    チャット形式でコンテンツを生成

    Args:
        messages: チャット履歴 [{"role": "user"/"model", "parts": ["text"]}]
        system_prompt: システムプロンプト
        max_tokens: 最大トークン数

    Returns:
        生成されたテキスト
    """
    try:
        model = get_gemini_client()

        # システムプロンプトがある場合は最初に追加
        if system_prompt:
            chat_history = [{"role": "user", "parts": [system_prompt]}]
            chat_history.extend(messages)
        else:
            chat_history = messages

        chat = model.start_chat(history=chat_history[:-1] if len(chat_history) > 1 else [])

        generation_config = genai.GenerationConfig(
            max_output_tokens=max_tokens,
            temperature=0.7,
        )

        # 最後のメッセージを送信
        last_message = chat_history[-1]["parts"][0] if chat_history else ""
        response = chat.send_message(
            last_message,
            generation_config=generation_config,
        )

        return response.text

    except Exception as e:
        raise Exception(f"Gemini API エラー: {str(e)}")
