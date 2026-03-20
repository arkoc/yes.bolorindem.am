-- Link election registrations to auth users so we can show status on dashboard.
ALTER TABLE public.election_registrations
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS er_user_id_idx ON public.election_registrations(user_id);
