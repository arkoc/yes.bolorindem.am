ALTER TABLE public.election_registrations
  ADD COLUMN IF NOT EXISTS document_number text;

ALTER TABLE public.election_registrations
  DROP CONSTRAINT IF EXISTS election_registrations_document_number_hash_key;

ALTER TABLE public.election_registrations
  DROP COLUMN IF EXISTS document_number_hash;

CREATE UNIQUE INDEX IF NOT EXISTS election_registrations_document_number_key
  ON public.election_registrations (document_number)
  WHERE status <> 'rejected';
