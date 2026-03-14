-- ============================================================
-- Heatmap completion bonus: when ALL dots in a project are
-- claimed, distribute 10 000 pts among contributors in
-- proportion to how many dots each one claimed.
-- Formula: ROUND(user_dot_count / total_dots * 10000)
--
-- Double-award prevention: checks point_transactions for any
-- existing 'heatmap_completion_bonus' row with source_id =
-- project_id before issuing new awards.
-- ============================================================

-- Add new source types to the check constraint
ALTER TABLE point_transactions
  DROP CONSTRAINT IF EXISTS point_transactions_source_type_check;

ALTER TABLE point_transactions
  ADD CONSTRAINT point_transactions_source_type_check
  CHECK (source_type IN (
    'task_completion', 'project_completion', 'admin_grant',
    'reversal', 'referral', 'profile_completion', 'poll_vote',
    'heatmap_claim', 'heatmap_completion_bonus'
  ));

-- Replace claim_heatmap_point with completion-bonus awareness
CREATE OR REPLACE FUNCTION public.claim_heatmap_point(
  p_point_id UUID,
  p_user_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  pt            heatmap_points%ROWTYPE;
  claimed_count INTEGER;
  total_dots    INTEGER;
  claimed_after INTEGER;
  dyn_points    INTEGER;
  contributor   RECORD;
  user_bonus    INTEGER;
  my_bonus      INTEGER := 0;
BEGIN
  -- Lock the row to prevent concurrent claims
  SELECT * INTO pt
  FROM heatmap_points
  WHERE id = p_point_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF pt.claimed_by IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed');
  END IF;

  -- Dynamic points: 10 at 0 claimed → 200 at 2000 claimed
  SELECT COUNT(*) INTO claimed_count
  FROM heatmap_points
  WHERE project_id = pt.project_id AND claimed_by IS NOT NULL;

  dyn_points := LEAST(200, ROUND(10 + (claimed_count / 2000.0) * 190));

  -- Mark claimed and store awarded value
  UPDATE heatmap_points
  SET claimed_by = p_user_id,
      claimed_at = now(),
      points     = dyn_points
  WHERE id = p_point_id;

  -- Award dot points
  PERFORM public.award_points(
    p_user_id,
    dyn_points,
    'heatmap_claim',
    p_point_id,
    'Heatmap dot claimed'
  );

  -- ── Completion bonus check ───────────────────────────────
  SELECT COUNT(*) INTO total_dots  FROM heatmap_points WHERE project_id = pt.project_id;
  SELECT COUNT(*) INTO claimed_after FROM heatmap_points WHERE project_id = pt.project_id AND claimed_by IS NOT NULL;

  IF total_dots > 0 AND claimed_after = total_dots THEN
    -- Only award once per project
    IF NOT EXISTS (
      SELECT 1 FROM point_transactions
      WHERE source_type = 'heatmap_completion_bonus'
        AND source_id    = pt.project_id
      LIMIT 1
    ) THEN
      FOR contributor IN
        SELECT claimed_by, COUNT(*) AS dot_count
        FROM heatmap_points
        WHERE project_id = pt.project_id
        GROUP BY claimed_by
      LOOP
        user_bonus := ROUND((contributor.dot_count::FLOAT / total_dots) * 10000);
        IF user_bonus > 0 THEN
          PERFORM public.award_points(
            contributor.claimed_by,
            user_bonus,
            'heatmap_completion_bonus',
            pt.project_id,
            'Heatmap completion bonus'
          );
        END IF;
        IF contributor.claimed_by = p_user_id THEN
          my_bonus := user_bonus;
        END IF;
      END LOOP;

      RETURN jsonb_build_object(
        'ok',              true,
        'points',          dyn_points,
        'projectComplete', true,
        'completionBonus', my_bonus
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'points', dyn_points);
END;
$$;
