-- ============================================================
-- Badge System
-- ============================================================

-- Allow 'photo' task type (was missing from original constraint)
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_task_type_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_task_type_check
  CHECK (task_type IN ('standard', 'form', 'location', 'photo'));

-- ─── Badge definitions ────────────────────────────────────────
CREATE TABLE badges (
  id             text PRIMARY KEY,
  name_hy        text NOT NULL,
  name_en        text NOT NULL,
  description_hy text NOT NULL,
  icon           text NOT NULL,
  sort_order     integer NOT NULL DEFAULT 0
);

-- ─── User earned badges ───────────────────────────────────────
CREATE TABLE user_badges (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id   text NOT NULL REFERENCES badges(id),
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

CREATE INDEX user_badges_user_idx ON user_badges(user_id);

-- ─── Badge data ───────────────────────────────────────────────
INSERT INTO badges (id, name_hy, name_en, description_hy, icon, sort_order) VALUES
  ('first-step',        'Առաջին Քայլ',       'First Step',        'Կատարիր առաջին խնդիրդ',          '🌟', 1),
  ('activist',          'Ակտիվիստ',           'Activist',          'Կատարիր 10 խնդիր',               '✊', 2),
  ('political-machine', 'Քաղաքական Մեքենա',  'Political Machine',  'Կատարիր 50 խնդիր',               '⚙️', 3),
  ('indefatigable',     'Անխոնջ',             'Indefatigable',     'Կատարիր 100 խնդիր',              '🔥', 4),
  ('paper-pusher',      'Թղթաբան',            'Paper Pusher',      'Ուղարկիր 20 ձև',                 '📋', 5),
  ('terrain-master',    'Տեղանքի Տիրակալ',   'Master of Terrain', 'Ստուգիր 20 տարբեր վայր',         '📍', 6),
  ('eyewitness',        'Ականատես',           'Eyewitness',        'Ուղարկիր 15 լուսանկար',          '📸', 7),
  ('novice',            'Սկսնակ',             'Novice',            'Կուտակիր 100 միավոր',            '🌱', 8),
  ('reliable',          'Վստահելի',           'Reliable',          'Կուտակիր 500 միավոր',            '🛡', 9),
  ('political-giant',   'Քաղաքական Գիգանտ',  'Political Giant',   'Կուտակիր 5,000 միավոր',          '👑', 10),
  ('first-mission',     'Առաջին Ծրագիր',      'First Mission',     'Ավարտիր առաջին ծրագիրդ',         '🎯', 11),
  ('veteran',           'Վետերան',            'Veteran',           'Ավարտիր 5 ծրագիր',               '🎖', 13);

-- ─── Badge award function ─────────────────────────────────────
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
  SELECT COUNT(*) INTO v_total_completions
  FROM task_completions
  WHERE user_id = p_user_id AND status = 'approved';

  SELECT COUNT(*) INTO v_form_completions
  FROM task_completions tc
  JOIN tasks t ON t.id = tc.task_id
  WHERE tc.user_id = p_user_id AND tc.status = 'approved' AND t.task_type = 'form';

  SELECT COUNT(*) INTO v_location_completions
  FROM task_completions tc
  JOIN tasks t ON t.id = tc.task_id
  WHERE tc.user_id = p_user_id AND tc.status = 'approved' AND t.task_type = 'location';

  SELECT COUNT(*) INTO v_photo_completions
  FROM task_completions tc
  JOIN tasks t ON t.id = tc.task_id
  WHERE tc.user_id = p_user_id AND tc.status = 'approved' AND t.task_type = 'photo';

  SELECT total_points INTO v_total_points
  FROM profiles WHERE id = p_user_id;

  SELECT COUNT(*) INTO v_project_completions
  FROM project_completions WHERE user_id = p_user_id;

  SELECT rank INTO v_rank FROM leaderboard WHERE id = p_user_id;

  -- Task count badges
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

  -- Task type badges
  IF v_form_completions >= 20 THEN
    INSERT INTO user_badges(user_id, badge_id) VALUES (p_user_id, 'paper-pusher') ON CONFLICT DO NOTHING;
  END IF;
  IF v_location_completions >= 20 THEN
    INSERT INTO user_badges(user_id, badge_id) VALUES (p_user_id, 'terrain-master') ON CONFLICT DO NOTHING;
  END IF;
  IF v_photo_completions >= 15 THEN
    INSERT INTO user_badges(user_id, badge_id) VALUES (p_user_id, 'eyewitness') ON CONFLICT DO NOTHING;
  END IF;

  -- Points badges
  IF v_total_points >= 100 THEN
    INSERT INTO user_badges(user_id, badge_id) VALUES (p_user_id, 'novice') ON CONFLICT DO NOTHING;
  END IF;
  IF v_total_points >= 500 THEN
    INSERT INTO user_badges(user_id, badge_id) VALUES (p_user_id, 'reliable') ON CONFLICT DO NOTHING;
  END IF;
  IF v_total_points >= 5000 THEN
    INSERT INTO user_badges(user_id, badge_id) VALUES (p_user_id, 'political-giant') ON CONFLICT DO NOTHING;
  END IF;

  -- Project completion badges
  IF v_project_completions >= 1 THEN
    INSERT INTO user_badges(user_id, badge_id) VALUES (p_user_id, 'first-mission') ON CONFLICT DO NOTHING;
  END IF;
  IF v_project_completions >= 5 THEN
    INSERT INTO user_badges(user_id, badge_id) VALUES (p_user_id, 'veteran') ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Trigger: task completion → check badges ─────────────────
-- Name starts with 'p' so it fires after 'on_task_completion_insert' (i < p)
CREATE OR REPLACE FUNCTION trigger_badges_on_task_completion()
RETURNS trigger AS $$
BEGIN
  PERFORM check_and_award_badges(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_task_completion_post_badges
  AFTER INSERT ON task_completions
  FOR EACH ROW EXECUTE FUNCTION trigger_badges_on_task_completion();

-- ─── Trigger: project completion → check badges ───────────────
CREATE OR REPLACE FUNCTION trigger_badges_on_project_completion()
RETURNS trigger AS $$
BEGIN
  PERFORM check_and_award_badges(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_project_completion_badges
  AFTER INSERT ON project_completions
  FOR EACH ROW EXECUTE FUNCTION trigger_badges_on_project_completion();

-- ─── RLS ──────────────────────────────────────────────────────
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badges_select_all" ON badges FOR SELECT USING (true);

CREATE POLICY "user_badges_select_own" ON user_badges FOR SELECT
  USING (user_id = auth.uid() OR current_user_role() IN ('leader', 'admin'));

GRANT SELECT ON badges TO authenticated;
GRANT SELECT ON user_badges TO authenticated;
