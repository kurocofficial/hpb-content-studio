# HPB Content Studio — 技術設計書

**ドキュメントバージョン**: v1.0
**作成日**: 2025-02-05
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
│  │          │ │(Gemini)  │ │(Nano-    │ │(Stripe)         │ │
│  │          │ │          │ │ banana)  │ │                 │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────────────────┘ │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              Prompt Engine                                │ │
│  │  [メタデータ] + [テンプレート] + [HPB制約] → プロンプト合成  │ │
│  └──────────────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────────────┤
│              Railway or Render (Hosting)                       │
└──────┬────────────┬────────────────┬──────────────────────────┘
       │            │                │
  ┌────┴────┐  ┌────┴────┐   ┌──────┴──────┐
  │Supabase │  │Supabase │   │External APIs│
  │Postgres │  │Storage  │   │             │
  │+ Auth   │  │(Images) │   │• Gemini API │
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
| Backend | Python FastAPI | Gemini SDK親和性、async対応、型ヒント |
| DB | PostgreSQL (Supabase) | Auth/Storage/DB一体、RLS対応 |
| 画像Storage | Supabase Storage | S3互換、CDN配信 |
| AI（テキスト） | Gemini 2.0 Flash | コスト効率、日本語品質 |
| AI（画像） | Nanobanana (Gemini) | ユーザー指定 |
| 決済 | Stripe (Checkout + Billing) | 業界標準、日本語対応 |
| Frontend Hosting | Vercel | デプロイ容易、Edge Network |
| Backend Hosting | Railway or Render | Python対応、スケーラブル |
| エラー監視 | Sentry | リアルタイムエラー追跡 |

---

## 2. データベース設計

### 2.1 ER図（概念）

```
users ──< salons ──< stylists ──< generated_contents ──< chat_sessions
                                         │
                                         └── content_exports
users ── subscriptions
```

### 2.2 テーブル定義

```sql
-- ============================================
-- ユーザー（Supabase Authと連携）
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'staff',  -- 'owner', 'staff'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- サロン
-- ============================================
CREATE TABLE salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(100) NOT NULL,
  area VARCHAR(50),
  target_audience TEXT,           -- ターゲット客層
  price_range VARCHAR(20),       -- '低', '中', '高'
  atmosphere TEXT,                -- サロンの雰囲気
  brand_keywords TEXT[],         -- ブランドキーワード
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- スタイリスト（メタデータ含む）
-- ============================================
CREATE TABLE stylists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  display_name VARCHAR(50) NOT NULL,
  real_name VARCHAR(50),
  experience_years INT,
  
  -- メタデータ（プロンプト合成に使用）
  specialties JSONB DEFAULT '[]',
  -- 例: ["カット", "ハイトーンカラー", "透明感カラー"]
  
  style_features JSONB DEFAULT '{}',
  -- 例: {"得意スタイル": "ナチュラルボブ", "こだわり": "透明感"}
  
  writing_style JSONB DEFAULT '{}',
  -- 例: {"tone": "friendly", "emoji": true, "formality": "casual_polite"}
  
  image_style_prefs JSONB DEFAULT '{}',
  -- 例: {"color_tone": "bright", "model_vibe": "natural", "background": "white"}
  
  sns_info JSONB DEFAULT '{}',
  -- 例: {"instagram": "@stylist_xxx"}
  
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_chat_log JSONB,     -- チャット履歴保存
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 生成コンテンツ
-- ============================================
CREATE TABLE generated_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  stylist_id UUID REFERENCES stylists(id) ON DELETE SET NULL,
  
  content_type VARCHAR(30) NOT NULL,
  -- 'salon_catch', 'salon_intro', 'stylist_profile',
  -- 'style_description', 'blog_article', 'coupon_text',
  -- 'review_reply', 'menu_description', 'ai_image'
  
  title VARCHAR(200),
  body TEXT,
  char_count INT,                -- 文字数
  hpb_char_limit INT,           -- HPB上限値
  
  image_urls TEXT[],             -- AI画像のStorage URL
  
  prompt_used TEXT,              -- 再現性のため保存
  model_used VARCHAR(50),        -- 'gemini-2.0-flash' etc
  
  status VARCHAR(20) DEFAULT 'draft',
  -- 'draft', 'approved', 'exported', 'archived'
  
  metadata JSONB DEFAULT '{}',
  -- テンプレート名、キーワード、生成パラメータ等
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- チャット修正セッション
-- ============================================
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES generated_contents(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]',
  -- [{role: "user", content: "...", timestamp: "..."}, 
  --  {role: "assistant", content: "...", timestamp: "..."}]
  
  message_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- サブスクリプション（Stripe連携）
-- ============================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) UNIQUE,
  stripe_customer_id VARCHAR(100),
  stripe_subscription_id VARCHAR(100),
  plan VARCHAR(20) DEFAULT 'free',  -- 'free', 'pro'
  status VARCHAR(20) DEFAULT 'active',
  -- 'active', 'trialing', 'past_due', 'canceled', 'unpaid'
  
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 利用量トラッキング（Free制限管理）
-- ============================================
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  usage_type VARCHAR(30) NOT NULL,
  -- 'text_generation', 'blog_generation', 'review_reply',
  -- 'image_generation', 'chat_message'
  
  period_start DATE NOT NULL,    -- 月初日
  count INT DEFAULT 0,
  
  UNIQUE(user_id, usage_type, period_start)
);

-- ============================================
-- プロンプトテンプレート（管理画面から編集可能）
-- ============================================
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type VARCHAR(30) NOT NULL,
  template_name VARCHAR(100) NOT NULL,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  -- プレースホルダ: {stylist_name}, {specialties}, {writing_style}, etc.
  
  version INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS ポリシー
-- ============================================
ALTER TABLE salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE stylists ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- サロンは自分のデータのみ参照可能
CREATE POLICY "Users can view own salon"
  ON salons FOR ALL
  USING (owner_id = auth.uid());

-- スタイリストは自サロン内のみ
CREATE POLICY "Users can view own stylists"
  ON stylists FOR ALL
  USING (salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid()));

-- 生成コンテンツは自サロン内のみ
CREATE POLICY "Users can view own contents"
  ON generated_contents FOR ALL
  USING (salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid()));
```

### 2.3 インデックス

```sql
CREATE INDEX idx_stylists_salon ON stylists(salon_id);
CREATE INDEX idx_contents_salon ON generated_contents(salon_id);
CREATE INDEX idx_contents_stylist ON generated_contents(stylist_id);
CREATE INDEX idx_contents_type ON generated_contents(content_type);
CREATE INDEX idx_contents_created ON generated_contents(created_at DESC);
CREATE INDEX idx_chat_content ON chat_sessions(content_id);
CREATE INDEX idx_usage_user_period ON usage_tracking(user_id, period_start);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_customer_id);
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
POST   /auth/reset-password      # パスワードリセット

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
POST   /stylists/:id/onboarding # オンボーディングチャット

# ─── コンテンツ生成 ───
POST   /generate/text            # テキスト生成（汎用）
POST   /generate/blog            # ブログ記事生成
POST   /generate/batch           # 一括生成（Pro限定）
POST   /generate/image           # AI画像生成（Pro限定）
POST   /generate/review-reply    # 口コミ返信生成

# ─── チャット修正 ───
POST   /chat/message             # 修正メッセージ送信
GET    /chat/sessions/:contentId # セッション取得

# ─── コンテンツ管理 ───
GET    /contents                 # 一覧取得（フィルタ・ページネーション）
GET    /contents/:id             # 詳細取得
PUT    /contents/:id             # 手動編集
DELETE /contents/:id             # 削除
POST   /contents/export          # エクスポート（Pro限定）

# ─── 利用量 ───
GET    /usage/current            # 今月の利用量取得

# ─── 決済（Stripe）───
POST   /billing/create-checkout  # Checkout Session作成
POST   /billing/portal           # Customer Portal URL取得
POST   /billing/webhook          # Stripe Webhook受信
GET    /billing/subscription     # サブスク状態取得

# ─── プロンプトテンプレート ───
GET    /templates                # テンプレート一覧
GET    /templates/:contentType   # 種別別テンプレート
```

### 3.2 主要APIの詳細

#### POST /generate/text

テキストコンテンツを生成する汎用エンドポイント。

```json
// Request
{
  "stylist_id": "uuid",
  "content_type": "salon_intro",
  "template_name": "default",
  "parameters": {
    "keywords": ["透明感", "ナチュラル"],
    "char_limit": 500,
    "additional_instructions": "春のキャンペーンを意識して"
  }
}

// Response
{
  "id": "uuid",
  "content_type": "salon_intro",
  "title": "サロン紹介文",
  "body": "渋谷駅から徒歩5分...",
  "char_count": 487,
  "hpb_char_limit": 500,
  "prompt_used": "...",
  "status": "draft"
}
```

#### POST /generate/blog

ブログ記事を生成する。

```json
// Request
{
  "stylist_id": "uuid",
  "template_name": "trend",
  "parameters": {
    "topic": "2025年春のトレンドカラー",
    "keywords": ["ベージュ", "透明感", "イルミナカラー"],
    "target_length": 2000,
    "sections": 3
  }
}

// Response
{
  "id": "uuid",
  "content_type": "blog_article",
  "title": "【2025春】トレンドカラーBEST5",
  "body": "<h2>...</h2><p>...</p>...",
  "char_count": 1987,
  "hpb_char_limit": 10000,
  "prompt_used": "...",
  "suggested_image_positions": [
    {"after_section": 1, "description": "春カラーのイメージ写真"},
    {"after_section": 2, "description": "ビフォーアフター写真"}
  ]
}
```

#### POST /chat/message

コンテンツの修正指示をチャット形式で送信。

```json
// Request
{
  "content_id": "uuid",
  "message": "もう少しカジュアルな文体にして。絵文字も入れて"
}

// Response (Server-Sent Events / streaming)
{
  "session_id": "uuid",
  "updated_body": "渋谷駅チカ♪ 徒歩5分の...",
  "char_count": 492,
  "message_count": 2
}
```

### 3.3 レート制限

| プラン | テキスト生成 | 画像生成 | チャット修正 |
|-------|------------|---------|-------------|
| Free | 30回/月 | 0 | 3往復/セッション |
| Pro | 無制限 (100回/時) | 50枚/月 | 20往復/セッション |

---

## 4. プロンプトエンジン設計

### 4.1 プロンプト合成フロー

```
┌─────────────────────────────────────────┐
│           Prompt Engine                  │
│                                          │
│  [1] システムプロンプト（content_type別） │
│     ↓                                    │
│  [2] + サロン情報コンテキスト             │
│     ↓                                    │
│  [3] + スタイリストメタデータ             │
│     ↓                                    │
│  [4] + 文体指定（writing_style）         │
│     ↓                                    │
│  [5] + HPB制約（文字数、禁止表現）       │
│     ↓                                    │
│  [6] + ユーザーの追加指示                 │
│     ↓                                    │
│  [完成プロンプト] → Gemini API            │
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
サロン名: {salon_name}
エリア: {area}
ターゲット: {target_audience}
価格帯: {price_range}
雰囲気: {atmosphere}

【スタイリスト情報】
代表スタイリスト: {display_name}
得意メニュー: {specialties}
こだわり: {style_features}

【文体指定】
トーン: {tone}
敬語レベル: {formality}
絵文字使用: {emoji}

【追加指示】
{additional_instructions}
```

### 4.3 プロンプト管理方針

- テンプレートはDBに保存し、管理画面から編集可能
- バージョニング対応（A/Bテスト可能）
- 生成時のプロンプトを`generated_contents.prompt_used`に保存（再現性）
- HPB禁止表現リストをプロンプトに組み込み

---

## 5. Stripe決済フロー

### 5.1 サブスクリプション開始

```
[ユーザー] → [Proにアップグレードボタン]
           → Backend: POST /billing/create-checkout
           → Stripe Checkout Session作成
           → [Stripe Checkout画面にリダイレクト]
           → [決済完了]
           → Stripe Webhook: checkout.session.completed
           → Backend: subscriptions テーブル更新（plan='pro'）
           → [ダッシュボードにリダイレクト（Pro機能解放）]
```

### 5.2 Webhook処理

```python
# 処理すべきイベント
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
# ミドルウェアで利用量チェック
async def check_usage_limit(user_id, usage_type):
    subscription = get_subscription(user_id)
    
    if subscription.plan == 'pro':
        return True  # Pro は基本無制限
    
    # Free プランの制限チェック
    limits = {
        'text_generation': 30,
        'blog_generation': 5,
        'review_reply': 10,
        'image_generation': 0,  # Free は利用不可
    }
    
    current_usage = get_monthly_usage(user_id, usage_type)
    return current_usage < limits.get(usage_type, 0)
```

---

## 6. ディレクトリ構造

### 6.1 Frontend

```
frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── ui/               # shadcn/ui コンポーネント
│   │   ├── layout/           # Header, Sidebar, Footer
│   │   ├── dashboard/        # ダッシュボード関連
│   │   ├── stylist/          # スタイリスト管理
│   │   ├── generator/        # コンテンツ生成
│   │   ├── chat/             # チャット修正UI
│   │   ├── preview/          # HPBプレビュー
│   │   └── billing/          # 料金・決済
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── StylistListPage.tsx
│   │   ├── StylistDetailPage.tsx
│   │   ├── GeneratePage.tsx
│   │   ├── BatchGeneratePage.tsx
│   │   ├── ContentHistoryPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── PricingPage.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useGenerate.ts
│   │   ├── useChat.ts
│   │   ├── useSubscription.ts
│   │   └── useUsage.ts
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── stylistStore.ts
│   │   └── contentStore.ts
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
│   ├── routers/
│   │   ├── auth.py
│   │   ├── salons.py
│   │   ├── stylists.py
│   │   ├── generate.py
│   │   ├── chat.py
│   │   ├── contents.py
│   │   ├── billing.py
│   │   └── usage.py
│   │
│   ├── services/
│   │   ├── gemini_service.py     # Gemini API呼び出し
│   │   ├── nanobanana_service.py # 画像生成API呼び出し
│   │   ├── prompt_engine.py      # プロンプト合成エンジン
│   │   ├── content_service.py    # コンテンツ生成ロジック
│   │   ├── stripe_service.py     # Stripe連携
│   │   └── usage_service.py      # 利用量管理
│   │
│   ├── models/
│   │   ├── salon.py
│   │   ├── stylist.py
│   │   ├── content.py
│   │   ├── subscription.py
│   │   └── usage.py
│   │
│   ├── schemas/                # Pydantic スキーマ
│   │   ├── salon.py
│   │   ├── stylist.py
│   │   ├── content.py
│   │   ├── generate.py
│   │   └── billing.py
│   │
│   └── utils/
│       ├── hpb_constraints.py  # HPB文字数制限等
│       └── char_counter.py     # 全角文字数カウント
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
| Database | PostgreSQL（メインDB） |
| Storage | AI生成画像の保存・配信 |
| RLS | マルチテナントデータ分離 |
| Realtime | 将来対応（チャットのリアルタイム更新等） |

### 7.2 Claude API（テキスト生成メイン）

```python
# 使用モデル
MODEL_ID = "claude-haiku-4-5-20251001"  # Claude 4.5 Haiku

# ストリーミング生成
async def generate_text_stream(prompt: str):
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    with client.messages.stream(
        model=MODEL_ID,
        max_tokens=2000,
        temperature=0.7,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for text in stream.text_stream:
            yield text
```

> **モデル選定理由**: Claude 4.5 Haiku は日本語テキスト生成の品質とコストのバランスが優れている。詳細なコスト分析は `docs/marketing/06_pricing_cost_analysis.md` を参照。

### 7.3 Gemini API（画像生成用）

```python
# 画像生成（Proプラン限定） — Nanobanana 2 (Gemini 3.1 Flash Image Preview)
# テキスト生成は Claude に移行済み。Gemini は画像生成用途で残す。
async def generate_image(prompt: str, size: str = "1024x1024"):
    # Nanobanana 2 APIでの生成
    # ※実際のAPIインターフェースはGoogle公式ドキュメントに従う
    pass
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
| Local | 開発 | localhost:3000 / localhost:8000 |
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

# Gemini
GEMINI_API_KEY=

# Nanobanana
NANOBANANA_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=

# App
APP_ENV=production
FRONTEND_URL=https://app.hpb-studio.app
```

---

## 9. Teamプラン設計（追加）

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
    id UUID PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    owner_user_id UUID NOT NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    notes TEXT,
    max_salons INTEGER DEFAULT NULL,
    max_stylists_per_salon INTEGER DEFAULT NULL,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

#### organization_members
```sql
CREATE TABLE organization_members (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    UNIQUE(organization_id, user_id)
);
```

#### csv_import_jobs
```sql
CREATE TABLE csv_import_jobs (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL,
    import_type VARCHAR(20) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    total_rows INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    error_details JSONB DEFAULT '[]'
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
