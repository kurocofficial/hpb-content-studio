"""
Salonモデル
"""
from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.db.base import Base, TimestampMixin, generate_uuid


class Salon(Base, TimestampMixin):
    """サロンテーブル"""
    __tablename__ = "salons"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), nullable=False, index=True)
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    area = Column(String(100), nullable=False)
    concept = Column(Text, nullable=True)
    target_customer = Column(String(200), nullable=True)
    strength = Column(Text, nullable=True)

    # リレーション
    stylists = relationship("Stylist", back_populates="salon", cascade="all, delete-orphan")
    generated_contents = relationship("GeneratedContent", back_populates="salon", cascade="all, delete-orphan")
    organization = relationship("Organization", back_populates="salons")

    def to_dict(self):
        """辞書に変換"""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "organization_id": str(self.organization_id) if self.organization_id else None,
            "name": self.name,
            "area": self.area,
            "concept": self.concept,
            "target_customer": self.target_customer,
            "strength": self.strength,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
