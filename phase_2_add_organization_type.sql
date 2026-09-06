-- =============================================
-- PHASE 2: Add Organization Type
-- Purpose: Add type column to organizations table (hotel/laundry)
-- Safety: Additive change only - nullable column with check constraint
-- Impact: No impact on existing data or current system behavior
-- Transaction: All changes wrapped in a single transaction for atomic rollback
-- =============================================

BEGIN;

-- =============================================
-- Add type column to organizations table
-- =============================================
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS type TEXT;

-- =============================================
-- Add check constraint for type values
-- =============================================
ALTER TABLE organizations 
  ADD CONSTRAINT organizations_type_check 
    CHECK (type IN ('hotel', 'laundry'));

COMMIT;

-- =============================================
-- END OF PHASE 2
-- =============================================
