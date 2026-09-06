-- =============================================
-- PHASE 1: Multi-Tenant Expansion
-- Purpose: Add new tables and columns to prepare for multi-tenant architecture
-- Safety: All changes are ADDITIVE - no drops, no alters to existing columns
-- Impact: Current system continues to work unchanged
-- Transaction: All changes wrapped in a single transaction for atomic rollback
-- =============================================

BEGIN;

-- =============================================
-- 1. Create organizations table
-- =============================================
CREATE TABLE organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  status     TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT organizations_status_check 
    CHECK (status IN ('active', 'suspended'))
);

-- =============================================
-- 2. Create branches table
-- =============================================
CREATE TABLE branches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  legacy_branch   TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT branches_organization_fk 
    FOREIGN KEY (organization_id) 
    REFERENCES organizations(id) 
    ON DELETE RESTRICT,
  
  CONSTRAINT branches_status_check 
    CHECK (status IN ('active', 'archived')),
  
  CONSTRAINT branches_org_slug_unique 
    UNIQUE (organization_id, slug),
  
  CONSTRAINT branches_org_name_unique 
    UNIQUE (organization_id, name)
);

-- =============================================
-- 3. Create memberships table
-- =============================================
CREATE TABLE memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  organization_id UUID NOT NULL,
  branch_id       UUID,
  role            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT memberships_user_fk 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT memberships_organization_fk 
    FOREIGN KEY (organization_id) 
    REFERENCES organizations(id) 
    ON DELETE RESTRICT,
  
  CONSTRAINT memberships_branch_fk 
    FOREIGN KEY (branch_id) 
    REFERENCES branches(id) 
    ON DELETE RESTRICT,
  
  CONSTRAINT memberships_role_check 
    CHECK (role IN ('organization_admin', 'branch_manager', 'employee')),
  
  CONSTRAINT memberships_status_check 
    CHECK (status IN ('active', 'suspended'))
);

-- =============================================
-- Trigger to ensure branch_id belongs to organization_id
-- =============================================
CREATE OR REPLACE FUNCTION memberships_branch_organization_check()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.branch_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM branches 
      WHERE id = NEW.branch_id AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'branch_id must belong to the same organization as organization_id';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER memberships_branch_organization_trigger
  BEFORE INSERT OR UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION memberships_branch_organization_check();

-- =============================================
-- 4. Add columns to records table
-- =============================================
ALTER TABLE records 
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS branch_id UUID;

ALTER TABLE records 
  ADD CONSTRAINT records_organization_fk 
    FOREIGN KEY (organization_id) 
    REFERENCES organizations(id) 
    ON DELETE RESTRICT;

ALTER TABLE records 
  ADD CONSTRAINT records_branch_fk 
    FOREIGN KEY (branch_id) 
    REFERENCES branches(id) 
    ON DELETE RESTRICT;

-- =============================================
-- 5. Add columns to prices table
-- =============================================
ALTER TABLE prices 
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS branch_id UUID;

ALTER TABLE prices 
  ADD CONSTRAINT prices_organization_fk 
    FOREIGN KEY (organization_id) 
    REFERENCES organizations(id) 
    ON DELETE RESTRICT;

ALTER TABLE prices 
  ADD CONSTRAINT prices_branch_fk 
    FOREIGN KEY (branch_id) 
    REFERENCES branches(id) 
    ON DELETE RESTRICT;

-- =============================================
-- 6. Add index to record_items
-- =============================================
-- Regular index on record_id for performance
-- UNIQUE constraint will be added in a later phase after manual duplicate check
CREATE INDEX IF NOT EXISTS record_items_record_id_idx ON record_items(record_id);

-- =============================================
-- 7. Create indexes
-- =============================================

-- Indexes on branches
CREATE INDEX IF NOT EXISTS branches_organization_id_idx ON branches(organization_id);

-- Indexes on memberships
CREATE INDEX IF NOT EXISTS memberships_user_id_idx ON memberships(user_id);
CREATE INDEX IF NOT EXISTS memberships_organization_id_idx ON memberships(organization_id);
CREATE INDEX IF NOT EXISTS memberships_branch_id_idx ON memberships(branch_id);

-- Partial unique indexes to prevent duplicate memberships
-- One membership per user at organization level (when branch_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS memberships_user_org_unique 
  ON memberships(user_id, organization_id)
  WHERE branch_id IS NULL;

-- One membership per user per branch (when branch_id IS NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS memberships_user_org_branch_unique 
  ON memberships(user_id, organization_id, branch_id)
  WHERE branch_id IS NOT NULL;

-- Indexes on records
CREATE INDEX IF NOT EXISTS records_organization_id_idx ON records(organization_id);
CREATE INDEX IF NOT EXISTS records_branch_id_idx ON records(branch_id);

-- Indexes on prices
CREATE INDEX IF NOT EXISTS prices_organization_id_idx ON prices(organization_id);
CREATE INDEX IF NOT EXISTS prices_branch_id_idx ON prices(branch_id);

-- =============================================
-- 8. RLS for new tables
-- =============================================
-- Enable RLS on new tables to make them inaccessible until proper policies are created
-- No policies are created in this phase - tables will be inaccessible to frontend

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- =============================================
-- IMPORTANT: Existing RLS policies remain unchanged
-- records, record_items, prices RLS policies are NOT modified
-- =============================================

COMMIT;

-- =============================================
-- END OF PHASE 1
-- =============================================
