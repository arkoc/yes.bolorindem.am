-- Add AmeriBank payment tracking fields to election_registrations
ALTER TABLE public.election_registrations
  ADD COLUMN IF NOT EXISTS ameria_order_id  bigint,
  ADD COLUMN IF NOT EXISTS ameria_payment_id text;

CREATE UNIQUE INDEX IF NOT EXISTS er_ameria_order_id_idx
  ON public.election_registrations (ameria_order_id)
  WHERE ameria_order_id IS NOT NULL;
