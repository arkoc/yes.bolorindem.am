-- User bounty system
-- Creator spends points to post an open bounty; anyone can complete it.
-- is_repeatable = true means multiple different users can each complete it once, up to max_completions.
-- Non-repeatable: closes after first accepted completion (max_completions ignored / treated as 1).
-- Repeatable: stays open until accepted_count >= max_completions.
-- Escrow = reward_points * COALESCE(max_completions, 1) paid upfront at creation.
-- Each user can only complete a bounty once (UNIQUE constraint). Disputed completions resolved by admin.

DROP TABLE IF EXISTS bounty_completions CASCADE;
DROP TABLE IF EXISTS user_bounties CASCADE;

-- Extend point_transactions source_type to include bounty types
ALTER TABLE point_transactions DROP CONSTRAINT IF EXISTS point_transactions_source_type_check;
ALTER TABLE point_transactions ADD CONSTRAINT point_transactions_source_type_check
  CHECK (source_type IN (
    'task_completion', 'project_completion', 'admin_grant',
    'reversal', 'referral', 'profile_completion', 'poll_vote',
    'heatmap_claim', 'heatmap_completion_bonus',
    'bounty_escrow', 'bounty_reward', 'bounty_refund'
  ));

CREATE TABLE user_bounties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  proof_hint      TEXT,
  reward_points   INTEGER NOT NULL CHECK (reward_points >= 10),
  is_repeatable   BOOLEAN NOT NULL DEFAULT false,
  max_completions INTEGER CHECK (max_completions IS NULL OR max_completions >= 1),
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','closed','cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ
);

CREATE TABLE bounty_completions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id   UUID NOT NULL REFERENCES user_bounties(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  proof_url   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending_review'
                CHECK (status IN ('pending_review','accepted','disputed','rejected')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolution  TEXT,
  UNIQUE(bounty_id, user_id)
);

ALTER TABLE user_bounties      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bounty_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bounty_read_all"        ON user_bounties      FOR SELECT USING (true);
CREATE POLICY "completion_read_all"    ON bounty_completions FOR SELECT USING (true);
CREATE POLICY "bounty_creator_insert"  ON user_bounties      FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "bounty_creator_update"  ON user_bounties      FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "completion_insert"      ON bounty_completions FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE user_bounties      REPLICA IDENTITY FULL;
ALTER TABLE bounty_completions REPLICA IDENTITY FULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- create_user_bounty
-- Escrows reward_points * COALESCE(max_completions, 1) at creation.
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
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
-- accept_bounty_completion
-- Non-repeatable: pays completer from escrow, closes bounty.
-- Repeatable: pays completer from escrow, closes when accepted_count >= max_completions.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION accept_bounty_completion(
  p_completion_id UUID,
  p_resolver_id   UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_c             bounty_completions%ROWTYPE;
  v_b             user_bounties%ROWTYPE;
  v_accepted_count INTEGER;
BEGIN
  SELECT * INTO v_c FROM bounty_completions WHERE id = p_completion_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  IF v_c.status <> 'pending_review' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'wrong_status');
  END IF;

  SELECT * INTO v_b FROM user_bounties WHERE id = v_c.bounty_id FOR UPDATE;
  IF p_resolver_id <> v_b.creator_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthorized');
  END IF;

  UPDATE bounty_completions
    SET status = 'accepted', resolved_at = now(), resolution = 'accepted'
    WHERE id = p_completion_id;

  -- Pay completer (from escrowed slot)
  UPDATE profiles SET total_points = total_points + v_b.reward_points WHERE id = v_c.user_id;
  INSERT INTO point_transactions (user_id, amount, source_type, description)
    VALUES (v_c.user_id, v_b.reward_points, 'bounty_reward', 'Bounty reward: ' || v_b.title);

  -- Close bounty when capacity is reached
  SELECT COUNT(*) INTO v_accepted_count
    FROM bounty_completions
    WHERE bounty_id = v_b.id AND status = 'accepted';

  IF NOT v_b.is_repeatable OR v_accepted_count >= COALESCE(v_b.max_completions, 1) THEN
    UPDATE user_bounties SET status = 'closed' WHERE id = v_b.id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'points', v_b.reward_points);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- cancel_user_bounty: refunds remaining escrowed slots (total - accepted)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION cancel_user_bounty(
  p_bounty_id  UUID,
  p_creator_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
-- Storage bucket for bounty proof images (public read, authenticated upload)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bounty-proofs',
  'bounty-proofs',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Bounty proofs are publicly readable"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'bounty-proofs');

CREATE POLICY "Authenticated users can upload bounty proofs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bounty-proofs');
