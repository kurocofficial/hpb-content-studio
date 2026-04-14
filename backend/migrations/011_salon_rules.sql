-- Migration 011: サロンの店舗ルール（タグ付け）カラム追加
-- Pro/Teamプラン限定機能: NGワード・必須ワード・トンマナなどの生成ルールを保存

ALTER TABLE salons ADD COLUMN IF NOT EXISTS rules JSONB;

-- rules カラムの形式:
-- [{"tag": "NGワード", "value": "最安値"}, {"tag": "必須ワード", "value": "似合わせ"}, ...]
-- タグのプリセット: "NGワード" | "必須ワード" | "トンマナ" | "ブランドガイド" | 自由入力

COMMENT ON COLUMN salons.rules IS 'Pro/Team限定: 生成ルール（タグ+値のJSONB配列）';
