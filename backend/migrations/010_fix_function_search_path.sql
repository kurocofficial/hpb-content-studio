-- 010: update_updated_at_column 関数の search_path を固定
-- Supabase Advisor警告: "Function has a role mutable search_path" の解消

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;
