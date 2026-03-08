-- ============================================================
-- Use Armenian descriptions for referral and profile
-- completion point transactions.
-- ============================================================

CREATE OR REPLACE FUNCTION public.award_referral_points()
RETURNS trigger AS $$
DECLARE
  v_points integer := 50;
BEGIN
  IF NEW.referred_by IS NOT NULL AND OLD.referred_by IS NULL THEN
    PERFORM public.award_points(
      NEW.referred_by,
      v_points,
      'referral',
      NEW.id,
      'Ռեֆերալ բոնուս` ' || NEW.full_name || ' միացավ'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


CREATE OR REPLACE FUNCTION public.award_profile_completion_points()
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
    SET profile_completion_bonus_awarded = true,
        updated_at = now()
    WHERE id = NEW.id;

    PERFORM public.award_points(
      NEW.id, 20, 'profile_completion', NULL, 'Պրոֆիլի լրացման բոնուս'
    );
  END IF;
  RETURN NEW;
END;
$$;
