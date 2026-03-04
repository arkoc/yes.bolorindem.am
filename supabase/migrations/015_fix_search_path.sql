-- ============================================================
-- Fix: add SET search_path = public to all SECURITY DEFINER
-- functions so they can resolve public schema tables.
-- Supabase now restricts search_path for SECURITY DEFINER fns.
-- ============================================================

-- ─── handle_new_user ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Volunteer'),
    NEW.phone,
    UPPER(SUBSTR(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8))
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ─── handle_task_completion_insert ────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_task_completion_insert()
RETURNS trigger AS $$
DECLARE
  v_task_title text;
  v_project_id uuid;
BEGIN
  SELECT title, project_id INTO v_task_title, v_project_id
  FROM public.tasks WHERE id = NEW.task_id;

  UPDATE public.profiles
  SET total_points = total_points + NEW.points_awarded,
      updated_at   = now()
  WHERE id = NEW.user_id;

  INSERT INTO public.point_transactions (user_id, amount, source_type, source_id, description)
  VALUES (
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

-- ─── handle_task_completion_update ────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_task_completion_update()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'reversed' AND OLD.status = 'approved' THEN
    UPDATE public.profiles
    SET total_points = GREATEST(0, total_points - OLD.points_awarded),
        updated_at   = now()
    WHERE id = OLD.user_id;

    INSERT INTO public.point_transactions (user_id, amount, source_type, source_id, description, created_by)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ─── check_project_completion ─────────────────────────────────
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

    UPDATE public.profiles
    SET total_points = total_points + v_bonus_points,
        updated_at   = now()
    WHERE id = p_user_id;

    INSERT INTO public.point_transactions (user_id, amount, source_type, source_id, description)
    VALUES (p_user_id, v_bonus_points, 'project_completion', p_project_id, 'Project completion bonus');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ─── current_user_role ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ─── check_and_award_badges ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_total_completions    integer;
  v_form_completions     integer;
  v_location_completions integer;
  v_photo_completions    integer;
  v_total_points         integer;
  v_project_completions  integer;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE t.task_type = 'form'),
    COUNT(*) FILTER (WHERE t.task_type = 'location'),
    COUNT(*) FILTER (WHERE t.task_type = 'photo')
  INTO v_total_completions, v_form_completions, v_location_completions, v_photo_completions
  FROM public.task_completions tc
  LEFT JOIN public.tasks t ON t.id = tc.task_id
  WHERE tc.user_id = p_user_id AND tc.status = 'approved';

  SELECT p.total_points, COUNT(pc.id)
  INTO v_total_points, v_project_completions
  FROM public.profiles p
  LEFT JOIN public.project_completions pc ON pc.user_id = p_user_id
  WHERE p.id = p_user_id
  GROUP BY p.total_points;

  IF v_total_completions >= 1   THEN INSERT INTO public.user_badges(user_id, badge_id) VALUES (p_user_id, 'first-step')        ON CONFLICT DO NOTHING; END IF;
  IF v_total_completions >= 10  THEN INSERT INTO public.user_badges(user_id, badge_id) VALUES (p_user_id, 'activist')          ON CONFLICT DO NOTHING; END IF;
  IF v_total_completions >= 50  THEN INSERT INTO public.user_badges(user_id, badge_id) VALUES (p_user_id, 'political-machine')  ON CONFLICT DO NOTHING; END IF;
  IF v_total_completions >= 100 THEN INSERT INTO public.user_badges(user_id, badge_id) VALUES (p_user_id, 'indefatigable')     ON CONFLICT DO NOTHING; END IF;
  IF v_form_completions >= 20   THEN INSERT INTO public.user_badges(user_id, badge_id) VALUES (p_user_id, 'paper-pusher')      ON CONFLICT DO NOTHING; END IF;
  IF v_location_completions >= 20 THEN INSERT INTO public.user_badges(user_id, badge_id) VALUES (p_user_id, 'terrain-master')  ON CONFLICT DO NOTHING; END IF;
  IF v_photo_completions >= 15  THEN INSERT INTO public.user_badges(user_id, badge_id) VALUES (p_user_id, 'eyewitness')        ON CONFLICT DO NOTHING; END IF;
  IF v_total_points >= 100  THEN INSERT INTO public.user_badges(user_id, badge_id) VALUES (p_user_id, 'novice')               ON CONFLICT DO NOTHING; END IF;
  IF v_total_points >= 500  THEN INSERT INTO public.user_badges(user_id, badge_id) VALUES (p_user_id, 'reliable')             ON CONFLICT DO NOTHING; END IF;
  IF v_total_points >= 5000 THEN INSERT INTO public.user_badges(user_id, badge_id) VALUES (p_user_id, 'political-giant')      ON CONFLICT DO NOTHING; END IF;
  IF v_project_completions >= 1 THEN INSERT INTO public.user_badges(user_id, badge_id) VALUES (p_user_id, 'first-mission')    ON CONFLICT DO NOTHING; END IF;
  IF v_project_completions >= 5 THEN INSERT INTO public.user_badges(user_id, badge_id) VALUES (p_user_id, 'veteran')          ON CONFLICT DO NOTHING; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ─── get_badge_progress ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_badge_progress(p_user_id uuid)
RETURNS TABLE (
  form_completions     bigint,
  location_completions bigint,
  photo_completions    bigint,
  project_completions  bigint
) AS $$
  SELECT
    COUNT(*) FILTER (WHERE tc.status = 'approved' AND t.task_type = 'form'),
    COUNT(*) FILTER (WHERE tc.status = 'approved' AND t.task_type = 'location'),
    COUNT(*) FILTER (WHERE tc.status = 'approved' AND t.task_type = 'photo'),
    (SELECT COUNT(*) FROM public.project_completions pc WHERE pc.user_id = p_user_id)
  FROM public.task_completions tc
  LEFT JOIN public.tasks t ON t.id = tc.task_id
  WHERE tc.user_id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_badge_progress(uuid) TO authenticated;

-- ─── award_referral_points ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.award_referral_points()
RETURNS trigger AS $$
DECLARE
  v_points INTEGER := 50;
BEGIN
  IF NEW.referred_by IS NOT NULL AND OLD.referred_by IS NULL THEN
    UPDATE public.profiles
    SET total_points = total_points + v_points,
        updated_at   = now()
    WHERE id = NEW.referred_by;

    INSERT INTO public.point_transactions (user_id, amount, source_type, source_id, description)
    VALUES (
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

-- ─── Add referral columns if not yet applied ──────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

UPDATE public.profiles
SET referral_code = UPPER(SUBSTR(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE referral_code IS NULL;

-- ─── Ensure referral trigger exists ───────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_referral_set') THEN
    CREATE TRIGGER on_referral_set
      AFTER UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.award_referral_points();
  END IF;
END;
$$;

-- ─── Ensure point_transactions source_type includes referral ──
ALTER TABLE public.point_transactions
  DROP CONSTRAINT IF EXISTS point_transactions_source_type_check;
ALTER TABLE public.point_transactions
  ADD CONSTRAINT point_transactions_source_type_check
  CHECK (source_type IN ('task_completion','project_completion','admin_grant','reversal','referral'));

-- ─── push_subscriptions if not yet applied ────────────────────
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  endpoint   text NOT NULL,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'push_subscriptions'
      AND policyname = 'Users manage own push subscriptions'
  ) THEN
    CREATE POLICY "Users manage own push subscriptions"
      ON public.push_subscriptions FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;
