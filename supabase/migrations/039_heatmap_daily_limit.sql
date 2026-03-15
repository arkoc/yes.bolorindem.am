-- Heatmap anti-cheat: max 10 dot claims per user per 24 hours.

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
  prev          heatmap_points%ROWTYPE;
  claimed_count INTEGER;
  daily_count   INTEGER;
  total_dots    INTEGER;
  claimed_after INTEGER;
  dyn_points    INTEGER;
  contributor   RECORD;
  user_bonus    INTEGER;
  my_bonus      INTEGER := 0;
  hours_diff    DOUBLE PRECISION;
  dist_km       DOUBLE PRECISION;
BEGIN
  -- ── Per-user advisory lock ────────────────────────────────────────────────
  -- Serializes all concurrent claims by the same user so that the daily-limit
  -- count and the impossible-travel "prev dot" are both read consistently.
  -- Uses namespace=1 to avoid colliding with other advisory locks.
  PERFORM pg_advisory_xact_lock(1, hashtext(p_user_id::text));
  -- ─────────────────────────────────────────────────────────────────────────

  -- Block banned users
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND is_banned = true) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'banned');
  END IF;

  -- Lock the target dot
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

  -- ── Daily limit check ─────────────────────────────────────────────────────
  -- Safe from races: advisory lock above ensures this count is accurate.
  SELECT COUNT(*) INTO daily_count
  FROM heatmap_points
  WHERE claimed_by = p_user_id
    AND claimed_at >= now() - INTERVAL '24 hours';

  IF daily_count >= 10 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'daily_limit');
  END IF;
  -- ─────────────────────────────────────────────────────────────────────────

  -- ── Impossible travel check ───────────────────────────────────────────────
  -- Safe from races: advisory lock ensures we see the true latest claim.
  SELECT * INTO prev
  FROM heatmap_points
  WHERE claimed_by = p_user_id
  ORDER BY claimed_at DESC
  LIMIT 1;

  IF prev.id IS NOT NULL THEN
    hours_diff := EXTRACT(EPOCH FROM (now() - prev.claimed_at)) / 3600.0;

    dist_km := 6371.0 * 2.0 * ASIN(SQRT(
      POWER(SIN(RADIANS((pt.lat - prev.lat) / 2.0)), 2) +
      COS(RADIANS(prev.lat)) * COS(RADIANS(pt.lat)) *
      POWER(SIN(RADIANS((pt.lng - prev.lng) / 2.0)), 2)
    ));

    IF hours_diff > 0 AND (dist_km / hours_diff) > 70 THEN
      UPDATE profiles SET is_banned = true WHERE id = p_user_id;
      RETURN jsonb_build_object('ok', false, 'reason', 'banned', 'speed_kmh', ROUND(dist_km / hours_diff));
    END IF;
  END IF;
  -- ─────────────────────────────────────────────────────────────────────────

  -- Dynamic points: 10 at 0 claimed → 200 at 2000 claimed
  SELECT COUNT(*) INTO claimed_count
  FROM heatmap_points
  WHERE project_id = pt.project_id AND claimed_by IS NOT NULL;

  dyn_points := LEAST(200, ROUND(10 + (claimed_count / 2000.0) * 190));

  -- Mark claimed
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

  -- ── Completion bonus check ────────────────────────────────────────────────
  SELECT COUNT(*) INTO total_dots    FROM heatmap_points WHERE project_id = pt.project_id;
  SELECT COUNT(*) INTO claimed_after FROM heatmap_points WHERE project_id = pt.project_id AND claimed_by IS NOT NULL;

  IF total_dots > 0 AND claimed_after = total_dots THEN
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
