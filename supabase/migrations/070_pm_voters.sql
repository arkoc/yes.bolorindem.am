-- PM Voters table for those who want to vote but not nominate
CREATE TABLE public.pm_voters (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX pm_voters_user_idx ON public.pm_voters(user_id);

-- RLS: Each user can manage only their own row
ALTER TABLE public.pm_voters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_voters_insert_own"
  ON public.pm_voters FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pm_voters_update_own"
  ON public.pm_voters FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "pm_voters_delete_own"
  ON public.pm_voters FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "pm_voters_select_own"
  ON public.pm_voters FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
