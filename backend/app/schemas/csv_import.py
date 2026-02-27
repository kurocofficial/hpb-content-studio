"""
CSVインポート用バリデーションスキーマ
"""
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator


class SalonCsvRow(BaseModel):
    """サロンCSV行バリデーション"""
    name: str = Field(..., min_length=1, max_length=100, description="サロン名")
    area: str = Field(..., min_length=1, max_length=100, description="エリア")
    concept: Optional[str] = Field(None, max_length=500, description="コンセプト")
    target_customer: Optional[str] = Field(None, max_length=200, description="ターゲット層")
    strength: Optional[str] = Field(None, max_length=500, description="強み・特徴")


class StylistCsvRow(BaseModel):
    """スタイリストCSV行バリデーション"""
    salon_name: str = Field(..., min_length=1, description="所属サロン名")
    name: str = Field(..., min_length=1, max_length=100, description="スタイリスト名")
    role: Optional[str] = Field(None, max_length=50, description="役職")
    years_experience: Optional[int] = Field(None, ge=0, le=50, description="経験年数")
    specialties: Optional[str] = Field(None, description="得意技術（;区切り）")
    style_features: Optional[str] = Field(None, description="スタイル特徴（;区切り）")
    personality: Optional[str] = Field(None, max_length=200, description="性格・人柄")
    writing_tone: Optional[str] = Field("friendly", description="文体トーン")
    writing_emoji: Optional[str] = Field("minimal", description="絵文字使用度")
    writing_sentence_style: Optional[str] = Field("medium", description="文の長さ")

    @field_validator("writing_tone")
    @classmethod
    def validate_tone(cls, v):
        if v and v not in ("casual", "formal", "friendly", "professional"):
            raise ValueError("writing_toneはcasual/formal/friendly/professionalのいずれかです")
        return v or "friendly"

    @field_validator("writing_emoji")
    @classmethod
    def validate_emoji(cls, v):
        if v and v not in ("none", "minimal", "moderate", "frequent"):
            raise ValueError("writing_emojiはnone/minimal/moderate/frequentのいずれかです")
        return v or "minimal"

    @field_validator("writing_sentence_style")
    @classmethod
    def validate_sentence_style(cls, v):
        if v and v not in ("short", "medium", "long"):
            raise ValueError("writing_sentence_styleはshort/medium/longのいずれかです")
        return v or "medium"

    def parse_specialties(self) -> List[str]:
        """セミコロン区切りの得意技術をリストに変換"""
        if not self.specialties:
            return []
        return [s.strip() for s in self.specialties.split(";") if s.strip()]

    def parse_style_features(self) -> List[str]:
        """セミコロン区切りのスタイル特徴をリストに変換"""
        if not self.style_features:
            return []
        return [s.strip() for s in self.style_features.split(";") if s.strip()]

    def to_writing_style(self) -> dict:
        """WritingStyle辞書を生成"""
        return {
            "tone": self.writing_tone or "friendly",
            "emoji_usage": self.writing_emoji or "minimal",
            "sentence_style": self.writing_sentence_style or "medium",
        }
