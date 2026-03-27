-- Award points when election registration payment_status changes to 'paid'
CREATE OR REPLACE FUNCTION handle_election_payment_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_points integer;
BEGIN
  -- Only fire when transitioning to 'paid' from a non-paid state
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    v_points := CASE NEW.type
      WHEN 'candidate' THEN 3000
      WHEN 'voter'     THEN 1000
      ELSE 0
    END;

    IF v_points > 0 THEN
      UPDATE profiles
        SET total_points = total_points + v_points,
            updated_at   = now()
      WHERE id = NEW.user_id;

      INSERT INTO point_transactions (user_id, amount, source_type, source_id, description)
      VALUES (
        NEW.user_id,
        v_points,
        'election_registration',
        NEW.id,
        CASE NEW.type
          WHEN 'candidate' THEN 'ԱԺ թեկնածուի գրանցում'
          ELSE 'Ընտրողի գրանցում'
        END
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_election_payment_paid
  AFTER UPDATE ON election_registrations
  FOR EACH ROW
  EXECUTE FUNCTION handle_election_payment_paid();
