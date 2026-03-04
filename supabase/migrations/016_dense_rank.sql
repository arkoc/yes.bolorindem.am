-- Replace RANK() with DENSE_RANK() so tied users don't create gaps in rankings.
-- e.g. two users at rank 4 → next user gets rank 5 (not 6).

CREATE OR REPLACE VIEW leaderboard AS
SELECT
  p.id,
  p.full_name,
  p.total_points,
  DENSE_RANK() OVER (ORDER BY p.total_points DESC) AS rank,
  COUNT(tc.id) FILTER (WHERE tc.status = 'approved') AS total_completions
FROM profiles p
LEFT JOIN task_completions tc ON tc.user_id = p.id
GROUP BY p.id, p.full_name, p.total_points;
