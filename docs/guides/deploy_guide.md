# デプロイガイド — HPB Content Studio

## 構成概要

| サービス | ホスティング | リポジトリパス |
|---------|------------|--------------|
| LP（ランディングページ） | Netlify | `lp/index.html` |
| フロントエンド（Reactアプリ） | Vercel | `frontend/` |
| バックエンド（FastAPI） | Railway or Render | `backend/` |
| DB・認証・Storage | Supabase | — |

## フロントエンド（Vercel）

### 初回セットアップ

1. [Vercel](https://vercel.com) にGitHubリポジトリを接続
2. プロジェクト設定:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

3. 環境変数を設定（Settings → Environment Variables）:

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `VITE_SUPABASE_URL` | SupabaseプロジェクトURL | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon Key | `eyJ...` |
| `VITE_API_URL` | バックエンドURL | `https://api.example.com` |

### デプロイ

- `main` ブランチにPushすると**自動デプロイ**される
- PRを作成するとプレビューデプロイが生成される

### SPA設定

`frontend/vercel.json` でSPAリライトを設定済み。React Routerのクライアントサイドルーティングが正しく動作する。

### ビルドエラー対応（過去の事例）

| エラー | 原因 | 対処 |
|--------|------|------|
| `import.meta.env` 型エラー | `vite-env.d.ts` がない | `frontend/src/vite-env.d.ts` を追加 |
| 未使用import/変数 | TypeScript strict mode | 該当コードを削除 |
| 404（ページ遷移時） | SPAリライト未設定 | `vercel.json` を追加 |

## LP（Netlify）

### 初回セットアップ

1. [Netlify](https://netlify.com) にGitHubリポジトリを接続
2. プロジェクト設定:
   - **Base Directory**: `lp`
   - **Publish Directory**: `lp`
   - ビルドコマンドは不要（静的HTML）

### LP → フロントエンド連携

LP内の「無料で始める」「ログイン」ボタンはVercelのフロントエンドURLにリンク:
- 新規登録: `https://hpb-content-studio.vercel.app/signup`
- ログイン: `https://hpb-content-studio.vercel.app/login`

※ リンクは `target="_blank"` で新しいタブで開く設定

### デプロイ

- `main` ブランチにPushすると自動デプロイされる

## バックエンド（Railway / Render）

> ※ Phase 1 ではまだ未デプロイ。以下は今後のセットアップ手順。

### 環境変数

| 変数名 | 説明 |
|--------|------|
| `SUPABASE_URL` | SupabaseプロジェクトURL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key |
| `ANTHROPIC_API_KEY` | Claude API キー |
| `APP_ENV` | `production` |
| `FRONTEND_URL` | Vercel のデプロイURL |

### デプロイコマンド

```bash
# Dockerfile を使用
docker build -t hpb-backend ./backend
docker run -p 8000:8000 hpb-backend
```

## 本番URL一覧

| サービス | URL |
|---------|-----|
| LP | Netlify URL（要設定） |
| フロントエンド | https://hpb-content-studio.vercel.app |
| バックエンドAPI | 未デプロイ |
| Supabase | ダッシュボードから確認 |
