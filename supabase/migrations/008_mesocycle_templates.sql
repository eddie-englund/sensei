-- reusable predefined mesocycle blueprints, not owned by any user
CREATE TABLE mesocycle_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(128) NOT NULL,
  description VARCHAR(256),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE mesocycle_templates ENABLE ROW LEVEL SECURITY;

-- readable by everyone, writable only via migrations/service role
CREATE POLICY "select mesocycle_templates" ON mesocycle_templates
  FOR SELECT USING (true);
