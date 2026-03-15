-- Bounty race condition fixes.
--
-- Fixes:
-- 1. cancel_user_bounty: count 'disputed' as used slots (points already paid out).
-- 2. submit_bounty_completion: non-repeatable "already claimed" check — use
--    'accepted'/'disputed' instead of 'accepted'/'pending_review'.
-- 3. submit_bounty_completion: close-bounty capacity check — count
--    'accepted'+'disputed' as used so repeatable bounties can't be over-claimed.
-- 4. reject_bounty_completion: acquire bounty lock before completion lock to
--    keep lock ordering consistent with submit_bounty_completion.
-- 5. Drop accept_bounty_completion — dead code (auto-accept flow never produces
--    'pending_review' status, so it always returned wrong_status).
-- 6. Add SET search_path to all 036 functions.

-- ─────────────────────────────────────────────────────────────────────────────
-- create_user_bounty  (add search_path only)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_user_bounty(
  p_creator_id      UUID,
  p_title           TEXT,
  p_description     TEXT,
  p_proof_hint      TEXT,
  p_reward_points   INTEGER,
  p_is_repeatable   BOOLEAN     DEFAULT false,
  p_max_completions INTEGER     DEFAULT NULL,
  p_expires_at      TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_creator   profiles%ROWTYPE;
  v_id        UUID;
  v_slots     INTEGER;
  v_escrow    INTEGER;
BEGIN
  v_slots  := COALESCE(p_max_completions, 1);
  v_escrow := p_reward_points * v_slots;

  SELECT * INTO v_creator FROM profiles WHERE id = p_creator_id FOR UPDATE;

  IF v_creator.total_points < v_escrow THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_points');
  END IF;

  UPDATE profiles SET total_points = total_points - v_escrow WHERE id = p_creator_id;
  INSERT INTO point_transactions (user_id, amount, source_type, description)
    VALUES (p_creator_id, -v_escrow, 'bounty_escrow', 'Bounty escrow: ' || p_title);

  INSERT INTO user_bounties (
    creator_id, title, description, proof_hint,
    reward_points, is_repeatable, max_completions, expires_at
  ) VALUES (
    p_creator_id, p_title, p_description, p_proof_hint,
    p_reward_points, p_is_repeatable, p_max_completions, p_expires_at
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- cancel_user_bounty
-- Fix: count 'accepted' + 'disputed' as used slots.
-- Disputed completions have already had points paid to completers; refunding
-- those slots would over-pay the creator. The slot is only freed if admin
-- later rejects the disputed completion (reject_bounty_completion handles that).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION cancel_user_bounty(
  p_bounty_id  UUID,
  p_creator_id UUID
)
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
  IF v_b.creator_id <> p_creator_id THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthorized'); END IF;
  IF v_b.status <> 'open' THEN RETURN jsonb_build_object('ok', false, 'reason', 'wrong_status'); END IF;

  -- Count accepted + disputed: both have had points paid out already.
  SELECT COUNT(*) INTO v_used_slots
    FROM bounty_completions
    WHERE bounty_id = p_bounty_id AND status IN ('accepted', 'disputed');

  v_refund := v_b.reward_points * (COALESCE(v_b.max_completions, 1) - v_used_slots);

  UPDATE user_bounties SET status = 'cancelled' WHERE id = p_bounty_id;

  IF v_refund > 0 THEN
    UPDATE profiles SET total_points = total_points + v_refund WHERE id = p_creator_id;
    INSERT INTO point_transactions (user_id, amount, source_type, description)
      VALUES (p_creator_id, v_refund, 'bounty_refund', 'Bounty refund: ' || v_b.title);
  END IF;

  RETURN jsonb_build_object('ok', true, 'refunded', v_refund);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- submit_bounty_completion
-- Fix 1: "already_claimed" check uses 'accepted'/'disputed' (not pending_review).
-- Fix 2: capacity check counts 'accepted'+'disputed' as used slots.
-- Fix 3: consistent lock ordering — bounty lock first, always.
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
  v_b         user_bounties%ROWTYPE;
  v_comp_id   UUID;
  v_used_slots INTEGER;
BEGIN
  -- Bounty lock first (consistent ordering with all other functions).
  SELECT * INTO v_b FROM user_bounties WHERE id = p_bounty_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF v_b.status <> 'open' THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_open'); END IF;
  IF v_b.creator_id = p_user_id THEN RETURN jsonb_build_object('ok', false, 'reason', 'own_bounty'); END IF;

  -- One completion per user (UNIQUE constraint is the hard backstop).
  IF EXISTS (SELECT 1 FROM bounty_completions WHERE bounty_id = p_bounty_id AND user_id = p_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_completed');
  END IF;

  -- Count accepted + disputed as used slots.
  -- For non-repeatable: any used slot blocks a new claim.
  -- For repeatable:     used slots must be < max_completions.
  SELECT COUNT(*) INTO v_used_slots
    FROM bounty_completions
    WHERE bounty_id = p_bounty_id AND status IN ('accepted', 'disputed');

  IF NOT v_b.is_repeatable THEN
    IF v_used_slots > 0 THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed');
    END IF;
  ELSE
    IF v_used_slots >= COALESCE(v_b.max_completions, 1) THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'at_capacity');
    END IF;
  END IF;

  INSERT INTO bounty_completions (bounty_id, user_id, proof_url, status, resolved_at, resolution)
    VALUES (p_bounty_id, p_user_id, p_proof_url, 'accepted', now(), 'auto_accepted')
    RETURNING id INTO v_comp_id;

  PERFORM public.award_points(
    p_user_id, v_b.reward_points, 'bounty_reward',
    p_bounty_id, 'Bounty reward: ' || v_b.title
  );

  -- Re-count after insert; close if all slots filled (accepted + disputed).
  SELECT COUNT(*) INTO v_used_slots
    FROM bounty_completions
    WHERE bounty_id = p_bounty_id AND status IN ('accepted', 'disputed');

  IF NOT v_b.is_repeatable OR v_used_slots >= COALESCE(v_b.max_completions, 1) THEN
    UPDATE user_bounties SET status = 'closed' WHERE id = p_bounty_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'completionId', v_comp_id, 'points', v_b.reward_points);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- reject_bounty_completion
-- Fix: acquire bounty lock before completion lock (consistent ordering).
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
  -- Read completion without lock first to get bounty_id.
  SELECT * INTO v_c FROM bounty_completions WHERE id = p_completion_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF v_c.status <> 'disputed' THEN RETURN jsonb_build_object('ok', false, 'reason', 'wrong_status'); END IF;

  -- Lock bounty first (consistent with submit_bounty_completion).
  SELECT * INTO v_b FROM user_bounties WHERE id = v_c.bounty_id FOR UPDATE;

  -- Re-lock completion after bounty to avoid TOCTOU on status.
  SELECT * INTO v_c FROM bounty_completions WHERE id = p_completion_id FOR UPDATE;
  IF v_c.status <> 'disputed' THEN RETURN jsonb_build_object('ok', false, 'reason', 'wrong_status'); END IF;

  -- Reverse points from completer.
  UPDATE profiles SET total_points = GREATEST(0, total_points - v_b.reward_points) WHERE id = v_c.user_id;
  INSERT INTO point_transactions (user_id, amount, source_type, description)
    VALUES (v_c.user_id, -v_b.reward_points, 'reversal', 'Bounty reward reversed: ' || v_b.title);

  -- Refund slot to creator.
  UPDATE profiles SET total_points = total_points + v_b.reward_points WHERE id = v_b.creator_id;
  INSERT INTO point_transactions (user_id, amount, source_type, description)
    VALUES (v_b.creator_id, v_b.reward_points, 'bounty_refund', 'Bounty slot refunded: ' || v_b.title);

  UPDATE bounty_completions
    SET status = 'rejected', resolved_at = now(), resolution = 'admin_rejected'
    WHERE id = p_completion_id;

  -- Reopen bounty if closed — the rejected completion frees a slot.
  IF v_b.status = 'closed' THEN
    UPDATE user_bounties SET status = 'open' WHERE id = v_b.id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Drop dead code: accept_bounty_completion checked 'pending_review' status
-- which the auto-accept flow (038) never produces.
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS accept_bounty_completion(UUID, UUID);
