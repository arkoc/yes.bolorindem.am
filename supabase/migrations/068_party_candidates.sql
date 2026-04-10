CREATE TABLE public.party_candidates (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_number integer     NOT NULL UNIQUE,
  full_name        text        NOT NULL,
  phone            text,
  social_url       text,
  bio              text,
  reason           text,
  image_url        text,
  sort_order       integer     NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.party_candidates ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Public can read party_candidates"
  ON public.party_candidates FOR SELECT
  USING (true);
