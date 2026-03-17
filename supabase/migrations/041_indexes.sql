-- Missing indexes for bounty tables (new feature, no indexes yet)
CREATE INDEX IF NOT EXISTS bounty_completions_bounty_status_idx
  ON bounty_completions(bounty_id, status);

CREATE INDEX IF NOT EXISTS bounty_completions_user_idx
  ON bounty_completions(user_id);

CREATE INDEX IF NOT EXISTS bounty_completions_status_created_idx
  ON bounty_completions(status, created_at DESC);

CREATE INDEX IF NOT EXISTS user_bounties_status_reward_idx
  ON user_bounties(status, reward_points DESC);

CREATE INDEX IF NOT EXISTS user_bounties_creator_idx
  ON user_bounties(creator_id);

CREATE INDEX IF NOT EXISTS user_bounties_created_at_idx
  ON user_bounties(created_at DESC);

CREATE INDEX IF NOT EXISTS user_bounties_expires_open_idx
  ON user_bounties(expires_at) WHERE status = 'open';

-- FK protective indexes (missing on several tables)
CREATE INDEX IF NOT EXISTS projects_created_by_idx
  ON projects(created_by);

CREATE INDEX IF NOT EXISTS project_completions_project_idx
  ON project_completions(project_id);

CREATE INDEX IF NOT EXISTS project_completions_user_idx
  ON project_completions(user_id);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON push_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS user_badges_badge_idx
  ON user_badges(badge_id);

CREATE INDEX IF NOT EXISTS point_transactions_created_by_idx
  ON point_transactions(created_by);

CREATE INDEX IF NOT EXISTS task_completions_reversed_by_idx
  ON task_completions(reversed_by) WHERE reversed_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS polls_created_by_idx
  ON polls(created_by);

-- Heatmap: admin orders by claimed_at
CREATE INDEX IF NOT EXISTS heatmap_points_claimed_at_idx
  ON heatmap_points(claimed_at DESC) WHERE claimed_at IS NOT NULL;
