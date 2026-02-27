-- Migration 003: Team Plan Support
-- organizations, organization_members, csv_import_jobs テーブル追加
-- salons, subscriptions テーブル変更

-- =============================================
-- 1. organizations テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    owner_user_id UUID NOT NULL REFERENCES auth.users(id),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    notes TEXT,
    max_salons INTEGER DEFAULT NULL,              -- NULL=無制限
    max_stylists_per_salon INTEGER DEFAULT NULL,   -- NULL=無制限
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. organization_members テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member'
        CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- =============================================
-- 3. csv_import_jobs テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS csv_import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    import_type VARCHAR(20) NOT NULL CHECK (import_type IN ('salons', 'stylists')),
    file_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    total_rows INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    error_details JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. salons テーブル変更
-- =============================================

-- organization_id カラムを追加（NULLable: Free/Proは組織なし）
ALTER TABLE salons ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- 既存の user_id UNIQUE 制約を削除（組織ユーザーは複数サロン可能にする）
ALTER TABLE salons DROP CONSTRAINT IF EXISTS salons_user_id_key;

-- 条件付きユニーク制約: 組織に属さないユーザーは1サロンのみ
CREATE UNIQUE INDEX IF NOT EXISTS salons_user_id_unique_no_org
    ON salons (user_id) WHERE organization_id IS NULL;

-- =============================================
-- 5. subscriptions テーブル変更
-- =============================================

-- plan の CHECK 制約を更新して 'team' を追加
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check
    CHECK (plan IN ('free', 'pro', 'team'));

-- organization_id カラムを追加（Teamプランは組織に紐づく）
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- =============================================
-- 6. RLSポリシー
-- =============================================

-- organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organizations_select_members" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "organizations_update_owner_admin" ON organizations
    FOR UPDATE USING (
        id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- organization_members
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select" ON organization_members
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members AS om
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "org_members_insert_owner_admin" ON organization_members
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members AS om
            WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "org_members_delete_owner_admin" ON organization_members
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM organization_members AS om
            WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
        )
    );

-- csv_import_jobs
ALTER TABLE csv_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "csv_import_jobs_select" ON csv_import_jobs
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "csv_import_jobs_insert_owner_admin" ON csv_import_jobs
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- salons: 組織メンバーにもアクセスを許可する追加ポリシー
CREATE POLICY "salons_select_org_members" ON salons
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "salons_insert_org_admin" ON salons
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "salons_update_org_admin" ON salons
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- =============================================
-- 7. インデックス
-- =============================================
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_csv_import_jobs_org_id ON csv_import_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_salons_org_id ON salons(organization_id);
