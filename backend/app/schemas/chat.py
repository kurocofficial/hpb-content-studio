"""
チャット関連のスキーマ
"""
from typing import List, Literal, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ChatSessionCreate(BaseModel):
    """チャットセッション作成リクエスト"""
    content_id: str


class ChatSessionResponse(BaseModel):
    """チャットセッションレスポンス"""
    id: str
    content_id: str
    turn_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChatMessageCreate(BaseModel):
    """チャットメッセージ作成リクエスト"""
    message: str = Field(..., min_length=1, max_length=1000)


class ChatMessageResponse(BaseModel):
    """チャットメッセージレスポンス"""
    id: str
    session_id: str
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatHistoryResponse(BaseModel):
    """チャット履歴レスポンス"""
    session: ChatSessionResponse
    messages: List[ChatMessageResponse]
    current_content: str
    can_continue: bool
    turns_remaining: Optional[int] = None
