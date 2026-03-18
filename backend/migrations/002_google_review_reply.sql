-- Migration: 002_google_review_reply
-- Google口コミ返信機能の追加

-- generated_contents に platform カラムを追加（将来のフィルタリング用）
ALTER TABLE generated_contents
ADD COLUMN IF NOT EXISTS platform VARCHAR(20) DEFAULT 'hpb';

-- 既存データの platform を hpb に設定
UPDATE generated_contents SET platform = 'hpb' WHERE platform IS NULL;

-- google_review_reply のデータは platform = 'google' にする
-- (新規データは content_type に応じてアプリケーション側で設定)

-- content_type にインデックスを追加（フィルタリング高速化）
CREATE INDEX IF NOT EXISTS idx_generated_contents_content_type
ON generated_contents (content_type);

-- platform にインデックスを追加
CREATE INDEX IF NOT EXISTS idx_generated_contents_platform
ON generated_contents (platform);

-- prompt_templates に google_review_reply 用のデフォルトテンプレートを追加
INSERT INTO prompt_templates (content_type, name, template, is_active)
SELECT
    'google_review_reply',
    'Google口コミ返信（デフォルト）',
    'あなたはGoogleビジネスプロフィールの口コミ返信のプロフェッショナルです。Googleマップに投稿されたお客様の口コミに対して、丁寧で誠実な返信文を作成します。',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM prompt_templates
    WHERE content_type = 'google_review_reply' AND name = 'Google口コミ返信（デフォルト）'
);
