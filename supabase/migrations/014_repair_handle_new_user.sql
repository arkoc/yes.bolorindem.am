-- ============================================================
-- Repair: ensure handle_new_user is robust and referral
-- columns exist. Safe to run even if 012 was already applied.
-- ============================================================

-- ─── Add referral columns if they don't exist ─────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by   UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- ─── Generate codes for profiles that don't have one ──────
UPDATE profiles
SET referral_code = UPPER(SUBSTR(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE referral_code IS NULL;

-- ─── Replace handle_new_user (always safe to replace) ─────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, full_name, phone, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Volunteer'),
    NEW.phone,
    UPPER(SUBSTR(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8))
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Ensure award_referral_points function exists ─────────
CREATE OR REPLACE FUNCTION award_referral_points()
RETURNS trigger AS $$
DECLARE
  v_points INTEGER := 50;
BEGIN
  IF NEW.referred_by IS NOT NULL AND OLD.referred_by IS NULL THEN
    UPDATE profiles
    SET total_points = total_points + v_points,
        updated_at   = now()
    WHERE id = NEW.referred_by;

    INSERT INTO point_transactions (user_id, amount, source_type, source_id, description)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Create referral trigger if not exists ────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_referral_set'
  ) THEN
    CREATE TRIGGER on_referral_set
      AFTER UPDATE ON profiles
      FOR EACH ROW EXECUTE FUNCTION award_referral_points();
  END IF;
END;
$$;

-- ─── Ensure 'referral' is in point_transactions source_type
ALTER TABLE point_transactions
  DROP CONSTRAINT IF EXISTS point_transactions_source_type_check;

ALTER TABLE point_transactions
  ADD CONSTRAINT point_transactions_source_type_check
  CHECK (source_type IN (
    'task_completion', 'project_completion', 'admin_grant', 'reversal', 'referral'
  ));

-- ─── push_subscriptions table if not exists ───────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  endpoint   text NOT NULL,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'push_subscriptions' AND policyname = 'Users manage own push subscriptions'
  ) THEN
    CREATE POLICY "Users manage own push subscriptions"
      ON push_subscriptions FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;
