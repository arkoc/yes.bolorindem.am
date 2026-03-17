-- Drop all overloaded versions of create_user_bounty left by migrations 042/043/044.
DROP FUNCTION IF EXISTS create_user_bounty(uuid, text, text, text, integer, boolean, integer, timestamptz, boolean);
DROP FUNCTION IF EXISTS create_user_bounty(uuid, text, text, text, integer, boolean, integer, timestamptz, boolean, text);
DROP FUNCTION IF EXISTS create_user_bounty(uuid, text, text, text, integer, boolean, integer, timestamptz, boolean, text[]);

CREATE FUNCTION create_user_bounty(
  p_creator_id      UUID,
  p_title           TEXT,
  p_description     TEXT,
  p_proof_hint      TEXT,
  p_reward_points   INTEGER,
  p_is_repeatable   BOOLEAN     DEFAULT false,
  p_max_completions INTEGER     DEFAULT NULL,
  p_expires_at      TIMESTAMPTZ DEFAULT NULL,
  p_require_photo   BOOLEAN     DEFAULT false,
  p_image_urls      TEXT[]      DEFAULT '{}'
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
    reward_points, is_repeatable, max_completions, expires_at,
    require_photo, image_urls
  ) VALUES (
    p_creator_id, p_title, p_description, p_proof_hint,
    p_reward_points, p_is_repeatable, p_max_completions, p_expires_at,
    p_require_photo, p_image_urls
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;
