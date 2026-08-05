-- attributes a template to the admin who authored it; null = system-seeded
-- (inserted by migration 013, never editable through the app)
ALTER TABLE mesocycle_templates
  ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE POLICY "admins insert mesocycle_templates" ON mesocycle_templates
  FOR INSERT WITH CHECK (
    created_by = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND is_admin)
  );

CREATE POLICY "authors update own mesocycle_templates" ON mesocycle_templates
  FOR UPDATE USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "authors delete own mesocycle_templates" ON mesocycle_templates
  FOR DELETE USING (created_by = (SELECT auth.uid()));

-- child tables: authorization is the ownership chain up to mesocycle_templates.created_by,
-- mirroring the join-chain RLS already used for mesocycle_weeks/workouts/workout_exercises
CREATE POLICY "authors insert mesocycle_template_weeks" ON mesocycle_template_weeks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM mesocycle_templates
      WHERE mesocycle_templates.id = mesocycle_template_weeks.mesocycle_template_id
        AND mesocycle_templates.created_by = (SELECT auth.uid())
    )
  );

CREATE POLICY "authors update mesocycle_template_weeks" ON mesocycle_template_weeks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM mesocycle_templates
      WHERE mesocycle_templates.id = mesocycle_template_weeks.mesocycle_template_id
        AND mesocycle_templates.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mesocycle_templates
      WHERE mesocycle_templates.id = mesocycle_template_weeks.mesocycle_template_id
        AND mesocycle_templates.created_by = (SELECT auth.uid())
    )
  );

CREATE POLICY "authors delete mesocycle_template_weeks" ON mesocycle_template_weeks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM mesocycle_templates
      WHERE mesocycle_templates.id = mesocycle_template_weeks.mesocycle_template_id
        AND mesocycle_templates.created_by = (SELECT auth.uid())
    )
  );

CREATE POLICY "authors insert mesocycle_template_workouts" ON mesocycle_template_workouts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM mesocycle_template_weeks
      JOIN mesocycle_templates ON mesocycle_templates.id = mesocycle_template_weeks.mesocycle_template_id
      WHERE mesocycle_template_weeks.id = mesocycle_template_workouts.mesocycle_template_week_id
        AND mesocycle_templates.created_by = (SELECT auth.uid())
    )
  );

CREATE POLICY "authors update mesocycle_template_workouts" ON mesocycle_template_workouts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM mesocycle_template_weeks
      JOIN mesocycle_templates ON mesocycle_templates.id = mesocycle_template_weeks.mesocycle_template_id
      WHERE mesocycle_template_weeks.id = mesocycle_template_workouts.mesocycle_template_week_id
        AND mesocycle_templates.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mesocycle_template_weeks
      JOIN mesocycle_templates ON mesocycle_templates.id = mesocycle_template_weeks.mesocycle_template_id
      WHERE mesocycle_template_weeks.id = mesocycle_template_workouts.mesocycle_template_week_id
        AND mesocycle_templates.created_by = (SELECT auth.uid())
    )
  );

CREATE POLICY "authors delete mesocycle_template_workouts" ON mesocycle_template_workouts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM mesocycle_template_weeks
      JOIN mesocycle_templates ON mesocycle_templates.id = mesocycle_template_weeks.mesocycle_template_id
      WHERE mesocycle_template_weeks.id = mesocycle_template_workouts.mesocycle_template_week_id
        AND mesocycle_templates.created_by = (SELECT auth.uid())
    )
  );

CREATE POLICY "authors insert mesocycle_template_workout_exercises" ON mesocycle_template_workout_exercises
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM mesocycle_template_workouts
      JOIN mesocycle_template_weeks ON mesocycle_template_weeks.id = mesocycle_template_workouts.mesocycle_template_week_id
      JOIN mesocycle_templates ON mesocycle_templates.id = mesocycle_template_weeks.mesocycle_template_id
      WHERE mesocycle_template_workouts.id = mesocycle_template_workout_exercises.mesocycle_template_workout_id
        AND mesocycle_templates.created_by = (SELECT auth.uid())
    )
  );

CREATE POLICY "authors update mesocycle_template_workout_exercises" ON mesocycle_template_workout_exercises
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM mesocycle_template_workouts
      JOIN mesocycle_template_weeks ON mesocycle_template_weeks.id = mesocycle_template_workouts.mesocycle_template_week_id
      JOIN mesocycle_templates ON mesocycle_templates.id = mesocycle_template_weeks.mesocycle_template_id
      WHERE mesocycle_template_workouts.id = mesocycle_template_workout_exercises.mesocycle_template_workout_id
        AND mesocycle_templates.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mesocycle_template_workouts
      JOIN mesocycle_template_weeks ON mesocycle_template_weeks.id = mesocycle_template_workouts.mesocycle_template_week_id
      JOIN mesocycle_templates ON mesocycle_templates.id = mesocycle_template_weeks.mesocycle_template_id
      WHERE mesocycle_template_workouts.id = mesocycle_template_workout_exercises.mesocycle_template_workout_id
        AND mesocycle_templates.created_by = (SELECT auth.uid())
    )
  );

CREATE POLICY "authors delete mesocycle_template_workout_exercises" ON mesocycle_template_workout_exercises
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM mesocycle_template_workouts
      JOIN mesocycle_template_weeks ON mesocycle_template_weeks.id = mesocycle_template_workouts.mesocycle_template_week_id
      JOIN mesocycle_templates ON mesocycle_templates.id = mesocycle_template_weeks.mesocycle_template_id
      WHERE mesocycle_template_workouts.id = mesocycle_template_workout_exercises.mesocycle_template_workout_id
        AND mesocycle_templates.created_by = (SELECT auth.uid())
    )
  );
