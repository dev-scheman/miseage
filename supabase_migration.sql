-- ============================================================
-- miseage migration: category_master + shops拡張
-- Supabaseのダッシュボード > SQL Editor で実行してください
-- ============================================================

-- 1. category_master テーブル
CREATE TABLE IF NOT EXISTS category_master (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_category TEXT      NOT NULL,  -- 大分類slug (food_beverage, beauty_health, ...)
  parent_label    TEXT      NOT NULL,  -- 大分類表示名
  name            TEXT      NOT NULL,  -- 小分類名
  slug            TEXT      NOT NULL UNIQUE,
  schema_type     TEXT      NOT NULL,  -- JSON-LDのschema.orgタイプ
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 2. shops テーブルに住所・カテゴリを追加
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS postal_code    TEXT,
  ADD COLUMN IF NOT EXISTS city           TEXT,   -- 市区郡（zipcloud自動入力）
  ADD COLUMN IF NOT EXISTS street_address TEXT,   -- 番地以降（手入力）
  ADD COLUMN IF NOT EXISTS category_id    UUID REFERENCES category_master(id),
  ADD COLUMN IF NOT EXISTS metadata       JSONB DEFAULT '{}';  -- カテゴリ別追加フィールド

-- ※ prefecture カラムは既存のため追加不要

-- 3. category_master シードデータ（GBPカテゴリ準拠）

-- 飲食・カフェ
INSERT INTO category_master (parent_category, parent_label, name, slug, schema_type) VALUES
  ('food_beverage', '飲食・カフェ', 'カフェ',               'cafe',            'CafeOrCoffeeShop'),
  ('food_beverage', '飲食・カフェ', 'コーヒー専門店',       'coffee-shop',     'CafeOrCoffeeShop'),
  ('food_beverage', '飲食・カフェ', 'レストラン',           'restaurant',      'Restaurant'),
  ('food_beverage', '飲食・カフェ', 'ラーメン・麺類',       'ramen',           'Restaurant'),
  ('food_beverage', '飲食・カフェ', '焼肉・肉料理',         'yakiniku',        'Restaurant'),
  ('food_beverage', '飲食・カフェ', '居酒屋・バー',         'izakaya-bar',     'BarOrPub'),
  ('food_beverage', '飲食・カフェ', 'ベーカリー・パン屋',   'bakery',          'Bakery'),
  ('food_beverage', '飲食・カフェ', 'スイーツ・ケーキ',     'sweets',          'FoodEstablishment'),
  ('food_beverage', '飲食・カフェ', '寿司・海鮮',           'sushi-seafood',   'Restaurant'),
  ('food_beverage', '飲食・カフェ', '定食・弁当',           'teishoku',        'Restaurant'),
  ('food_beverage', '飲食・カフェ', '中華料理',             'chinese',         'Restaurant'),
  ('food_beverage', '飲食・カフェ', 'イタリアン',           'italian',         'Restaurant'),
  ('food_beverage', '飲食・カフェ', 'フレンチ',             'french',          'Restaurant'),
  ('food_beverage', '飲食・カフェ', 'ファストフード',       'fast-food',       'FastFoodRestaurant')
ON CONFLICT (slug) DO NOTHING;

-- 美容・ヘルスケア
INSERT INTO category_master (parent_category, parent_label, name, slug, schema_type) VALUES
  ('beauty_health', '美容・ヘルスケア', '美容室・ヘアサロン',   'hair-salon',          'HairSalon'),
  ('beauty_health', '美容・ヘルスケア', 'ネイルサロン',         'nail-salon',          'BeautySalon'),
  ('beauty_health', '美容・ヘルスケア', 'エステサロン',         'esthetic-salon',      'BeautySalon'),
  ('beauty_health', '美容・ヘルスケア', 'まつ毛エクステ',       'eyelash-extension',   'BeautySalon'),
  ('beauty_health', '美容・ヘルスケア', 'マッサージ・整体',     'massage',             'HealthClub'),
  ('beauty_health', '美容・ヘルスケア', '接骨院・整骨院',       'judo-therapy',        'MedicalClinic'),
  ('beauty_health', '美容・ヘルスケア', 'クリニック・医院',     'clinic',              'MedicalClinic'),
  ('beauty_health', '美容・ヘルスケア', '歯科医院',             'dental-clinic',       'Dentist'),
  ('beauty_health', '美容・ヘルスケア', '皮膚科・美容クリニック','skin-clinic',        'MedicalClinic')
ON CONFLICT (slug) DO NOTHING;

-- フィットネス
INSERT INTO category_master (parent_category, parent_label, name, slug, schema_type) VALUES
  ('fitness', 'フィットネス', 'ジム・フィットネス',       'gym',                  'SportsActivityLocation'),
  ('fitness', 'フィットネス', 'ヨガスタジオ',             'yoga',                 'SportsActivityLocation'),
  ('fitness', 'フィットネス', 'ピラティス',               'pilates',              'SportsActivityLocation'),
  ('fitness', 'フィットネス', 'パーソナルトレーニング',   'personal-training',    'SportsActivityLocation'),
  ('fitness', 'フィットネス', 'ダンススタジオ',           'dance-studio',         'SportsActivityLocation'),
  ('fitness', 'フィットネス', 'スポーツクラブ',           'sports-club',          'SportsActivityLocation')
ON CONFLICT (slug) DO NOTHING;

-- ショッピング・小売
INSERT INTO category_master (parent_category, parent_label, name, slug, schema_type) VALUES
  ('retail', 'ショッピング・小売', 'アパレル・ファッション', 'apparel',        'ClothingStore'),
  ('retail', 'ショッピング・小売', '雑貨・インテリア',       'general-goods',  'HomeGoodsStore'),
  ('retail', 'ショッピング・小売', '書店',                   'bookstore',      'BookStore'),
  ('retail', 'ショッピング・小売', 'ペットショップ',         'pet-shop',       'PetStore'),
  ('retail', 'ショッピング・小売', 'フラワーショップ',       'flower-shop',    'Florist'),
  ('retail', 'ショッピング・小売', 'コスメ・美容用品',       'cosmetics',      'Store')
ON CONFLICT (slug) DO NOTHING;

-- サービス業
INSERT INTO category_master (parent_category, parent_label, name, slug, schema_type) VALUES
  ('service', 'サービス業', '不動産',               'real-estate',    'RealEstateAgent'),
  ('service', 'サービス業', '学習塾・スクール',     'school',         'EducationalOrganization'),
  ('service', 'サービス業', '写真スタジオ',         'photo-studio',   'LocalBusiness'),
  ('service', 'サービス業', 'イベントスペース',     'event-space',    'EventVenue'),
  ('service', 'サービス業', 'コワーキングスペース', 'coworking',      'LocalBusiness')
ON CONFLICT (slug) DO NOTHING;
