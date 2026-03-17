-- Add require_photo flag to user_bounties.
-- When false, volunteers can complete a bounty without attaching a photo.
-- Also makes bounty_completions.proof_url nullable to support photo-free completions.

-- 1. Make proof_url nullable (photo may not be required)
ALTER TABLE bounty_completions ALTER COLUMN proof_url DROP NOT NULL;

-- 2. Add require_photo flag (default true to keep existing bounties unchanged)
ALTER TABLE user_bounties ADD COLUMN IF NOT EXISTS require_photo BOOLEAN NOT NULL DEFAULT true;

-- ─────────────────────────────────────────────────────────────────────────────
-- create_user_bounty — accept p_require_photo parameter
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_user_bounty(
  p_creator_id      UUID,
  p_title           TEXT,
  p_description     TEXT,
  p_proof_hint      TEXT,
  p_reward_points   INTEGER,
  p_is_repeatable   BOOLEAN     DEFAULT false,
  p_max_completions INTEGER     DEFAULT NULL,
  p_expires_at      TIMESTAMPTZ DEFAULT NULL,
  p_require_photo   BOOLEAN     DEFAULT true
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
    reward_points, is_repeatable, max_completions, expires_at, require_photo
  ) VALUES (
    p_creator_id, p_title, p_description, p_proof_hint,
    p_reward_points, p_is_repeatable, p_max_completions, p_expires_at, p_require_photo
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- submit_bounty_completion — proof_url is now optional (NULL when no photo)
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
  v_b          user_bounties%ROWTYPE;
  v_comp_id    UUID;
  v_used_slots INTEGER;
BEGIN
  -- Bounty lock first (consistent ordering with all other functions).
  SELECT * INTO v_b FROM user_bounties WHERE id = p_bounty_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF v_b.status <> 'open' THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_open'); END IF;
  IF v_b.creator_id = p_user_id THEN RETURN jsonb_build_object('ok', false, 'reason', 'own_bounty'); END IF;

  -- Enforce photo requirement at the DB level.
  IF v_b.require_photo AND (p_proof_url IS NULL OR p_proof_url = '') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'photo_required');
  END IF;

  -- One completion per user (UNIQUE constraint is the hard backstop).
  IF EXISTS (SELECT 1 FROM bounty_completions WHERE bounty_id = p_bounty_id AND user_id = p_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_completed');
  END IF;

  -- Count accepted + disputed as used slots.
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
    VALUES (p_bounty_id, p_user_id, NULLIF(p_proof_url, ''), 'accepted', now(), 'auto_accepted')
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
