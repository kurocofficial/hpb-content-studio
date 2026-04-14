-- 009: prompt_templates テーブルにRLSを有効化
-- システムマスターデータ: 認証済みユーザーはactiveなテンプレートのみ読取可
-- 書き込みはService Role（バックエンド）のみ

ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーはactiveなテンプレートのみ読取可能
CREATE POLICY "Authenticated users can view active templates" ON prompt_templates
    FOR SELECT TO authenticated
    USING (is_active = TRUE);
