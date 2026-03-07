-- ============================================================
-- Voting / Polls
-- ============================================================

CREATE TABLE polls (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text        NOT NULL,
  description       text,
  status            text        NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft', 'active', 'closed')),
  allow_multiple    boolean     NOT NULL DEFAULT false,
  expires_at        timestamptz,
  notify_on_publish boolean     NOT NULL DEFAULT false,
  created_by        uuid        REFERENCES profiles(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE poll_options (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id     uuid        NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  text        text        NOT NULL,
  order_index integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE poll_votes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id    uuid        NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id  uuid        NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, option_id, user_id)
);

-- ─── Indexes ──────────────────────────────────────────────
CREATE INDEX poll_options_poll_idx     ON poll_options(poll_id, order_index);
CREATE INDEX poll_votes_poll_idx       ON poll_votes(poll_id);
CREATE INDEX poll_votes_user_poll_idx  ON poll_votes(user_id, poll_id);
CREATE INDEX poll_votes_option_idx     ON poll_votes(option_id);

-- ─── RLS ──────────────────────────────────────────────────
ALTER TABLE polls        ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes   ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read active/closed polls
CREATE POLICY "polls_select"
  ON polls FOR SELECT TO authenticated
  USING (status IN ('active', 'closed'));

-- Poll options visible when parent poll is active/closed
CREATE POLICY "poll_options_select"
  ON poll_options FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM polls
      WHERE polls.id = poll_options.poll_id
        AND polls.status IN ('active', 'closed')
    )
  );

-- Users can read their own votes only
CREATE POLICY "poll_votes_select_own"
  ON poll_votes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own vote if poll is active and not expired
CREATE POLICY "poll_votes_insert"
  ON poll_votes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM polls
      WHERE polls.id = poll_votes.poll_id
        AND polls.status = 'active'
        AND (polls.expires_at IS NULL OR polls.expires_at > now())
    )
  );
