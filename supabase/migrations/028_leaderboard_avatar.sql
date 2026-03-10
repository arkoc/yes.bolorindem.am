-- Add avatar_url to leaderboard view (drop+recreate to allow new column)
DROP VIEW IF EXISTS leaderboard;
CREATE VIEW leaderboard AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.total_points,
  DENSE_RANK() OVER (ORDER BY p.total_points DESC) AS rank,
  COUNT(tc.id) FILTER (WHERE tc.status = 'approved') AS total_completions
FROM profiles p
LEFT JOIN task_completions tc ON tc.user_id = p.id
GROUP BY p.id, p.full_name, p.avatar_url, p.total_points;

GRANT SELECT ON leaderboard TO authenticated;
