# CLAUDE.md — HPB Content Studio

## プロジェクト概要

ホットペッパービューティー（HPB）向けテキストコンテンツをAIで一括生成するWebアプリ。美容室の集客担当スタッフが、スタイリストの個性に合わせたブログ記事・紹介文・プロフィール等を効率的に作成できる。

**プロダクトビジョン**: 「ブラウザのタブひとつで、HPBの文章運用がすべて完結する世界」

## ⚠️ 最重要制約: HPB規約

- **AI生成画像はHPBに掲載禁止**（2024年2月〜リクルート公式発表）
- AI画像機能はSNS・カウンセリング用途に限定し、HPB掲載不可の警告を常時表示すること
- AIテキストは明確な禁止規定なしだが、「AI下書き→人が編集」を推奨するUIにすること

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Frontend | React 18 + TypeScript + Vite |
| UI | TailwindCSS + shadcn/ui |
| 状態管理 | Zustand |
| Backend | Python FastAPI |
| DB | PostgreSQL (Supabase) |
| 認証 | Supabase Auth |
| 画像Storage | Supabase Storage |
| AI（テキスト） | Claude 4.5 Haiku (Anthropic) |
| AI（画像） | Nanobanana 2 (Gemini 3.1 Flash Image Preview) |
| 決済 | Stripe (Checkout + Billing) |
| Frontend Hosting | Vercel |
| Backend Hosting | Railway or Render |
| エラー監視 | Sentry |

## ディレクトリ構成

```
hpb-content-studio/
├── CLAUDE.md              ← このファイル
├── README.md
├── docs/
│   ├── requirements/
│   │   └── 01_requirements_v02.md    # 要件定義書
│   ├── design/
│   │   ├── 02_technical_design.md    # 技術設計書（DB/API/アーキテクチャ）
│   │   └── 03_ui_design_spec.md      # UI/UXデザイン仕様書
│   └── specs/
│       └── 04_detailed_spec.md       # 詳細機能仕様書
├── frontend/                          # React アプリ
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui
│   │   │   ├── layout/              # Header, Sidebar, Footer
│   │   │   ├── dashboard/
│   │   │   ├── stylist/
│   │   │   ├── generator/
│   │   │   ├── chat/
│   │   │   ├── preview/
│   │   │   └── billing/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── stores/                   # Zustand stores
│   │   ├── lib/                      # supabase.ts, api.ts, stripe.ts
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
└── backend/                           # FastAPI アプリ
    ├── app/
    │   ├── main.py
    │   ├── config.py
    │   ├── dependencies.py
    │   ├── routers/
    │   │   ├── auth.py
    │   │   ├── salons.py
    │   │   ├── stylists.py
    │   │   ├── generate.py
    │   │   ├── chat.py
    │   │   ├── contents.py
    │   │   ├── billing.py
    │   │   └── usage.py
    │   ├── services/
    │   │   ├── gemini_service.py
    │   │   ├── nanobanana_service.py
    │   │   ├── prompt_engine.py
    │   │   ├── content_service.py
    │   │   ├── stripe_service.py
    │   │   └── usage_service.py
    │   ├── models/
    │   ├── schemas/
    │   └── utils/
    │       ├── hpb_constraints.py
    │       └── char_counter.py
    ├── tests/
    ├── requirements.txt
    ├── Dockerfile
    └── .env.example
```

## 開発フェーズ

### 現在: Phase 1 — MVP（〜4月リリース）

**スコープ:**
- ユーザー認証（Supabase Auth: メール+パスワード）
- サロン・スタイリスト登録（フォーム形式）
- テキスト生成 4種: サロンキャッチ、サロン紹介文、スタイリストプロフィール、ブログ記事
- チャット修正機能（基本）
- コピーボタン付き出力画面 + HPB文字数カウンター
- 利用量制限（Freeプラン: 月30回）
- ダッシュボード + コンテンツ履歴

**Phase 1で実装しないもの:**
- AI画像生成（Nanobanana）
- 一括生成
- Stripe決済
- オンボーディングチャット
- 口コミ返信・クーポン説明文・メニュー説明文
- CSV/Excelエクスポート

### Phase 2（6〜7月）
オンボーディングチャット、AI画像、一括生成、Stripe、口コミ返信、エクスポート

### Phase 3（8〜9月）
UI改善、βテスト、LP、利用規約、チュートリアル

### ローンチ（10月）

## 主要なDB設計

DB設計の詳細は `docs/design/02_technical_design.md` を参照。主要テーブル:

- `users` — Supabase Auth連携
- `salons` — サロン情報
- `stylists` — スタイリスト + メタデータ（JSONB）
- `generated_contents` — 生成コンテンツ + 使用プロンプト保存
- `chat_sessions` — チャット修正履歴
- `subscriptions` — Stripe連携サブスク状態
- `usage_tracking` — 月間利用量
- `prompt_templates` — プロンプトテンプレート（DB管理）

**RLS（Row Level Security）を必ず設定すること。** マルチテナントのデータ分離はRLSで担保する。

## プロンプトエンジンの仕組み

コンテンツ生成の中核。スタイリストのメタデータを自動的にプロンプトに合成する。

```
[システムプロンプト（content_type別、DBから取得）]
  + [サロン情報]
  + [スタイリストメタデータ（specialties, style_features, writing_style）]
  + [HPB制約（文字数上限、禁止表現）]
  + [ユーザーの追加指示]
  → Claude 4.5 Haiku API（ストリーミング）
```

- テンプレートはDBの`prompt_templates`テーブルで管理
- 生成時のプロンプトは`generated_contents.prompt_used`に保存（再現性担保）
- 文字数カウントはHPB基準の全角カウント（`utils/char_counter.py`）

## コーディング規約

### 全般
- 言語: TypeScript（Frontend）、Python 3.11+（Backend）
- コメントは日本語OK
- 変数名・関数名は英語
- エラーメッセージのユーザー表示は日本語

### Frontend
- コンポーネントはFunction Component + Hooks
- 状態管理はZustand（Contextは使わない）
- APIクライアントは`src/lib/api.ts`に集約
- ページコンポーネントは`src/pages/`、UIパーツは`src/components/`
- shadcn/uiコンポーネントは`src/components/ui/`にそのまま配置

### Backend
- FastAPIのルーターは機能単位で分割（`routers/`）
- ビジネスロジックは`services/`に集約（ルーターは薄く）
- Pydanticスキーマは`schemas/`に定義
- 環境変数は`config.py`で一元管理
- テキスト生成のClaude API呼び出しは`services/claude_service.py`に集約し、他サービスは直接呼ばない
- 画像生成のGemini API呼び出しは`services/gemini_service.py`に集約（Phase 2）

### テスト
- Backend: pytest
- Frontend: Vitest + React Testing Library（Phase 3以降で本格導入）

## 環境変数

```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Claude AI（テキスト生成メイン）
ANTHROPIC_API_KEY=

# Gemini（画像生成用）
GEMINI_API_KEY=

# Nanobanana 2（Phase 2 画像生成）
NANOBANANA_API_KEY=

# Stripe（Phase 2）
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=

# App
APP_ENV=development
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:8000
```

## よく使うコマンド

```bash
# Frontend
cd frontend
npm install
npm run dev          # 開発サーバー起動 (localhost:5173)
npm run build        # ビルド
npm run lint         # Lint

# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload  # 開発サーバー起動 (localhost:8000)
pytest               # テスト実行

# DB マイグレーション
# Supabase CLI or SQL直接実行（docs/design/02_technical_design.md のSQL参照）
```

## 重要な設計判断メモ

1. **HPBへのコンテンツ反映はコピペ方式。** HPBは公開APIを提供していないため自動連携不可。コピーボタンのUXが生命線。
2. **AI画像はHPB掲載禁止。** HPB用途としてではなく、SNS・カウンセリング用途の付加価値として提供。警告UIを忘れないこと。
3. **プロンプトはDBで管理。** ハードコードしない。将来のA/Bテスト・チューニングに対応するため。
4. **Free/Proの制限はバックエンドで強制。** フロントエンドのUI非表示だけでは不十分、APIレベルで`usage_tracking`テーブルをチェック。
5. **全角文字数カウントが重要。** HPBの文字数制限は全角基準。半角は0.5文字としてカウントする独自ロジックが必要。

## ドキュメント参照先

| 何を知りたい | 参照先 |
|------------|--------|
| 機能一覧・料金プラン・スケジュール | `docs/requirements/01_requirements_v02.md` |
| アーキテクチャ・DB設計・API一覧 | `docs/design/02_technical_design.md` |
| 画面設計・ワイヤーフレーム・コンポーネント | `docs/design/03_ui_design_spec.md` |
| 各機能の詳細仕様・実装チェックリスト | `docs/specs/04_detailed_spec.md` |
