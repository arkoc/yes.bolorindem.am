-- ============================================================
-- Security Fixes
-- ============================================================

-- ─── Fix 1: Remove point_transactions INSERT policy with OR true ──────────────
-- The old policy allowed ANY authenticated user to insert arbitrary records
-- because of the `OR true` clause meant to accommodate SECURITY DEFINER triggers.
-- SECURITY DEFINER triggers bypass RLS automatically — they don't need this.
DROP POLICY IF EXISTS "point_transactions_insert_system" ON point_transactions;

CREATE POLICY "point_transactions_insert_admin" ON point_transactions FOR INSERT
  WITH CHECK (current_user_role() IN ('leader', 'admin'));


-- ─── Fix 2: Block direct manipulation of total_points and role ────────────────
-- Without this, any authenticated user can call:
--   supabase.from('profiles').update({ role: 'admin', total_points: 999999 })
-- because `profiles_update_own` only checks the row identity, not the columns.
--
-- This trigger silently reverts total_points and role to their old values when
-- called from the `authenticated` or `anon` DB roles (i.e. direct API clients).
-- SECURITY DEFINER triggers (running as `postgres`) and service_role are unaffected.
--
-- IMPORTANT: Do NOT add SECURITY DEFINER to this function — it must run as the
-- caller's DB role so that current_user reflects who is making the change.
CREATE OR REPLACE FUNCTION protect_profile_sensitive_fields()
RETURNS trigger AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.total_points := OLD.total_points;
    NEW.role         := OLD.role;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_profile_sensitive_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_sensitive_fields();


-- ─── Fix 3: Remove policy that exposes all profile columns to all users ───────
-- `profiles_select_leaderboard` with USING (true) let any authenticated user read
-- every profile row, including phone numbers and role fields.
-- The `leaderboard` view (already granted to authenticated) provides the correct
-- public access to profile data without exposing sensitive columns.
-- Admin/leader access is covered by the existing `profiles_admin_all` policy.
DROP POLICY IF EXISTS "profiles_select_leaderboard" ON profiles;
