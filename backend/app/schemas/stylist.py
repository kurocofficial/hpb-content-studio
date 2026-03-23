"""
スタイリスト関連のスキーマ
"""
from typing import Optional, List, Literal
from datetime import datetime
from pydantic import BaseModel, Field

# 共通の選択肢定数（csv_import.pyのバリデータと共有）
TONE_VALUES = ("casual", "formal", "friendly", "professional")
EMOJI_VALUES = ("none", "minimal", "moderate", "frequent")
SENTENCE_STYLE_VALUES = ("short", "medium", "long")
DIALECT_VALUES = ("標準語", "関西弁", "博多弁", "名古屋弁", "東北弁", "沖縄風")
FIRST_PERSON_VALUES = ("私", "わたし", "僕", "あたし", "自分")
CUSTOMER_CALL_VALUES = ("お客様", "ゲスト様", "お客さん")
SERVICE_STYLE_VALUES = ("おしゃべり好き", "落ち着いた空間重視", "提案型", "お任せ歓迎型")


class WritingStyle(BaseModel):
    """文体の好み"""
    tone: Literal["casual", "formal", "friendly", "professional"] = "friendly"
    emoji_usage: Literal["none", "minimal", "moderate", "frequent"] = "minimal"
    sentence_style: Literal["short", "medium", "long"] = "medium"


class LanguageStyle(BaseModel):
    """言葉づかい設定"""
    dialect: Optional[Literal["標準語", "関西弁", "博多弁", "名古屋弁", "東北弁", "沖縄風"]] = None
    first_person: Optional[Literal["私", "わたし", "僕", "あたし", "自分"]] = None
    customer_call: Optional[Literal["お客様", "ゲスト様", "お客さん"]] = None
    catchphrase: Optional[str] = Field(None, max_length=100, description="口癖（例: 〜なんですよね！）")


class Background(BaseModel):
    """バックグラウンド"""
    hobbies: Optional[str] = Field(None, max_length=200, description="趣味")
    motivation: Optional[str] = Field(None, max_length=300, description="美容師になった理由")
    motto: Optional[str] = Field(None, max_length=100, description="座右の銘")
    fashion_style: Optional[str] = Field(None, max_length=100, description="好きなファッション（例: ストリート, モード）")


class ServiceInfo(BaseModel):
    """接客スタイル"""
    target_demographic: Optional[str] = Field(None, max_length=200, description="得意な客層（例: 20代OL, ママ世代）")
    service_style: Optional[Literal["おしゃべり好き", "落ち着いた空間重視", "提案型", "お任せ歓迎型"]] = None
    counseling_approach: Optional[str] = Field(None, max_length=300, description="カウンセリングの特徴")


class StylistCreate(BaseModel):
    """スタイリスト作成リクエスト"""
    name: str = Field(..., min_length=1, max_length=50, description="スタイリスト名")
    role: Optional[str] = Field(None, max_length=50, description="役職（例: 店長、トップスタイリスト）")
    years_experience: Optional[int] = Field(None, ge=0, le=50, description="経験年数")
    specialties: List[str] = Field(default_factory=list, description="得意メニュー")
    style_features: List[str] = Field(default_factory=list, description="得意スタイル、こだわり")
    personality: Optional[str] = Field(None, max_length=500, description="性格・人柄")
    writing_style: Optional[WritingStyle] = Field(None, description="文体の好み")
    language_style: Optional[LanguageStyle] = Field(None, description="言葉づかい設定")
    background: Optional[Background] = Field(None, description="バックグラウンド")
    service_info: Optional[ServiceInfo] = Field(None, description="接客スタイル")


class StylistUpdate(BaseModel):
    """スタイリスト更新リクエスト"""
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    role: Optional[str] = Field(None, max_length=50)
    years_experience: Optional[int] = Field(None, ge=0, le=50)
    specialties: Optional[List[str]] = None
    style_features: Optional[List[str]] = None
    personality: Optional[str] = Field(None, max_length=500)
    writing_style: Optional[WritingStyle] = None
    language_style: Optional[LanguageStyle] = None
    background: Optional[Background] = None
    service_info: Optional[ServiceInfo] = None


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
    language_style: Optional[LanguageStyle] = None
    background: Optional[Background] = None
    service_info: Optional[ServiceInfo] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StylistListResponse(BaseModel):
    """スタイリスト一覧レスポンス"""
    items: List[StylistResponse]
    total: int
