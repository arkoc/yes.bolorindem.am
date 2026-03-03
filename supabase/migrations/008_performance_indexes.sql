-- ============================================================
-- Performance Indexes
-- ============================================================

-- Covers the period-based limit query in the completion API:
-- WHERE task_id = ? AND user_id = ? AND status = 'approved' AND completed_at >= ?
-- Also useful for point-limit and batch-count checks on the same table.
CREATE INDEX IF NOT EXISTS task_completions_task_user_status_time_idx
  ON task_completions(task_id, user_id, status, completed_at DESC);
