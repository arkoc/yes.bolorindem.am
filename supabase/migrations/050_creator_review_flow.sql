-- Replace dispute/auto-accept flow with creator review flow.
--
-- New flow:
-- 1. User submits → pending_review (no points awarded)
-- 2. Creator accepts → points awarded; if slots full, all remaining pending auto-rejected + bounty closed
-- 3. Creator rejects → status = rejected; slot stays open for others
-- 4. Cancel/expire → auto-reject all pending; refund only unaccepted slots to creator
--
-- Removed: 'disputed' status, reject_bounty_completion (admin), auto-accept on submit.

-- ─────────────────────────────────────────────────────────────────────────────
-- Drop 'disputed' from status constraint
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE bounty_completions
  DROP CONSTRAINT IF EXISTS bounty_completions_status_check;

ALTER TABLE bounty_completions
  ADD CONSTRAINT bounty_completions_status_check
  CHECK (status IN ('pending_review', 'accepted', 'rejected'));

-- Migrate any lingering disputed rows → rejected (should be none in prod, but safety)
UPDATE bounty_completions SET status = 'rejected', resolution = 'migrated_from_disputed'
  WHERE status = 'disputed';

-- ─────────────────────────────────────────────────────────────────────────────
-- submit_bounty_completion
-- Now inserts as pending_review; no points awarded; multiple users can have
-- pending submissions simultaneously (bounty stays open until creator accepts).
-- ─────────────────────────────────────────────────────────────────────────────
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
  v_b       user_bounties%ROWTYPE;
  v_comp_id UUID;
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

  -- One submission per user (UNIQUE constraint is the hard backstop)
  IF EXISTS (SELECT 1 FROM bounty_completions WHERE bounty_id = p_bounty_id AND user_id = p_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_completed');
  END IF;

  INSERT INTO bounty_completions (bounty_id, user_id, proof_url, status)
    VALUES (p_bounty_id, p_user_id, NULLIF(p_proof_url, ''), 'pending_review')
    RETURNING id INTO v_comp_id;

  -- Bounty stays open; creator will review and accept/reject
  RETURN jsonb_build_object('ok', true, 'completionId', v_comp_id);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- creator_accept_completion
-- Awards points to completer. If slots are now full (or non-repeatable),
-- auto-rejects all remaining pending_review completions and closes the bounty.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION creator_accept_completion(
  p_completion_id UUID,
  p_creator_id    UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_c              bounty_completions%ROWTYPE;
  v_b              user_bounties%ROWTYPE;
  v_accepted_count INTEGER;
BEGIN
  -- Read completion to get bounty_id first (no lock yet)
  SELECT * INTO v_c FROM bounty_completions WHERE id = p_completion_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  -- Lock bounty first (consistent ordering)
  SELECT * INTO v_b FROM user_bounties WHERE id = v_c.bounty_id FOR UPDATE;
  IF v_b.creator_id <> p_creator_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthorized');
  END IF;

  -- Re-lock completion after bounty
  SELECT * INTO v_c FROM bounty_completions WHERE id = p_completion_id FOR UPDATE;
  IF v_c.status <> 'pending_review' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'wrong_status');
  END IF;

  -- Accept and award points
  UPDATE bounty_completions
    SET status = 'accepted', resolved_at = now(), resolution = 'creator_accepted'
    WHERE id = p_completion_id;

  PERFORM public.award_points(
    v_c.user_id, v_b.reward_points, 'bounty_reward',
    v_b.id, 'Bounty reward: ' || v_b.title
  );

  -- Count accepted slots after this acceptance
  SELECT COUNT(*) INTO v_accepted_count
    FROM bounty_completions
    WHERE bounty_id = v_b.id AND status = 'accepted';

  -- If non-repeatable or all slots filled: auto-reject remaining pending + close bounty
  IF NOT v_b.is_repeatable OR v_accepted_count >= COALESCE(v_b.max_completions, 1) THEN
    UPDATE bounty_completions
      SET status = 'rejected', resolved_at = now(), resolution = 'auto_rejected'
      WHERE bounty_id = v_b.id AND status = 'pending_review';

    UPDATE user_bounties SET status = 'closed' WHERE id = v_b.id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'points', v_b.reward_points);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- creator_reject_completion
-- Marks a pending_review completion as rejected. Slot stays open for others.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION creator_reject_completion(
  p_completion_id UUID,
  p_creator_id    UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_c bounty_completions%ROWTYPE;
  v_b user_bounties%ROWTYPE;
BEGIN
  SELECT * INTO v_c FROM bounty_completions WHERE id = p_completion_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  SELECT * INTO v_b FROM user_bounties WHERE id = v_c.bounty_id FOR UPDATE;
  IF v_b.creator_id <> p_creator_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthorized');
  END IF;

  SELECT * INTO v_c FROM bounty_completions WHERE id = p_completion_id FOR UPDATE;
  IF v_c.status <> 'pending_review' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'wrong_status');
  END IF;

  UPDATE bounty_completions
    SET status = 'rejected', resolved_at = now(), resolution = 'creator_rejected'
    WHERE id = p_completion_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- cancel_user_bounty
-- Only accepted slots cost escrow. Refund remaining (total - accepted).
-- Auto-reject any pending_review on cancel.
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
  v_b              user_bounties%ROWTYPE;
  v_accepted_count INTEGER;
  v_refund         INTEGER;
BEGIN
  SELECT * INTO v_b FROM user_bounties WHERE id = p_bounty_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF v_b.creator_id <> p_creator_id THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthorized'); END IF;
  IF v_b.status <> 'open' THEN RETURN jsonb_build_object('ok', false, 'reason', 'wrong_status'); END IF;

  SELECT COUNT(*) INTO v_accepted_count
    FROM bounty_completions WHERE bounty_id = p_bounty_id AND status = 'accepted';

  v_refund := v_b.reward_points * (COALESCE(v_b.max_completions, 1) - v_accepted_count);

  -- Auto-reject pending submissions
  UPDATE bounty_completions
    SET status = 'rejected', resolved_at = now(), resolution = 'auto_rejected'
    WHERE bounty_id = p_bounty_id AND status = 'pending_review';

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
-- expire_bounties
-- Same logic: refund unaccepted slots, auto-reject pending submissions.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION expire_bounties()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_b              user_bounties%ROWTYPE;
  v_accepted_count INTEGER;
  v_refund         INTEGER;
  v_count          INTEGER := 0;
BEGIN
  FOR v_b IN
    SELECT * FROM user_bounties
    WHERE status = 'open'
      AND expires_at IS NOT NULL
      AND expires_at < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT COUNT(*) INTO v_accepted_count
      FROM bounty_completions
      WHERE bounty_id = v_b.id AND status = 'accepted';

    v_refund := v_b.reward_points * (COALESCE(v_b.max_completions, 1) - v_accepted_count);

    -- Auto-reject pending submissions
    UPDATE bounty_completions
      SET status = 'rejected', resolved_at = now(), resolution = 'auto_rejected'
      WHERE bounty_id = v_b.id AND status = 'pending_review';

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

-- ─────────────────────────────────────────────────────────────────────────────
-- Drop old admin dispute function (no longer needed)
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS reject_bounty_completion(UUID);
