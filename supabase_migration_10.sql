-- ============================================================
-- Migration 10: カテゴリー対応表
-- ============================================================

CREATE TABLE IF NOT EXISTS category_mapping (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,

  api_category    TEXT        NOT NULL UNIQUE,

  big_category    TEXT,
  detail_category TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- API category で検索用インデックス
CREATE INDEX IF NOT EXISTS idx_category_mapping_api
  ON category_mapping (api_category);

-- big_category で検索用インデックス
CREATE INDEX IF NOT EXISTS idx_category_mapping_big
  ON category_mapping (big_category) WHERE big_category IS NOT NULL;
