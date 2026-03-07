-- ============================================================
-- Add points_per_vote to polls
-- ============================================================

ALTER TABLE polls
  ADD COLUMN points_per_vote integer NOT NULL DEFAULT 0;

-- Extend source_type constraint to include poll_vote
ALTER TABLE point_transactions
  DROP CONSTRAINT IF EXISTS point_transactions_source_type_check;

ALTER TABLE point_transactions
  ADD CONSTRAINT point_transactions_source_type_check
  CHECK (source_type IN (
    'task_completion', 'project_completion', 'admin_grant',
    'reversal', 'referral', 'profile_completion', 'poll_vote'
  ));

