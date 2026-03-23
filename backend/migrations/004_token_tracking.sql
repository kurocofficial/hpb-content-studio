-- 004_token_tracking.sql
-- トークン使用量の追跡カラムを追加

-- usage_tracking にトークンカラム追加
ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS total_input_tokens BIGINT DEFAULT 0;
ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS total_output_tokens BIGINT DEFAULT 0;

-- generated_contents にも個別記録
ALTER TABLE generated_contents ADD COLUMN IF NOT EXISTS input_tokens INTEGER DEFAULT 0;
ALTER TABLE generated_contents ADD COLUMN IF NOT EXISTS output_tokens INTEGER DEFAULT 0;
