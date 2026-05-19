-- Migration 013: chat_messages テーブルに updated_at カラムを追加
-- TimestampMixin が updated_at を定義しているが、001_initial_schema.sql に漏れていた

-- テーブルが存在しない場合は updated_at つきで作成
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- テーブルが既に存在する場合は updated_at カラムを追加
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- インデックス（未作成の場合のみ）
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);

-- RLS（未設定の場合のみ）
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own chat messages" ON chat_messages
    FOR SELECT USING (
        session_id IN (
            SELECT cs.id FROM chat_sessions cs
            JOIN generated_contents gc ON cs.content_id = gc.id
            JOIN salons s ON gc.salon_id = s.id
            WHERE s.user_id = auth.uid()
        )
    );

CREATE POLICY IF NOT EXISTS "Users can insert own chat messages" ON chat_messages
    FOR INSERT WITH CHECK (
        session_id IN (
            SELECT cs.id FROM chat_sessions cs
            JOIN generated_contents gc ON cs.content_id = gc.id
            JOIN salons s ON gc.salon_id = s.id
            WHERE s.user_id = auth.uid()
        )
    );
