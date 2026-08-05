-- persistent per-slot marker (myrep / myrep-match), keyed like exercise_pinned_notes
-- so it survives week-to-week regeneration of the per-week mesocycle_workout_exercises row
CREATE TYPE set_marker_type AS ENUM ('myrep', 'myrep_match');

CREATE TABLE exercise_set_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesocycle_id UUID NOT NULL REFERENCES mesocycles(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  set_number INT NOT NULL,
  marker_type set_marker_type NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (mesocycle_id, exercise_id, set_number)
);

ALTER TABLE exercise_set_markers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "access own exercise_set_markers" ON exercise_set_markers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM mesocycles
      WHERE mesocycles.id = exercise_set_markers.mesocycle_id
        AND mesocycles.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mesocycles
      WHERE mesocycles.id = exercise_set_markers.mesocycle_id
        AND mesocycles.created_by = auth.uid()
    )
  );
