-- Add banned column to profiles table
ALTER TABLE public.profiles
ADD COLUMN banned boolean NOT NULL DEFAULT false,
ADD COLUMN banned_at timestamptz,
ADD COLUMN ban_reason text;

-- Create index for banned users
CREATE INDEX idx_profiles_banned ON public.profiles(banned);
