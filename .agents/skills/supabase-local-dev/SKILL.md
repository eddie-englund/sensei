---
name: supabase-local-dev
description: Start, stop, reset, and troubleshoot the local Supabase stack for this repo (podman socket setup, .env.local generation, known container issues). Use when running `pnpm supabase:*`, when `supabase start` fails, or when setting up local dev on a new machine.
---

# Supabase local dev

## Commands

```sh
pnpm supabase:start   # boot local Postgres/Auth/Studio stack
pnpm supabase:reset   # re-apply migrations + seed to the local DB
pnpm supabase:env     # regenerate .env.local from the running local stack
pnpm supabase:stop    # tear the stack down
```

Run `pnpm supabase:start && pnpm supabase:env` once per machine/session before `pnpm dev`.

## Env files

`.env` (committed) points at the real prod Supabase project. `.env.local` (gitignored, wins over `.env` in Vite) should point at the local stack for day-to-day dev. `pnpm supabase:env` writes it for you from `supabase status -o json` — don't hand-edit it.

## Container runtime (podman)

This machine has no `docker` binary — the stack runs on rootless **podman** instead. One-time host setup:

1. `systemctl --user enable --now podman.socket` — starts the rootless socket at `/run/user/<uid>/podman/podman.sock`.
2. Set `DOCKER_HOST` to that socket path in the shell profile (e.g. fish's `config.fish`) so the `supabase` CLI finds it.
3. Symlink `/var/run/docker.sock` to the same socket via a `systemd-tmpfiles` rule (needs root once): some of the CLI's container-creation paths hardcode `/var/run/docker.sock` and ignore `DOCKER_HOST` — without the symlink, `supabase start` fails with `statfs /var/run/docker.sock: no such file or directory`.

## Known podman-specific quirks

- `supabase:start` passes `--exclude edge-runtime`. That container's workdir bind-mount doesn't work under rootless podman (`workdir "<repo path>" does not exist on container`), and this project has no `supabase/functions` to serve anyway.
- `[analytics]` is disabled in `supabase/config.toml`. The vector/logflare containers hit the same bind-mount problem and aren't needed for local dev.
- If `supabase start` fails with a "does not exist on container" workdir error for some other service, check whether that service needs a host directory to exist first (e.g. `supabase/snippets` for Studio) — create it and retry.

## Testing

Existing e2e specs (`e2e/*.spec.ts`) fully mock Supabase REST calls via `page.route` (see `e2e/support/mockSupabase.ts`) and never touch a real backend, so they pass regardless of whether the local stack is running. The local stack exists for realistic manual dev/testing (real magic-link auth via Mailpit, real RLS) and as the foundation for future real-backend e2e tests.
