-- Redesign candidate acceptance fields to match actual legal requirements.
-- Remove: acceptance_armenian_school (no longer a requirement)
-- Add:    acceptance_voting_right  (ունենա ընտրական իրավունք)
--         acceptance_armenian_language (տիրապետի հայերենին, հաստ. փաստաթղթով)
-- Keep:   acceptance_movement, acceptance_self_restriction, acceptance_age_25,
--         acceptance_only_armenian, acceptance_lived_in_armenia
-- Keep:   acceptance_citizenship (still used by voter flow)

ALTER TABLE public.election_registrations
  DROP COLUMN IF EXISTS acceptance_armenian_school,
  ADD COLUMN IF NOT EXISTS acceptance_voting_right    boolean,
  ADD COLUMN IF NOT EXISTS acceptance_armenian_language boolean;
