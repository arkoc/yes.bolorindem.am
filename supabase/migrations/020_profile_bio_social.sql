-- ============================================================
-- Profile Bio & Social URL
-- ============================================================

-- ─── Add columns to profiles ──────────────────────────────
ALTER TABLE profiles
  ADD COLUMN bio        TEXT,
  ADD COLUMN social_url TEXT,
  ADD COLUMN profile_completion_bonus_awarded BOOLEAN NOT NULL DEFAULT false;

-- ─── Add profile_completion to allowed source types ───────
ALTER TABLE point_transactions
  DROP CONSTRAINT IF EXISTS point_transactions_source_type_check;

ALTER TABLE point_transactions
  ADD CONSTRAINT point_transactions_source_type_check
  CHECK (source_type IN (
    'task_completion', 'project_completion', 'admin_grant',
    'reversal', 'referral', 'profile_completion'
  ));

-- ─── Trigger: award 20 pts when bio + social_url both set ─
-- Fires only on bio/social_url updates; the internal UPDATE
-- that sets profile_completion_bonus_awarded does not touch
-- those columns so the trigger will not re-fire.
CREATE OR REPLACE FUNCTION award_profile_completion_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.profile_completion_bonus_awarded = false
     AND NEW.bio IS NOT NULL AND trim(NEW.bio) <> ''
     AND NEW.social_url IS NOT NULL AND trim(NEW.social_url) <> ''
  THEN
    UPDATE profiles
    SET total_points = total_points + 20,
        profile_completion_bonus_awarded = true,
        updated_at = now()
    WHERE id = NEW.id;

    INSERT INTO point_transactions (user_id, amount, source_type, description)
    VALUES (NEW.id, 20, 'profile_completion', 'Profile completion bonus');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_completion_bonus
  AFTER UPDATE OF bio, social_url ON profiles
  FOR EACH ROW EXECUTE FUNCTION award_profile_completion_points();
