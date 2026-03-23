-- 006: スタイリストメタデータ拡張
-- language_style: 方言・一人称・呼び方・口癖
-- background: 趣味・動機・座右の銘・ファッション
-- service_info: ターゲット層・接客スタイル・カウンセリング

ALTER TABLE stylists ADD COLUMN IF NOT EXISTS language_style JSONB;
ALTER TABLE stylists ADD COLUMN IF NOT EXISTS background JSONB;
ALTER TABLE stylists ADD COLUMN IF NOT EXISTS service_info JSONB;
