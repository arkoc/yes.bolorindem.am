-- Index for leaderboard sorting by total_points (used in DENSE_RANK window function)
CREATE INDEX IF NOT EXISTS profiles_total_points_idx ON profiles (total_points DESC);

-- Composite index for task completion uniqueness checks in complete API
CREATE INDEX IF NOT EXISTS task_completions_task_user_approved_idx
  ON task_completions (task_id, user_id, status, completed_at DESC);
