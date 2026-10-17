# Security & privacy checklist (Phase 22)

Status of every Phase 22 control, the findings from the audit, and what still needs a
person. Re-run the checks below before each release and after any migration.

**Sign-off:** ☐ project lead ☐ adviser (pending; see "Open items").

## How to re-run

| Check | Command | Last result (2026-10-18) |
|---|---|---|
| RLS role matrix (anon, 2 users, kiosk, 2 admins × every table, rolled back) | `pnpm db:rls-roles` | **59/59** |
| RLS end-to-end with the public anon key | `pnpm db:rls-check` (env: `SUPABASE_URL`, `SUPABASE_ANON_KEY`) | **32/32** |
| API abuse/fuzz tests | `cd services/ml-api && uv run pytest -q` | **29 passed** |
| Dependency audit | `pnpm audit --prod --audit-level high`; `pip-audit` (see CI) | 0 runtime advisories |
| Secrets in git history | gitleaks (CI, full history) | clean |
| Service-role key in the client bundle | `grep -r service_role apps/web/.next/static` | none (only the `anon` key) |

CI runs the dependency audit on every push. It runs the RLS role matrix once the
`SUPABASE_ACCESS_TOKEN` secret and the `SUPABASE_PROJECT_REF` variable are set (until then the
job is skipped with a warning).

## Findings

| # | Severity | Finding | Fix | Verified by |
|---|---|---|---|---|
| S1 | High | Any institution admin could edit the global Bin Guide content (`waste_items`, `waste_categories`) seen by every user. | Content writes revoked from clients; changes go through migrations/seed (project team). | role matrix: "admin A cannot edit global content (S1)"; mutation test fails when reverted |
| S2 | High | An admin could set `devices.kiosk_user_id` to **any** user, which would tag that person's future scans with the admin's institution, readable by the admin. | Devices are created only by `admin_register_kiosk` (checks the account by email). Admins can update only `label`, `location_note`, `bin_order`; new check constraints validate them. | role matrix: "cannot relink" / "cannot insert devices directly"; mutation test |
| S3 | Medium | A stolen kiosk session could read and delete the kiosk's whole scan history. | Kiosk accounts are **insert-only** for scans (no select/delete; `delete_my_data` deletes nothing for them; no feedback). | role matrix: kiosk section (8 checks) |
| S4 | Medium | Service worker served the cached Turbopack worker bootstrap, whose fragment carried the previous build's chunk list, so **the previous build's worker code ran** (this hid the new integrity check). | `/_next/static` and `/ort` are network-first, with the cache only offline; caches bumped to v2. | tampered model now refused in a production build |
| S5 | Medium | Image "decompression bombs" (tiny PNG declaring gigapixels) and malformed files against the reference API. | Pixel limit (50 MP) checked before decoding → 413; all decode errors → 400. | `tests/test_abuse.py` (11 cases + 40 random mutations) |
| S6 | Low | Model/labels were trusted as downloaded. | SHA-256 of each pinned file is committed (`PINNED_SHA256`). The worker verifies cached and downloaded bytes and deletes a bad copy. | tampered cache byte → "failed its integrity check"; clean reload re-downloads |
| S7 | Low (bug) | Daily-count RPC defaults used the UTC date, so 00:00–08:00 Manila time missed "today". | Defaults use the Manila date. | `rls-check.mjs` "A gets own daily counts" |

Accepted (documented) risks:
- **CSP allows `'unsafe-inline'` scripts.** Next streams RSC data in inline scripts and pages are prerendered (no per-request nonce). Every other source is pinned, plus `object-src 'none'`, `frame-ancestors 'none'` and `base-uri 'self'`. Revisit if pages become dynamic.
- **Dev-only advisories** (Vitest 3 → tinypool, @vitest/mocker; braces via eslint-config-next): none of them ship to users or run on untrusted input. Vitest 4+ needs Node ≥ 20.19. Node 20 has been end-of-life since April 2026, so moving to Node 22 LTS (local and CI) is the fix. Tracked as an open item.
- The HF token pasted into a chat on 2026-10-17 was never committed and was replaced by a fresh token.

## Controls

**HTTP headers (production, `next.config.ts`)**: `Content-Security-Policy` (default `'self'`;
scripts `'self' 'unsafe-inline' 'wasm-unsafe-eval'`; connect to `*.supabase.co`, `huggingface.co`,
`*.hf.co`; images also `*.supabase.co`; workers `'self' blob:`), `Strict-Transport-Security`
(2 years, subdomains), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, fullscreen and
wake lock self only; microphone, geolocation, payment and USB off), plus COOP/COEP (D12).

**Data access (RLS, see `docs/database.md`)**: every public table has RLS on (checked by the
matrix). Users see only their own rows. Institution admins see only their institution's scans,
feedback and photos and can't edit global content. Kiosks are insert-only. The `service_role` key
is used only by maintainers' scripts (`export_feedback.py`, `purge_feedback_photos.py`) and
GitHub secrets, never in the web app.

**Model integrity (D12)**: the model loads only from the pinned HF tag over HTTPS and must
match `PINNED_SHA256`. Dev (`/models`) and preview overrides skip the check on purpose.

**Privacy (RA 10173)**: `/privacy` notice (what, why, who, retention, rights, NPC). Separate,
unticked-by-default photo consent per photo. No images stored by default (frames stay on the
device). Delete-my-data covers scans, feedback and photos. Retention: shared photos are deleted
after 12 months (`purge_feedback_photos.py`, monthly `Retention` workflow).

**Reference API (not deployed, D12)**: CORS allowlist, 2 MB upload limit, type allowlist, 50 MP
pixel limit, clean 4xx on malformed input. If it's ever deployed, add rate limiting and an
optional Supabase JWT check first.

## Open items (need a person)

1. Add repository secrets so CI can run the RLS matrix (`SUPABASE_ACCESS_TOKEN` + variable
   `SUPABASE_PROJECT_REF`) and the retention job (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
2. Upgrade Node to 22 LTS locally, then CI + Vitest 4 (clears the dev advisories).
3. Name a privacy contact (team email) for the notice. It points to GitHub for now.
4. Sign-off above.
