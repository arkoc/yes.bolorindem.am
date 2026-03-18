-- 1. Prevent completing an expired bounty.
CREATE OR REPLACE FUNCTION submit_bounty_completion(
  p_bounty_id UUID,
  p_user_id   UUID,
  p_proof_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_b          user_bounties%ROWTYPE;
  v_comp_id    UUID;
  v_used_slots INTEGER;
BEGIN
  SELECT * INTO v_b FROM user_bounties WHERE id = p_bounty_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF v_b.status <> 'open' THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_open'); END IF;
  IF v_b.creator_id = p_user_id THEN RETURN jsonb_build_object('ok', false, 'reason', 'own_bounty'); END IF;
  IF v_b.expires_at IS NOT NULL AND v_b.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  IF v_b.require_photo AND (p_proof_url IS NULL OR p_proof_url = '') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'photo_required');
  END IF;

  IF EXISTS (SELECT 1 FROM bounty_completions WHERE bounty_id = p_bounty_id AND user_id = p_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_completed');
  END IF;

  SELECT COUNT(*) INTO v_used_slots
    FROM bounty_completions
    WHERE bounty_id = p_bounty_id AND status IN ('accepted', 'disputed');

  IF NOT v_b.is_repeatable THEN
    IF v_used_slots > 0 THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed'); END IF;
  ELSE
    IF v_used_slots >= COALESCE(v_b.max_completions, 1) THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'at_capacity');
    END IF;
  END IF;

  INSERT INTO bounty_completions (bounty_id, user_id, proof_url, status, resolved_at, resolution)
    VALUES (p_bounty_id, p_user_id, NULLIF(p_proof_url, ''), 'accepted', now(), 'auto_accepted')
    RETURNING id INTO v_comp_id;

  PERFORM public.award_points(
    p_user_id, v_b.reward_points, 'bounty_reward',
    p_bounty_id, 'Bounty reward: ' || v_b.title
  );

  SELECT COUNT(*) INTO v_used_slots
    FROM bounty_completions
    WHERE bounty_id = p_bounty_id AND status IN ('accepted', 'disputed');

  IF NOT v_b.is_repeatable OR v_used_slots >= COALESCE(v_b.max_completions, 1) THEN
    UPDATE user_bounties SET status = 'closed' WHERE id = p_bounty_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'completionId', v_comp_id, 'points', v_b.reward_points);
END;
$$;

-- 2. Close all expired open bounties and refund remaining escrow to creators.
CREATE OR REPLACE FUNCTION expire_bounties()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_b          user_bounties%ROWTYPE;
  v_used_slots INTEGER;
  v_refund     INTEGER;
  v_count      INTEGER := 0;
BEGIN
  FOR v_b IN
    SELECT * FROM user_bounties
    WHERE status = 'open'
      AND expires_at IS NOT NULL
      AND expires_at < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT COUNT(*) INTO v_used_slots
      FROM bounty_completions
      WHERE bounty_id = v_b.id AND status IN ('accepted', 'disputed');

    v_refund := v_b.reward_points * (COALESCE(v_b.max_completions, 1) - v_used_slots);

    UPDATE user_bounties SET status = 'closed' WHERE id = v_b.id;

    IF v_refund > 0 THEN
      UPDATE profiles SET total_points = total_points + v_refund WHERE id = v_b.creator_id;
      INSERT INTO point_transactions (user_id, amount, source_type, description)
        VALUES (v_b.creator_id, v_refund, 'bounty_refund', 'Bounty expired: ' || v_b.title);
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
