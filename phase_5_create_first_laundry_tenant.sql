-- =============================================
-- PHASE 5: Create First Laundry Tenant
-- Purpose: Create first laundry organization and link existing auth user as admin
-- Safety: Idempotent - checks for existing data before creating
-- Impact: Adds new laundry tenant without affecting existing hotel system
-- Transaction: All changes wrapped in a single transaction for atomic rollback
-- =============================================

-- =============================================
-- CONFIGURATION - Replace these values
-- =============================================
-- LAUNDRY_NAME: Name of the laundry organization (e.g., 'Excellent Laundry')
-- OWNER_EMAIL: Email of existing auth user to link as admin (e.g., 'admin@example.com')

BEGIN;

DO $$
DECLARE
  laundry_name TEXT := 'Excellent Laundry';
  owner_email TEXT := 'admin@example.com';
  
  org_id UUID;
  user_id UUID;
  existing_membership_count INT;
  org_slug TEXT;
BEGIN
  -- =============================================
  -- 1. Generate safe unique slug from laundry name
  -- =============================================
  org_slug := 'laundry-' || lower(regexp_replace(laundry_name, '[^a-z0-9]+', '-', 'g')) || '-' || substr(md5(laundry_name || now()::text), 1, 8);
  
  -- =============================================
  -- 2. Check if user exists in auth.users
  -- =============================================
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = owner_email;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % does not exist in auth.users', owner_email;
  END IF;
  
  -- =============================================
  -- 3. Check if user already has active organization-level membership
  -- =============================================
  SELECT COUNT(*) INTO existing_membership_count
  FROM memberships
  WHERE user_id = user_id
    AND branch_id IS NULL
    AND status = 'active';
  
  IF existing_membership_count > 0 THEN
    RAISE EXCEPTION 'User % already has an active organization-level membership', owner_email;
  END IF;
  
  -- =============================================
  -- 4. Create laundry organization
  -- =============================================
  INSERT INTO organizations (name, slug, type, status)
  VALUES (laundry_name, org_slug, 'laundry', 'active')
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO org_id;
  
  -- If organization already exists with this slug, get its ID
  IF org_id IS NULL THEN
    SELECT id INTO org_id FROM organizations WHERE slug = org_slug;
  END IF;
  
  -- =============================================
  -- 5. Create membership for user as organization_admin
  -- =============================================
  INSERT INTO memberships (user_id, organization_id, branch_id, role, status)
  VALUES (user_id, org_id, NULL, 'organization_admin', 'active')
  ON CONFLICT DO NOTHING;
  
  -- =============================================
  -- 6. Validation: Verify creation was successful
  -- =============================================
  IF NOT EXISTS (
    SELECT 1 FROM organizations
    WHERE id = org_id AND type = 'laundry' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Organization validation failed';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = user_id
      AND organization_id = org_id
      AND role = 'organization_admin'
      AND branch_id IS NULL
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Membership validation failed';
  END IF;
  
  RAISE NOTICE 'Successfully created laundry tenant: % (slug: %) for user: %', laundry_name, org_slug, owner_email;
END $$;

COMMIT;
