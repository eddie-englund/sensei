-- one row per week in the mesocycle
CREATE TABLE mesocycle_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesocycle_id UUID NOT NULL REFERENCES mesocycles(id) ON DELETE CASCADE,
  week_number INT NOT NULL,
  is_deload BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (mesocycle_id, week_number)
);

ALTER TABLE mesocycle_weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "access own mesocycle_weeks" ON mesocycle_weeks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM mesocycles
      WHERE mesocycles.id = mesocycle_weeks.mesocycle_id
        AND mesocycles.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mesocycles
      WHERE mesocycles.id = mesocycle_weeks.mesocycle_id
        AND mesocycles.created_by = auth.uid()
    )
  );
