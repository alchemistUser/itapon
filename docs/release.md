# Release, environments & monitoring (Phase 24)

## Environments

| | Web | Database | Model | Who deploys |
|---|---|---|---|---|
| **dev** | `pnpm dev` (localhost) | Supabase `itapon-dev` | local `/models` (unpinned, no hash check) | you |
| **preview** | Vercel preview per PR/branch | Supabase `itapon-dev` | pinned HF tag + SHA-256 | Vercel (automatic) |
| **production** | Vercel production (`main`) | Supabase `itapon-prod` | pinned HF tag + SHA-256 | Vercel (automatic) + `db.yml` |

The Vercel project needs the Supabase variables **per environment** (Settings → Environment
Variables): `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` set to **prod** for
*Production* and to **dev** for *Preview* and *Development*.

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

1. **Supabase prod:** create `itapon-prod` in the same region. Enable anonymous sign-ins.
   Set Auth → URL configuration (site URL `https://itapon.vercel.app`, redirect
   `https://itapon.vercel.app/**`).
2. **Custom SMTP** (Supabase → Auth → SMTP; e.g. Resend or Brevo free tier) with a sender on
   a domain you control. Needed before strangers sign in: the built-in mailer only sends to
   team members.
3. **GitHub → Settings → Environments → `production`:** secrets `SUPABASE_ACCESS_TOKEN`,
   `SUPABASE_PROD_DB_PASSWORD`; variable `SUPABASE_PROD_PROJECT_REF`. Optionally require a
   reviewer for the environment.
4. **GitHub repository secrets/variables** (dev checks + retention): `SUPABASE_ACCESS_TOKEN`
   + variable `SUPABASE_PROJECT_REF` (dev); `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
   (**prod**, for the Retention workflow).
5. **Vercel:** per-environment Supabase variables (above). Enable Analytics and Speed Insights.
   Optional custom domain (then update site URL/redirects in Supabase and the uptime monitor).
6. **Uptime monitor** on `/api/health`.
7. Merge to `main` → `db.yml` creates the prod schema and content. Then make the first admin
   ([kiosk-setup.md](kiosk-setup.md#making-the-first-admin-project-team-once-per-institution)).
