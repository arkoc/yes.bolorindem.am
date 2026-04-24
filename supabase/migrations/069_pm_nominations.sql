-- PM Nominations table for prime minister candidate nominations
CREATE TABLE public.pm_nominations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nominee_name    text NOT NULL,
  nominator_email text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX pm_nom_nominee_idx ON public.pm_nominations(nominee_name);

-- RLS: Each user can manage only their own nomination
ALTER TABLE public.pm_nominations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_nom_insert_own"
  ON public.pm_nominations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pm_nom_update_own"
  ON public.pm_nominations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "pm_nom_delete_own"
  ON public.pm_nominations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "pm_nom_select_own"
  ON public.pm_nominations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Public aggregate view — no PII exposed (email is not included)
CREATE OR REPLACE VIEW public.pm_nominee_counts AS
SELECT nominee_name, COUNT(*) AS nomination_count
FROM public.pm_nominations
GROUP BY nominee_name
ORDER BY nomination_count DESC, nominee_name;

GRANT SELECT ON public.pm_nominee_counts TO anon, authenticated;
