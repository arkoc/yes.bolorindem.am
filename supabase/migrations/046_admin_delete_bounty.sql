-- Admin delete bounty: refunds remaining escrowed points to creator, then deletes.
CREATE OR REPLACE FUNCTION admin_delete_bounty(p_bounty_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_b          user_bounties%ROWTYPE;
  v_used_slots INTEGER;
  v_refund     INTEGER;
BEGIN
  SELECT * INTO v_b FROM user_bounties WHERE id = p_bounty_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  -- Only refund if bounty is still open (not already cancelled/closed).
  IF v_b.status = 'open' THEN
    -- Count accepted + disputed: points already paid out for these slots.
    SELECT COUNT(*) INTO v_used_slots
      FROM bounty_completions
      WHERE bounty_id = p_bounty_id AND status IN ('accepted', 'disputed');

    v_refund := v_b.reward_points * (COALESCE(v_b.max_completions, 1) - v_used_slots);

    IF v_refund > 0 THEN
      UPDATE profiles SET total_points = total_points + v_refund WHERE id = v_b.creator_id;
      INSERT INTO point_transactions (user_id, amount, source_type, description)
        VALUES (v_b.creator_id, v_refund, 'bounty_refund', 'Bounty deleted by admin: ' || v_b.title);
    END IF;
  ELSE
    v_refund := 0;
  END IF;

  DELETE FROM user_bounties WHERE id = p_bounty_id;

  RETURN jsonb_build_object('ok', true, 'refunded', v_refund);
END;
$$;
