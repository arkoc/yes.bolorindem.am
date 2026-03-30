-- Fix trigger: correct source_type values + handle voter→candidate upgrade points
CREATE OR REPLACE FUNCTION handle_election_payment_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_points integer;
  v_prev_points integer := 0;
BEGIN
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    v_points := CASE NEW.type
      WHEN 'candidate' THEN 3000
      WHEN 'voter'     THEN 1000
      ELSE 0
    END;

    -- If upgraded from voter, deduct previously awarded voter points
    IF NEW.type = 'candidate' THEN
      SELECT COALESCE(SUM(amount), 0) INTO v_prev_points
      FROM point_transactions
      WHERE source_id = NEW.id AND source_type = 'voter_registration';
    END IF;

    IF v_points > 0 THEN
      UPDATE profiles
        SET total_points = total_points + v_points - v_prev_points,
            updated_at   = now()
      WHERE id = NEW.user_id;

      -- Remove old voter point transaction if upgrading
      IF v_prev_points > 0 THEN
        DELETE FROM point_transactions
        WHERE source_id = NEW.id AND source_type = 'voter_registration';
      END IF;

      INSERT INTO point_transactions (user_id, amount, source_type, source_id, description)
      VALUES (
        NEW.user_id,
        v_points,
        CASE NEW.type WHEN 'candidate' THEN 'candidate_registration' ELSE 'voter_registration' END,
        NEW.id,
        CASE NEW.type WHEN 'candidate' THEN 'ԱԺ թեկնածուի գրանցում' ELSE 'Ընտրողի գրանցում' END
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
