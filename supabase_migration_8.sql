-- ============================================================
-- Migration 8: DataForce API 連携カラムを shops テーブルに追加
-- ============================================================

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS dataforce_response JSONB,
  ADD COLUMN IF NOT EXISTS place_rating NUMERIC,
  ADD COLUMN IF NOT EXISTS place_votes INT,
  ADD COLUMN IF NOT EXISTS place_latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS place_longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS other_urls TEXT[];

-- インデックス: 評価で検索・ソート可能にする
CREATE INDEX IF NOT EXISTS idx_shops_place_rating ON shops (place_rating DESC NULLS LAST);
