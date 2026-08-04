-- note attached to one exercise on one specific week
CREATE TABLE exercise_week_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesocycle_workout_exercise_id UUID NOT NULL UNIQUE
    REFERENCES mesocycle_workout_exercises(id) ON DELETE CASCADE,
  content VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE exercise_week_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "access own exercise_week_notes" ON exercise_week_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM mesocycle_workout_exercises
      JOIN mesocycle_workouts ON mesocycle_workouts.id = mesocycle_workout_exercises.mesocycle_workout_id
      JOIN mesocycle_weeks ON mesocycle_weeks.id = mesocycle_workouts.mesocycle_week_id
      JOIN mesocycles ON mesocycles.id = mesocycle_weeks.mesocycle_id
      WHERE mesocycle_workout_exercises.id = exercise_week_notes.mesocycle_workout_exercise_id
        AND mesocycles.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mesocycle_workout_exercises
      JOIN mesocycle_workouts ON mesocycle_workouts.id = mesocycle_workout_exercises.mesocycle_workout_id
      JOIN mesocycle_weeks ON mesocycle_weeks.id = mesocycle_workouts.mesocycle_week_id
      JOIN mesocycles ON mesocycles.id = mesocycle_weeks.mesocycle_id
      WHERE mesocycle_workout_exercises.id = exercise_week_notes.mesocycle_workout_exercise_id
        AND mesocycles.created_by = auth.uid()
    )
  );

-- note attached to an exercise across every week of the mesocycle
CREATE TABLE exercise_pinned_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesocycle_id UUID NOT NULL REFERENCES mesocycles(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  content VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (mesocycle_id, exercise_id)
);

ALTER TABLE exercise_pinned_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "access own exercise_pinned_notes" ON exercise_pinned_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM mesocycles
      WHERE mesocycles.id = exercise_pinned_notes.mesocycle_id
        AND mesocycles.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mesocycles
      WHERE mesocycles.id = exercise_pinned_notes.mesocycle_id
        AND mesocycles.created_by = auth.uid()
    )
  );
