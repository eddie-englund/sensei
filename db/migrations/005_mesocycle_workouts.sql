-- one row per workout day within a week
CREATE TABLE mesocycle_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesocycle_week_id UUID NOT NULL REFERENCES mesocycle_weeks(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  name VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (mesocycle_week_id, day_number)
);

ALTER TABLE mesocycle_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "access own mesocycle_workouts" ON mesocycle_workouts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM mesocycle_weeks
      JOIN mesocycles ON mesocycles.id = mesocycle_weeks.mesocycle_id
      WHERE mesocycle_weeks.id = mesocycle_workouts.mesocycle_week_id
        AND mesocycles.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mesocycle_weeks
      JOIN mesocycles ON mesocycles.id = mesocycle_weeks.mesocycle_id
      WHERE mesocycle_weeks.id = mesocycle_workouts.mesocycle_week_id
        AND mesocycles.created_by = auth.uid()
    )
  );
