-- Migration: Normalize all emails to lowercase and trimmed
-- Purpose: Fix email case-sensitivity issues in authentication
-- Date: 2024-2025
-- Safe wrapper: uses DO block so this is a no-op if tables don't exist yet
-- (e.g., in shadow database during migration planning)

DO $$
BEGIN
  -- Update Employee table emails if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Employee') THEN
    UPDATE "Employee"
    SET email = TRIM(LOWER(email))
    WHERE email != TRIM(LOWER(email));
  END IF;

  -- Update SuperAdmin table emails if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'SuperAdmin') THEN
    UPDATE "SuperAdmin"
    SET email = TRIM(LOWER(email))
    WHERE email != TRIM(LOWER(email));
  END IF;

  -- Update UserInvite table emails if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'UserInvite') THEN
    UPDATE "UserInvite"
    SET email = TRIM(LOWER(email))
    WHERE email != TRIM(LOWER(email));
  END IF;
END $$;
