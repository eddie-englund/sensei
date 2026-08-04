# CLAUDE.md

## What this is

Sensei is a Vue 3 and Supabase app. It runs on mobile devices. It tracks workout programs. Each program has weeks, workouts, exercises, and logged sets. This repo has only the frontend code. Supabase is the backend. Supabase gives Postgres and Auth. The schema is raw SQL in `supabase/migrations/`.

## Styling

Use Tailwind CSS for all styling.

## Commands

```sh
pnpm dev              # start dev server
pnpm build            # type-check + production build
pnpm test:unit        # vitest, run all
pnpm test:unit <name> # vitest, filter by file/test name
pnpm test:e2e         # playwright (auto-starts dev server)
pnpm test:e2e e2e/vue.spec.ts      # single file
pnpm lint             # oxlint --fix, then eslint --fix
pnpm format           # oxfmt src/
```

Run the unit tests and the e2e tests after every change. Add new tests when you add a feature.

Do not use semicolons. Use single quotes. The tool `oxfmt` enforces this. See `.oxfmtrc.json`.

## Local development (Supabase)

```sh
pnpm supabase:start   # start the local stack
pnpm supabase:env     # point .env.local at the local stack
pnpm supabase:reset   # re-apply migrations and seed data
pnpm supabase:stop    # stop the local stack
```

See the `supabase-local-dev` skill for setup steps and for fixes to known problems.

## Architecture

- **Routing is file-based.** Each file under `src/pages/**/*.vue` becomes a route (via `vue-router/auto-routes`, configured in `vite.config.ts`). Do not write route tables by hand. Add a file to add a route. The route name matches the file path. Example: `login.vue` becomes `/login`.
- **The auth guard is in `src/router/index.ts`.** It runs before each route change. It sends signed-out users to `/login`. It sends signed-in users away from `/login`. The only public route names are `login` and `auth/callback`. Add new public pages to the `isPublic` check there.
- **Auth state is the Pinia `auth` store**, at `src/stores/auth.ts`. It wraps the Supabase session and JWT. It does not use custom session handling. `main.ts` calls `authStore.init()` once, before the router and app mount. After that call, `auth.isAuthenticated` is safe to read. Sign-in uses a magic link (OTP) only. There is no password flow.
- **Use the one Supabase client** at `src/utils/supabase.ts`. It reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the environment. Do not create new clients.
- **The path alias `@` points to `src/`.** It is set in `vite.config.ts` and mirrored in `tsconfig`.

## Skills

- `supabase` and `supabase-postgres-best-practices`: use for any Supabase task — schema, RLS, or migrations.
- `frontend-design`: use when you change anything the user can see.
- `supabase-local-dev`: use to start, stop, reset, or debug the local Supabase stack.

## Reusability first

Look for an existing button or component first. Reuse it if it fits. Adjust it if a small change makes it fit and does not break its other uses. Build a new one only if reuse and adjustment do not work.

## Utilities

`@vueuse/core` is a dependency. Use its composables for browser and timing needs: debouncing (`refDebounced`, `useDebounceFn`), `localStorage` (`useStorage`), event listeners (`useEventListener`), media queries, clipboard, and more. Write custom logic only when no vueuse composable fits.
