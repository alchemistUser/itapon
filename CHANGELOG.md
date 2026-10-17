# Changelog

All notable changes to iTapon. Versions follow [Semantic Versioning](https://semver.org/);
see [docs/release.md](docs/release.md) for the release process.

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
- **Monitoring**: first-party error log, Vercel Analytics/Speed Insights, `/api/health`.
- **Release**: production DB workflow, model pin check workflow, release/rollback runbook.

### Known limitations
- The model is zero-shot (D11). A trained model (Phases 3–7) is deferred.
- Field accuracy, phone device matrix and the regression photo set are pending the pilot.
