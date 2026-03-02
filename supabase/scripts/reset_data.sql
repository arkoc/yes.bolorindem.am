-- ============================================================
-- Data Reset Script
-- Clears all projects, tasks, completions, and audit logs.
-- Preserves the profile with phone 37455422722.
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

BEGIN;

-- Safety check: abort if user not found
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM profiles
  WHERE phone LIKE '%37455422722%'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with phone 37455422722 not found — aborting to prevent accidental data loss.';
  END IF;

  RAISE NOTICE 'Found user to preserve: %', v_user_id;
END $$;

-- 1. Completions first (they reference tasks and profiles)
DELETE FROM task_completions;
DELETE FROM project_completions;

-- 2. Point audit log
DELETE FROM point_transactions;

-- 3. Tasks and projects
DELETE FROM tasks;
DELETE FROM projects;

-- 4. All profiles except the preserved user
DELETE FROM profiles
WHERE phone NOT LIKE '%37455422722%';

-- 5. Reset the preserved user's point total to 0
UPDATE profiles
SET total_points = 0,
    updated_at   = now()
WHERE phone LIKE '%37455422722%';

COMMIT;

-- Verify result
SELECT id, full_name, phone, total_points, role
FROM profiles;
