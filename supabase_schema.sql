-- =============================================
-- LAUNDRY SYSTEM — Supabase SQL Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================

-- 1. Prices per branch per item
CREATE TABLE prices (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch     TEXT NOT NULL,
  item_id    TEXT NOT NULL,
  price      NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (branch, item_id)
);

-- 2. Daily records (one row per day per branch)
CREATE TABLE records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch          TEXT NOT NULL,
  date            DATE NOT NULL,
  day             TEXT,
  client          TEXT,
  total_received  INT DEFAULT 0,
  total_washed    INT DEFAULT 0,
  total_remaining INT DEFAULT 0,
  total_amount    NUMERIC(10,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (branch, date)
);

-- 3. Item details for each daily record
CREATE TABLE record_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id      UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  item_id        TEXT NOT NULL,
  carry          INT DEFAULT 0,
  carry_treatment INT DEFAULT 0,
  new_qty        INT DEFAULT 0,
  total_received INT DEFAULT 0,
  washed         INT DEFAULT 0,
  for_treatment  INT DEFAULT 0,
  remaining_at_laundry INT DEFAULT 0,
  remaining      INT DEFAULT 0,
  price          NUMERIC(10,2) DEFAULT 0,
  amount         NUMERIC(10,2) DEFAULT 0
);

-- If you already created the tables before this update, run these lines once:
ALTER TABLE record_items ADD COLUMN IF NOT EXISTS for_treatment INT DEFAULT 0;
ALTER TABLE record_items ADD COLUMN IF NOT EXISTS remaining_at_laundry INT DEFAULT 0;
ALTER TABLE record_items ADD COLUMN IF NOT EXISTS carry_treatment INT DEFAULT 0;

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- Each user can only see their own branch data
-- =============================================

ALTER TABLE prices       ENABLE ROW LEVEL SECURITY;
ALTER TABLE records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_items ENABLE ROW LEVEL SECURITY;

-- Prices: user can only access their branch
CREATE POLICY "branch_prices" ON prices
  USING (branch = auth.jwt() -> 'user_metadata' ->> 'branch');

CREATE POLICY "branch_prices_insert" ON prices FOR INSERT
  WITH CHECK (branch = auth.jwt() -> 'user_metadata' ->> 'branch');

CREATE POLICY "branch_prices_update" ON prices FOR UPDATE
  USING (branch = auth.jwt() -> 'user_metadata' ->> 'branch');

-- Records: user can only access their branch
CREATE POLICY "branch_records" ON records
  USING (branch = auth.jwt() -> 'user_metadata' ->> 'branch');

CREATE POLICY "branch_records_insert" ON records FOR INSERT
  WITH CHECK (branch = auth.jwt() -> 'user_metadata' ->> 'branch');

CREATE POLICY "branch_records_update" ON records FOR UPDATE
  USING (branch = auth.jwt() -> 'user_metadata' ->> 'branch');

CREATE POLICY "branch_records_delete" ON records FOR DELETE
  USING (branch = auth.jwt() -> 'user_metadata' ->> 'branch');

-- Record items: accessible only through parent record's branch
CREATE POLICY "branch_record_items" ON record_items
  USING (
    record_id IN (
      SELECT id FROM records
      WHERE branch = auth.jwt() -> 'user_metadata' ->> 'branch'
    )
  );

CREATE POLICY "branch_record_items_insert" ON record_items FOR INSERT
  WITH CHECK (
    record_id IN (
      SELECT id FROM records
      WHERE branch = auth.jwt() -> 'user_metadata' ->> 'branch'
    )
  );

CREATE POLICY "branch_record_items_delete" ON record_items FOR DELETE
  USING (
    record_id IN (
      SELECT id FROM records
      WHERE branch = auth.jwt() -> 'user_metadata' ->> 'branch'
    )
  );

-- =============================================
-- HOW TO CREATE USERS (run in SQL Editor)
-- =============================================
-- After running this schema, create users like this:
--
-- SELECT supabase.auth.create_user('{
--   "email": "branch1@hotel.com",
--   "password": "password123",
--   "user_metadata": { "branch": "الفرع الأول" }
-- }');
--
-- SELECT supabase.auth.create_user('{
--   "email": "branch2@hotel.com",
--   "password": "password123",
--   "user_metadata": { "branch": "الفرع الثاني" }
-- }');
--
-- Or use: Supabase Dashboard → Authentication → Users → Add User
-- Then set user_metadata.branch in the user's metadata
