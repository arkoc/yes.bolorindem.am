-- Referral code lookup in /api/referral/record
CREATE INDEX IF NOT EXISTS profiles_referral_code_idx ON profiles(referral_code);
