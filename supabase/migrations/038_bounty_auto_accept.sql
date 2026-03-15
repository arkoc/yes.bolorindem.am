-- Bounty auto-accept: points awarded immediately on submission.
-- Creator can dispute; admin can accept (keep points) or reject (reverse points).

-- ─────────────────────────────────────────────────────────────────────────────
-- submit_bounty_completion
-- Validates, inserts completion as 'accepted', awards points atomically.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION submit_bounty_completion(
  p_bounty_id UUID,
  p_user_id   UUID,
  p_proof_url TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_b              user_bounties%ROWTYPE;
  v_comp_id        UUID;
  v_accepted_count INTEGER;
BEGIN
  SELECT * INTO v_b FROM user_bounties WHERE id = p_bounty_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF v_b.status <> 'open' THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_open'); END IF;
  IF v_b.creator_id = p_user_id THEN RETURN jsonb_build_object('ok', false, 'reason', 'own_bounty'); END IF;

  IF EXISTS (SELECT 1 FROM bounty_completions WHERE bounty_id = p_bounty_id AND user_id = p_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_completed');
  END IF;

  IF NOT v_b.is_repeatable THEN
    SELECT COUNT(*) INTO v_accepted_count
      FROM bounty_completions WHERE bounty_id = p_bounty_id AND status IN ('accepted', 'pending_review');
    IF v_accepted_count > 0 THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed');
    END IF;
  END IF;

  INSERT INTO bounty_completions (bounty_id, user_id, proof_url, status, resolved_at, resolution)
    VALUES (p_bounty_id, p_user_id, p_proof_url, 'accepted', now(), 'auto_accepted')
    RETURNING id INTO v_comp_id;

  PERFORM public.award_points(
    p_user_id, v_b.reward_points, 'bounty_reward',
    p_bounty_id, 'Bounty reward: ' || v_b.title
  );

  SELECT COUNT(*) INTO v_accepted_count
    FROM bounty_completions WHERE bounty_id = p_bounty_id AND status = 'accepted';

  IF NOT v_b.is_repeatable OR v_accepted_count >= COALESCE(v_b.max_completions, 1) THEN
    UPDATE user_bounties SET status = 'closed' WHERE id = p_bounty_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'completionId', v_comp_id, 'points', v_b.reward_points);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- reject_bounty_completion (admin only)
-- Reverses points from completer, refunds slot to creator, reopens bounty.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION reject_bounty_completion(
  p_completion_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_c bounty_completions%ROWTYPE;
  v_b user_bounties%ROWTYPE;
BEGIN
  SELECT * INTO v_c FROM bounty_completions WHERE id = p_completion_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF v_c.status <> 'disputed' THEN RETURN jsonb_build_object('ok', false, 'reason', 'wrong_status'); END IF;

  SELECT * INTO v_b FROM user_bounties WHERE id = v_c.bounty_id FOR UPDATE;

  -- Reverse points from completer
  UPDATE profiles SET total_points = GREATEST(0, total_points - v_b.reward_points) WHERE id = v_c.user_id;
  INSERT INTO point_transactions (user_id, amount, source_type, description)
    VALUES (v_c.user_id, -v_b.reward_points, 'reversal', 'Bounty reward reversed: ' || v_b.title);

  -- Refund slot to creator
  UPDATE profiles SET total_points = total_points + v_b.reward_points WHERE id = v_b.creator_id;
  INSERT INTO point_transactions (user_id, amount, source_type, description)
    VALUES (v_b.creator_id, v_b.reward_points, 'bounty_refund', 'Bounty slot refunded: ' || v_b.title);

  UPDATE bounty_completions
    SET status = 'rejected', resolved_at = now(), resolution = 'admin_rejected'
    WHERE id = p_completion_id;

  -- Reopen bounty if it was closed (free the slot)
  IF v_b.status = 'closed' THEN
    UPDATE user_bounties SET status = 'open' WHERE id = v_b.id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;
