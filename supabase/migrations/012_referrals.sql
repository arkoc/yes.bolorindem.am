-- ============================================================
-- Referral System
-- ============================================================

-- ─── Add referral columns to profiles ─────────────────────
ALTER TABLE profiles
  ADD COLUMN referral_code TEXT UNIQUE,
  ADD COLUMN referred_by   UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- ─── Generate codes for existing users ────────────────────
UPDATE profiles
SET referral_code = UPPER(ENCODE(GEN_RANDOM_BYTES(4), 'hex'))
WHERE referral_code IS NULL;

-- ─── Update handle_new_user to generate referral code ─────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, full_name, phone, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Volunteer'),
    NEW.phone,
    UPPER(ENCODE(GEN_RANDOM_BYTES(4), 'hex'))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Add 'referral' to point_transactions source_type ─────
ALTER TABLE point_transactions
  DROP CONSTRAINT IF EXISTS point_transactions_source_type_check;

ALTER TABLE point_transactions
  ADD CONSTRAINT point_transactions_source_type_check
  CHECK (source_type IN (
    'task_completion', 'project_completion', 'admin_grant', 'reversal', 'referral'
  ));

-- ─── Trigger: award points when referred_by is set ────────
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

CREATE TRIGGER on_referral_set
  AFTER UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION award_referral_points();
