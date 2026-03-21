-- Dashboard: task_completions queried by user_id + status (no task_id filter)
CREATE INDEX IF NOT EXISTS task_completions_user_status_idx
  ON task_completions(user_id, status);

-- Dashboard + elections page: election_registrations queried by user_id + payment_status + status
CREATE INDEX IF NOT EXISTS er_user_payment_status_idx
  ON public.election_registrations(user_id, payment_status, status);
