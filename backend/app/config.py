"""
環境変数管理モジュール
"""
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """アプリケーション設定"""

    # App
    app_env: str = "development"
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"

    # Security
    secret_key: str = "development-secret-key-change-in-production"

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # Gemini
    gemini_api_key: str = ""

    # Anthropic Claude API
    anthropic_api_key: str = ""

    # Nanobanana (Phase 2)
    nanobanana_api_key: str = ""

    # Stripe (Phase 2)
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_pro_price_id: str = ""

    # 利用制限設定
    free_monthly_generations: int = 30
    free_monthly_blogs: int = 5
    free_chat_turns_per_session: int = 3
    free_max_stylists_per_salon: int = 3
    pro_max_stylists_per_salon: int = 20
    pro_chat_turns_per_session: int = 20
    team_chat_turns_per_session: int = 20

    # CSV一括登録設定
    csv_max_file_size_mb: int = 5
    csv_max_rows: int = 1000

    # DB Mode（"sqlite" or "supabase"）
    db_mode: str = "sqlite"
    sqlite_url: str = "sqlite:///./data/dev.db"

    # 開発用モック認証
    mock_auth: bool = True
    mock_user_id: str = "dev-user-00000000-0000-0000-0000-000000000001"
    mock_user_email: str = "dev@example.com"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """設定のシングルトンインスタンスを取得"""
    return Settings()
