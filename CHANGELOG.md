# Changelog

All notable changes to iTapon. Versions follow [Semantic Versioning](https://semver.org/);
see [docs/release.md](docs/release.md) for the release process.

## [2.0.0] - 2026-10-22

Accounts and points (ROADMAP-v2 Phases 31–35). Points are **future work** in the
manuscript (D16/D20); this release makes them demo-ready.

### Added
- **Accounts v2:** email + password with no emails sent (D24); profile with handle, preset
  avatar and an opt-in public toggle (adults only); birth year in an owner-only table with a
  conservative age rule (D22); consent records; join a school or office with a rotatable code
  (D23); export my data (JSON, scans as CSV); delete my account; sign out everywhere.
- **Missions and points** (D26): the same 3 daily and 3 weekly missions for everyone (scan
  different items, read the library, quizzes, "Which one is yours?", ideas); server-only
  ledger with caps (30/day, 150/week); anti-cheat (distinct items, scan spacing, burst
  flags, one-try quizzes, guests can't claim); points history.
- **Levels, streaks, badges and leaderboards:** levels 1–10, streak with a grace day,
  11 badges, weekly/monthly leaderboards per institution (public adults with a handle,
  accounts 3+ days old, admins can hide handles); the kiosk shows the top 5 when idle.
- **Admin:** members and join codes, points panel (flags, reversals with a reason), missions
  and search insights (active and returning players), "not found" search backlog, campus
  notes and drop-off points editor, knowledge test results.
- **Evaluation:** `/evaluate` pre/post knowledge test (participant codes, server-scored);
  `pilot_report.py` adds a pre/post table with a Wilcoxon signed-rank test; SUS for the v2
  screens.
- **Feature flags:** a project-wide `points` switch (the rollback plan turns it off first)
  and a per-institution points switch for admins (on by default for the demo, D27).

### Security & privacy
- Privacy review (`docs/accounts/privacy-review.md`, awaiting adviser approval), privacy notice
  and consent form updated. Role matrix: 218 checks. Points load check:
  `supabase/tests/points-perf.sql`.

### Known limitations
- No emails: no confirmation, magic links or password reset (the team resets passwords).
- Scan results come from the device; faked scans can earn at most the scan missions' capped
  points.
- Institution-run prizes are not built (D26).

## [1.1.0] - 2026-10-21

The disposal library (ROADMAP-v2 Phases 27–30). Shipped continuously on `main`; not tagged
separately.

### Added
- **Disposal library:** 175 entries in 16 material groups (plastics by resin code, paper,
  metals, glass, ceramics, textiles, e-waste, batteries, lighting, organics and more), in
  English and Filipino, with preparation steps, don'ts, hazards, where else it can go, reuse
  and reduce ideas, Quezon City rules and sources. AI-drafted and shown labelled "Not reviewed
  yet" until the team reviews them (D19, D25).
- **Library pages** (`/library`, group, subgroup, item) prerendered, with an EN/FIL switch,
  read aloud, related items and "commonly confused with".
- **Search** across the library: names, Filipino, aliases, materials, resin codes
  ("#5", "PP"), typos and "did you mean".
- **Post-scan card** with "Which one is yours?", where else, the top idea and the local rule;
  the kiosk reads a "where else / idea" line and shows a QR code to the entry.
- **Drop-off finder** by type (no invented places).
- **Offline:** the library is about 60 KB gzipped of per-group files cached by the service
  worker; item pages never opened online render from them.
- Content pipeline `supabase/scripts/build_library.py` (validator with safety rules, seed,
  app files, coverage report, CI `--check`).

## [1.0.0-rc.1] - 2026-10-18

First release candidate for the pilot (ROADMAP Phases 1–24).

### Added
- **Scanner** with on-device YOLO-World (ONNX in a Web Worker, D11/D12): live camera and
  photo upload, stability lock, confidence tiers, read-aloud (EN/FIL), the 4-bin result, and
  "What to do next" for multi-item scans.
- **Bin Guide**: fuzzy search in English, Filipino and aliases; category and item pages.
- **Accounts**: anonymous by default; save history with email or Google; history; delete my data.
- **Kiosk mode** for tablets above bins: hands-free loop, idle/attract screen, motion wake,
  wake lock, per-device bin order.
- **Institution dashboard** (`/admin`): KPIs, daily bins, top items, heatmap, per-device,
  model health (confidence, user-reported wrong rate, model versions, real-device speed),
  CSV export, kiosk registration, feedback review queue.
- **Feedback loop**: "Was this right?", opt-in photo sharing, review, export and field
  evaluation scripts with a promotion rule (D13).
- **PWA**: installable, offline Bin Guide and offline scanning after the first visit,
  offline scan-log queue.
- **Security & privacy**: RLS role matrix, model SHA-256 pinning, CSP and security headers,
  privacy notice (RA 10173), 12-month photo retention.
- **QA**: unit/component tests, Playwright E2E with axe and a real offline test, API
  contract and fuzz tests, model regression harness, soak page, QA sheets.
- **Monitoring**: first-party error log, real-device speed on `/admin`, `/api/health`.
- **Release**: production DB workflow, model pin check workflow, release/rollback runbook.

### Known limitations
- The model is zero-shot (D11). A trained model (Phases 3–7) is deferred.
- Field accuracy, phone device matrix and the regression photo set are pending the pilot.
