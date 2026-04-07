-- ============================================================
-- Migration 12: FAQ テンプレート
-- ============================================================

ALTER TABLE facility_master
  ADD COLUMN IF NOT EXISTS faq_question TEXT,
  ADD COLUMN IF NOT EXISTS faq_answer_example TEXT;

-- 駐車場
UPDATE facility_master
SET faq_question = '駐車場はありますか？',
    faq_answer_example = '例）無料駐車場30台完備'
WHERE key = 'parking';

-- WiFi
UPDATE facility_master
SET faq_question = 'WiFiは使えますか？',
    faq_answer_example = '例）無料で利用可能'
WHERE key = 'wifi';

-- ペット同伴
UPDATE facility_master
SET faq_question = 'ペットは同伴可能ですか？',
    faq_answer_example = '例）小型犬のみ可、事前予約必須'
WHERE key = 'pet_friendly';

-- テイクアウト可
UPDATE facility_master
SET faq_question = 'テイクアウトは可能ですか？',
    faq_answer_example = '例）可能、営業時間内は随時受付'
WHERE key = 'takeout';

-- 個室
UPDATE facility_master
SET faq_question = '個室はありますか？',
    faq_answer_example = '例）2名～20名対応、要予約'
WHERE key = 'private_room';

-- 喫煙
UPDATE facility_master
SET faq_question = '喫煙はできますか？',
    faq_answer_example = '例）喫煙エリア完備'
WHERE key = 'smoking';
