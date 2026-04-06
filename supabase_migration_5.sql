-- ============================================================
-- miseage migration 5: facility_config シードデータ
-- ============================================================

-- ── 大分類レベル（parent_category_key） ──────────────────────

-- 飲食・カフェ
INSERT INTO facility_config (parent_category_key, facility_key, is_default, is_visible, position) VALUES
  ('food_beverage', 'smoking',      true,  true, 1),
  ('food_beverage', 'takeout',      true,  true, 2),
  ('food_beverage', 'delivery',     true,  true, 3),
  ('food_beverage', 'credit_card',  true,  true, 4),
  ('food_beverage', 'reservation',  true,  true, 5),
  ('food_beverage', 'parking',      false, true, 6),
  ('food_beverage', 'wifi',         false, true, 7),
  ('food_beverage', 'power',        false, true, 8),
  ('food_beverage', 'private_room', false, true, 9)
ON CONFLICT DO NOTHING;

-- 美容・ヘルスケア
INSERT INTO facility_config (parent_category_key, facility_key, is_default, is_visible, position) VALUES
  ('beauty_health', 'reservation',  true,  true, 1),
  ('beauty_health', 'credit_card',  true,  true, 2),
  ('beauty_health', 'parking',      false, true, 3),
  ('beauty_health', 'wifi',         false, true, 4)
ON CONFLICT DO NOTHING;

-- フィットネス
INSERT INTO facility_config (parent_category_key, facility_key, is_default, is_visible, position) VALUES
  ('fitness', 'reservation',  true,  true, 1),
  ('fitness', 'credit_card',  true,  true, 2),
  ('fitness', 'parking',      false, true, 3)
ON CONFLICT DO NOTHING;

-- 医療・クリニック
INSERT INTO facility_config (parent_category_key, facility_key, is_default, is_visible, position) VALUES
  ('medical', 'reservation',  true,  true, 1),
  ('medical', 'credit_card',  true,  true, 2),
  ('medical', 'parking',      true,  true, 3)
ON CONFLICT DO NOTHING;

-- ショッピング・小売
INSERT INTO facility_config (parent_category_key, facility_key, is_default, is_visible, position) VALUES
  ('retail', 'credit_card',  true,  true, 1),
  ('retail', 'parking',      true,  true, 2),
  ('retail', 'wifi',         false, true, 3)
ON CONFLICT DO NOTHING;

-- サービス業
INSERT INTO facility_config (parent_category_key, facility_key, is_default, is_visible, position) VALUES
  ('service', 'reservation',  true,  true, 1),
  ('service', 'credit_card',  true,  true, 2),
  ('service', 'parking',      false, true, 3)
ON CONFLICT DO NOTHING;

-- ホテル・宿泊
INSERT INTO facility_config (parent_category_key, facility_key, is_default, is_visible, position) VALUES
  ('hotel', 'reservation',   true,  true, 1),
  ('hotel', 'credit_card',   true,  true, 2),
  ('hotel', 'parking',       true,  true, 3),
  ('hotel', 'wifi',          true,  true, 4)
ON CONFLICT DO NOTHING;

-- エンタメ・レジャー
INSERT INTO facility_config (parent_category_key, facility_key, is_default, is_visible, position) VALUES
  ('entertainment', 'credit_card',  true,  true, 1),
  ('entertainment', 'parking',      false, true, 2),
  ('entertainment', 'reservation',  false, true, 3),
  ('entertainment', 'smoking',      false, true, 4)
ON CONFLICT DO NOTHING;

-- 自動車
INSERT INTO facility_config (parent_category_key, facility_key, is_default, is_visible, position) VALUES
  ('automotive', 'credit_card',  true,  true, 1),
  ('automotive', 'parking',      true,  true, 2),
  ('automotive', 'reservation',  false, true, 3)
ON CONFLICT DO NOTHING;

-- 教育・スクール
INSERT INTO facility_config (parent_category_key, facility_key, is_default, is_visible, position) VALUES
  ('education', 'reservation',  true,  true, 1),
  ('education', 'parking',      false, true, 2),
  ('education', 'credit_card',  false, true, 3)
ON CONFLICT DO NOTHING;


-- ── 小分類レベル（大分類との差分のみ） ──────────────────────

-- カフェ：wifi・電源をデフォルト追加
INSERT INTO facility_config (category_id, facility_key, is_default, is_visible, position)
SELECT id, 'wifi',  true, true, 1 FROM category_master WHERE slug = 'cafe'
ON CONFLICT DO NOTHING;
INSERT INTO facility_config (category_id, facility_key, is_default, is_visible, position)
SELECT id, 'power', true, true, 2 FROM category_master WHERE slug = 'cafe'
ON CONFLICT DO NOTHING;

-- コーヒー専門店：wifi・電源をデフォルト追加
INSERT INTO facility_config (category_id, facility_key, is_default, is_visible, position)
SELECT id, 'wifi',  true, true, 1 FROM category_master WHERE slug = 'coffee-shop'
ON CONFLICT DO NOTHING;
INSERT INTO facility_config (category_id, facility_key, is_default, is_visible, position)
SELECT id, 'power', true, true, 2 FROM category_master WHERE slug = 'coffee-shop'
ON CONFLICT DO NOTHING;

-- 居酒屋・バー：個室をデフォルト追加
INSERT INTO facility_config (category_id, facility_key, is_default, is_visible, position)
SELECT id, 'private_room', true, true, 1 FROM category_master WHERE slug = 'izakaya-bar'
ON CONFLICT DO NOTHING;

-- レストラン：個室を「その他」で追加
INSERT INTO facility_config (category_id, facility_key, is_default, is_visible, position)
SELECT id, 'private_room', false, true, 1 FROM category_master WHERE slug = 'restaurant'
ON CONFLICT DO NOTHING;

-- ヨガ・ピラティス：予約は必須なのでデフォルト維持（大分類と同じなので追加不要）

-- ホテル：wifi をデフォルトに（大分類でも true だが念のため）
-- ※ 大分類ですでに is_default=true のため追加不要
