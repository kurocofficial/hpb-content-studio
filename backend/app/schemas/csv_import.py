"""
CSVインポート用バリデーションスキーマ
"""
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator

from app.schemas.stylist import (
    TONE_VALUES,
    EMOJI_VALUES,
    SENTENCE_STYLE_VALUES,
    DIALECT_VALUES,
    FIRST_PERSON_VALUES,
    CUSTOMER_CALL_VALUES,
    SERVICE_STYLE_VALUES,
)


class SalonCsvRow(BaseModel):
    """サロンCSV行バリデーション"""
    name: str = Field(..., min_length=1, max_length=100, description="サロン名")
    area: str = Field(..., min_length=1, max_length=100, description="エリア")
    concept: Optional[str] = Field(None, max_length=500, description="コンセプト")
    target_customer: Optional[str] = Field(None, max_length=200, description="ターゲット層")
    strength: Optional[str] = Field(None, max_length=500, description="強み・特徴")


def _validate_enum(v: Optional[str], field_name: str, valid: tuple, default: Optional[str] = None) -> Optional[str]:
    """共通のenum値バリデーション"""
    if v and v not in valid:
        raise ValueError(f"{field_name}は{'/'.join(valid)}のいずれかです")
    return v or default


def _collect_non_none(**fields: Optional[str]) -> Optional[dict]:
    """非Noneフィールドだけ集めた辞書を返す。全てNoneならNoneを返す"""
    data = {k: v for k, v in fields.items() if v}
    return data or None


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
    # language_style フィールド
    dialect: Optional[str] = Field(None, description="方言")
    first_person: Optional[str] = Field(None, description="一人称")
    customer_call: Optional[str] = Field(None, description="お客様の呼び方")
    catchphrase: Optional[str] = Field(None, max_length=100, description="口癖")
    # background フィールド
    hobbies: Optional[str] = Field(None, max_length=200, description="趣味")
    motivation: Optional[str] = Field(None, max_length=300, description="美容師になった理由")
    motto: Optional[str] = Field(None, max_length=100, description="座右の銘")
    fashion_style: Optional[str] = Field(None, max_length=100, description="好きなファッション")
    # service_info フィールド
    target_demographic: Optional[str] = Field(None, max_length=200, description="得意な客層")
    service_style: Optional[str] = Field(None, description="接客スタイル")
    counseling_approach: Optional[str] = Field(None, max_length=300, description="カウンセリングの特徴")

    @field_validator("writing_tone")
    @classmethod
    def validate_tone(cls, v):
        return _validate_enum(v, "writing_tone", TONE_VALUES, "friendly")

    @field_validator("writing_emoji")
    @classmethod
    def validate_emoji(cls, v):
        return _validate_enum(v, "writing_emoji", EMOJI_VALUES, "minimal")

    @field_validator("writing_sentence_style")
    @classmethod
    def validate_sentence_style(cls, v):
        return _validate_enum(v, "writing_sentence_style", SENTENCE_STYLE_VALUES, "medium")

    @field_validator("dialect")
    @classmethod
    def validate_dialect(cls, v):
        return _validate_enum(v, "dialect", DIALECT_VALUES)

    @field_validator("first_person")
    @classmethod
    def validate_first_person(cls, v):
        return _validate_enum(v, "first_person", FIRST_PERSON_VALUES)

    @field_validator("customer_call")
    @classmethod
    def validate_customer_call(cls, v):
        return _validate_enum(v, "customer_call", CUSTOMER_CALL_VALUES)

    @field_validator("service_style")
    @classmethod
    def validate_service_style(cls, v):
        return _validate_enum(v, "service_style", SERVICE_STYLE_VALUES)

    def _parse_semicolon_list(self, value: Optional[str]) -> List[str]:
        """セミコロン区切りの文字列をリストに変換"""
        if not value:
            return []
        return [s.strip() for s in value.split(";") if s.strip()]

    def parse_specialties(self) -> List[str]:
        return self._parse_semicolon_list(self.specialties)

    def parse_style_features(self) -> List[str]:
        return self._parse_semicolon_list(self.style_features)

    def to_writing_style(self) -> dict:
        """WritingStyle辞書を生成"""
        return {
            "tone": self.writing_tone or "friendly",
            "emoji_usage": self.writing_emoji or "minimal",
            "sentence_style": self.writing_sentence_style or "medium",
        }

    def to_language_style(self) -> Optional[dict]:
        return _collect_non_none(
            dialect=self.dialect,
            first_person=self.first_person,
            customer_call=self.customer_call,
            catchphrase=self.catchphrase,
        )

    def to_background(self) -> Optional[dict]:
        return _collect_non_none(
            hobbies=self.hobbies,
            motivation=self.motivation,
            motto=self.motto,
            fashion_style=self.fashion_style,
        )

    def to_service_info(self) -> Optional[dict]:
        return _collect_non_none(
            target_demographic=self.target_demographic,
            service_style=self.service_style,
            counseling_approach=self.counseling_approach,
        )
