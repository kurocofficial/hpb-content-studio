-- HPB Content Studio - 初期スキーマ
-- Supabase SQLエディタで実行してください

-- UUIDの拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- テーブル作成
-- ==========================================

-- サロンテーブル
CREATE TABLE IF NOT EXISTS salons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    area VARCHAR(100) NOT NULL,
    concept TEXT,
    target_customer VARCHAR(200),
    strength TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id) -- 1ユーザー1サロン
);

-- スタイリストテーブル
CREATE TABLE IF NOT EXISTS stylists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    role VARCHAR(50),
    years_experience INTEGER,
    specialties JSONB DEFAULT '[]'::JSONB,
    style_features JSONB DEFAULT '[]'::JSONB,
    personality TEXT,
    writing_style JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 生成コンテンツテーブル
CREATE TABLE IF NOT EXISTS generated_contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    stylist_id UUID REFERENCES stylists(id) ON DELETE SET NULL,
    content_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    char_count INTEGER NOT NULL DEFAULT 0,
    prompt_used TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- チャットセッションテーブル
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID NOT NULL REFERENCES generated_contents(id) ON DELETE CASCADE,
    turn_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- チャットメッセージテーブル
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- サブスクリプションテーブル
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due')),
    stripe_customer_id VARCHAR(100),
    stripe_subscription_id VARCHAR(100),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 利用量追跡テーブル
CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    year_month VARCHAR(7) NOT NULL, -- YYYY-MM形式
    text_generation_count INTEGER DEFAULT 0,
    blog_generation_count INTEGER DEFAULT 0,
    image_generation_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, year_month)
);

-- プロンプトテンプレートテーブル
CREATE TABLE IF NOT EXISTS prompt_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- インデックス作成
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_salons_user_id ON salons(user_id);
CREATE INDEX IF NOT EXISTS idx_stylists_salon_id ON stylists(salon_id);
CREATE INDEX IF NOT EXISTS idx_generated_contents_salon_id ON generated_contents(salon_id);
CREATE INDEX IF NOT EXISTS idx_generated_contents_created_at ON generated_contents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_content_id ON chat_sessions(content_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_year_month ON usage_tracking(year_month);

-- ==========================================
-- Row Level Security (RLS) ポリシー
-- ==========================================

-- RLSを有効化
ALTER TABLE salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE stylists ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- サロンのRLSポリシー
CREATE POLICY "Users can view own salon" ON salons
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own salon" ON salons
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own salon" ON salons
    FOR UPDATE USING (auth.uid() = user_id);

-- スタイリストのRLSポリシー
CREATE POLICY "Users can view own stylists" ON stylists
    FOR SELECT USING (
        salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
    );
CREATE POLICY "Users can insert own stylists" ON stylists
    FOR INSERT WITH CHECK (
        salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
    );
CREATE POLICY "Users can update own stylists" ON stylists
    FOR UPDATE USING (
        salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
    );
CREATE POLICY "Users can delete own stylists" ON stylists
    FOR DELETE USING (
        salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
    );

-- 生成コンテンツのRLSポリシー
CREATE POLICY "Users can view own contents" ON generated_contents
    FOR SELECT USING (
        salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
    );
CREATE POLICY "Users can insert own contents" ON generated_contents
    FOR INSERT WITH CHECK (
        salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
    );
CREATE POLICY "Users can update own contents" ON generated_contents
    FOR UPDATE USING (
        salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
    );
CREATE POLICY "Users can delete own contents" ON generated_contents
    FOR DELETE USING (
        salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
    );

-- チャットセッションのRLSポリシー
CREATE POLICY "Users can view own chat sessions" ON chat_sessions
    FOR SELECT USING (
        content_id IN (
            SELECT gc.id FROM generated_contents gc
            JOIN salons s ON gc.salon_id = s.id
            WHERE s.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can insert own chat sessions" ON chat_sessions
    FOR INSERT WITH CHECK (
        content_id IN (
            SELECT gc.id FROM generated_contents gc
            JOIN salons s ON gc.salon_id = s.id
            WHERE s.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can update own chat sessions" ON chat_sessions
    FOR UPDATE USING (
        content_id IN (
            SELECT gc.id FROM generated_contents gc
            JOIN salons s ON gc.salon_id = s.id
            WHERE s.user_id = auth.uid()
        )
    );

-- チャットメッセージのRLSポリシー
CREATE POLICY "Users can view own chat messages" ON chat_messages
    FOR SELECT USING (
        session_id IN (
            SELECT cs.id FROM chat_sessions cs
            JOIN generated_contents gc ON cs.content_id = gc.id
            JOIN salons s ON gc.salon_id = s.id
            WHERE s.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can insert own chat messages" ON chat_messages
    FOR INSERT WITH CHECK (
        session_id IN (
            SELECT cs.id FROM chat_sessions cs
            JOIN generated_contents gc ON cs.content_id = gc.id
            JOIN salons s ON gc.salon_id = s.id
            WHERE s.user_id = auth.uid()
        )
    );

-- サブスクリプションのRLSポリシー
CREATE POLICY "Users can view own subscription" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- 利用量追跡のRLSポリシー
CREATE POLICY "Users can view own usage" ON usage_tracking
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage" ON usage_tracking
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own usage" ON usage_tracking
    FOR UPDATE USING (auth.uid() = user_id);

-- ==========================================
-- 更新日時自動更新のトリガー
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_salons_updated_at
    BEFORE UPDATE ON salons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stylists_updated_at
    BEFORE UPDATE ON stylists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_contents_updated_at
    BEFORE UPDATE ON generated_contents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_tracking_updated_at
    BEFORE UPDATE ON usage_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Service Role用ポリシー（バックエンドAPI用）
-- ==========================================

-- Service Roleはすべてのテーブルにアクセス可能
-- これはSupabaseのデフォルト動作
