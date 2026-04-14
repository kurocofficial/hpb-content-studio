-- 007: コンテンツカレンダー（Pro/Team限定機能）
-- 予定されたコンテンツ生成のスケジュール管理

CREATE TABLE IF NOT EXISTS content_calendar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    stylist_id UUID REFERENCES stylists(id) ON DELETE SET NULL,
    content_type VARCHAR(50) NOT NULL,
    scheduled_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'planned',  -- planned / generated / published
    generated_content_id UUID REFERENCES generated_contents(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_content_calendar_salon_id ON content_calendar(salon_id);
CREATE INDEX IF NOT EXISTS idx_content_calendar_scheduled_date ON content_calendar(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_content_calendar_status ON content_calendar(status);

-- 更新日時自動更新トリガー
CREATE TRIGGER update_content_calendar_updated_at
    BEFORE UPDATE ON content_calendar
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
