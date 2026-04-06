-- ============================================================
-- miseage migration 2: 営業時間 + 医療カテゴリ追加
-- ============================================================

-- 1. shops に opening_hours カラム追加
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '{}';

-- 2. beauty_health の医療系を medical に移動
UPDATE category_master
SET
  parent_category = 'medical',
  parent_label    = '医療・クリニック'
WHERE slug IN (
  'judo-therapy',
  'clinic',
  'dental-clinic',
  'skin-clinic'
);

-- 3. medical カテゴリの追加（既存に被らない分）
INSERT INTO category_master (parent_category, parent_label, name, slug, schema_type) VALUES
  ('medical', '医療・クリニック', '内科・一般診療',   'general-clinic',   'MedicalClinic'),
  ('medical', '医療・クリニック', '小児科',           'pediatrics',       'MedicalClinic'),
  ('medical', '医療・クリニック', '眼科',             'ophthalmology',    'MedicalClinic'),
  ('medical', '医療・クリニック', '耳鼻科',           'ent-clinic',       'MedicalClinic'),
  ('medical', '医療・クリニック', '整形外科',         'orthopedics',      'MedicalClinic'),
  ('medical', '医療・クリニック', '薬局',             'pharmacy',         'Pharmacy'),
  ('medical', '医療・クリニック', '動物病院',         'veterinary',       'VeterinaryCare')
ON CONFLICT (slug) DO NOTHING;
