-- ============================================================
-- Index Fixes
-- ============================================================

-- profiles.referred_by is queried on every dashboard load and admin referrals page.
-- No index existed despite being added in migration 012.
CREATE INDEX IF NOT EXISTS profiles_referred_by_idx ON profiles(referred_by);

-- Extend user_badges index to cover awarded_at ordering.
-- The dashboard query does: .eq("user_id", ...).order("awarded_at", ascending: true)
-- The existing user_badges_user_idx only covers user_id; the sort needed a separate sort step.
DROP INDEX IF EXISTS user_badges_user_idx;
CREATE INDEX IF NOT EXISTS user_badges_user_awarded_idx ON user_badges(user_id, awarded_at);

-- Drop the low-cardinality solo status index on task_completions.
-- status has only two values ('approved', 'reversed'), so the planner almost never
-- uses it. All hot query paths are covered by the composite indexes in migrations
-- 003 and 017, which include status as a column.
DROP INDEX IF EXISTS task_completions_status_idx;
