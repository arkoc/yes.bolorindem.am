-- ============================================================
-- Badge progress stats function
-- Returns per-type completion counts needed for progress display
-- on the volunteer profile page.
-- ============================================================

CREATE OR REPLACE FUNCTION get_badge_progress(p_user_id uuid)
RETURNS TABLE (
  form_completions     bigint,
  location_completions bigint,
  photo_completions    bigint,
  project_completions  bigint
) AS $$
  SELECT
    COUNT(*) FILTER (WHERE tc.status = 'approved' AND t.task_type = 'form'),
    COUNT(*) FILTER (WHERE tc.status = 'approved' AND t.task_type = 'location'),
    COUNT(*) FILTER (WHERE tc.status = 'approved' AND t.task_type = 'photo'),
    (SELECT COUNT(*) FROM project_completions pc WHERE pc.user_id = p_user_id)
  FROM task_completions tc
  LEFT JOIN tasks t ON t.id = tc.task_id
  WHERE tc.user_id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_badge_progress(uuid) TO authenticated;
