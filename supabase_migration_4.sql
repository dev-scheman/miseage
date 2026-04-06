-- ============================================================
-- miseage migration 4: facility_config を category_master に一本化
--                     categories テーブルを廃止
-- ============================================================

-- 1. facility_config の既存制約を削除
ALTER TABLE facility_config DROP CONSTRAINT IF EXISTS facility_config_category_id_fkey;
ALTER TABLE facility_config DROP CONSTRAINT IF EXISTS facility_config_category_id_facility_key_key;

-- 2. category_id を nullable に（大分類レベルの設定では NULL になる）
ALTER TABLE facility_config ALTER COLUMN category_id DROP NOT NULL;

-- 3. category_master への FK に付け替え
ALTER TABLE facility_config
  ADD CONSTRAINT facility_config_category_master_fkey
  FOREIGN KEY (category_id) REFERENCES category_master(id) ON DELETE CASCADE;

-- 4. 大分類レベルの設定用カラムを追加
--    例: "food_beverage" / "medical" など category_master.parent_category の値
ALTER TABLE facility_config
  ADD COLUMN IF NOT EXISTS parent_category_key TEXT;

-- 5. ユニーク制約（部分インデックスで NULL を除外）
--    小分類レベル: category_id + facility_key の組み合わせ
CREATE UNIQUE INDEX IF NOT EXISTS idx_facility_config_category_id_key
  ON facility_config (category_id, facility_key)
  WHERE category_id IS NOT NULL;

--    大分類レベル: parent_category_key + facility_key の組み合わせ
CREATE UNIQUE INDEX IF NOT EXISTS idx_facility_config_parent_category_key
  ON facility_config (parent_category_key, facility_key)
  WHERE parent_category_key IS NOT NULL;

-- 6. どちらか一方のみセット必須のチェック制約
ALTER TABLE facility_config
  ADD CONSTRAINT facility_config_category_check
  CHECK (
    (category_id IS NOT NULL AND parent_category_key IS NULL) OR
    (category_id IS NULL     AND parent_category_key IS NOT NULL)
  );

-- 7. categories テーブルを廃止
DROP TABLE IF EXISTS categories CASCADE;
