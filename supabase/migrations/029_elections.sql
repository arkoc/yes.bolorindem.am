-- Election registrations table
CREATE TABLE public.election_registrations (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type                        text NOT NULL CHECK (type IN ('voter', 'candidate')),
  full_name                   text NOT NULL,
  document_number_hash        text NOT NULL,
  phone                       text,
  payment_status              text NOT NULL DEFAULT 'pending'
                                CHECK (payment_status IN ('pending', 'paid')),
  payment_amount              numeric(10,2) NOT NULL,
  acceptance_movement         boolean NOT NULL DEFAULT false,
  acceptance_citizenship      boolean NOT NULL DEFAULT false,
  acceptance_self_restriction boolean,
  acceptance_age_25           boolean,
  acceptance_only_armenian    boolean,
  acceptance_lived_in_armenia boolean,
  acceptance_armenian_school  boolean,
  status                      text NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_number_hash)
);

CREATE INDEX er_type_status_idx    ON public.election_registrations(type, status);
CREATE INDEX er_created_at_idx     ON public.election_registrations(created_at DESC);

-- RLS: anyone can INSERT, nobody can SELECT except service role
ALTER TABLE public.election_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "er_insert_anon"
  ON public.election_registrations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Public counter view (aggregate only, no PII)
CREATE OR REPLACE VIEW public.election_counts AS
SELECT
  COUNT(*) FILTER (WHERE type = 'voter'     AND status != 'rejected') AS voter_count,
  COUNT(*) FILTER (WHERE type = 'candidate' AND status != 'rejected') AS candidate_count
FROM public.election_registrations;

GRANT SELECT ON public.election_counts TO anon, authenticated;
