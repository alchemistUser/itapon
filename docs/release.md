# Release, environments & monitoring (Phase 24)

## Environments

**One Supabase project for everything (D15).** `itapon-dev` (ref `svvbvkdkgduyphkkaiio`) is also
production. That keeps the free tier simple, and a second project can be split off later
without code changes.

| | Web | Database | Model | Who deploys |
|---|---|---|---|---|
| **dev** | `pnpm dev` (localhost) | the one Supabase project | local `/models` (unpinned, no hash check) | you |
| **preview** | Vercel preview per PR/branch | the one Supabase project | pinned HF tag + SHA-256 | Vercel (automatic) |
| **production** | Vercel production (`main`) | the one Supabase project | pinned HF tag + SHA-256 | Vercel (automatic) + `db.yml` |

What this means in practice:
- **Real data lives where you develop.** Scans you make on localhost or in previews show up
  in your own history and in an institution's dashboard only if your account belongs to one.
  Test with an anonymous or test account, not an institution admin.
- **Never run `supabase/demo/*.sql` after launch** (it adds a fake institution), and treat
  `supabase db push` from your laptop as a production change (normally `db.yml` does it).
- The test suites are safe on it: the RLS role matrix runs in a rolled-back transaction, and
  `rls-check.mjs` only creates throwaway anonymous users and deletes their data.
- Free projects pause after 7 days without traffic. `keepalive.yml` reads one row daily.
- **Splitting later:** create a new project, point `SUPABASE_PROD_PROJECT_REF` (+ password) at it,
  set the Vercel *Production* variables to it, merge anything to `main` (or run `db.yml` by hand).
  The schema and content come entirely from the migrations and seed.

## How a change reaches production (no manual steps)

1. PR → CI (lint, typecheck, unit, E2E + axe, API, dependency audit, gitleaks, RLS matrix on
   dev) + a Vercel preview deployment.
2. Merge to `main` → Vercel builds and promotes production. If `supabase/migrations/**` or
   the seed changed, **`db.yml`** applies them to `itapon-prod` (dry run first) and runs the
   RLS role matrix there (rolled back).
3. A model change (new HF tag in `PINNED_MODEL_BASE_URL` + new `PINNED_SHA256`) triggers
   **`model-regression.yml`**: it downloads the pinned files, verifies the hashes and runs the
   regression set. Publishing to HF stays manual and reviewed ([retraining.md](retraining.md)).

**Order rule:** migrations must be backward compatible with the currently deployed app
(add columns/tables first, start using them in a later deploy). Vercel and `db.yml` run in
parallel.

## Versioning & release checklist

Semantic versioning in `apps/web/package.json` (shown in the footer and `/api/health`). Every
release adds a section to [CHANGELOG.md](../CHANGELOG.md).

- [ ] CI green on `main`. Preview tested ([qa/device-matrix.md](qa/device-matrix.md) quick pass: A–G on one phone)
- [ ] `db.yml` run succeeded (or no DB change). RLS matrix passed on prod
- [ ] Vercel env vars correct for Production. `/api/health` shows the new `version` and `build`
- [ ] Smoke test on production: scan one item, open the Bin Guide offline, `/admin` gating,
      "Was this right?" round-trip
- [ ] Bump the version + CHANGELOG, then tag: `git tag v1.0.0 && git push --tags`, and create a GitHub release from the tag

## Rollback

- **Web + model:** Vercel → Deployments → previous production deployment → *Instant
  Rollback*. The model pin lives in the code, so this also restores the previous model.
  Service workers pick up the old build on the next page load (pages are network-first).
- **Database:** roll **forward** only. Write a new migration that undoes the change, merge it
  and let `db.yml` apply it. Never edit production by hand. Supabase's daily backups (free
  tier: 7 days, restore via support/dashboard) are the last resort.

## Monitoring

| What | Where | Setup |
|---|---|---|
| Browser errors | `public.client_errors` (first-party, insert-only, no user id, query strings stripped; 90-day purge) | built in. Query: `select date_trunc('day', created_at) d, kind, message, count(*) from client_errors group by 1,2,3 order by 1 desc, 4 desc limit 50;` |
| Page views, Web Vitals (LCP, INP, CLS) from real users | Vercel → Analytics / Speed Insights | enable both in the Vercel project (free tier) |
| Real-device model speed | `/admin` → Model health → *Time to result on real devices* (from scan logs: latency, engine, device type; never images) | built in |
| Uptime | UptimeRobot / Better Stack, HTTPS monitor on `https://itapon.vercel.app/api/health`, every 5 min, keyword `"ok"` | create a free monitor, alert to the team email |
| Database usage | Supabase → Organization → Usage (DB size 500 MB, egress 5 GB, MAU) | turn on usage emails; check weekly during the pilot |
| Server logs | Vercel → Logs | built in |

**Exit criterion:** uptime monitor at 99%+ over one week. Record it in the table below.

| Week | Uptime | Incidents |
|---|---|---|
| | | |

## One-time setup (team)

Single-project version (D15). The Supabase auth settings (site URL, redirect URLs, anonymous
sign-ins) are already done and tracked in `supabase/config.toml`.

1. **Custom SMTP** (Supabase → Authentication → Emails → SMTP settings; e.g. Resend or Brevo
   free tier) with a sender address you control. Needed before people outside the team sign in:
   the built-in mailer only sends to team members and allows only a few emails per hour.
2. **GitHub → Settings → Environments → New environment `production`:**
   - secret `SUPABASE_ACCESS_TOKEN`: a personal access token from supabase.com/dashboard/account/tokens
   - secret `SUPABASE_PROD_DB_PASSWORD`: the project's database password (Project Settings → Database; reset it there if unknown)
   - variable `SUPABASE_PROD_PROJECT_REF` = `svvbvkdkgduyphkkaiio`
3. **GitHub → Settings → Secrets and variables → Actions** (repository level):
   - secret `SUPABASE_ACCESS_TOKEN` (same token) and variable `SUPABASE_PROJECT_REF` = `svvbvkdkgduyphkkaiio` (RLS matrix in CI)
   - secrets `SUPABASE_URL` = `https://svvbvkdkgduyphkkaiio.supabase.co` and `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API Keys → `service_role`/secret key) for the Retention workflow
   - variables `SUPABASE_URL` (same URL) and `SUPABASE_ANON_KEY` (the public anon key) for `keepalive.yml`
4. **Vercel:** the Supabase variables already point to this project for all environments, so
   nothing to change. Turn on **Analytics** and **Speed Insights** in the project.
5. **Uptime monitor** (UptimeRobot or Better Stack, free): HTTPS keyword monitor on
   `https://itapon.vercel.app/api/health`, keyword `"ok"`, every 5 min, alerts to the team email.
6. **Check:** Actions → *Database (production)* → *Run workflow*. It should link the project,
   find no pending migrations, re-apply the content seed and pass the RLS matrix. Then run
   *Supabase keep-alive* and *Retention* once by hand.
