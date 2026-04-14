-- 008: content_calendar テーブルにRLSを有効化
-- salon_id 経由でアクセス制御（個人ユーザー + 組織メンバー）

ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 個人ユーザー: 自分のサロンのカレンダーのみ
-- ==========================================

CREATE POLICY "Users can view own calendar" ON content_calendar
    FOR SELECT USING (
        salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert own calendar" ON content_calendar
    FOR INSERT WITH CHECK (
        salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update own calendar" ON content_calendar
    FOR UPDATE USING (
        salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete own calendar" ON content_calendar
    FOR DELETE USING (
        salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
    );

-- ==========================================
-- 組織メンバー: 所属組織のサロンのカレンダー
-- ==========================================

-- 閲覧: 全メンバー
CREATE POLICY "calendar_select_org_members" ON content_calendar
    FOR SELECT USING (
        salon_id IN (
            SELECT s.id FROM salons s
            WHERE s.organization_id IN (
                SELECT organization_id FROM organization_members
                WHERE user_id = auth.uid()
            )
        )
    );

-- 作成: owner/admin のみ
CREATE POLICY "calendar_insert_org_admin" ON content_calendar
    FOR INSERT WITH CHECK (
        salon_id IN (
            SELECT s.id FROM salons s
            WHERE s.organization_id IN (
                SELECT organization_id FROM organization_members
                WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
            )
        )
    );

-- 更新: owner/admin のみ
CREATE POLICY "calendar_update_org_admin" ON content_calendar
    FOR UPDATE USING (
        salon_id IN (
            SELECT s.id FROM salons s
            WHERE s.organization_id IN (
                SELECT organization_id FROM organization_members
                WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
            )
        )
    );

-- 削除: owner/admin のみ
CREATE POLICY "calendar_delete_org_admin" ON content_calendar
    FOR DELETE USING (
        salon_id IN (
            SELECT s.id FROM salons s
            WHERE s.organization_id IN (
                SELECT organization_id FROM organization_members
                WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
            )
        )
    );
