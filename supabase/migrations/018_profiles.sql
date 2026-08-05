-- one row per auth user; tracks whether the user is an admin ("coach") allowed to
-- author mesocycle templates. Row is created automatically by the trigger below.
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- a user may read only their own profile (used client-side to gate the template-builder UI);
-- no INSERT/UPDATE/DELETE policy -- rows are created only by the trigger below and is_admin
-- is flipped only via direct SQL/service role, never by the client
CREATE POLICY "select own profile" ON profiles
  FOR SELECT USING ((SELECT auth.uid()) = id);

-- auto-create a profile row for every new auth user, defaulting to is_admin = false
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (new.id);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- backfill: existing auth.users rows predate this migration
INSERT INTO profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;
