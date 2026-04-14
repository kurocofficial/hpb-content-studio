"""
サロン関連のスキーマ
"""
from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel, Field


class SalonCreate(BaseModel):
    """サロン作成リクエスト"""
    name: str = Field(..., min_length=1, max_length=100, description="サロン名")
    area: str = Field(..., min_length=1, max_length=100, description="エリア（例: 渋谷、表参道）")
    concept: Optional[str] = Field(None, max_length=500, description="サロンコンセプト")
    target_customer: Optional[str] = Field(None, max_length=200, description="ターゲット層")
    strength: Optional[str] = Field(None, max_length=500, description="強み・特徴")
    rules: Optional[List[Dict[str, str]]] = Field(None, description="Pro/Team限定: 生成ルール（[{tag, value}]）")


class SalonUpdate(BaseModel):
    """サロン更新リクエスト"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    area: Optional[str] = Field(None, min_length=1, max_length=100)
    concept: Optional[str] = Field(None, max_length=500)
    target_customer: Optional[str] = Field(None, max_length=200)
    strength: Optional[str] = Field(None, max_length=500)
    rules: Optional[List[Dict[str, str]]] = Field(None, description="Pro/Team限定: 生成ルール（[{tag, value}]）")


class SalonResponse(BaseModel):
    """サロンレスポンス"""
    id: str
    user_id: str
    organization_id: Optional[str] = None
    name: str
    area: str
    concept: Optional[str] = None
    target_customer: Optional[str] = None
    strength: Optional[str] = None
    rules: Optional[List[Dict[str, str]]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
