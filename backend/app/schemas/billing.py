"""
決済・サブスクリプション関連のスキーマ
"""
from typing import Optional, Literal
from pydantic import BaseModel


class CreateCheckoutRequest(BaseModel):
    """Checkout Session作成リクエスト"""
    price_id: Optional[str] = None
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class CreateCheckoutResponse(BaseModel):
    """Checkout Session作成レスポンス"""
    checkout_url: str
    session_id: str


class CreatePortalRequest(BaseModel):
    """Customer Portal作成リクエスト"""
    return_url: Optional[str] = None


class CreatePortalResponse(BaseModel):
    """Customer Portal作成レスポンス"""
    portal_url: str


class SubscriptionResponse(BaseModel):
    """サブスクリプション情報レスポンス"""
    plan: str
    status: Literal["active", "trialing", "past_due", "canceled"]
    stripe_customer_id: Optional[str] = None
    current_period_start: Optional[str] = None
    current_period_end: Optional[str] = None
    trial_end: Optional[str] = None
    cancel_at_period_end: bool = False


class WebhookResponse(BaseModel):
    """Webhook受信レスポンス"""
    received: bool
