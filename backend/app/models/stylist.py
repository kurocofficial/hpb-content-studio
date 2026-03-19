"""
Stylistモデル
"""
import json
from sqlalchemy import Column, String, Text, Integer, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.db.base import Base, TimestampMixin, generate_uuid


class Stylist(Base, TimestampMixin):
    """スタイリストテーブル"""
    __tablename__ = "stylists"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    salon_id = Column(String(36), ForeignKey("salons.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    role = Column(String(50), nullable=True)  # スタイリスト、アシスタント等
    years_experience = Column(Integer, nullable=True)
    specialties = Column(JSON, nullable=True)  # 得意なスタイル（リスト）
    style_features = Column(JSON, nullable=True)  # スタイルの特徴（リスト）
    personality = Column(Text, nullable=True)  # 人柄・雰囲気
    writing_style = Column(JSON, nullable=True)  # 文体設定

    # リレーション
    salon = relationship("Salon", back_populates="stylists")
    generated_contents = relationship("GeneratedContent", back_populates="stylist")

    def to_dict(self):
        """辞書に変換"""
        return {
            "id": str(self.id),
            "salon_id": str(self.salon_id),
            "name": self.name,
            "role": self.role,
            "years_experience": self.years_experience,
            "specialties": self.specialties,
            "style_features": self.style_features,
            "personality": self.personality,
            "writing_style": self.writing_style,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
