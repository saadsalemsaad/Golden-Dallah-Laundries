-- =============================================
-- PHASE 3: Seed Golden Dallah Organization and Backfill
-- Purpose: Create first organization and backfill existing data
-- Safety: Backfill only - no changes to existing columns or frontend
-- Impact: Links existing data to new organization/branch structure
-- Transaction: All changes wrapped in a single transaction for atomic rollback
-- =============================================

BEGIN;

-- =============================================
-- 1. Create Golden Dallah Organization
-- =============================================
INSERT INTO organizations (name, slug, type, status)
VALUES ('Golden Dallah', 'golden-dallah', 'hotel', 'active')
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- 2. Create branches for each distinct legacy branch value
-- =============================================

-- Insert branches from records.branch values
INSERT INTO branches (organization_id, name, slug, legacy_branch, status)
SELECT 
  (SELECT id FROM organizations WHERE slug = 'golden-dallah'),
  branch,
  'branch-' || substr(md5(branch), 1, 12) as slug,
  branch,
  'active'
FROM (
  SELECT DISTINCT branch FROM records WHERE branch IS NOT NULL
  UNION
  SELECT DISTINCT branch FROM prices WHERE branch IS NOT NULL
) distinct_branches
ON CONFLICT (organization_id, slug) DO NOTHING;

-- =============================================
-- 3. Backfill records with organization_id and branch_id
-- =============================================
UPDATE records
SET 
  organization_id = (SELECT id FROM organizations WHERE slug = 'golden-dallah'),
  branch_id = (
    SELECT b.id 
    FROM branches b 
    JOIN organizations o ON b.organization_id = o.id
    WHERE o.slug = 'golden-dallah' 
      AND b.legacy_branch = records.branch
  )
WHERE organization_id IS NULL OR branch_id IS NULL;

-- =============================================
-- 4. Backfill prices with organization_id and branch_id
-- =============================================
UPDATE prices
SET 
  organization_id = (SELECT id FROM organizations WHERE slug = 'golden-dallah'),
  branch_id = (
    SELECT b.id 
    FROM branches b 
    JOIN organizations o ON b.organization_id = o.id
    WHERE o.slug = 'golden-dallah' 
      AND b.legacy_branch = prices.branch
  )
WHERE organization_id IS NULL OR branch_id IS NULL;

-- =============================================
-- 5. Validation: Ensure all records with branch are linked
-- =============================================
DO $$
DECLARE
  null_count INT;
BEGIN
  SELECT COUNT(*) INTO null_count 
  FROM records 
  WHERE branch IS NOT NULL 
    AND (organization_id IS NULL OR branch_id IS NULL);
  
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Validation failed: % records have branch but missing organization_id or branch_id', null_count;
  END IF;
END $$;

-- =============================================
-- 6. Validation: Ensure all prices with branch are linked
-- =============================================
DO $$
DECLARE
  null_count INT;
BEGIN
  SELECT COUNT(*) INTO null_count 
  FROM prices 
  WHERE branch IS NOT NULL 
    AND (organization_id IS NULL OR branch_id IS NULL);
  
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Validation failed: % prices have branch but missing organization_id or branch_id', null_count;
  END IF;
END $$;

COMMIT;

-- =============================================
-- END OF PHASE 3
-- =============================================
