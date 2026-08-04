-- exercise catalog: predefined (created_by null) + user custom
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(128) NOT NULL,
  muscle_group muscle_group NOT NULL,
  equipment equipment_type NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- predefined (created_by null) visible to everyone, custom only to their creator
CREATE POLICY "select exercises" ON exercises
  FOR SELECT USING (created_by IS NULL OR created_by = auth.uid());

-- only allowed to insert your own custom exercises, can't fake a predefined one
CREATE POLICY "insert own exercises" ON exercises
  FOR INSERT WITH CHECK (created_by = auth.uid() AND is_custom = true);

CREATE POLICY "update own exercises" ON exercises
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "delete own exercises" ON exercises
  FOR DELETE USING (created_by = auth.uid());
