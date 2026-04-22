"""
SQLAlchemy Session and Engine
"""
import os
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.config import get_settings

settings = get_settings()

# DATABASE_URLが設定されていればPostgreSQL、なければSQLite
_database_url = os.getenv("DATABASE_URL", "")
_use_postgres = bool(_database_url and _database_url.startswith("postgresql"))

if _use_postgres:
    engine = create_engine(
        _database_url,
        echo=settings.app_env == "development",
    )
else:
    db_dir = os.path.dirname(settings.sqlite_url.replace("sqlite:///", ""))
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
    engine = create_engine(
        settings.sqlite_url,
        connect_args={"check_same_thread": False},
        echo=settings.app_env == "development",
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """DBセッションを取得する依存関係"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """データベースを初期化（テーブル作成）"""
    from app.db.base import Base
    # 全モデルをインポートしてBaseに登録
    from app.models import salon, stylist, content, chat, usage, organization, calendar  # noqa
    Base.metadata.create_all(bind=engine)
