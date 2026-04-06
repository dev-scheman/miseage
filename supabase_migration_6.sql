-- ============================================================
-- miseage migration 6: opening_hours 再確認 + image_url追加
-- ============================================================

-- 1. opening_hours カラム（未適用の場合に備えて再追加）
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '{}';

-- 2. image_url カラム追加（ロゴ・店舗写真 / JSON-LD用）
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 3. Supabase Storage バケット作成
--    ダッシュボード > Storage > New bucket で手動作成してください
--    バケット名: shop-images
--    Public: ON（公開URL発行のため）
