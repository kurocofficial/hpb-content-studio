"""
コンテンツ関連のスキーマ
"""
from typing import Optional, List, Literal
from datetime import datetime
from pydantic import BaseModel, Field


ContentType = Literal[
    "salon_catch", "salon_intro", "stylist_profile", "blog_article",
    "review_reply", "consultation", "google_review_reply"
]


class GenerateRequest(BaseModel):
    """コンテンツ生成リクエスト"""
    content_type: ContentType
    stylist_id: Optional[str] = None
    additional_instructions: Optional[str] = Field(None, max_length=500)
    blog_theme: Optional[str] = Field(None, max_length=200, description="ブログのテーマ（blog_articleの場合）")
    review_text: Optional[str] = Field(None, max_length=2000, description="お客様の口コミ文（review_reply/google_review_replyの場合）")
    consultation_text: Optional[str] = Field(None, max_length=2000, description="悩み・相談内容（consultationの場合）")
    star_rating: Optional[int] = Field(None, ge=1, le=5, description="口コミの星評価（google_review_replyの場合）")


class GenerateResponse(BaseModel):
    """コンテンツ生成レスポンス"""
    id: str
    content: str
    content_type: ContentType
    char_count: int
    max_chars: int
    is_over_limit: bool
    created_at: datetime


class ContentResponse(BaseModel):
    """コンテンツレスポンス"""
    id: str
    salon_id: str
    stylist_id: Optional[str] = None
    content_type: ContentType
    content: str
    char_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ContentListResponse(BaseModel):
    """コンテンツ一覧レスポンス"""
    items: List[ContentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class UsageLimitResponse(BaseModel):
    """利用制限レスポンス"""
    allowed: bool
    plan: str
    limit: Optional[int] = None
    used: Optional[int] = None
    remaining: Optional[int] = None
    message: Optional[str] = None


class UsageSummaryResponse(BaseModel):
    """利用量サマリーレスポンス"""
    plan: str
    text_generation: dict
    blog_generation: dict
    image_generation: dict
