CREATE TYPE muscle_group AS ENUM (
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'quads', 'hamstrings', 'glutes', 'calves', 'abs', 'forearms'
);

CREATE TYPE equipment_type AS ENUM (
  'free-weight', 'cable', 'machine', 'bodyweight', 'bodyweight-loadable', 'other'
);
