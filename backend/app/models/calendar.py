"""
コンテンツカレンダーモデル
"""
from sqlalchemy import Column, String, Text, Date, ForeignKey
from sqlalchemy.orm import relationship

from app.db.base import Base, TimestampMixin, generate_uuid


class ContentCalendar(Base, TimestampMixin):
    """コンテンツカレンダーテーブル"""
    __tablename__ = "content_calendar"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    salon_id = Column(String(36), ForeignKey("salons.id"), nullable=False, index=True)
    stylist_id = Column(String(36), ForeignKey("stylists.id"), nullable=True, index=True)
    content_type = Column(String(50), nullable=False)
    scheduled_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, default="planned")  # planned / generated / published
    generated_content_id = Column(String(36), ForeignKey("generated_contents.id"), nullable=True)
    notes = Column(Text, nullable=True)

    # リレーション
    salon = relationship("Salon")
    stylist = relationship("Stylist")
    generated_content = relationship("GeneratedContent")

    def to_dict(self):
        """辞書に変換"""
        return {
            "id": str(self.id),
            "salon_id": str(self.salon_id),
            "stylist_id": str(self.stylist_id) if self.stylist_id else None,
            "content_type": self.content_type,
            "scheduled_date": self.scheduled_date.isoformat() if self.scheduled_date else None,
            "status": self.status,
            "generated_content_id": str(self.generated_content_id) if self.generated_content_id else None,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
