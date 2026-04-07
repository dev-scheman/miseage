-- ============================================================
-- Migration 7: MEO 順位追跡機能のテーブル追加
-- ============================================================

-- ============================================================
-- 1. shops テーブルへの追加カラム
-- ============================================================

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS place_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS place_id_status TEXT NOT NULL DEFAULT 'none'
    CHECK (place_id_status IN ('none', 'searching', 'confirmed')),
  ADD COLUMN IF NOT EXISTS place_confirmed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_shops_place_id ON shops (place_id) WHERE place_id IS NOT NULL;

-- ============================================================
-- 2. profiles テーブルへの追加カラム
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS extra_keyword_slots INT NOT NULL DEFAULT 0
    CHECK (extra_keyword_slots >= 0);

-- ============================================================
-- 3. shop_keywords テーブル（新規作成）
-- ============================================================

CREATE TABLE IF NOT EXISTS shop_keywords (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,

  shop_id         UUID        NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  keyword         TEXT        NOT NULL,

  position        INT         NOT NULL DEFAULT 1
    CHECK (position >= 1 AND position <= 20),

  is_active       BOOLEAN     NOT NULL DEFAULT true,

  is_paid         BOOLEAN     NOT NULL DEFAULT false,

  stripe_item_id  TEXT,

  next_check_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  last_checked_at TIMESTAMPTZ,

  latest_rank     INT
    CHECK (latest_rank IS NULL OR (latest_rank >= 1 AND latest_rank <= 20)),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_keywords_next_check
  ON shop_keywords (next_check_at)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_shop_keywords_shop_id
  ON shop_keywords (shop_id, is_active, position);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_keywords_unique_active
  ON shop_keywords (shop_id, keyword)
  WHERE is_active = true;

-- ============================================================
-- 4. rank_checks テーブル（新規作成）
-- ============================================================

CREATE TABLE IF NOT EXISTS rank_checks (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,

  keyword_id    UUID        NOT NULL REFERENCES shop_keywords(id) ON DELETE RESTRICT,

  shop_id       UUID        NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  keyword_text  TEXT        NOT NULL,

  search_area   TEXT        NOT NULL,

  rank          INT
    CHECK (rank IS NULL OR (rank >= 1 AND rank <= 20)),

  is_active     BOOLEAN     NOT NULL DEFAULT true,

  check_status  TEXT        NOT NULL DEFAULT 'ok'
    CHECK (check_status IN ('ok', 'not_found', 'api_error', 'rate_limited')),

  error_message TEXT,

  checked_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rank_checks_keyword_time
  ON rank_checks (keyword_id, checked_at DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_rank_checks_shop_id
  ON rank_checks (shop_id, checked_at DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_rank_checks_checked_at
  ON rank_checks (checked_at);

-- ============================================================
-- 5. keyword_purchases テーブル（新規作成）
-- ============================================================

CREATE TABLE IF NOT EXISTS keyword_purchases (
  id                     UUID        DEFAULT gen_random_uuid() PRIMARY KEY,

  user_id                UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  shop_id                UUID        NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  stripe_subscription_id TEXT,

  stripe_item_id         TEXT UNIQUE,

  quantity               INT         NOT NULL DEFAULT 1
    CHECK (quantity >= 1),

  unit_price             INT         NOT NULL DEFAULT 100,

  status                 TEXT        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'canceled', 'past_due')),

  purchased_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  canceled_at            TIMESTAMPTZ,

  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_keyword_purchases_user_id
  ON keyword_purchases (user_id, status);

CREATE INDEX IF NOT EXISTS idx_keyword_purchases_shop_id
  ON keyword_purchases (shop_id, status);

-- ============================================================
-- 6. RLS ポリシー設定
-- ============================================================

ALTER TABLE shop_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE rank_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_purchases ENABLE ROW LEVEL SECURITY;

-- shop_keywords: 自分の店舗のキーワードのみ操作可能
CREATE POLICY "shop_keywords_owner" ON shop_keywords
  FOR ALL USING (
    shop_id IN (
      SELECT id FROM shops WHERE user_id = auth.uid()
    )
  );

-- rank_checks: 自分の店舗の履歴のみ参照可能
CREATE POLICY "rank_checks_owner" ON rank_checks
  FOR SELECT USING (
    shop_id IN (
      SELECT id FROM shops WHERE user_id = auth.uid()
    )
  );

-- rank_checks: INSERT は service_role のみ（Cron）
CREATE POLICY "rank_checks_service_insert" ON rank_checks
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- keyword_purchases: 自分の購入履歴のみ参照可能
CREATE POLICY "keyword_purchases_owner" ON keyword_purchases
  FOR SELECT USING (user_id = auth.uid());

-- keyword_purchases: service_role のみ書き込み可能（Stripe webhook）
CREATE POLICY "keyword_purchases_service_write" ON keyword_purchases
  FOR ALL USING (auth.role() = 'service_role');

