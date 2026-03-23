-- Migration 005: モデルとDBのカラム差分を解消
-- subscriptions, usage_tracking, generated_contents に不足カラムを追加

-- =============================================
-- 1. subscriptions テーブル
-- =============================================
-- trial_end カラム追加
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ;

-- =============================================
-- 2. usage_tracking テーブル
-- =============================================
-- トークン使用量カラム追加
ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS total_input_tokens BIGINT DEFAULT 0;
ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS total_output_tokens BIGINT DEFAULT 0;

-- =============================================
-- 3. generated_contents テーブル
-- =============================================
-- 個別トークン記録カラム追加
ALTER TABLE generated_contents ADD COLUMN IF NOT EXISTS input_tokens INTEGER DEFAULT 0;
ALTER TABLE generated_contents ADD COLUMN IF NOT EXISTS output_tokens INTEGER DEFAULT 0;
