-- =============================================
-- PHASE 4: Laundry SaaS RLS Policies
-- Purpose: Enable laundry owners to manage their branches with full isolation
-- Safety: RLS policies only - no data changes, no frontend changes
-- Impact: Enables multi-tenant laundry SaaS model
-- Transaction: All changes wrapped in a single transaction for atomic rollback
-- =============================================

BEGIN;

-- =============================================
-- 1. Partial UNIQUE Index for single organization membership
-- =============================================
-- Ensures a user can have only one active organization-level membership
CREATE UNIQUE INDEX IF NOT EXISTS memberships_user_org_active_unique
  ON memberships(user_id)
  WHERE branch_id IS NULL AND status = 'active';

-- =============================================
-- 2. Helper function to get user's laundry organization_id
-- =============================================
CREATE OR REPLACE FUNCTION get_my_laundry_organization_id()
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT m.organization_id INTO org_id
  FROM public.memberships m
  JOIN public.organizations o ON m.organization_id = o.id
  WHERE m.user_id = auth.uid()
    AND m.role = 'organization_admin'
    AND m.status = 'active'
    AND m.branch_id IS NULL
    AND o.type = 'laundry'
    AND o.status = 'active';
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Grant permissions
REVOKE ALL ON FUNCTION get_my_laundry_organization_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_my_laundry_organization_id() TO authenticated;

-- =============================================
-- 3. RLS Policies for organizations
-- =============================================

-- Drop existing policies if they exist (idempotency)
DROP POLICY IF EXISTS "organizations_select_own" ON organizations;
DROP POLICY IF EXISTS "organizations_update_own" ON organizations;

-- organization_admin can select their own laundry organization
CREATE POLICY "organizations_select_own" ON organizations
  FOR SELECT
  USING (id = get_my_laundry_organization_id());

-- organization_admin can update their own laundry organization
CREATE POLICY "organizations_update_own" ON organizations
  FOR UPDATE
  USING (id = get_my_laundry_organization_id())
  WITH CHECK (id = get_my_laundry_organization_id());

-- =============================================
-- 4. RLS Policies for branches
-- =============================================

-- Drop existing policies if they exist (idempotency)
DROP POLICY IF EXISTS "branches_select_own_org" ON branches;
DROP POLICY IF EXISTS "branches_insert_own_org" ON branches;
DROP POLICY IF EXISTS "branches_update_own_org" ON branches;

-- organization_admin can select branches of their laundry organization
CREATE POLICY "branches_select_own_org" ON branches
  FOR SELECT
  USING (organization_id = get_my_laundry_organization_id());

-- organization_admin can insert branches in their laundry organization
CREATE POLICY "branches_insert_own_org" ON branches
  FOR INSERT
  WITH CHECK (organization_id = get_my_laundry_organization_id());

-- organization_admin can update branches in their laundry organization
CREATE POLICY "branches_update_own_org" ON branches
  FOR UPDATE
  USING (organization_id = get_my_laundry_organization_id())
  WITH CHECK (organization_id = get_my_laundry_organization_id());

-- No delete policy - use status='archived' instead

-- =============================================
-- 5. RLS Policies for memberships
-- =============================================

-- Drop existing policies if they exist (idempotency)
DROP POLICY IF EXISTS "memberships_select_own" ON memberships;

-- Users can only select their own memberships
CREATE POLICY "memberships_select_own" ON memberships
  FOR SELECT
  USING (user_id = auth.uid());

-- No insert/update/delete policies - memberships managed administratively

COMMIT;

-- =============================================
-- END OF PHASE 4
-- =============================================
