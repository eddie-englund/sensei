-- two starter templates built from the seeded exercise catalog
DO $$
DECLARE
  template_id UUID;
  week_id UUID;
  workout_id UUID;
  wk INT;
BEGIN
  -- Upper / Lower, 4 weeks
  INSERT INTO mesocycle_templates (name, description)
  VALUES ('Upper / Lower — 4 Week', 'A 4-week upper/lower split for balanced strength gains, deload on week 4.')
  RETURNING id INTO template_id;

  FOR wk IN 1..4 LOOP
    INSERT INTO mesocycle_template_weeks (mesocycle_template_id, week_number, is_deload)
    VALUES (template_id, wk, wk = 4)
    RETURNING id INTO week_id;

    INSERT INTO mesocycle_template_workouts (mesocycle_template_week_id, day_number, name)
    VALUES (week_id, 1, 'Upper')
    RETURNING id INTO workout_id;

    INSERT INTO mesocycle_template_workout_exercises (mesocycle_template_workout_id, exercise_id, order_index, target_sets)
    VALUES
      (workout_id, (SELECT id FROM exercises WHERE name = 'Barbell Bench Press'), 0, 3),
      (workout_id, (SELECT id FROM exercises WHERE name = 'Barbell Row'), 1, 3),
      (workout_id, (SELECT id FROM exercises WHERE name = 'Overhead Press'), 2, 2),
      (workout_id, (SELECT id FROM exercises WHERE name = 'Lat Pulldown'), 3, 2);

    INSERT INTO mesocycle_template_workouts (mesocycle_template_week_id, day_number, name)
    VALUES (week_id, 2, 'Lower')
    RETURNING id INTO workout_id;

    INSERT INTO mesocycle_template_workout_exercises (mesocycle_template_workout_id, exercise_id, order_index, target_sets)
    VALUES
      (workout_id, (SELECT id FROM exercises WHERE name = 'Back Squat'), 0, 3),
      (workout_id, (SELECT id FROM exercises WHERE name = 'Romanian Deadlift'), 1, 3),
      (workout_id, (SELECT id FROM exercises WHERE name = 'Leg Press'), 2, 2),
      (workout_id, (SELECT id FROM exercises WHERE name = 'Standing Calf Raise'), 3, 2);
  END LOOP;

  -- Push / Pull / Legs, 6 weeks
  INSERT INTO mesocycle_templates (name, description)
  VALUES ('Push / Pull / Legs — 6 Week', 'A 6-week push/pull/legs split for hypertrophy, deload on week 6.')
  RETURNING id INTO template_id;

  FOR wk IN 1..6 LOOP
    INSERT INTO mesocycle_template_weeks (mesocycle_template_id, week_number, is_deload)
    VALUES (template_id, wk, wk = 6)
    RETURNING id INTO week_id;

    INSERT INTO mesocycle_template_workouts (mesocycle_template_week_id, day_number, name)
    VALUES (week_id, 1, 'Push')
    RETURNING id INTO workout_id;

    INSERT INTO mesocycle_template_workout_exercises (mesocycle_template_workout_id, exercise_id, order_index, target_sets)
    VALUES
      (workout_id, (SELECT id FROM exercises WHERE name = 'Barbell Bench Press'), 0, 3),
      (workout_id, (SELECT id FROM exercises WHERE name = 'Incline Dumbbell Press'), 1, 3),
      (workout_id, (SELECT id FROM exercises WHERE name = 'Overhead Press'), 2, 2),
      (workout_id, (SELECT id FROM exercises WHERE name = 'Cable Triceps Pushdown'), 3, 2);

    INSERT INTO mesocycle_template_workouts (mesocycle_template_week_id, day_number, name)
    VALUES (week_id, 2, 'Pull')
    RETURNING id INTO workout_id;

    INSERT INTO mesocycle_template_workout_exercises (mesocycle_template_workout_id, exercise_id, order_index, target_sets)
    VALUES
      (workout_id, (SELECT id FROM exercises WHERE name = 'Barbell Row'), 0, 3),
      (workout_id, (SELECT id FROM exercises WHERE name = 'Lat Pulldown'), 1, 3),
      (workout_id, (SELECT id FROM exercises WHERE name = 'Seated Cable Row'), 2, 2),
      (workout_id, (SELECT id FROM exercises WHERE name = 'Barbell Curl'), 3, 2);

    INSERT INTO mesocycle_template_workouts (mesocycle_template_week_id, day_number, name)
    VALUES (week_id, 3, 'Legs')
    RETURNING id INTO workout_id;

    INSERT INTO mesocycle_template_workout_exercises (mesocycle_template_workout_id, exercise_id, order_index, target_sets)
    VALUES
      (workout_id, (SELECT id FROM exercises WHERE name = 'Back Squat'), 0, 3),
      (workout_id, (SELECT id FROM exercises WHERE name = 'Romanian Deadlift'), 1, 3),
      (workout_id, (SELECT id FROM exercises WHERE name = 'Leg Curl'), 2, 2),
      (workout_id, (SELECT id FROM exercises WHERE name = 'Standing Calf Raise'), 3, 2);
  END LOOP;
END $$;
