"""
組織関連のスキーマ
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class OrganizationCreate(BaseModel):
    """組織作成リクエスト"""
    name: str = Field(..., min_length=1, max_length=200, description="組織名")
    contact_email: Optional[str] = Field(None, max_length=255, description="連絡先メール")
    contact_phone: Optional[str] = Field(None, max_length=20, description="連絡先電話番号")
    notes: Optional[str] = Field(None, description="備考")


class OrganizationUpdate(BaseModel):
    """組織更新リクエスト"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = None


class OrganizationResponse(BaseModel):
    """組織レスポンス"""
    id: str
    name: str
    owner_user_id: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    notes: Optional[str] = None
    max_salons: Optional[int] = None
    max_stylists_per_salon: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrgMemberCreate(BaseModel):
    """メンバー追加リクエスト"""
    email: str = Field(..., description="追加するユーザーのメールアドレス")
    role: str = Field("member", description="ロール（admin/member）")


class OrgMemberResponse(BaseModel):
    """メンバーレスポンス"""
    id: str
    organization_id: str
    user_id: str
    role: str
    email: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrgMemberListResponse(BaseModel):
    """メンバー一覧レスポンス"""
    items: List[OrgMemberResponse]
    total: int


class CsvImportErrorItem(BaseModel):
    """CSVインポートエラー項目"""
    row: int
    field: str
    message: str


class CsvImportJobResponse(BaseModel):
    """CSVインポートジョブレスポンス"""
    id: str
    organization_id: str
    user_id: str
    import_type: str
    file_name: str
    status: str
    total_rows: int
    success_count: int
    error_count: int
    error_details: List[CsvImportErrorItem] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CsvImportJobListResponse(BaseModel):
    """インポートジョブ一覧レスポンス"""
    items: List[CsvImportJobResponse]
    total: int
