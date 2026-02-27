# HPB Content Studio

ホットペッパービューティー向けテキストコンテンツをAIで一括生成するWebアプリケーション。

## 概要

美容室の集客担当スタッフが、スタイリストの個性に合わせたブログ記事・紹介文・プロフィール等をAIで効率的に作成し、HPB管理画面（サロンボード）にコピー＆ペーストできるツールです。

## 主な機能

- **スタイリスト登録**: チャット形式でスタイリストの特徴・文体・好みをメタデータとして登録
- **テキスト生成**: サロン紹介文、スタイリストプロフィール、ブログ記事、スタイル説明文等をAI生成
- **チャット修正**: 生成したテキストをチャットで対話的に修正
- **ワンクリックコピー**: HPBの文字数制限に対応したコピペ最適化出力
- **AI画像生成（Pro）**: SNS・カウンセリング用途のAI画像生成（※HPB掲載不可）

## 技術スタック

- **Frontend**: React + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Python FastAPI
- **DB**: PostgreSQL (Supabase)
- **AI**: Gemini 2.0 Flash / Nanobanana
- **決済**: Stripe

## セットアップ

### 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)でプロジェクトを作成
2. `backend/migrations/001_initial_schema.sql` をSQLエディタで実行
3. プロジェクト設定からAPI URLとキーを取得

### 2. Backend セットアップ

```bash
cd backend

# 仮想環境を作成（推奨）
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存関係をインストール
pip install -r requirements.txt

# 環境変数を設定
cp .env.example .env
# .envを編集してSupabaseとGeminiのAPIキーを設定

# 開発サーバーを起動
uvicorn app.main:app --reload
```

### 3. Frontend セットアップ

```bash
cd frontend

# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.example .env
# .envを編集してSupabaseのURLとキーを設定

# 開発サーバーを起動
npm run dev
```

### 4. 動作確認

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/api/docs
- Health Check: http://localhost:8000/api/v1/health

## 環境変数

### Backend (.env)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
APP_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:8000
VITE_APP_ENV=development
```

## Phase 1 MVP 実装済み機能

- [x] ユーザー認証（Supabase Auth）
- [x] サロン情報登録・編集
- [x] スタイリスト管理（CRUD）
- [x] テキストコンテンツ生成（ストリーミング対応）
  - サロンキャッチ（45文字）
  - サロン紹介文（500文字）
  - スタイリストプロフィール（200文字）
  - ブログ記事（10,000文字）
- [x] チャットでの修正機能
- [x] HPB基準の文字数カウンター
- [x] コピーボタン
- [x] 利用量制限（Free: 月30回）
- [x] ダッシュボード
- [x] コンテンツ履歴

## ドキュメント

- [要件定義書](docs/requirements/01_requirements_v02.md)
- [技術設計書](docs/design/02_technical_design.md)
- [UI/UXデザイン仕様書](docs/design/03_ui_design_spec.md)
- [詳細機能仕様書](docs/specs/04_detailed_spec.md)

## ライセンス

Private
