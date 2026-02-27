"""
認証関連のスキーマ
"""
from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    """サインアップリクエスト"""
    email: EmailStr
    password: str = Field(..., min_length=6, description="パスワード（6文字以上）")


class LoginRequest(BaseModel):
    """ログインリクエスト"""
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    """認証レスポンス"""
    user_id: str
    email: str
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """ユーザー情報レスポンス"""
    id: str
    email: str
    created_at: str


class MessageResponse(BaseModel):
    """メッセージレスポンス"""
    message: str
