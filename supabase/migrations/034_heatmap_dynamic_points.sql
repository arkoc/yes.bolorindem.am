-- ============================================================
-- Dynamic point value for heatmap claims.
-- Points scale from 10 (0 claimed) to 200 (2000 claimed).
-- The more dots that have been claimed, the rarer unclaimed
-- ones become, so each new claim is worth more.
-- Formula: ROUND(10 + (claimed_count / 2000.0) * 190), capped at 200.
-- ============================================================

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
  dyn_points    INTEGER;
BEGIN
  -- Lock the row first to prevent concurrent claims
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

  -- Count how many dots in this project are already claimed
  -- (done inside the lock so the value is stable for this transaction)
  SELECT COUNT(*) INTO claimed_count
  FROM heatmap_points
  WHERE project_id = pt.project_id
    AND claimed_by IS NOT NULL;

  -- Dynamic points: 10 at 0 claimed, 200 at 2000 claimed, linear
  dyn_points := LEAST(200, ROUND(10 + (claimed_count / 2000.0) * 190));

  -- Mark claimed
  UPDATE heatmap_points
  SET claimed_by = p_user_id,
      claimed_at = now(),
      points     = dyn_points   -- store actual awarded value for admin reporting
  WHERE id = p_point_id;

  -- Award points atomically
  PERFORM public.award_points(
    p_user_id,
    dyn_points,
    'heatmap_claim',
    p_point_id,
    'Heatmap dot claimed'
  );

  RETURN jsonb_build_object('ok', true, 'points', dyn_points);
END;
$$;
