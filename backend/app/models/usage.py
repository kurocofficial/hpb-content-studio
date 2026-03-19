"""
UsageTracking, Subscriptionモデル
"""
from sqlalchemy import Column, String, Integer, BigInteger, DateTime, ForeignKey

from app.db.base import Base, TimestampMixin, generate_uuid


class UsageTracking(Base, TimestampMixin):
    """利用量追跡テーブル"""
    __tablename__ = "usage_tracking"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), nullable=False, index=True)
    year_month = Column(String(7), nullable=False)  # "YYYY-MM"
    text_generation_count = Column(Integer, nullable=False, default=0)
    blog_generation_count = Column(Integer, nullable=False, default=0)
    image_generation_count = Column(Integer, nullable=False, default=0)
    total_input_tokens = Column(BigInteger, nullable=False, default=0)
    total_output_tokens = Column(BigInteger, nullable=False, default=0)

    def to_dict(self):
        """辞書に変換"""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "year_month": self.year_month,
            "text_generation_count": self.text_generation_count,
            "blog_generation_count": self.blog_generation_count,
            "image_generation_count": self.image_generation_count,
            "total_input_tokens": self.total_input_tokens,
            "total_output_tokens": self.total_output_tokens,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Subscription(Base, TimestampMixin):
    """サブスクリプションテーブル"""
    __tablename__ = "subscriptions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), nullable=False, unique=True, index=True)
    plan = Column(String(20), nullable=False, default="free")  # "free", "pro", "team"
    status = Column(String(20), nullable=False, default="active")  # "active", "canceled", etc.
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=True)
    stripe_customer_id = Column(String(100), nullable=True)
    stripe_subscription_id = Column(String(100), nullable=True)
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    trial_end = Column(DateTime, nullable=True)

    def to_dict(self):
        """辞書に変換"""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "plan": self.plan,
            "status": self.status,
            "organization_id": str(self.organization_id) if self.organization_id else None,
            "stripe_customer_id": self.stripe_customer_id,
            "stripe_subscription_id": self.stripe_subscription_id,
            "current_period_start": self.current_period_start.isoformat() if self.current_period_start else None,
            "current_period_end": self.current_period_end.isoformat() if self.current_period_end else None,
            "trial_end": self.trial_end.isoformat() if self.trial_end else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
