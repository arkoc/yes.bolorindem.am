-- Archive active projects whose end_date has passed.
CREATE OR REPLACE FUNCTION expire_projects()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE projects
    SET status = 'archived'
  WHERE status = 'active'
    AND end_date IS NOT NULL
    AND end_date < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
