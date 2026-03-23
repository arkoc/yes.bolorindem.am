-- Add voter_registration and candidate_registration to point_transactions source_type constraint
ALTER TABLE public.point_transactions
  DROP CONSTRAINT IF EXISTS point_transactions_source_type_check;

ALTER TABLE public.point_transactions
  ADD CONSTRAINT point_transactions_source_type_check
  CHECK (source_type IN (
    'task_completion', 'project_completion', 'admin_grant',
    'reversal', 'referral', 'profile_completion', 'poll_vote',
    'heatmap_claim', 'heatmap_completion_bonus',
    'bounty_escrow', 'bounty_reward', 'bounty_refund',
    'voter_registration', 'candidate_registration'
  ));
