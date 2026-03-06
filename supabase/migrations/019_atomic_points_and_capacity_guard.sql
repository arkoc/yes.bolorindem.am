-- ============================================================
-- Atomic Admin Points Grant + Task Capacity Guard
-- ============================================================

-- ─── Atomic point grant RPC ───────────────────────────────
-- Replaces the two-step read+write in the API route with a single
-- atomic UPDATE+INSERT inside one transaction. Eliminates the lost-
-- update race condition that occurred when two concurrent admin grants
-- read the same total_points before either wrote back.
--
-- Returns the new total_points after the grant.
CREATE OR REPLACE FUNCTION grant_points_atomic(
  p_user_id    uuid,
  p_amount     integer,
  p_description text,
  p_granted_by uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new_points integer;
BEGIN
  UPDATE profiles
  SET total_points = GREATEST(0, total_points + p_amount),
      updated_at   = now()
  WHERE id = p_user_id
  RETURNING total_points INTO v_new_points;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  INSERT INTO point_transactions (user_id, amount, source_type, description, created_by)
  VALUES (p_user_id, p_amount, 'admin_grant', p_description, p_granted_by);

  RETURN v_new_points;
END;
$$;

-- Allow authenticated users to call this function;
-- the API route enforces admin/leader role check before calling it.
GRANT EXECUTE ON FUNCTION grant_points_atomic(uuid, integer, text, uuid) TO authenticated;


-- ─── Task capacity guard ──────────────────────────────────
-- Enforces total_completions_allowed at the database level using a
-- BEFORE INSERT trigger with FOR UPDATE row locking on the task.
-- This serializes concurrent inserts for the same task, eliminating
-- the TOCTOU race condition that existed when the application code
-- checked the count and then inserted in separate round-trips.
CREATE OR REPLACE FUNCTION guard_task_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_allowed integer;
  v_current integer;
BEGIN
  -- Lock the task row so concurrent inserts queue up behind this check.
  SELECT total_completions_allowed INTO v_allowed
  FROM tasks
  WHERE id = NEW.task_id
  FOR UPDATE;

  -- NULL means no cap configured; skip the check.
  IF v_allowed IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_current
  FROM task_completions
  WHERE task_id = NEW.task_id AND status = 'approved';

  IF v_current >= v_allowed THEN
    RAISE EXCEPTION 'task_at_capacity'
      USING HINT = 'This task has reached its maximum number of completions';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER before_task_completion_capacity_check
  BEFORE INSERT ON task_completions
  FOR EACH ROW EXECUTE FUNCTION guard_task_capacity();
