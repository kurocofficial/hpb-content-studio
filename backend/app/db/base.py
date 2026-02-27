"""
SQLAlchemy Base and Mixins
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime
from sqlalchemy.orm import declarative_base

Base = declarative_base()


def generate_uuid() -> str:
    """UUIDを生成"""
    return str(uuid.uuid4())


class TimestampMixin:
    """created_at, updated_atを提供するMixin"""
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
