"""
ChatSession, ChatMessageモデル
"""
from sqlalchemy import Column, String, Text, Integer, ForeignKey
from sqlalchemy.orm import relationship

from app.db.base import Base, TimestampMixin, generate_uuid


class ChatSession(Base, TimestampMixin):
    """チャットセッションテーブル"""
    __tablename__ = "chat_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    content_id = Column(String(36), ForeignKey("generated_contents.id"), nullable=False, unique=True, index=True)
    turn_count = Column(Integer, nullable=False, default=0)

    # リレーション
    content = relationship("GeneratedContent", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

    def to_dict(self):
        """辞書に変換"""
        return {
            "id": self.id,
            "content_id": self.content_id,
            "turn_count": self.turn_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class ChatMessage(Base, TimestampMixin):
    """チャットメッセージテーブル"""
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("chat_sessions.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)

    # リレーション
    session = relationship("ChatSession", back_populates="messages")

    def to_dict(self):
        """辞書に変換"""
        return {
            "id": self.id,
            "session_id": self.session_id,
            "role": self.role,
            "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
