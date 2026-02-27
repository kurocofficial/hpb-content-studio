"""
GeneratedContentモデル
"""
from sqlalchemy import Column, String, Text, Integer, ForeignKey
from sqlalchemy.orm import relationship

from app.db.base import Base, TimestampMixin, generate_uuid


class GeneratedContent(Base, TimestampMixin):
    """生成コンテンツテーブル"""
    __tablename__ = "generated_contents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    salon_id = Column(String(36), ForeignKey("salons.id"), nullable=False, index=True)
    stylist_id = Column(String(36), ForeignKey("stylists.id"), nullable=True, index=True)
    content_type = Column(String(50), nullable=False)  # salon_catch, salon_intro, stylist_profile, blog_article
    content = Column(Text, nullable=False)
    char_count = Column(Integer, nullable=False, default=0)
    prompt_used = Column(Text, nullable=True)  # 生成時に使用したプロンプト

    # リレーション
    salon = relationship("Salon", back_populates="generated_contents")
    stylist = relationship("Stylist", back_populates="generated_contents")
    chat_sessions = relationship("ChatSession", back_populates="content", cascade="all, delete-orphan")

    def to_dict(self):
        """辞書に変換"""
        return {
            "id": self.id,
            "salon_id": self.salon_id,
            "stylist_id": self.stylist_id,
            "content_type": self.content_type,
            "content": self.content,
            "char_count": self.char_count,
            "prompt_used": self.prompt_used,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
