-- ============================================================
-- Query-Driven Index Additions
-- ============================================================
-- Analysis based on actual query patterns in the application.
-- Each index is justified by a specific hot query path.


-- ─── task_completions ─────────────────────────────────────────────────────────

-- CRITICAL: On every task completion attempt the API route runs three queries
-- that filter on (task_id, user_id, status):
--   1. COUNT approved completions for this user on this task
--   2. SELECT location_data for per-point limit check
--   3. COUNT all completions regardless of status (same task+user, no status filter)
-- This replaces the need to combine the separate single-column indexes.
CREATE INDEX task_completions_task_user_status_idx
  ON task_completions(task_id, user_id, status);

-- HIGH: Volunteer dashboard and project page fetch recent approved completions
-- ordered by time for a specific user:
--   .eq("user_id", ...).eq("status", "approved").order("completed_at", desc)
CREATE INDEX task_completions_user_status_time_idx
  ON task_completions(user_id, status, completed_at DESC);

-- MEDIUM: Admin completions page lists all completions ordered by time,
-- optionally filtered by user. Without a user filter this just needs fast sort.
CREATE INDEX task_completions_completed_at_idx
  ON task_completions(completed_at DESC);

-- MEDIUM: Admin dashboard counts completions today:
--   .eq("status", "approved").gte("completed_at", todayStart)
CREATE INDEX task_completions_status_time_idx
  ON task_completions(status, completed_at DESC);


-- ─── projects ─────────────────────────────────────────────────────────────────

-- MEDIUM: Both volunteer pages and admin dashboard filter projects by status,
-- then order by created_at. Used by:
--   - Volunteer /projects page: .eq("status", "active").order("created_at", desc)
--   - Volunteer /dashboard: .eq("status", "active").limit(4)
--   - Admin /dashboard: .eq("status", "active") count
--   - Admin /projects page: .order("created_at", desc) (all statuses)
CREATE INDEX projects_status_created_idx
  ON projects(status, created_at DESC);


-- ─── tasks ────────────────────────────────────────────────────────────────────

-- MEDIUM: Volunteer project detail page fetches active tasks sorted by order:
--   .eq("project_id", id).eq("is_active", true).order("order_index")
-- Admin tasks page fetches all tasks for a project sorted by order:
--   .eq("project_id", id).order("order_index")
-- This 3-column index covers both queries and supersedes
-- tasks_project_id_idx and tasks_project_active_idx.
CREATE INDEX tasks_project_active_order_idx
  ON tasks(project_id, is_active, order_index);


-- ─── profiles ─────────────────────────────────────────────────────────────────

-- LOW: Admin /users page sorts all users by total_points descending.
CREATE INDEX profiles_total_points_idx
  ON profiles(total_points DESC);

-- LOW: Admin /dashboard counts non-admin users: .neq("role", "admin")
-- Also used by the leaderboard view's GROUP BY which touches profiles.role.
CREATE INDEX profiles_role_idx
  ON profiles(role);


-- ─── point_transactions ───────────────────────────────────────────────────────

-- LOW: Admin /points page fetches recent admin_grant and reversal transactions:
--   .in("source_type", ["admin_grant", "reversal"]).order("created_at", desc)
CREATE INDEX point_transactions_source_type_time_idx
  ON point_transactions(source_type, created_at DESC);
