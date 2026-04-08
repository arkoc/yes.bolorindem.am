-- Allow same document_number for voter + candidate (same person upgrading)
-- Uniqueness is per type, not globally across all registrations
DROP INDEX IF EXISTS election_registrations_document_number_key;

CREATE UNIQUE INDEX IF NOT EXISTS election_registrations_document_number_type_key
  ON public.election_registrations (document_number, type)
  WHERE status <> 'rejected';
