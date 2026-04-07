-- ============================================================
-- Migration 9: DataForce API 検索キャッシュテーブル
-- ============================================================

CREATE TABLE IF NOT EXISTS search_cache (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,

  prefecture      TEXT        NOT NULL,
  city            TEXT        NOT NULL,
  keyword         TEXT        NOT NULL,
  depth           INT         NOT NULL,

  results         JSONB       NOT NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL
);

-- 有効期限内のキャッシュ検索用インデックス
CREATE INDEX IF NOT EXISTS idx_search_cache_lookup
  ON search_cache (prefecture, city, keyword, depth, expires_at DESC);

-- 期限切れレコード削除用インデックス
CREATE INDEX IF NOT EXISTS idx_search_cache_expired
  ON search_cache (expires_at);

-- 定期的に期限切れレコードを削除するためのクエリ例（Cron 等で実行）
-- DELETE FROM search_cache WHERE expires_at <= now();
