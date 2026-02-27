"""
スタイリスト関連のスキーマ
"""
from typing import Optional, List, Literal
from datetime import datetime
from pydantic import BaseModel, Field


class WritingStyle(BaseModel):
    """文体の好み"""
    tone: Literal["casual", "formal", "friendly", "professional"] = "friendly"
    emoji_usage: Literal["none", "minimal", "moderate", "frequent"] = "minimal"
    sentence_style: Literal["short", "medium", "long"] = "medium"


class StylistCreate(BaseModel):
    """スタイリスト作成リクエスト"""
    name: str = Field(..., min_length=1, max_length=50, description="スタイリスト名")
    role: Optional[str] = Field(None, max_length=50, description="役職（例: 店長、トップスタイリスト）")
    years_experience: Optional[int] = Field(None, ge=0, le=50, description="経験年数")
    specialties: List[str] = Field(default_factory=list, description="得意メニュー")
    style_features: List[str] = Field(default_factory=list, description="得意スタイル、こだわり")
    personality: Optional[str] = Field(None, max_length=500, description="性格・人柄")
    writing_style: Optional[WritingStyle] = Field(None, description="文体の好み")


class StylistUpdate(BaseModel):
    """スタイリスト更新リクエスト"""
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    role: Optional[str] = Field(None, max_length=50)
    years_experience: Optional[int] = Field(None, ge=0, le=50)
    specialties: Optional[List[str]] = None
    style_features: Optional[List[str]] = None
    personality: Optional[str] = Field(None, max_length=500)
    writing_style: Optional[WritingStyle] = None


class StylistResponse(BaseModel):
    """スタイリストレスポンス"""
    id: str
    salon_id: str
    name: str
    role: Optional[str] = None
    years_experience: Optional[int] = None
    specialties: List[str] = []
    style_features: List[str] = []
    personality: Optional[str] = None
    writing_style: Optional[WritingStyle] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StylistListResponse(BaseModel):
    """スタイリスト一覧レスポンス"""
    items: List[StylistResponse]
    total: int
