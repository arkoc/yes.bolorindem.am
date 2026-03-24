-- bounty_completions: queried by user_id ordered by created_at (volunteer /bounties page)
CREATE INDEX IF NOT EXISTS bounty_completions_user_created_idx
  ON bounty_completions(user_id, created_at DESC);

-- election_registrations: queried by type + payment_status + status + order by created_at
-- (elections page candidate/voter lists)
CREATE INDEX IF NOT EXISTS er_type_payment_created_idx
  ON election_registrations(type, payment_status, status, created_at ASC);

-- heatmap_points: daily claim count query (claimed_by + claimed_at range)
CREATE INDEX IF NOT EXISTS heatmap_points_user_claimed_idx
  ON heatmap_points(claimed_by, claimed_at DESC) WHERE claimed_by IS NOT NULL;

-- user_bounties: creator list sorted by created_at (volunteer /bounties my bounties tab)
CREATE INDEX IF NOT EXISTS user_bounties_creator_created_idx
  ON user_bounties(creator_id, created_at DESC);

-- Drop duplicate index (identical to task_completions_task_user_status_time_idx from migration 008)
DROP INDEX IF EXISTS task_completions_task_user_approved_idx;
