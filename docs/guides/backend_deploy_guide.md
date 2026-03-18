# バックエンドデプロイガイド — HPB Content Studio

## 構成概要

| コンポーネント | サービス | 備考 |
|--------------|---------|------|
| API サーバー | Railway or Render | FastAPI + Uvicorn |
| データベース | Supabase (PostgreSQL) | RLS でマルチテナント分離 |
| 認証 | Supabase Auth | JWT ベース |
| AI テキスト生成 | Anthropic Claude 4.5 Haiku | ストリーミング対応 |
| 決済（Phase 2） | Stripe | Checkout + Billing Portal |

---

## Step 1: Supabase プロジェクトセットアップ

### 1-1. プロジェクト作成

1. [supabase.com](https://supabase.com) にログイン
2. 「New Project」でプロジェクトを作成
   - **Name**: `hpb-content-studio`
   - **Database Password**: 強力なパスワードを設定（後で使う）
   - **Region**: Northeast Asia (Tokyo) — `ap-northeast-1`
3. プロジェクト作成後、以下をメモ:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon key**: `eyJ...`（Settings → API）
   - **service_role key**: `eyJ...`（Settings → API）
   - **Database URL**: `postgresql://postgres.[ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`（画面上部の「Connect」ボタン → Transaction pooler の URI）

### 1-2. データベースマイグレーション

Supabase ダッシュボード → **SQL Editor** で、以下の順番に実行:

```
1. backend/migrations/001_initial_schema.sql
2. backend/migrations/002_google_review_reply.sql
3. backend/migrations/003_team_plan.sql
```

> **注意**: 必ずこの順番で実行すること。002 は 001 のテーブルに依存し、003 は salons / subscriptions テーブルを ALTER する。

### 1-3. 認証設定

Supabase ダッシュボード → **Authentication** → **Settings**:

- **Site URL**: `https://hpb-content-studio.vercel.app`（フロントエンドURL）
- **Redirect URLs**: `https://hpb-content-studio.vercel.app/**`
- **Email Auth**: 有効（デフォルト）
- **Confirm email**: 本番では有効にする（開発中は無効でもOK）

### 1-4. 動作確認

SQL Editor で以下を実行して、テーブルが正しく作成されたか確認:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

期待されるテーブル一覧:
- `salons`
- `stylists`
- `generated_contents`
- `chat_sessions`
- `chat_messages`
- `subscriptions`
- `usage_tracking`
- `prompt_templates`
- `organizations`
- `organization_members`
- `csv_import_jobs`

---

## Step 2: バックエンド環境変数の設定

### 本番用 `.env` ファイル

```env
# App
APP_ENV=production
FRONTEND_URL=https://hpb-content-studio.vercel.app
BACKEND_URL=https://[your-backend-url]

# Security
SECRET_KEY=[ランダムな長い文字列を生成して設定]

# Database
DB_MODE=supabase
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Authentication
MOCK_AUTH=false

# Claude AI
ANTHROPIC_API_KEY=sk-ant-api03-...

# Stripe (Phase 2 — 未設定でもAPI起動可能)
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_PUBLISHABLE_KEY=pk_live_...
# STRIPE_WEBHOOK_SECRET=whsec_...
# STRIPE_PRO_PRICE_ID=price_...
```

### SECRET_KEY の生成方法

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

---

## Step 3: Dockerfile の作成

`backend/Dockerfile` を作成:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 依存関係のインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードのコピー
COPY . .

# ポート公開
EXPOSE 8000

# 起動コマンド
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Step 4: Railway でデプロイ

### 4-1. Railway プロジェクト作成

1. [railway.app](https://railway.app) にGitHubでログイン
2. 「New Project」→「Deploy from GitHub repo」
3. リポジトリ `hpb-content-studio` を選択
4. **Root Directory** を `backend` に設定

### 4-2. 環境変数の設定

Railway ダッシュボード → Variables で Step 2 の環境変数を全て設定。

**重要**: Railway は `PORT` 環境変数を自動提供するので、起動コマンドを以下に変更:

```
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### 4-3. デプロイ設定

- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Railway は Dockerfile があれば自動検出するので、Dockerfile ベースでもOK。

### 4-4. カスタムドメイン（任意）

Railway Settings → Domains で公開ドメインを取得。デフォルトは `*.up.railway.app`。

---

## Step 4（代替）: Render でデプロイ

### Render プロジェクト作成

1. [render.com](https://render.com) にGitHubでログイン
2. 「New」→「Web Service」
3. リポジトリを接続
4. 設定:
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

5. Environment で Step 2 の環境変数を設定

---

## Step 5: CORS 設定の更新

デプロイ後、`backend/app/main.py` の CORS `allow_origins` にバックエンドの本番URLは不要だが、フロントエンドのURLが含まれていることを確認:

```python
allow_origins=[
    settings.frontend_url,  # ← .env の FRONTEND_URL が使われる
    "http://localhost:5173",  # ← 開発用（本番でも残してOK）
    ...
]
```

`FRONTEND_URL` を正しく設定していれば対応済み。

---

## Step 6: フロントエンド側の接続設定

### Vercel 環境変数の追加・更新

Vercel ダッシュボード → Settings → Environment Variables:

| 変数名 | 値 |
|--------|-----|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...`（anon key） |
| `VITE_API_URL` | `https://[backend-url]`（Railway/RenderのURL） |

> **注意**: `VITE_MOCK_AUTH` は設定しない（= 本番Supabase認証を使用）

設定後、Vercel で再デプロイ（Deployments → Redeploy）。

---

## Step 7: 動作確認

### 7-1. ヘルスチェック

```bash
curl https://[backend-url]/api/v1/health
```

期待レスポンス:
```json
{"status": "healthy", "app": "HPB Content Studio", "version": "1.0.0"}
```

### 7-2. E2E 確認チェックリスト

- [ ] ヘルスチェック OK
- [ ] フロントエンド LP が表示される
- [ ] 新規ユーザー登録（signup）ができる
- [ ] ログインできる
- [ ] サロン情報を登録できる
- [ ] スタイリストを追加できる
- [ ] テキスト生成（Claude API）が動作する
- [ ] チャット修正が動作する
- [ ] コンテンツ履歴が表示される
- [ ] ログアウトできる

---

## トラブルシューティング

### よくある問題

| 症状 | 原因 | 対処 |
|------|------|------|
| 401 Unauthorized | `MOCK_AUTH=false` だが Supabase キーが未設定 | 環境変数を確認 |
| CORS エラー | `FRONTEND_URL` が Vercel URL と不一致 | `.env` を修正して再デプロイ |
| DB 接続エラー | `DATABASE_URL` が間違っている | Supabase の Connection string を再確認 |
| テキスト生成エラー | `ANTHROPIC_API_KEY` 未設定 or 無効 | Anthropic コンソールでキーを確認 |
| SSE ストリーミングが切れる | Railway/Render のタイムアウト | タイムアウト設定を延長（60s → 300s） |
| `prompt_templates` が空 | マイグレーション 002 未実行 | SQL Editor で 002 を実行 |

### ログの確認

- **Railway**: ダッシュボード → Deployments → Logs
- **Render**: ダッシュボード → Service → Logs
- **Supabase**: ダッシュボード → Logs → API / Auth

---

## 本番運用チェックリスト

- [ ] `APP_ENV=production`（Swagger UIが無効化される）
- [ ] `MOCK_AUTH=false`（本番認証を使用）
- [ ] `DB_MODE=supabase`（PostgreSQLを使用）
- [ ] `SECRET_KEY` がランダムな長い文字列
- [ ] Supabase の Email 確認が有効
- [ ] RLS ポリシーが全テーブルで有効
- [ ] CORS に本番フロントエンドURLが含まれている
- [ ] Sentry を有効化（任意）
