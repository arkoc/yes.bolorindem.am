-- ============================================================
-- Fix: badge checks were only triggered by task/project
-- completion inserts, missing admin grants, referrals,
-- profile completion, and poll vote point sources.
--
-- Solution: call check_and_award_badges inside award_points
-- so every point-awarding path triggers badge evaluation.
-- The existing task/project triggers still fire but
-- ON CONFLICT DO NOTHING in the badge inserts makes that safe.
-- ============================================================

CREATE OR REPLACE FUNCTION public.award_points(
  p_user_id     uuid,
  p_amount      integer,
  p_source_type text,
  p_source_id   uuid    DEFAULT NULL,
  p_description text    DEFAULT '',
  p_created_by  uuid    DEFAULT NULL
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

  INSERT INTO point_transactions (user_id, amount, source_type, source_id, description, created_by)
  VALUES (p_user_id, p_amount, p_source_type, p_source_id, p_description, p_created_by);

  -- Check and award any newly-earned badges after every point change.
  -- This covers admin grants, referrals, profile completion, and poll
  -- votes which previously bypassed the badge triggers.
  PERFORM public.check_and_award_badges(p_user_id);

  RETURN v_new_points;
END;
$$;
