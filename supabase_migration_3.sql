-- ============================================================
-- miseage migration 3: 病院追加 + 大分類4種追加
-- ============================================================

-- 1. medical に病院を追加
INSERT INTO category_master (parent_category, parent_label, name, slug, schema_type) VALUES
  ('medical', '医療・クリニック', '病院・総合病院', 'hospital', 'Hospital')
ON CONFLICT (slug) DO NOTHING;

-- 2. 教育・スクール
INSERT INTO category_master (parent_category, parent_label, name, slug, schema_type) VALUES
  ('education', '教育・スクール', '学習塾・予備校',     'cram-school',       'EducationalOrganization'),
  ('education', '教育・スクール', '語学スクール',        'language-school',   'EducationalOrganization'),
  ('education', '教育・スクール', '保育園・幼稚園',      'nursery-school',    'ChildCare'),
  ('education', '教育・スクール', '音楽・楽器教室',      'music-school',      'EducationalOrganization'),
  ('education', '教育・スクール', 'スポーツ・習い事',    'sports-school',     'EducationalOrganization'),
  ('education', '教育・スクール', '専門学校・スクール',  'vocational-school', 'EducationalOrganization')
ON CONFLICT (slug) DO NOTHING;

-- 3. ホテル・宿泊
INSERT INTO category_master (parent_category, parent_label, name, slug, schema_type) VALUES
  ('hotel', 'ホテル・宿泊', 'ホテル',               'hotel',        'Hotel'),
  ('hotel', 'ホテル・宿泊', '旅館',                 'ryokan',       'LodgingBusiness'),
  ('hotel', 'ホテル・宿泊', 'ゲストハウス・民宿',   'guesthouse',   'LodgingBusiness'),
  ('hotel', 'ホテル・宿泊', 'リゾート・ヴィラ',     'resort',       'Resort'),
  ('hotel', 'ホテル・宿泊', 'カプセルホテル',       'capsule-hotel','LodgingBusiness')
ON CONFLICT (slug) DO NOTHING;

-- 4. エンタメ・レジャー
INSERT INTO category_master (parent_category, parent_label, name, slug, schema_type) VALUES
  ('entertainment', 'エンタメ・レジャー', 'カラオケ',           'karaoke',          'EntertainmentBusiness'),
  ('entertainment', 'エンタメ・レジャー', '映画館',             'cinema',           'MovieTheater'),
  ('entertainment', 'エンタメ・レジャー', 'ゲームセンター',     'game-center',      'AmusementCenter'),
  ('entertainment', 'エンタメ・レジャー', 'ゴルフ・ゴルフ場',  'golf',             'SportsActivityLocation'),
  ('entertainment', 'エンタメ・レジャー', 'ボウリング',         'bowling',          'BowlingAlley'),
  ('entertainment', 'エンタメ・レジャー', 'スパ・温泉',         'spa-onsen',        'DaySpa'),
  ('entertainment', 'エンタメ・レジャー', 'アミューズメント',   'amusement',        'AmusementPark')
ON CONFLICT (slug) DO NOTHING;

-- 5. 自動車
INSERT INTO category_master (parent_category, parent_label, name, slug, schema_type) VALUES
  ('automotive', '自動車', 'カーディーラー・販売',   'car-dealer',       'AutoDealer'),
  ('automotive', '自動車', '中古車販売',             'used-car-dealer',  'AutoDealer'),
  ('automotive', '自動車', '車検・整備・修理',       'auto-repair',      'AutoRepair'),
  ('automotive', '自動車', 'ガソリンスタンド',       'gas-station',      'GasStation'),
  ('automotive', '自動車', '洗車・コーティング',     'car-wash',         'AutoWash'),
  ('automotive', '自動車', 'バイク・二輪',           'motorcycle',       'MotorcycleDealer')
ON CONFLICT (slug) DO NOTHING;
