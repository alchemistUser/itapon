# Pilot & UAT kit (Phase 25)

Everything needed to run the pilot at TIP QC and turn the results into Chapter 4.
Built-in tools are marked 🛠; paperwork is in this folder.

| What | Where |
|---|---|
| Plan, roles, timeline, checklist | this page |
| UAT tasks + facilitator script + recording sheet | [protocol.md](protocol.md) |
| Informed consent (RA 10173) | [consent.md](consent.md) |
| SUS + ISO/IEC 25010 + open-ended questionnaire | [questionnaires.md](questionnaires.md) |
| Bin contamination audit (before/during) | [contamination-audit.md](contamination-audit.md) |
| Operational data SQL (scans, P95 speed, kiosk uptime) | [operational-data.md](operational-data.md) |
| Field accuracy protocol | [../qa/field-test.md](../qa/field-test.md) |
| 🛠 Printable QR poster | https://itapon.vercel.app/print/poster |
| 🛠 Kiosk pairing (no email) | `/kiosk` → Get pairing code; `/admin` → Kiosks → Register a kiosk |
| 🛠 Dashboard, CSV export, kiosk online hours | `/admin` |
| 🛠 Results → Markdown tables | `services/ml-api/scripts/pilot_report.py` |
| Response templates (CSV) | [`pilot/templates/`](../../pilot/templates) |

## Roles

| Role | Who | Does |
|---|---|---|
| Pilot lead | 1 member | permissions, schedule, admin account, final report |
| Facilitators | 2 members | run UAT sessions, read the script, record times |
| Kiosk/tech | 1 member | kiosks, daily check, posters |
| Auditor | 1 member + janitorial staff | contamination audits |

## Timeline (suggested: 4 weeks)

| Week | Activities |
|---|---|
| 0 | Adviser + facility approval (letter), choose 1–2 locations, print consent forms and posters. Ethics/consent wording approved |
| 1 | **Baseline contamination audit** (3 days, before any iTapon signage). Install kiosks; pair them; put up posters on day 5 |
| 2–3 | Pilot running. **UAT sessions** (≥ 20 participants: students/public, janitorial, admin/facility, PWD). Field test session. Contamination audit "during" (3 days in week 3). Daily kiosk check |
| 4 | Export data, run `pilot_report.py`, triage issues, bug-fix release v1.0.x, write Chapter 4 |

Five per group is a practical minimum for usability findings. Twenty total gives a usable
SUS mean. Include at least 3 PWD participants (e.g. low vision, using large text and read-aloud).

## Setup checklist

- [ ] Written permission from the adviser and the facility/admin office (location, dates, kiosk power/Wi-Fi, poster placement)
- [ ] Pilot institution + admin account (SQL in [kiosk-setup.md](../kiosk-setup.md#making-the-first-admin-project-team-once-per-institution)). The admin signs in with a **team member's email** (the built-in mailer only sends to team members until custom SMTP is set up)
- [ ] Kiosk hardware: tablet/monitor + webcam above the 4 bins, power, stand. Open `/kiosk` in Chrome, **Get pairing code** → admin registers it with the physical bin order → **Start kiosk**. OS lock-down per [kiosk-setup.md](../kiosk-setup.md)
- [ ] Print posters (`/print/poster`, one per location, A4/A3) and the consent forms
- [ ] Create the Google Forms from [questionnaires.md](questionnaires.md). Keep the column names (q1…q10, FS1…) so the CSV export works with the report script
- [ ] Test the full UAT run once with a team member (timing, devices, forms)
- [ ] Daily: `/admin` → Kiosks shows "online now" for each kiosk; check the bins

## After the pilot

1. Export the form responses into `pilot/data/` (git-ignored) as `sus.csv`, `tasks.csv`,
   `iso.csv`, `contamination.csv` (templates in `pilot/templates/`).
2. `cd services/ml-api && uv run python -m scripts.pilot_report --data ../../pilot/data --out ../../pilot/data/report.md`
3. Run the SQL in [operational-data.md](operational-data.md) and [field-test.md](../qa/field-test.md).
4. Fill the Phase 1 targets table below and triage the issues (P1 first) into v1.0.x.

| Phase 1 target | Result | Met? |
|---|---|---|
| SUS ≥ 75 | | |
| Task success ≥ 90% | | |
| P95 time to result ≤ 1.5 s on 4G mobile | | |
| Lighthouse accessibility ≥ 95 | **100** on 7 main pages (2026-10-18) | ✓ |
| WCAG 2.2 AA | axe: 0 serious/critical on 8 pages (Phase 23) | ✓ (automated) |
| Per-bin accuracy ≥ 90% (held-out set) | zero-shot model (D11): field bin accuracy instead | explain |
| mAP@50 ≥ 0.80 / mAP@50-95 ≥ 0.55 | no trained model (D11) | explain |
| ISO/IEC 25010 survey | | |
