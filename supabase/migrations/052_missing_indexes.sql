-- Missing indexes identified in performance review.

-- Period-limit checks: (user_id, task_id, completed_at) — used in completion route
-- to count completions within day/week windows per user per task.
CREATE INDEX IF NOT EXISTS task_completions_user_task_completed_idx
  ON task_completions (user_id, task_id, completed_at DESC);

-- Referral lookups: profiles.referred_by — used in referral record route.
CREATE INDEX IF NOT EXISTS profiles_referred_by_idx
  ON profiles (referred_by)
  WHERE referred_by IS NOT NULL;

-- point_transactions user+created_at — used in profile point history queries.
CREATE INDEX IF NOT EXISTS point_transactions_user_created_idx
  ON point_transactions (user_id, created_at DESC);
