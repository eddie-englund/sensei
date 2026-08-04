-- one row per week in a mesocycle template
CREATE TABLE mesocycle_template_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesocycle_template_id UUID NOT NULL REFERENCES mesocycle_templates(id) ON DELETE CASCADE,
  week_number INT NOT NULL,
  is_deload BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (mesocycle_template_id, week_number)
);

ALTER TABLE mesocycle_template_weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select mesocycle_template_weeks" ON mesocycle_template_weeks
  FOR SELECT USING (true);
