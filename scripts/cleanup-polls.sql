-- ============================================================
-- Poll Cleanup Script
-- Removes all polls and reverses points awarded for voting
-- ============================================================
-- Run this in Supabase SQL Editor (as service role / postgres)
-- ============================================================

BEGIN;

-- 1. Reverse points on profiles for all poll_vote transactions
UPDATE profiles p
SET
  total_points = GREATEST(0, p.total_points - sub.total_awarded),
  updated_at   = now()
FROM (
  SELECT user_id, SUM(amount) AS total_awarded
  FROM point_transactions
  WHERE source_type = 'poll_vote'
  GROUP BY user_id
) sub
WHERE p.id = sub.user_id;

-- 2. Delete all poll_vote point transactions
DELETE FROM point_transactions
WHERE source_type = 'poll_vote';

-- 3. Delete all polls (cascades to poll_options and poll_votes)
DELETE FROM polls;

COMMIT;

-- Verify
SELECT COUNT(*) AS remaining_polls        FROM polls;
SELECT COUNT(*) AS remaining_poll_options FROM poll_options;
SELECT COUNT(*) AS remaining_poll_votes   FROM poll_votes;
SELECT COUNT(*) AS remaining_poll_txns    FROM point_transactions WHERE source_type = 'poll_vote';
