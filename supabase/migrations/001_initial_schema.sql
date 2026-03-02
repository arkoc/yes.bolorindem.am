-- ============================================================
-- ActiveBDEM Volunteer Management System
-- Initial Schema Migration
-- ============================================================

-- ─── Enable extensions ────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Profiles ─────────────────────────────────────────────────
CREATE TABLE profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    text NOT NULL,
  phone        text,
  total_points integer NOT NULL DEFAULT 0,
  role         text NOT NULL DEFAULT 'volunteer'
                 CHECK (role IN ('volunteer', 'leader', 'admin')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ─── Projects ─────────────────────────────────────────────────
CREATE TABLE projects (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                    text NOT NULL,
  description              text,
  banner_url               text,
  status                   text NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  start_date               timestamptz,
  end_date                 timestamptz,
  completion_bonus_points  integer NOT NULL DEFAULT 0,
  created_by               uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- ─── Tasks ────────────────────────────────────────────────────
CREATE TABLE tasks (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                 uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title                      text NOT NULL,
  description                text,
  task_type                  text NOT NULL DEFAULT 'standard'
                               CHECK (task_type IN ('standard', 'form', 'location')),
  completion_points          integer NOT NULL DEFAULT 10 CHECK (completion_points >= 0),
  max_completions_per_user   integer DEFAULT 1 CHECK (max_completions_per_user > 0),
  total_completions_allowed  integer CHECK (total_completions_allowed > 0),
  requires_evidence          boolean NOT NULL DEFAULT false,
  form_schema                jsonb,
  location_data              jsonb,
  is_active                  boolean NOT NULL DEFAULT true,
  order_index                integer NOT NULL DEFAULT 0,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tasks_project_id_idx ON tasks(project_id);
CREATE INDEX tasks_project_active_idx ON tasks(project_id, is_active);

-- ─── Task Completions ─────────────────────────────────────────
CREATE TABLE task_completions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id           uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  completion_number integer NOT NULL DEFAULT 1 CHECK (completion_number > 0),
  status            text NOT NULL DEFAULT 'approved'
                      CHECK (status IN ('approved', 'reversed')),
  form_data         jsonb,
  location_data     jsonb,
  evidence_urls     text[],
  points_awarded    integer NOT NULL CHECK (points_awarded >= 0),
  notes             text,
  completed_at      timestamptz NOT NULL DEFAULT now(),
  reversed_by       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reversed_at       timestamptz,
  UNIQUE (task_id, user_id, completion_number)
);

CREATE INDEX task_completions_user_idx ON task_completions(user_id);
CREATE INDEX task_completions_task_idx ON task_completions(task_id);
CREATE INDEX task_completions_status_idx ON task_completions(status);

-- ─── Project Completions ──────────────────────────────────────
CREATE TABLE project_completions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bonus_points integer NOT NULL,
  awarded_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

-- ─── Point Transactions ───────────────────────────────────────
CREATE TABLE point_transactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount       integer NOT NULL,
  source_type  text NOT NULL
                 CHECK (source_type IN ('task_completion', 'project_completion', 'admin_grant', 'reversal')),
  source_id    uuid,
  description  text,
  created_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX point_transactions_user_created_idx ON point_transactions(user_id, created_at DESC);

-- ─── Leaderboard View ─────────────────────────────────────────
CREATE VIEW leaderboard AS
SELECT
  p.id,
  p.full_name,
  p.total_points,
  RANK() OVER (ORDER BY p.total_points DESC) AS rank,
  COUNT(tc.id) FILTER (WHERE tc.status = 'approved') AS total_completions
FROM profiles p
LEFT JOIN task_completions tc ON tc.user_id = p.id
GROUP BY p.id, p.full_name, p.total_points;

-- ─── Trigger: new auth user → create profile ──────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Volunteer'),
    NEW.phone
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Trigger: task completion → award points ──────────────────
CREATE OR REPLACE FUNCTION handle_task_completion_insert()
RETURNS trigger AS $$
BEGIN
  -- Update profile total points
  UPDATE profiles
  SET total_points = total_points + NEW.points_awarded,
      updated_at   = now()
  WHERE id = NEW.user_id;

  -- Insert audit transaction
  INSERT INTO point_transactions (user_id, amount, source_type, source_id, description)
  VALUES (
    NEW.user_id,
    NEW.points_awarded,
    'task_completion',
    NEW.id,
    'Task completion #' || NEW.completion_number
  );

  -- Check if project is now fully complete for this user
  PERFORM check_project_completion(NEW.user_id, (SELECT project_id FROM tasks WHERE id = NEW.task_id));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_task_completion_insert
  AFTER INSERT ON task_completions
  FOR EACH ROW EXECUTE FUNCTION handle_task_completion_insert();

-- ─── Trigger: task completion reversal → deduct points ────────
CREATE OR REPLACE FUNCTION handle_task_completion_update()
RETURNS trigger AS $$
BEGIN
  -- Only handle status change to 'reversed'
  IF NEW.status = 'reversed' AND OLD.status = 'approved' THEN
    UPDATE profiles
    SET total_points = GREATEST(0, total_points - OLD.points_awarded),
        updated_at   = now()
    WHERE id = OLD.user_id;

    INSERT INTO point_transactions (user_id, amount, source_type, source_id, description, created_by)
    VALUES (
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_task_completion_update
  AFTER UPDATE ON task_completions
  FOR EACH ROW EXECUTE FUNCTION handle_task_completion_update();

-- ─── Function: check project completion ───────────────────────
CREATE OR REPLACE FUNCTION check_project_completion(
  p_user_id   uuid,
  p_project_id uuid
)
RETURNS void AS $$
DECLARE
  v_total_active_tasks  integer;
  v_completed_tasks     integer;
  v_bonus_points        integer;
  v_already_completed   boolean;
BEGIN
  -- Get bonus points for this project
  SELECT completion_bonus_points INTO v_bonus_points
  FROM projects
  WHERE id = p_project_id;

  -- No bonus configured, skip
  IF v_bonus_points IS NULL OR v_bonus_points = 0 THEN
    RETURN;
  END IF;

  -- Check if already awarded
  SELECT EXISTS(
    SELECT 1 FROM project_completions
    WHERE project_id = p_project_id AND user_id = p_user_id
  ) INTO v_already_completed;

  IF v_already_completed THEN
    RETURN;
  END IF;

  -- Count active tasks in project
  SELECT COUNT(*) INTO v_total_active_tasks
  FROM tasks
  WHERE project_id = p_project_id AND is_active = true;

  -- Count distinct tasks the user has completed (at least once, approved)
  SELECT COUNT(DISTINCT tc.task_id) INTO v_completed_tasks
  FROM task_completions tc
  JOIN tasks t ON t.id = tc.task_id
  WHERE t.project_id = p_project_id
    AND tc.user_id   = p_user_id
    AND tc.status    = 'approved';

  -- Award bonus if all tasks are done
  IF v_completed_tasks >= v_total_active_tasks AND v_total_active_tasks > 0 THEN
    INSERT INTO project_completions (project_id, user_id, bonus_points)
    VALUES (p_project_id, p_user_id, v_bonus_points);

    UPDATE profiles
    SET total_points = total_points + v_bonus_points,
        updated_at   = now()
    WHERE id = p_user_id;

    INSERT INTO point_transactions (user_id, amount, source_type, source_id, description)
    VALUES (
      p_user_id,
      v_bonus_points,
      'project_completion',
      p_project_id,
      'Project completion bonus'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Row Level Security ───────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

-- Helper: current user role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles policies
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_select_leaderboard" ON profiles FOR SELECT
  USING (true); -- All authenticated users can view profiles for leaderboard

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "profiles_admin_all" ON profiles FOR ALL
  USING (current_user_role() = 'admin');

-- Projects policies
CREATE POLICY "projects_select_active" ON projects FOR SELECT
  USING (status = 'active' OR current_user_role() IN ('leader', 'admin'));

CREATE POLICY "projects_admin_write" ON projects FOR ALL
  USING (current_user_role() IN ('leader', 'admin'));

-- Tasks policies
CREATE POLICY "tasks_select_active" ON tasks FOR SELECT
  USING (
    is_active = true AND (
      SELECT status FROM projects WHERE id = project_id
    ) = 'active'
    OR current_user_role() IN ('leader', 'admin')
  );

CREATE POLICY "tasks_admin_write" ON tasks FOR ALL
  USING (current_user_role() IN ('leader', 'admin'));

-- Task completions policies
CREATE POLICY "task_completions_select_own" ON task_completions FOR SELECT
  USING (user_id = auth.uid() OR current_user_role() IN ('leader', 'admin'));

CREATE POLICY "task_completions_insert_own" ON task_completions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "task_completions_update_admin" ON task_completions FOR UPDATE
  USING (current_user_role() IN ('leader', 'admin'));

-- Project completions policies
CREATE POLICY "project_completions_select_own" ON project_completions FOR SELECT
  USING (user_id = auth.uid() OR current_user_role() IN ('leader', 'admin'));

-- Point transactions policies
CREATE POLICY "point_transactions_select_own" ON point_transactions FOR SELECT
  USING (user_id = auth.uid() OR current_user_role() IN ('leader', 'admin'));

CREATE POLICY "point_transactions_insert_system" ON point_transactions FOR INSERT
  WITH CHECK (current_user_role() IN ('leader', 'admin') OR true); -- triggers use SECURITY DEFINER

-- Leaderboard view — readable by all authenticated users
GRANT SELECT ON leaderboard TO authenticated;
