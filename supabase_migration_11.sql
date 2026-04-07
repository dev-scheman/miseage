-- ============================================================
-- Migration 11: FAQ JSON-LD
-- ============================================================

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS faqs_jsonb JSONB DEFAULT '[]'::JSONB;

-- FAQ 検索用インデックス（必要に応じて）
CREATE INDEX IF NOT EXISTS idx_shops_faqs
  ON shops USING GIN (faqs_jsonb);
