-- =============================================
-- PHASE 3: Verification Queries
-- Purpose: Verify Phase 3 migration results
-- Run these after executing phase_3_seed_golden_dallah.sql
-- =============================================

-- 1. Count organizations
SELECT COUNT(*) as organization_count FROM organizations;

-- 2. Count branches
SELECT COUNT(*) as branch_count FROM branches;

-- 3. Show organization details
SELECT id, name, slug, type, status FROM organizations;

-- 4. Show branch details
SELECT b.id, b.name, b.slug, b.legacy_branch, b.status, o.name as organization_name
FROM branches b
JOIN organizations o ON b.organization_id = o.id;

-- 5. Count records with organization_id
SELECT COUNT(*) as records_with_org FROM records WHERE organization_id IS NOT NULL;

-- 6. Count records with branch_id
SELECT COUNT(*) as records_with_branch FROM records WHERE branch_id IS NOT NULL;

-- 7. Count prices with organization_id
SELECT COUNT(*) as prices_with_org FROM prices WHERE organization_id IS NOT NULL;

-- 8. Count prices with branch_id
SELECT COUNT(*) as prices_with_branch FROM prices WHERE branch_id IS NOT NULL;

-- 9. Records still NULL
SELECT COUNT(*) as records_null_org FROM records WHERE organization_id IS NULL;
SELECT COUNT(*) as records_null_branch FROM records WHERE branch_id IS NULL;

-- 10. Prices still NULL
SELECT COUNT(*) as prices_null_org FROM prices WHERE organization_id IS NULL;
SELECT COUNT(*) as prices_null_branch FROM prices WHERE branch_id IS NULL;

-- 11. Sample of records with new IDs
SELECT id, branch, organization_id, branch_id, date FROM records LIMIT 5;

-- 12. Sample of prices with new IDs
SELECT id, branch, organization_id, branch_id, item_id FROM prices LIMIT 5;
