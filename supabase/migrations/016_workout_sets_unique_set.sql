-- one row per (exercise instance, set number); enables safe upsert-based set logging
ALTER TABLE workout_sets
  ADD CONSTRAINT workout_sets_exercise_set_unique UNIQUE (mesocycle_workout_exercise_id, set_number);
