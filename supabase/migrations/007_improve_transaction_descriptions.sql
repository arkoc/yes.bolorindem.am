-- ============================================================
-- Improve point_transactions description to include task title
-- ============================================================

CREATE OR REPLACE FUNCTION handle_task_completion_insert()
RETURNS trigger AS $$
DECLARE
  v_task_title text;
  v_project_id uuid;
BEGIN
  -- Get task title and project_id
  SELECT title, project_id INTO v_task_title, v_project_id
  FROM tasks WHERE id = NEW.task_id;

  -- Update profile total points
  UPDATE profiles
  SET total_points = total_points + NEW.points_awarded,
      updated_at   = now()
  WHERE id = NEW.user_id;

  -- Insert audit transaction with meaningful description
  INSERT INTO point_transactions (user_id, amount, source_type, source_id, description)
  VALUES (
    NEW.user_id,
    NEW.points_awarded,
    'task_completion',
    NEW.id,
    COALESCE(v_task_title, 'Task completion')
      || CASE WHEN NEW.completion_number > 1 THEN ' #' || NEW.completion_number ELSE '' END
  );

  -- Check if project is now fully complete for this user
  PERFORM check_project_completion(NEW.user_id, v_project_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
