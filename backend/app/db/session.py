"""
SQLAlchemy Session and Engine
"""
import os
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.config import get_settings

settings = get_settings()

# SQLiteの場合はdataディレクトリを作成
if settings.db_mode == "sqlite":
    db_dir = os.path.dirname(settings.sqlite_url.replace("sqlite:///", ""))
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

# エンジン設定
if settings.db_mode == "sqlite":
    engine = create_engine(
        settings.sqlite_url,
        connect_args={"check_same_thread": False},
        echo=settings.app_env == "development",
    )
else:
    # Supabase PostgreSQL（将来用）
    # DATABASE_URL形式: postgresql://user:password@host:port/dbname
    engine = create_engine(
        os.getenv("DATABASE_URL", ""),
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
