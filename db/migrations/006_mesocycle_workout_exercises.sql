-- exercise slotted into a specific workout
CREATE TABLE mesocycle_workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesocycle_workout_id UUID NOT NULL REFERENCES mesocycle_workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  order_index INT NOT NULL DEFAULT 0,
  target_sets INT NOT NULL DEFAULT 2,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE mesocycle_workout_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "access own mesocycle_workout_exercises" ON mesocycle_workout_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM mesocycle_workouts
      JOIN mesocycle_weeks ON mesocycle_weeks.id = mesocycle_workouts.mesocycle_week_id
      JOIN mesocycles ON mesocycles.id = mesocycle_weeks.mesocycle_id
      WHERE mesocycle_workouts.id = mesocycle_workout_exercises.mesocycle_workout_id
        AND mesocycles.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mesocycle_workouts
      JOIN mesocycle_weeks ON mesocycle_weeks.id = mesocycle_workouts.mesocycle_week_id
      JOIN mesocycles ON mesocycles.id = mesocycle_weeks.mesocycle_id
      WHERE mesocycle_workouts.id = mesocycle_workout_exercises.mesocycle_workout_id
        AND mesocycles.created_by = auth.uid()
    )
  );
