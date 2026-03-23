# HPB Content Studio — 技術設計書

**ドキュメントバージョン**: v2.0
**作成日**: 2025-02-05
**最終更新**: 2026-03-19（Phase 1 完了時の実装反映）
**対象**: 開発チーム

---

## 1. アーキテクチャ概要

### 1.1 システム構成図

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT                                │
│               React + TypeScript + Vite                      │
│              TailwindCSS + shadcn/ui                         │
│              Zustand (状態管理)                               │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐│
│  │Dashboard │ │Stylist   │ │Content   │ │Chat              ││
│  │Page      │ │Manager   │ │Generator │ │Modifier          ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘│
├──────────────────────────────────────────────────────────────┤
│                    Vercel (Hosting)                           │
└───────────────────────┬──────────────────────────────────────┘
                        │ HTTPS
┌───────────────────────┴──────────────────────────────────────┐
│                      BACKEND API                              │
│                Python FastAPI                                 │
│                                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────────┐ │
│  │Auth      │ │Content   │ │Image     │ │Billing          │ │
│  │Module    │ │Generator │ │Generator │ │Module           │ │
│  │          │ │(Claude)  │ │(Nano-    │ │(Stripe)         │ │
│  │          │ │          │ │ banana)  │ │                 │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────────────────┘ │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              Prompt Engine                                │ │
│  │  [メタデータ] + [コード管理テンプレート] + [HPB制約] → プロンプト合成  │ │
│  └──────────────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────────────┤
│              Railway or Render (Hosting)                       │
└──────┬────────────┬────────────────┬──────────────────────────┘
       │            │                │
  ┌────┴────┐  ┌────┴────┐   ┌──────┴──────┐
  │Supabase │  │Supabase │   │External APIs│
  │Postgres │  │Storage  │   │             │
  │+ Auth   │  │(Images) │   │• Claude API │
  │+ RLS    │  │         │   │• Nanobanana │
  │         │  │         │   │• Stripe API │
  └─────────┘  └─────────┘   └─────────────┘
```

### 1.2 技術スタック

| レイヤー | 技術 | 選定理由 |
|---------|------|---------|
| Frontend | React 18 + TypeScript + Vite | モダン、型安全、高速HMR |
| UI | TailwindCSS + shadcn/ui | プロ品質UIを高速構築 |
| 状態管理 | Zustand | 軽量、ボイラープレート少 |
| Backend | Python FastAPI | async対応、型ヒント、Claude SDK親和性 |
| DB | PostgreSQL (Supabase) / SQLite (開発時) | Auth/Storage/DB一体、RLS対応 |
| 画像Storage | Supabase Storage | S3互換、CDN配信 |
| AI（テキスト） | Claude 4.5 Haiku (`claude-haiku-4-5-20251001`) | 日本語品質、コスト効率 |
| AI（画像） | Nanobanana 2 (Gemini 3.1 Flash Image Preview) | Phase 2で実装予定 |
| 決済 | Stripe (Checkout + Billing) | 業界標準、日本語対応 |
| Frontend Hosting | Vercel | デプロイ容易、Edge Network |
| Backend Hosting | Railway or Render | Python対応、スケーラブル |
| エラー監視 | Sentry | リアルタイムエラー追跡 |

---

## 2. データベース設計

### 2.1 ER図（概念）

```
Supabase Auth (users) ──< salons ──< stylists
                              │
                              ├──< generated_contents ──< chat_sessions ──< chat_messages
                              │
                              └── organizations (Team plan)

Supabase Auth (users) ── subscriptions
Supabase Auth (users) ── usage_tracking
```

> **Note:** `users` テーブルはローカルに持たず、Supabase Auth で管理。開発時は `mock_auth` モードで `config.py` の `mock_user_id` / `mock_user_email` を使用。

### 2.2 テーブル定義

```sql
-- ============================================
-- サロン
-- ============================================
CREATE TABLE salons (
  id VARCHAR(36) PRIMARY KEY,          -- UUID
  user_id VARCHAR(36) NOT NULL,        -- Supabase Auth user ID
  organization_id VARCHAR(36) REFERENCES organizations(id),  -- Team plan用（nullable）
  name VARCHAR(100) NOT NULL,
  area VARCHAR(100),
  concept TEXT,                        -- サロンのコンセプト
  target_customer VARCHAR(200),        -- ターゲット客層
  strength TEXT,                       -- サロンの強み
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 個人利用時はuser_idでユニーク、Team plan時は組織配下で複数サロン可
CREATE UNIQUE INDEX idx_salons_user_unique
  ON salons(user_id) WHERE organization_id IS NULL;

-- ============================================
-- スタイリスト
-- ============================================
CREATE TABLE stylists (
  id VARCHAR(36) PRIMARY KEY,          -- UUID
  salon_id VARCHAR(36) NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(50),                    -- 役職（店長、スタイリスト等）
  years_experience INT,                -- 経験年数

  -- メタデータ（プロンプト合成に使用）
  specialties JSON DEFAULT '[]',       -- 得意メニュー ["カット", "ハイトーンカラー"]
  style_features JSON DEFAULT '[]',    -- スタイル特徴 ["ナチュラル", "透明感"]
  personality TEXT,                     -- 人柄・雰囲気
  writing_style JSON,                  -- 文体設定 {"tone": "friendly", "emoji": true}

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 生成コンテンツ
-- ============================================
CREATE TABLE generated_contents (
  id VARCHAR(36) PRIMARY KEY,          -- UUID
  salon_id VARCHAR(36) NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  stylist_id VARCHAR(36) REFERENCES stylists(id) ON DELETE SET NULL,

  content_type VARCHAR(50) NOT NULL,
  -- Phase 1 実装済み:
  --   'salon_catch'          サロンキャッチコピー (45文字)
  --   'salon_intro'          サロン紹介文 (500文字)
  --   'stylist_profile'      スタイリストプロフィール (200文字)
  --   'blog_article'         ブログ記事 (10,000文字)
  --   'review_reply'         口コミ返信 (500文字)
  --   'consultation'         カウンセリング文 (2,000文字)
  --   'google_review_reply'  Google口コミ返信 (500文字推奨/4,096文字上限)

  content TEXT,                        -- 生成テキスト（単一フィールド）
  char_count INT DEFAULT 0,            -- 文字数
  prompt_used TEXT,                    -- 再現性のためプロンプト保存
  input_tokens INT DEFAULT 0,         -- Claude API入力トークン数
  output_tokens INT DEFAULT 0,        -- Claude API出力トークン数

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- チャット修正セッション（正規化済み）
-- ============================================
CREATE TABLE chat_sessions (
  id VARCHAR(36) PRIMARY KEY,          -- UUID
  content_id VARCHAR(36) NOT NULL REFERENCES generated_contents(id) ON DELETE CASCADE,
  turn_count INT DEFAULT 0,            -- 修正回数
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_id)
);

-- チャットメッセージ（別テーブルで正規化）
CREATE TABLE chat_messages (
  id VARCHAR(36) PRIMARY KEY,          -- UUID
  session_id VARCHAR(36) NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,           -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- サブスクリプション（Stripe連携）
-- ============================================
CREATE TABLE subscriptions (
  id VARCHAR(36) PRIMARY KEY,          -- UUID
  user_id VARCHAR(36) NOT NULL UNIQUE, -- Supabase Auth user ID
  organization_id VARCHAR(36) REFERENCES organizations(id),  -- Team plan用
  stripe_customer_id VARCHAR(100),
  stripe_subscription_id VARCHAR(100),
  plan VARCHAR(20) DEFAULT 'free',     -- 'free', 'pro', 'team'
  status VARCHAR(20) DEFAULT 'active',
  -- 'active', 'trialing', 'past_due', 'canceled', 'unpaid'

  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 利用量トラッキング（月次集計方式）
-- ============================================
CREATE TABLE usage_tracking (
  id VARCHAR(36) PRIMARY KEY,          -- UUID
  user_id VARCHAR(36) NOT NULL,        -- Supabase Auth user ID
  year_month VARCHAR(7) NOT NULL,      -- 'YYYY-MM' 形式

  text_generation_count INT DEFAULT 0,  -- テキスト生成回数
  blog_generation_count INT DEFAULT 0,  -- ブログ生成回数
  image_generation_count INT DEFAULT 0, -- 画像生成回数（Phase 2）
  total_input_tokens BIGINT DEFAULT 0,  -- 累計入力トークン
  total_output_tokens BIGINT DEFAULT 0, -- 累計出力トークン

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, year_month)
);

-- ============================================
-- プロンプトテンプレート
-- ※ Phase 1ではDBテーブルは未使用。
--   prompt_engine.py にハードコードで管理。
--   将来的にDB管理（A/Bテスト等）に移行予定。
-- ============================================

-- ============================================
-- RLS ポリシー
-- ============================================
ALTER TABLE salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE stylists ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- サロンは自分のデータのみ参照可能
CREATE POLICY "Users can view own salon"
  ON salons FOR ALL
  USING (user_id = auth.uid());

-- スタイリストは自サロン内のみ
CREATE POLICY "Users can view own stylists"
  ON stylists FOR ALL
  USING (salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid()));

-- 生成コンテンツは自サロン内のみ
CREATE POLICY "Users can view own contents"
  ON generated_contents FOR ALL
  USING (salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid()));
```

### 2.3 インデックス

```sql
CREATE INDEX idx_salons_user ON salons(user_id);
CREATE INDEX idx_salons_org ON salons(organization_id);
CREATE INDEX idx_stylists_salon ON stylists(salon_id);
CREATE INDEX idx_contents_salon ON generated_contents(salon_id);
CREATE INDEX idx_contents_stylist ON generated_contents(stylist_id);
CREATE INDEX idx_contents_type ON generated_contents(content_type);
CREATE INDEX idx_contents_created ON generated_contents(created_at DESC);
CREATE INDEX idx_chat_sessions_content ON chat_sessions(content_id);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_usage_user_month ON usage_tracking(user_id, year_month);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_customer_id);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_csv_jobs_org ON csv_import_jobs(organization_id);
```

---

## 3. API設計

### 3.1 エンドポイント一覧

```
Base URL: /api/v1

# ─── 認証（Supabase Auth経由）───
POST   /auth/signup              # サインアップ
POST   /auth/login               # ログイン
POST   /auth/logout              # ログアウト

# ─── サロン ───
GET    /salons/me                # 自分のサロン取得
POST   /salons                   # サロン作成（初回のみ）
PUT    /salons/:id               # サロン情報更新

# ─── スタイリスト ───
GET    /stylists                 # 一覧取得
POST   /stylists                 # 新規登録
GET    /stylists/:id             # 詳細取得
PUT    /stylists/:id             # 更新
DELETE /stylists/:id             # 削除

# ─── コンテンツ生成 ───
POST   /generate/check-limit     # 利用量上限チェック
POST   /generate/text            # テキスト生成（全コンテンツタイプ統合、SSEストリーミング）
# ※ /generate/blog, /generate/review-reply は /generate/text に統合済み
# ※ /generate/batch — Phase 2で実装予定
# ※ /generate/image — Phase 2で実装予定

# ─── チャット修正 ───
POST   /chat/sessions                        # セッション作成
GET    /chat/sessions/:sessionId             # セッション取得（履歴+現在コンテンツ）
POST   /chat/sessions/:sessionId/messages    # 修正メッセージ送信
POST   /chat/sessions/:sessionId/confirm     # コンテンツ確定

# ─── コンテンツ管理 ───
GET    /contents                 # 一覧取得（フィルタ・ページネーション）
GET    /contents/:id             # 詳細取得
PUT    /contents/:id             # 手動編集
DELETE /contents/:id             # 削除
# ※ POST /contents/export — Phase 2で実装予定

# ─── 利用量 ───
GET    /usage/                   # 今月の利用量取得

# ─── 決済（Stripe）───
POST   /billing/create-checkout  # Checkout Session作成
POST   /billing/portal           # Customer Portal URL取得
GET    /billing/subscription     # サブスク状態取得
POST   /billing/webhook          # Stripe Webhook受信（認証不要）

# ─── 公開API ───
GET    /public/stats             # 公開統計情報（認証不要、5分キャッシュ）

# ─── 組織（Teamプラン）───
GET    /organizations/me                        # 自分の所属組織
PUT    /organizations/:id                       # 組織情報更新
GET    /organizations/:id/members               # メンバー一覧
POST   /organizations/:id/members               # メンバー追加
DELETE /organizations/:id/members/:userId       # メンバー削除
GET    /organizations/:id/salons                # 組織配下サロン一覧
POST   /organizations/:id/import/salons         # サロンCSVインポート
POST   /organizations/:id/import/stylists       # スタイリストCSVインポート
GET    /organizations/:id/import/jobs           # インポート履歴
GET    /organizations/:id/import/jobs/:jobId    # ジョブ詳細
GET    /import/templates/salons                 # サロンCSVテンプレートDL
GET    /import/templates/stylists               # スタイリストCSVテンプレートDL
```

### 3.2 主要APIの詳細

#### POST /generate/check-limit

生成前に利用量上限をチェックする。

```json
// Request
{
  "content_type": "salon_intro"
}

// Response
{
  "allowed": true,
  "plan": "free",
  "current_count": 5,
  "limit": 30,
  "message": "利用可能です"
}
```

#### POST /generate/text

全コンテンツタイプを統合した生成エンドポイント。SSEストリーミングで応答。

```json
// Request
{
  "content_type": "salon_intro",
  "stylist_id": "uuid",           // optional（サロン系は不要）
  "additional_instructions": "春のキャンペーンを意識して",
  "blog_theme": "春のトレンドカラー",        // blog_article時のみ
  "review_text": "丁寧な施術でした",         // review_reply時のみ
  "consultation_text": "髪のダメージが...",   // consultation時のみ
  "star_rating": 5                            // review_reply時のみ
}

// Response (Server-Sent Events)
// event: start
data: {"type": "start"}

// event: chunk
data: {"type": "chunk", "content": "渋谷駅から"}

// event: complete
data: {
  "type": "complete",
  "content_id": "uuid",
  "char_count": 487,
  "max_chars": 500,
  "is_over_limit": false
}
```

#### POST /chat/sessions

チャット修正セッションを作成する。

```json
// Request
{
  "content_id": "uuid"
}

// Response
{
  "session_id": "uuid",
  "content_id": "uuid",
  "turn_count": 0
}
```

#### POST /chat/sessions/:sessionId/messages

修正指示をチャット形式で送信。

```json
// Request
{
  "message": "もう少しカジュアルな文体にして。絵文字も入れて"
}

// Response
{
  "session_id": "uuid",
  "role": "assistant",
  "content": "渋谷駅チカ♪ 徒歩5分の...",
  "turn_count": 2
}
```

#### POST /chat/sessions/:sessionId/confirm

修正を確定しコンテンツを更新する。

```json
// Response
{
  "content_id": "uuid",
  "confirmed": true
}
```

### 3.3 レート制限

| プラン | テキスト生成 | ブログ生成 | 画像生成 | チャット修正 | スタイリスト数 |
|-------|------------|-----------|---------|-------------|-------------|
| Free | 30回/月 | 5回/月 | 不可 | 3往復/セッション | 3名/サロン |
| Pro | 無制限 | 無制限 | 50枚/月 (Phase 2) | 20往復/セッション | 20名/サロン |
| Team | 無制限 | 無制限 | 50枚/月 (Phase 2) | 20往復/セッション | 無制限 |

---

## 4. プロンプトエンジン設計

### 4.1 プロンプト合成フロー

```
┌─────────────────────────────────────────┐
│           Prompt Engine                  │
│      (prompt_engine.py で管理)           │
│                                          │
│  [1] システムプロンプト（content_type別） │
│     ↓                                    │
│  [2] + サロン情報コンテキスト             │
│     （name, area, concept,               │
│       target_customer, strength）        │
│     ↓                                    │
│  [3] + スタイリストメタデータ             │
│     （name, role, years_experience,      │
│       specialties, style_features,       │
│       personality, writing_style）       │
│     ↓                                    │
│  [4] + HPB制約（文字数、禁止表現）       │
│     ↓                                    │
│  [5] + コンテンツ固有データ               │
│     （blog_theme, review_text,           │
│       consultation_text, star_rating）   │
│     ↓                                    │
│  [6] + ユーザーの追加指示                 │
│     ↓                                    │
│  [完成プロンプト] → Claude API            │
│  （ストリーミング応答）                   │
└─────────────────────────────────────────┘
```

### 4.2 プロンプトテンプレート例（サロン紹介文）

```
【システムプロンプト】
あなたはホットペッパービューティーのサロン紹介文を書く専門ライターです。
以下のルールに従って紹介文を生成してください。

ルール:
- {char_limit}文字以内で書くこと
- 誇大表現や医療的表現を避けること
- 実際のサービスと乖離しない表現を使うこと
- サロンの特徴と雰囲気が伝わる文章にすること

【サロン情報】
サロン名: {name}
エリア: {area}
コンセプト: {concept}
ターゲット: {target_customer}
強み: {strength}

【スタイリスト情報】（スタイリスト関連コンテンツの場合）
名前: {name}
役職: {role}
経験年数: {years_experience}年
得意メニュー: {specialties}
スタイル特徴: {style_features}
人柄: {personality}

【追加指示】
{additional_instructions}
```

### 4.3 プロンプト管理方針

- **Phase 1**: `prompt_engine.py` にハードコードで管理（迅速な開発・チューニング）
- **将来**: DBの`prompt_templates`テーブルに移行し、管理画面から編集・A/Bテスト可能にする予定
- 生成時のプロンプトを`generated_contents.prompt_used`に保存（再現性）
- HPB禁止表現リスト（`hpb_constraints.py`）をプロンプトに組み込み

### 4.4 HPB禁止表現

`hpb_constraints.py` で管理:
- 「日本一」「No.1」「ナンバーワン」「最高」「最強」「完璧」
- 「治療」「治る」「医療」「効果が保証」
- 「激安」「破格」「0円」

---

## 5. Stripe決済フロー

### 5.1 サブスクリプション開始

```
[ユーザー] → [Pro/Teamにアップグレードボタン]
           → Backend: POST /billing/create-checkout
           → Stripe Checkout Session作成
           → [Stripe Checkout画面にリダイレクト]
           → [決済完了]
           → Stripe Webhook: checkout.session.completed
           → Backend: subscriptions テーブル更新（plan='pro' or 'team'）
           → [ダッシュボードにリダイレクト（機能解放）]
```

### 5.2 Webhook処理

```python
# 処理すべきイベント（stripe_service.py で実装済み）
STRIPE_EVENTS = {
    'checkout.session.completed':      # 初回決済完了
    'customer.subscription.updated':   # プラン変更・更新
    'customer.subscription.deleted':   # 解約
    'invoice.payment_succeeded':       # 月次決済成功
    'invoice.payment_failed':          # 月次決済失敗
}
```

### 5.3 プラン制限の実装

```python
# usage_service.py で実装
async def check_usage_limit(db, user_id, content_type):
    plan = await get_user_plan(db, user_id)  # 'free', 'pro', 'team'

    if plan in ('pro', 'team'):
        return {"allowed": True}  # Pro/Team は無制限

    # Free プランの制限チェック
    usage = await get_or_create_usage_tracking(db, user_id)

    if content_type == 'blog_article':
        return {"allowed": usage['blog_generation_count'] < 5}
    else:
        return {"allowed": usage['text_generation_count'] < 30}
```

---

## 6. ディレクトリ構造

### 6.1 Frontend

```
frontend/
├── public/
│   └── stats.json
├── src/
│   ├── components/
│   │   ├── ui/               # shadcn/ui コンポーネント
│   │   ├── layout/           # MainLayout, Header, Sidebar
│   │   ├── dashboard/        # ダッシュボード関連
│   │   ├── stylist/          # スタイリスト管理
│   │   ├── generator/        # コンテンツ生成
│   │   ├── chat/             # チャット修正UI
│   │   ├── preview/          # HPBプレビュー
│   │   └── billing/          # 料金・決済
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── SignupPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── SalonSetupPage.tsx
│   │   ├── StylistListPage.tsx
│   │   ├── StylistFormPage.tsx
│   │   ├── GeneratePage.tsx
│   │   ├── ChatPage.tsx
│   │   ├── HistoryPage.tsx
│   │   ├── BillingPage.tsx
│   │   ├── BillingSuccessPage.tsx
│   │   ├── CsvImportPage.tsx         # Team plan
│   │   ├── TeamSalonListPage.tsx     # Team plan
│   │   ├── OrgMembersPage.tsx        # Team plan
│   │   └── LandingPage.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useGenerate.ts
│   │   ├── useChat.ts
│   │   ├── useSubscription.ts
│   │   └── useUsage.ts
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── stylistStore.ts
│   │   ├── contentStore.ts
│   │   ├── generateStore.ts
│   │   ├── salonStore.ts
│   │   └── organizationStore.ts      # Team plan
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── api.ts
│   │   └── stripe.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

### 6.2 Backend

```
backend/
├── app/
│   ├── main.py               # FastAPI アプリケーション
│   ├── config.py             # 設定・環境変数
│   ├── dependencies.py       # 依存関係注入
│   │
│   ├── db/
│   │   ├── session.py        # DBセッション管理
│   │   └── base.py           # SQLAlchemy Base
│   │
│   ├── routers/
│   │   ├── auth.py
│   │   ├── salons.py
│   │   ├── stylists.py
│   │   ├── generate.py
│   │   ├── chat.py
│   │   ├── contents.py
│   │   ├── billing.py
│   │   ├── usage.py
│   │   ├── organizations.py      # Team plan
│   │   ├── csv_import.py         # Team plan CSV
│   │   └── public.py             # 公開API（認証不要）
│   │
│   ├── services/
│   │   ├── claude_service.py     # Claude API呼び出し（テキスト生成）
│   │   ├── gemini_service.py     # Gemini API（画像生成用、Phase 2）
│   │   ├── nanobanana_service.py # 画像生成API（Phase 2）
│   │   ├── prompt_engine.py      # プロンプト合成エンジン
│   │   ├── content_service.py    # コンテンツ生成ロジック
│   │   ├── stripe_service.py     # Stripe連携
│   │   ├── usage_service.py      # 利用量管理
│   │   ├── organization_service.py  # 組織管理（Team plan）
│   │   ├── csv_import_service.py    # CSV一括登録（Team plan）
│   │   └── stats_service.py      # 公開統計
│   │
│   ├── models/
│   │   ├── salon.py
│   │   ├── stylist.py
│   │   ├── content.py
│   │   ├── chat.py              # chat_sessions + chat_messages
│   │   ├── subscription.py
│   │   ├── usage.py
│   │   └── organization.py      # organizations + members + csv_jobs
│   │
│   ├── schemas/                # Pydantic スキーマ
│   │   ├── salon.py
│   │   ├── stylist.py
│   │   ├── content.py
│   │   ├── generate.py
│   │   └── billing.py
│   │
│   └── utils/
│       ├── hpb_constraints.py  # HPB文字数制限・禁止表現
│       └── char_counter.py     # 全角文字数カウント
│
├── cli/                        # 管理者CLIツール（click）
│   ├── main.py
│   ├── commands/
│   │   └── stats.py
│   └── README.md
│
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 003_team_plan.sql
│   ├── 004_token_tracking.sql
│   └── 005_missing_columns.sql
│
├── tests/
├── requirements.txt
├── Dockerfile
└── .env.example
```

---

## 7. 外部サービス連携

### 7.1 Supabase

| 機能 | 用途 |
|------|------|
| Auth | ユーザー認証（メール+パスワード） |
| Database | PostgreSQL（本番DB） |
| Storage | AI生成画像の保存・配信（Phase 2） |
| RLS | マルチテナントデータ分離 |

### 7.2 Claude API（テキスト生成メイン）

```python
# 使用モデル
MODEL_ID = "claude-haiku-4-5-20251001"  # Claude 4.5 Haiku

# ストリーミング生成（claude_service.py）
async def generate_content_stream(prompt: str, max_tokens: int = 2000):
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    with client.messages.stream(
        model=MODEL_ID,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for text in stream.text_stream:
            yield {"type": "text", "content": text}
        # 最後にトークン使用量を返す
        usage = stream.get_final_message().usage
        yield {"type": "usage", "input_tokens": usage.input_tokens, "output_tokens": usage.output_tokens}
```

> **モデル選定理由**: Claude 4.5 Haiku は日本語テキスト生成の品質とコストのバランスが優れている。詳細なコスト分析は `docs/marketing/06_pricing_cost_analysis.md` を参照。

### 7.3 Gemini API（画像生成用 — Phase 2）

```python
# 画像生成（Proプラン限定） — Nanobanana 2 (Gemini 3.1 Flash Image Preview)
# テキスト生成は Claude に移行済み。Gemini は画像生成用途でPhase 2実装予定。
```

### 7.4 Stripe

| Product | 用途 |
|---------|------|
| Checkout | 決済ページ |
| Billing | サブスクリプション管理 |
| Webhook | イベント通知受信 |
| Customer Portal | ユーザー自身でのプラン管理 |

---

## 8. デプロイ・CI/CD

### 8.1 環境構成

| 環境 | 用途 | URL |
|------|------|-----|
| Local | 開発 | localhost:5173 / localhost:8000 |
| Staging | テスト | staging.hpb-studio.app |
| Production | 本番 | app.hpb-studio.app |

### 8.2 CI/CD

```
[GitHub Push] → [GitHub Actions]
  ├── Frontend: Build → Test → Deploy to Vercel
  └── Backend: Test → Build Docker → Deploy to Railway/Render
```

### 8.3 環境変数

```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Claude AI（テキスト生成メイン）
ANTHROPIC_API_KEY=

# Gemini（画像生成用、Phase 2）
GEMINI_API_KEY=

# Nanobanana（Phase 2）
NANOBANANA_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=

# App
APP_ENV=production
FRONTEND_URL=https://app.hpb-studio.app
BACKEND_URL=https://api.hpb-studio.app

# DB（開発時）
DB_MODE=sqlite          # 'sqlite' or 'supabase'
SQLITE_URL=sqlite:///./data/dev.db
MOCK_AUTH=true
```

---

## 9. Teamプラン設計

### 9.1 プラン比較

| 機能 | Free | Pro | Team |
|------|------|-----|------|
| テキスト生成 | 月30回 | 無制限 | 無制限 |
| ブログ生成 | 月5回 | 無制限 | 無制限 |
| スタイリスト | 3名/サロン | 20名/サロン | 無制限 |
| チャット修正 | 3往復 | 20往復 | 20往復 |
| サロン | 1店舗 | 1店舗 | 無制限 |
| CSV一括登録 | -- | -- | 利用可能 |
| メンバー管理 | -- | -- | 利用可能 |
| 料金 | ¥0/月 | ¥980/月 | お問い合わせ |

### 9.2 追加テーブル

#### organizations
```sql
CREATE TABLE organizations (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    owner_user_id VARCHAR(36) NOT NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    notes TEXT,
    max_salons INTEGER DEFAULT NULL,          -- NULL = 無制限
    max_stylists_per_salon INTEGER DEFAULT NULL,  -- NULL = 無制限
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

#### organization_members
```sql
CREATE TABLE organization_members (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id),
    user_id VARCHAR(36) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    UNIQUE(organization_id, user_id)
);
```

#### csv_import_jobs
```sql
CREATE TABLE csv_import_jobs (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id),
    user_id VARCHAR(36) NOT NULL,
    import_type VARCHAR(20) NOT NULL,     -- 'salons', 'stylists'
    file_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending/processing/completed/failed
    total_rows INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    error_details TEXT DEFAULT '[]',      -- JSON文字列
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

### 9.3 追加API

```
GET    /api/v1/organizations/me                        — 自分の所属組織
PUT    /api/v1/organizations/{id}                      — 組織情報更新
GET    /api/v1/organizations/{id}/members              — メンバー一覧
POST   /api/v1/organizations/{id}/members              — メンバー追加
DELETE /api/v1/organizations/{id}/members/{user_id}    — メンバー削除
GET    /api/v1/organizations/{id}/salons               — 組織配下サロン一覧
POST   /api/v1/organizations/{id}/import/salons        — サロンCSVインポート
POST   /api/v1/organizations/{id}/import/stylists      — スタイリストCSVインポート
GET    /api/v1/organizations/{id}/import/jobs           — インポート履歴
GET    /api/v1/organizations/{id}/import/jobs/{job_id}  — ジョブ詳細
GET    /api/v1/import/templates/salons                  — サロンCSVテンプレートDL
GET    /api/v1/import/templates/stylists                — スタイリストCSVテンプレートDL
```

### 9.4 管理者CLIツール

```bash
python -m cli.main org create --name <名前> --owner-email <メール>
python -m cli.main plan set-team --user-email <メール> --org-id <ID>
python -m cli.main import salons --org-id <ID> --file <パス>
python -m cli.main import stylists --org-id <ID> --file <パス>
```

マイグレーション: `backend/migrations/003_team_plan.sql`
