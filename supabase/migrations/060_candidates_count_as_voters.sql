-- Candidates are also counted as voters
CREATE OR REPLACE VIEW public.election_counts AS
SELECT
  COUNT(*) FILTER (WHERE type IN ('voter', 'candidate') AND status != 'rejected' AND payment_status = 'paid') AS voter_count,
  COUNT(*) FILTER (WHERE type = 'candidate'              AND status != 'rejected' AND payment_status = 'paid') AS candidate_count
FROM public.election_registrations;
