CREATE TABLE mesocycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(128) NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE mesocycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "access own mesocycles" ON mesocycles
  FOR ALL USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);
