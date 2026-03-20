-- Only count registrations with confirmed payment in the public counters
CREATE OR REPLACE VIEW public.election_counts AS
SELECT
  COUNT(*) FILTER (WHERE type = 'voter'     AND status != 'rejected' AND payment_status = 'paid') AS voter_count,
  COUNT(*) FILTER (WHERE type = 'candidate' AND status != 'rejected' AND payment_status = 'paid') AS candidate_count
FROM public.election_registrations;
