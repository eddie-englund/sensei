-- exercise slotted into a specific template workout
CREATE TABLE mesocycle_template_workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesocycle_template_workout_id UUID NOT NULL REFERENCES mesocycle_template_workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  order_index INT NOT NULL DEFAULT 0,
  target_sets INT NOT NULL DEFAULT 2,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE mesocycle_template_workout_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select mesocycle_template_workout_exercises" ON mesocycle_template_workout_exercises
  FOR SELECT USING (true);
