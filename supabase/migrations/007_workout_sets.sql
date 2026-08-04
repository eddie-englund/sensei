-- actual logged sets
CREATE TABLE workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesocycle_workout_exercise_id UUID NOT NULL REFERENCES mesocycle_workout_exercises(id) ON DELETE CASCADE,
  set_number INT NOT NULL,
  weight NUMERIC(6,2),
  reps INT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "access own workout_sets" ON workout_sets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM mesocycle_workout_exercises
      JOIN mesocycle_workouts ON mesocycle_workouts.id = mesocycle_workout_exercises.mesocycle_workout_id
      JOIN mesocycle_weeks ON mesocycle_weeks.id = mesocycle_workouts.mesocycle_week_id
      JOIN mesocycles ON mesocycles.id = mesocycle_weeks.mesocycle_id
      WHERE mesocycle_workout_exercises.id = workout_sets.mesocycle_workout_exercise_id
        AND mesocycles.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mesocycle_workout_exercises
      JOIN mesocycle_workouts ON mesocycle_workouts.id = mesocycle_workout_exercises.mesocycle_workout_id
      JOIN mesocycle_weeks ON mesocycle_weeks.id = mesocycle_workouts.mesocycle_week_id
      JOIN mesocycles ON mesocycles.id = mesocycle_weeks.mesocycle_id
      WHERE mesocycle_workout_exercises.id = workout_sets.mesocycle_workout_exercise_id
        AND mesocycles.created_by = auth.uid()
    )
  );
