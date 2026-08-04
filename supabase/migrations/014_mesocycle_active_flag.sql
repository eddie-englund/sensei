-- exactly one active mesocycle per user at a time; drives the "current workout" landing page
ALTER TABLE mesocycles ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT false;

-- backfill: each user's most recently created mesocycle becomes their active one,
-- so existing users don't lose their landing page
WITH latest_per_user AS (
  SELECT DISTINCT ON (created_by) id
  FROM mesocycles
  ORDER BY created_by, created_at DESC, id DESC
)
UPDATE mesocycles
SET is_active = true
WHERE id IN (SELECT id FROM latest_per_user);

-- enforce at most one active mesocycle per user
CREATE UNIQUE INDEX mesocycles_one_active_per_user ON mesocycles (created_by) WHERE is_active;
