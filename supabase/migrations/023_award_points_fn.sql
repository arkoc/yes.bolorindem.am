-- ============================================================
-- General award_points function
-- Consolidates the UPDATE profiles + INSERT point_transactions
-- pattern used in every point-awarding code path.
-- ============================================================

-- ─── Core function ────────────────────────────────────────
-- Atomically increments total_points and records the transaction.
-- Called by all triggers, internal functions, and trusted API routes.
-- NOT exposed to authenticated users directly (service role only).
CREATE OR REPLACE FUNCTION public.award_points(
  p_user_id     uuid,
  p_amount      integer,
  p_source_type text,
  p_source_id   uuid    DEFAULT NULL,
  p_description text    DEFAULT '',
  p_created_by  uuid    DEFAULT NULL
)
RETURNS integer   -- returns new total_points
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

  INSERT INTO point_transactions (user_id, amount, source_type, source_id, description, created_by)
  VALUES (p_user_id, p_amount, p_source_type, p_source_id, p_description, p_created_by);

  RETURN v_new_points;
END;
$$;


-- ─── Refactor: grant_points_atomic ────────────────────────
-- Thin wrapper kept for the admin grant API route.
CREATE OR REPLACE FUNCTION public.grant_points_atomic(
  p_user_id     uuid,
  p_amount      integer,
  p_description text,
  p_granted_by  uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN public.award_points(
    p_user_id, p_amount, 'admin_grant', NULL, p_description, p_granted_by
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_points_atomic(uuid, integer, text, uuid) TO authenticated;


-- ─── Refactor: handle_task_completion_insert ──────────────
CREATE OR REPLACE FUNCTION public.handle_task_completion_insert()
RETURNS trigger AS $$
DECLARE
  v_task_title text;
  v_project_id uuid;
BEGIN
  SELECT title, project_id INTO v_task_title, v_project_id
  FROM public.tasks WHERE id = NEW.task_id;

  PERFORM public.award_points(
    NEW.user_id,
    NEW.points_awarded,
    'task_completion',
    NEW.id,
    COALESCE(v_task_title, 'Task completion')
      || CASE WHEN NEW.completion_number > 1 THEN ' #' || NEW.completion_number ELSE '' END
  );

  PERFORM public.check_project_completion(NEW.user_id, v_project_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ─── Refactor: handle_task_completion_update ──────────────
CREATE OR REPLACE FUNCTION public.handle_task_completion_update()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'reversed' AND OLD.status = 'approved' THEN
    PERFORM public.award_points(
      OLD.user_id,
      -OLD.points_awarded,
      'reversal',
      OLD.id,
      'Points reversed for task completion',
      NEW.reversed_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ─── Refactor: check_project_completion ───────────────────
CREATE OR REPLACE FUNCTION public.check_project_completion(
  p_user_id    uuid,
  p_project_id uuid
)
RETURNS void AS $$
DECLARE
  v_total_active_tasks integer;
  v_completed_tasks    integer;
  v_bonus_points       integer;
  v_already_completed  boolean;
BEGIN
  SELECT completion_bonus_points INTO v_bonus_points
  FROM public.projects WHERE id = p_project_id;

  IF v_bonus_points IS NULL OR v_bonus_points = 0 THEN RETURN; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.project_completions
    WHERE project_id = p_project_id AND user_id = p_user_id
  ) INTO v_already_completed;

  IF v_already_completed THEN RETURN; END IF;

  SELECT COUNT(*) INTO v_total_active_tasks
  FROM public.tasks
  WHERE project_id = p_project_id AND is_active = true;

  SELECT COUNT(DISTINCT tc.task_id) INTO v_completed_tasks
  FROM public.task_completions tc
  JOIN public.tasks t ON t.id = tc.task_id
  WHERE t.project_id = p_project_id
    AND tc.user_id   = p_user_id
    AND tc.status    = 'approved';

  IF v_completed_tasks >= v_total_active_tasks AND v_total_active_tasks > 0 THEN
    INSERT INTO public.project_completions (project_id, user_id, bonus_points)
    VALUES (p_project_id, p_user_id, v_bonus_points);

    PERFORM public.award_points(
      p_user_id, v_bonus_points, 'project_completion', p_project_id, 'Project completion bonus'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ─── Refactor: award_referral_points ──────────────────────
CREATE OR REPLACE FUNCTION public.award_referral_points()
RETURNS trigger AS $$
DECLARE
  v_points integer := 50;
BEGIN
  IF NEW.referred_by IS NOT NULL AND OLD.referred_by IS NULL THEN
    PERFORM public.award_points(
      NEW.referred_by,
      v_points,
      'referral',
      NEW.id,
      'Referral bonus: ' || NEW.full_name || ' joined'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ─── Refactor: award_profile_completion_points ────────────
CREATE OR REPLACE FUNCTION public.award_profile_completion_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.profile_completion_bonus_awarded = false
     AND NEW.bio IS NOT NULL AND trim(NEW.bio) <> ''
     AND NEW.social_url IS NOT NULL AND trim(NEW.social_url) <> ''
  THEN
    -- Mark bonus awarded first (doesn't touch bio/social_url so trigger won't re-fire)
    UPDATE profiles
    SET profile_completion_bonus_awarded = true,
        updated_at = now()
    WHERE id = NEW.id;

    PERFORM public.award_points(
      NEW.id, 20, 'profile_completion', NULL, 'Profile completion bonus'
    );
  END IF;
  RETURN NEW;
END;
$$;
