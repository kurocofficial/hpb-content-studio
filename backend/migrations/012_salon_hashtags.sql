-- Migration 012: サロンのブログハッシュタグカラム追加
-- Pro/Teamプラン限定機能: ブログ記事末尾に自動付与するハッシュタグを保存

ALTER TABLE salons ADD COLUMN IF NOT EXISTS hashtags JSONB;

-- hashtags カラムの形式:
-- ["#Reala藤沢", "#縮毛矯正", "#髪質改善"]
-- ハッシュタグ文字数もブログの目標文字数に含まれる（Python側で計算・付与）

COMMENT ON COLUMN salons.hashtags IS 'Pro/Team限定: ブログ記事末尾に自動付与するハッシュタグ（文字列配列）';
