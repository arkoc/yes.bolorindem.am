-- ============================================================
-- Remove podium badge (badge deleted from table)
-- ============================================================

-- Drop podium check from badge award function.
-- Also drops the now-unnecessary leaderboard rank query (round-trip 3 → 2).

CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_total_completions    integer;
  v_form_completions     integer;
  v_location_completions integer;
  v_photo_completions    integer;
  v_total_points         integer;
  v_project_completions  integer;
BEGIN
  -- Round-trip 1: all completion counts in a single aggregated scan
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE t.task_type = 'form'),
    COUNT(*) FILTER (WHERE t.task_type = 'location'),
    COUNT(*) FILTER (WHERE t.task_type = 'photo')
  INTO v_total_completions, v_form_completions, v_location_completions, v_photo_completions
  FROM task_completions tc
  LEFT JOIN tasks t ON t.id = tc.task_id
  WHERE tc.user_id = p_user_id AND tc.status = 'approved';

  -- Round-trip 2: profile points + project completion count together
  SELECT p.total_points, COUNT(pc.id)
  INTO v_total_points, v_project_completions
  FROM profiles p
  LEFT JOIN project_completions pc ON pc.user_id = p_user_id
  WHERE p.id = p_user_id
  GROUP BY p.total_points;

  -- ── Task count badges ────────────────────────────────────
  IF v_total_completions >= 1 THEN
    INSERT INTO user_badges(user_id, badge_id) VALUES (p_user_id, 'first-step') ON CONFLICT DO NOTHING;
  END IF;
  IF v_total_completions >= 10 THEN
    INSERT INTO user_badges(user_id, badge_id) VALUES (p_user_id, 'activist') ON CONFLICT DO NOTHING;
  END IF;
  IF v_total_completions >= 50 THEN
    INSERT INTO user_badges(user_id, badge_id) VALUES (p_user_id, 'political-machine') ON CONFLICT DO NOTHING;
  END IF;
  IF v_total_completions >= 100 THEN
    INSERT INTO user_badges(user_id, badge_id) VALUES (p_user_id, 'indefatigable') ON CONFLICT DO NOTHING;
  END IF;

  -- ── Task type badges ─────────────────────────────────────
  IF v_form_completions >= 20 THEN
    INSERT INTO user_badges(user_id, badge_id) VALUES (p_user_id, 'paper-pusher') ON CONFLICT DO NOTHING;
  END IF;
  IF v_location_completions >= 20 THEN
    INSERT INTO user_badges(user_id, badge_id) VALUES (p_user_id, 'terrain-master') ON CONFLICT DO NOTHING;
  END IF;
  IF v_photo_completions >= 15 THEN
    INSERT INTO user_badges(user_id, badge_id) VALUES (p_user_id, 'eyewitness') ON CONFLICT DO NOTHING;
  END IF;

  -- ── Points badges ────────────────────────────────────────
  IF v_total_points >= 100 THEN
    INSERT INTO user_badges(user_id, badge_id) VALUES (p_user_id, 'novice') ON CONFLICT DO NOTHING;
  END IF;
  IF v_total_points >= 500 THEN
    INSERT INTO user_badges(user_id, badge_id) VALUES (p_user_id, 'reliable') ON CONFLICT DO NOTHING;
  END IF;
  IF v_total_points >= 5000 THEN
    INSERT INTO user_badges(user_id, badge_id) VALUES (p_user_id, 'political-giant') ON CONFLICT DO NOTHING;
  END IF;

  -- ── Project completion badges ────────────────────────────
  IF v_project_completions >= 1 THEN
    INSERT INTO user_badges(user_id, badge_id) VALUES (p_user_id, 'first-mission') ON CONFLICT DO NOTHING;
  END IF;
  IF v_project_completions >= 5 THEN
    INSERT INTO user_badges(user_id, badge_id) VALUES (p_user_id, 'veteran') ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
