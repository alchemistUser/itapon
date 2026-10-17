# QA & test plan (Phase 23)

What is tested, how to run it, and the latest results. The manual parts (devices, soak,
field test) have their own sheets in this folder; fill them in during UAT.

## Automated suites

| Suite | What it covers | Run | Latest (2026-10-18) |
|---|---|---|---|
| Web unit + component (Vitest, Testing Library) | content mapping, stability gate, plan aggregation/dedup, search (EN/FIL), speech, analytics, offline log queue, model hash pins, result views, bin order, "Was this right?" flow | `pnpm --filter web test` | **57 passed** |
| E2E (Playwright, phone + desktop) | guide search (Filipino), result pages, privacy link, admin gating, history, security headers, **offline guide with the server stopped** | `pnpm --filter web build && pnpm --filter web e2e` | **31 passed** (incl. scan) |
| Accessibility (axe, WCAG 2.1 A/AA) | 8 pages × phone/desktop: no serious/critical violations | part of E2E | **16 passed** |
| Live scan (fake camera) | Chrome fake camera plays a sample photo → result locks → "Next Scan" | E2E `scan` project (needs `E2E_SAMPLE_IMAGE` or local dev samples + ffmpeg) | **passed locally**; skipped in CI (no committable photo yet) |
| API (pytest) | endpoints, validation, thresholds, classes ↔ content, abuse/fuzz, **OpenAPI contract** (`openapi.json`) | `cd services/ml-api && uv run pytest -q` | **32 passed** |
| RLS role matrix | anon, users, kiosk, 2 admins × every table | `pnpm db:rls-roles` | **59/59** |
| RLS end-to-end (anon key) | real client flows incl. feedback and storage | `pnpm db:rls-check` | **32/32** |
| Model regression | fixed labelled set, fails on any accuracy drop vs `baseline.json` | `uv run --group build python -m scripts.model_regression --set ../../ml/regression-set --model …` | harness verified on 3 local samples. **Needs the ~50-photo set** ([`ml/regression-set`](../../ml/regression-set/README.md)) |

CI (`.github/workflows/ci.yml`) runs everything above except the fake-camera scan (no
committable photo yet) and the RLS matrix (until the `SUPABASE_ACCESS_TOKEN` secret is set).
The model-export workflow runs the regression test on every model build.

## Manual / on-device

| Sheet | Task | Status |
|---|---|---|
| [device-matrix.md](device-matrix.md) | 5: iPhone Safari, Android Chrome (low/mid), iPad, desktop Chrome/Edge/Firefox | Desktop Chrome done. **Phones and tablets need the team's devices** |
| [performance.md](performance.md) | 6: 10-minute continuous scan (fps, memory, battery/thermal) via `/dev/soak` | Desktop 10 min: 3.3 fps, 299 ms, heap flat ✓. **Phones pending** |
| [field-test.md](field-test.md) | 7: real items under campus lighting → field bin accuracy | Protocol + SQL ready. **Needs a campus session** |

## Bugs

P1 = wrong bin shown with high confidence, a crash, data exposure, or a blocked core flow
(scan, guide, delete my data).

| # | Pri | Found | Status |
|---|---|---|---|
| – | – | Phase 23 automated runs found no app bugs (the 4 first-run failures were test assumptions: hidden phone/desktop layouts, button label, Playwright's `setOffline` not covering service workers). | – |
| S1–S7 | High–Low | Phase 22 (see [security.md](../security.md)) | fixed |

**Open P1 bugs: none.**

## Exit criteria

- [x] All automated tests green (local; CI on push)
- [x] No P1 bugs open
- [ ] Field bin accuracy measured and recorded ([field-test.md](field-test.md))
