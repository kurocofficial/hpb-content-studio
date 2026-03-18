"""
HPB Content Studio - FastAPI Backend
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーション起動時/終了時の処理"""
    # 起動時: SQLiteモードならDB初期化
    if settings.db_mode == "sqlite":
        from app.db.session import init_db
        init_db()
        print("SQLite database initialized")
    yield
    # 終了時の処理（必要に応じて追加）

app = FastAPI(
    title="HPB Content Studio API",
    description="ホットペッパービューティー向けコンテンツ生成API",
    version="1.0.0",
    docs_url="/api/docs" if settings.app_env == "development" else None,
    redoc_url="/api/redoc" if settings.app_env == "development" else None,
    lifespan=lifespan,
)

# CORS設定
cors_origins = [
    settings.frontend_url,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:3000",
    "https://hpb-content-studio.vercel.app",
]
# 重複と空文字を除去
cors_origins = list(set(o for o in cors_origins if o))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://hpb-content-studio(-[a-z0-9]+)?\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/health")
async def health_check():
    """ヘルスチェックエンドポイント"""
    return {
        "status": "healthy",
        "app": "HPB Content Studio",
        "version": "1.0.0"
    }


@app.get("/")
async def root():
    """ルートエンドポイント"""
    return {
        "message": "HPB Content Studio API",
        "docs": "/api/docs"
    }


# ルーターの登録
from app.routers import auth, salons, stylists, generate, contents, usage, chat, organizations, csv_import, billing
app.include_router(auth.router, prefix="/api/v1/auth", tags=["認証"])
app.include_router(salons.router, prefix="/api/v1/salons", tags=["サロン"])
app.include_router(stylists.router, prefix="/api/v1/stylists", tags=["スタイリスト"])
app.include_router(generate.router, prefix="/api/v1/generate", tags=["コンテンツ生成"])
app.include_router(contents.router, prefix="/api/v1/contents", tags=["コンテンツ管理"])
app.include_router(usage.router, prefix="/api/v1/usage", tags=["利用量"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["チャット修正"])
app.include_router(organizations.router, prefix="/api/v1/organizations", tags=["組織管理"])
app.include_router(csv_import.router, prefix="/api/v1/organizations", tags=["CSV一括登録"])
app.include_router(billing.router, prefix="/api/v1/billing", tags=["決済"])
# CSVテンプレート用（組織IDなしのパス）
app.include_router(csv_import.router, prefix="/api/v1/import", tags=["CSV一括登録"], include_in_schema=False)
