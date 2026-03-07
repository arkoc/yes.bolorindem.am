-- ============================================================
-- Missing indexes identified in code review
-- ============================================================

-- Volunteer voting page filters by status IN ('active','closed') and orders by created_at DESC.
-- Without this, every page load does a sequential scan of the polls table.
CREATE INDEX IF NOT EXISTS polls_status_created_idx
  ON polls(status, created_at DESC);

-- push_subscriptions are fetched in bulk for broadcast notifications (no filter, just range).
-- The UNIQUE(user_id, endpoint) constraint already covers per-user lookups.
-- Add a plain index on endpoint for the upsert conflict target used in the subscribe API.
CREATE INDEX IF NOT EXISTS push_subscriptions_endpoint_idx
  ON push_subscriptions(endpoint);
