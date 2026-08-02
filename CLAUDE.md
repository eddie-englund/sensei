# CLAUDE.md

## What this is

Sensei: a Vue 3 + Supabase app intended for mobile devices tracking mesocycle-based workout programs (weeks → workouts → exercises → logged sets). Frontend-only repo; Supabase is the backend (Postgres + Auth), schema tracked as raw SQL in `db/migrations/`.

## Styling

ALL STYLING Is DONE WITH TAILWINDCSS

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

No semicolons, single quotes (enforced by oxfmt, see `.oxfmtrc.json`).

## Architecture

- **Routing is file-based**: `src/pages/**/*.vue` auto-generates routes via `vue-router/auto-routes` (unplugin-vue-router, configured in `vite.config.ts`). Don't hand-write route tables — add a file under `src/pages/` and the route appears. Route names match file paths (e.g. `/login`, `/auth/callback`).
- **Auth guard lives in `src/router/index.ts`**: a global `beforeEach` redirects unauthenticated visitors to `/login` and authenticated ones away from `/login`. `login` and `auth/callback` are the only public route names — new public pages must be added to the `isPublic` check there.
- **Auth state is the Pinia `auth` store** (`src/stores/auth.ts`), backed by Supabase's session/JWT, not custom session handling. It's initialized once in `main.ts` before the router/app mount (`await authStore.init()`), so `auth.isAuthenticated` is reliable by the time routing runs. Magic-link (OTP) sign-in only — no password flow.
- **Supabase client** is a single instance at `src/utils/supabase.ts`, reading `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` from env. Import this rather than constructing new clients.
- **Path alias `@` → `src/`** (set in `vite.config.ts`, mirrored in tsconfig).

## Skills

- Supabase and Supabase-Postgres-best-practices skills are installed (`.agents/skills/`) and auto-trigger on any Supabase or schema/RLS/migration work — no need to re-derive that guidance here.
  - Only invoke this when touching supabase related tasks

- frontend design skill.
  - Invoke when changing or adjusting anything that would be visible to the user.

## Reusability first

Whenever you need a button or other component verify if there is an existing one that suits your needs. If it doesn't suit your needs check if it's simple to just adjust the existing one without breaking it but still covering your use case.

## Utilities

`@vueuse/core` is a dependency. Prefer its composables over hand-rolled browser/timing glue — debouncing (`refDebounced`, `useDebounceFn`), `localStorage` (`useStorage`), event listeners (`useEventListener`), media queries, clipboard, etc. Only write custom logic when no vueuse composable fits.
