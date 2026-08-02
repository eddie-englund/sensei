-- one row per workout day within a template week
CREATE TABLE mesocycle_template_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesocycle_template_week_id UUID NOT NULL REFERENCES mesocycle_template_weeks(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  name VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (mesocycle_template_week_id, day_number)
);

ALTER TABLE mesocycle_template_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select mesocycle_template_workouts" ON mesocycle_template_workouts
  FOR SELECT USING (true);
