-- admins can add app-wide exercises (created_by null, is_custom false),
-- same visibility as seeded exercises, mirroring the admin-write pattern
-- used for mesocycle_templates in 019
CREATE POLICY "admins insert app-wide exercises" ON exercises
  FOR INSERT WITH CHECK (
    created_by IS NULL
    AND is_custom = false
    AND EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND is_admin)
  );
