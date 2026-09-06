-- =============================================
-- PHASE 7: Laundry Data Isolation RLS Policies
-- Purpose: Enable laundry owners to access their own records/prices via organization_id/branch_id
-- Safety: Adds new policies alongside existing hotel policies - no deletions
-- Impact: Enables multi-tenant data access for laundry SaaS
-- Transaction: All changes wrapped in a single transaction for atomic rollback
-- =============================================

BEGIN;

-- =============================================
-- Helper function to check if user can access a laundry branch
-- =============================================
CREATE OR REPLACE FUNCTION can_access_laundry_branch(target_branch_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  can_access BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships m
    JOIN public.organizations o ON m.organization_id = o.id
    JOIN public.branches b ON b.id = target_branch_id
    WHERE m.user_id = auth.uid()
      AND m.role = 'organization_admin'
      AND m.status = 'active'
      AND m.branch_id IS NULL
      AND o.type = 'laundry'
      AND o.status = 'active'
      AND b.organization_id = o.id
      AND b.status = 'active'
  ) INTO can_access;

  RETURN can_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Grant permissions
REVOKE ALL ON FUNCTION can_access_laundry_branch(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION can_access_laundry_branch(UUID) TO authenticated;

-- =============================================
-- Unique indexes for laundry mode upserts
-- =============================================

-- Records: globally unique by organization_id, branch_id, date
CREATE UNIQUE INDEX IF NOT EXISTS records_org_branch_date_unique
ON records(organization_id, branch_id, date);

-- Prices: globally unique by organization_id, branch_id, item_id
CREATE UNIQUE INDEX IF NOT EXISTS prices_org_branch_item_unique
ON prices(organization_id, branch_id, item_id);

-- =============================================
-- 1. RLS Policies for records (Laundry mode)
-- =============================================

-- Drop existing laundry policies if they exist (idempotency)
DROP POLICY IF EXISTS "records_laundry_select_own" ON records;
DROP POLICY IF EXISTS "records_laundry_insert_own" ON records;
DROP POLICY IF EXISTS "records_laundry_update_own" ON records;
DROP POLICY IF EXISTS "records_laundry_delete_own" ON records;
DROP POLICY IF EXISTS "records_laundry_guard" ON records;

-- RESTRICTIVE guard policy: prevent laundry owners from using legacy hotel policies
CREATE POLICY "records_laundry_guard" ON records
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    -- Allow hotel legacy policies to work normally if user is not laundry owner
    get_my_laundry_organization_id() IS NULL
    OR
    -- Laundry owners must only access their own organization's data
    (
      organization_id = get_my_laundry_organization_id()
      AND can_access_laundry_branch(branch_id)
    )
  )
  WITH CHECK (
    -- Allow hotel legacy policies to work normally if user is not laundry owner
    get_my_laundry_organization_id() IS NULL
    OR
    -- Laundry owners must only access their own organization's data
    (
      organization_id = get_my_laundry_organization_id()
      AND can_access_laundry_branch(branch_id)
    )
  );

-- Laundry owners can select their own organization's records
CREATE POLICY "records_laundry_select_own" ON records
  FOR SELECT
  USING (
    organization_id = get_my_laundry_organization_id()
    AND can_access_laundry_branch(branch_id)
  );

-- Laundry owners can insert records for their organization and accessible branches
CREATE POLICY "records_laundry_insert_own" ON records
  FOR INSERT
  WITH CHECK (
    organization_id = get_my_laundry_organization_id()
    AND can_access_laundry_branch(branch_id)
  );

-- Laundry owners can update their own records
CREATE POLICY "records_laundry_update_own" ON records
  FOR UPDATE
  USING (
    organization_id = get_my_laundry_organization_id()
    AND can_access_laundry_branch(branch_id)
  )
  WITH CHECK (
    organization_id = get_my_laundry_organization_id()
    AND can_access_laundry_branch(branch_id)
  );

-- Laundry owners can delete their own records
CREATE POLICY "records_laundry_delete_own" ON records
  FOR DELETE
  USING (
    organization_id = get_my_laundry_organization_id()
    AND can_access_laundry_branch(branch_id)
  );

-- =============================================
-- 2. RLS Policies for prices (Laundry mode)
-- =============================================

-- Drop existing laundry policies if they exist (idempotency)
DROP POLICY IF EXISTS "prices_laundry_select_own" ON prices;
DROP POLICY IF EXISTS "prices_laundry_insert_own" ON prices;
DROP POLICY IF EXISTS "prices_laundry_update_own" ON prices;
DROP POLICY IF EXISTS "prices_laundry_guard" ON prices;

-- RESTRICTIVE guard policy: prevent laundry owners from using legacy hotel policies
CREATE POLICY "prices_laundry_guard" ON prices
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    -- Allow hotel legacy policies to work normally if user is not laundry owner
    get_my_laundry_organization_id() IS NULL
    OR
    -- Laundry owners must only access their own organization's data
    (
      organization_id = get_my_laundry_organization_id()
      AND can_access_laundry_branch(branch_id)
    )
  )
  WITH CHECK (
    -- Allow hotel legacy policies to work normally if user is not laundry owner
    get_my_laundry_organization_id() IS NULL
    OR
    -- Laundry owners must only access their own organization's data
    (
      organization_id = get_my_laundry_organization_id()
      AND can_access_laundry_branch(branch_id)
    )
  );

-- Laundry owners can select their own organization's prices
CREATE POLICY "prices_laundry_select_own" ON prices
  FOR SELECT
  USING (
    organization_id = get_my_laundry_organization_id()
    AND can_access_laundry_branch(branch_id)
  );

-- Laundry owners can insert prices for their organization and accessible branches
CREATE POLICY "prices_laundry_insert_own" ON prices
  FOR INSERT
  WITH CHECK (
    organization_id = get_my_laundry_organization_id()
    AND can_access_laundry_branch(branch_id)
  );

-- Laundry owners can update their own prices
CREATE POLICY "prices_laundry_update_own" ON prices
  FOR UPDATE
  USING (
    organization_id = get_my_laundry_organization_id()
    AND can_access_laundry_branch(branch_id)
  )
  WITH CHECK (
    organization_id = get_my_laundry_organization_id()
    AND can_access_laundry_branch(branch_id)
  );

-- =============================================
-- 3. RLS Policies for record_items (Laundry mode)
-- =============================================

-- Drop existing laundry policies if they exist (idempotency)
DROP POLICY IF EXISTS "record_items_laundry_select_own" ON record_items;
DROP POLICY IF EXISTS "record_items_laundry_insert_own" ON record_items;
DROP POLICY IF EXISTS "record_items_laundry_update_own" ON record_items;
DROP POLICY IF EXISTS "record_items_laundry_delete_own" ON record_items;
DROP POLICY IF EXISTS "record_items_laundry_guard" ON record_items;

-- RESTRICTIVE guard policy: prevent laundry owners from using legacy hotel policies
CREATE POLICY "record_items_laundry_guard" ON record_items
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    -- Allow hotel legacy policies to work normally if user is not laundry owner
    get_my_laundry_organization_id() IS NULL
    OR
    -- Laundry owners must only access record_items belonging to their accessible records
    EXISTS (
      SELECT 1 FROM records
      WHERE records.id = record_items.record_id
        AND records.organization_id = get_my_laundry_organization_id()
        AND can_access_laundry_branch(records.branch_id)
    )
  )
  WITH CHECK (
    -- Allow hotel legacy policies to work normally if user is not laundry owner
    get_my_laundry_organization_id() IS NULL
    OR
    -- Laundry owners must only access record_items belonging to their accessible records
    EXISTS (
      SELECT 1 FROM records
      WHERE records.id = record_items.record_id
        AND records.organization_id = get_my_laundry_organization_id()
        AND can_access_laundry_branch(records.branch_id)
    )
  );

-- Laundry owners can select record_items belonging to their accessible records
CREATE POLICY "record_items_laundry_select_own" ON record_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM records
      WHERE records.id = record_items.record_id
        AND records.organization_id = get_my_laundry_organization_id()
        AND can_access_laundry_branch(records.branch_id)
    )
  );

-- Laundry owners can insert record_items for their accessible records
CREATE POLICY "record_items_laundry_insert_own" ON record_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM records
      WHERE records.id = record_items.record_id
        AND records.organization_id = get_my_laundry_organization_id()
        AND can_access_laundry_branch(records.branch_id)
    )
  );

-- Laundry owners can update record_items belonging to their accessible records
CREATE POLICY "record_items_laundry_update_own" ON record_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM records
      WHERE records.id = record_items.record_id
        AND records.organization_id = get_my_laundry_organization_id()
        AND can_access_laundry_branch(records.branch_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM records
      WHERE records.id = record_items.record_id
        AND records.organization_id = get_my_laundry_organization_id()
        AND can_access_laundry_branch(records.branch_id)
    )
  );

-- Laundry owners can delete record_items belonging to their accessible records
CREATE POLICY "record_items_laundry_delete_own" ON record_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM records
      WHERE records.id = record_items.record_id
        AND records.organization_id = get_my_laundry_organization_id()
        AND can_access_laundry_branch(records.branch_id)
    )
  );

COMMIT;

-- =============================================
-- END OF PHASE 7
-- =============================================
