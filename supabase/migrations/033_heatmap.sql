-- ============================================================
-- Heatmap Text Project
-- Special project type where volunteers physically claim GPS dots
-- that collectively spell out "ԲՈЛЛОРÏН ДЕМ ЕМ" across Armenia.
-- ============================================================

-- Add project_type column to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type TEXT NOT NULL DEFAULT 'standard';

-- ─── Heatmap points table ─────────────────────────────────
-- Seeded once from the SVG dot generation script.
-- Each row is a physical GPS location volunteers must visit.
CREATE TABLE heatmap_points (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  points      INTEGER NOT NULL CHECK (points > 0),
  claimed_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  claimed_at  TIMESTAMPTZ,
  UNIQUE (project_id, lat, lng)
);

CREATE INDEX heatmap_points_project_idx ON heatmap_points(project_id);
CREATE INDEX heatmap_points_claimed_idx ON heatmap_points(project_id, claimed_by) WHERE claimed_by IS NOT NULL;

ALTER TABLE heatmap_points ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read all points (needed for the map)
CREATE POLICY "heatmap_points_select" ON heatmap_points
  FOR SELECT USING (true);

-- Claims are done via SECURITY DEFINER function, no direct UPDATE needed
-- (kept for completeness; actual claim goes through claim_heatmap_point())

-- Enable Realtime so the map updates live as dots get claimed
ALTER TABLE heatmap_points REPLICA IDENTITY FULL;

-- ─── Atomic claim function ────────────────────────────────
-- Uses FOR UPDATE row lock to prevent double-claims.
-- Awards points via the established award_points() function.
CREATE OR REPLACE FUNCTION public.claim_heatmap_point(
  p_point_id UUID,
  p_user_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  pt          heatmap_points%ROWTYPE;
BEGIN
  -- Lock the row first to prevent concurrent claims
  SELECT * INTO pt
  FROM heatmap_points
  WHERE id = p_point_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF pt.claimed_by IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed');
  END IF;

  -- Mark claimed
  UPDATE heatmap_points
  SET claimed_by = p_user_id,
      claimed_at = now()
  WHERE id = p_point_id;

  -- Award points atomically
  PERFORM public.award_points(
    p_user_id,
    pt.points,
    'heatmap_claim',
    p_point_id,
    'Heatmap dot claimed'
  );

  RETURN jsonb_build_object('ok', true, 'points', pt.points);
END;
$$;

-- Only callable by service role (API routes use admin client)
-- No GRANT to authenticated since proximity check must happen server-side first
