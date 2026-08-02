-- links a restarted/copied mesocycle back to the mesocycle it was cloned from;
-- used to seed week-1 placeholders from the source's last work week before its deload
ALTER TABLE mesocycles
  ADD COLUMN cloned_from_id UUID REFERENCES mesocycles(id) ON DELETE SET NULL;

-- most rows will be null (not clones), so a partial index keeps it small
CREATE INDEX mesocycles_cloned_from_id_idx ON mesocycles (cloned_from_id) WHERE cloned_from_id IS NOT NULL;
