# What's left to do

As of **21 October 2026**. Detailed plans live in [ROADMAP.md](ROADMAP.md) (v1, Phases 1–26) and
[ROADMAP-v2.md](ROADMAP-v2.md) (v2, Phases 27–35). This page is the short list.

**Done:** v1 (Phases 1–24), the pilot kit (25), the v2 library (27–30: 175 entries live and
labelled "Not reviewed yet", D25), accounts v2 (31: email + password, no emails, D24) and
points from daily and weekly missions (32, D26).

## 1. Building (Claude can do these)

| # | Phase | What | Status |
|---|---|---|---|
| 1 | **32 Points engine** | Daily and weekly missions, a server-side ledger, quizzes, anti-cheat, points history, admin reversal (D26, [docs/points.md](docs/points.md)) | **done** |
| 2 | **33 Badges, levels, leaderboards** | Levels from lifetime points; badges (e.g. "Plastics expert", "7-day streak"); streaks with a grace day; opt-in weekly leaderboards per institution (adults only, handle and avatar only). Prizes only if an institution runs them | next |
| 3 | **34 Admin and evaluation** | Admin: points by mission, active players, flags, "not found" searches as a content backlog. Evaluation tools: knowledge pre/post quiz, SUS for new screens. Privacy, RLS and security updates; QA and load test on the points functions | after 33 |
| 4 | **35 v2 release** | Feature flags per institution (points opt-in), CHANGELOG 1.1.0 / 2.0.0, release and rollback checklist, staff guide | last |
| 5 | Small follow-ups | Admin editor for campus notes and drop-off points, and campus notes on item pages (proposed as its own session) · optional: rename "library" to "Disposal guide" in the UI | any time |

Estimated effort: about 1–2 working sessions per phase. Phases 32 → 35 run in order.

## 2. Team actions (no code; Claude can't do these)

| What | Why | Where |
|---|---|---|
| **Supabase: turn off "Confirm email" and set minimum password length to 8** | Account sign-up doesn't work until then (D24) | Dashboard → Authentication → Sign In / Providers → Email |
| **Review library entries** | Removes "Not reviewed yet" entry by entry; hazardous ones need 2 reviewers (D18) | `supabase/content/library/items/*.csv`, [docs/library/README.md](docs/library/README.md) |
| Verify the 3 sources marked "verify" (DAO 2013-22, lamp JAO, DOH manual) | Clears the 32 warnings | `supabase/content/library/sources.csv` |
| Add TIP campus notes and real drop-off points | The drop-off finder is empty until then | Supabase tables `library_local_rules`, `library_dropoff_points` |
| Supply a profanity and reserved-word list (EN/FIL/Taglish) | Handle filter (privacy review §7) | send to Claude or add to `private.handle_words` |
| **Adviser approvals**: privacy review, minors rule (D22), v2 scope | Needed before real users | [docs/accounts/privacy-review.md](docs/accounts/privacy-review.md) |
| **Run the pilot (Phase 25)**: people, place, dates, consent forms, PWD testers, contamination audit | Results for the manuscript | [docs/pilot/](docs/pilot/README.md) |
| Figma frames for the v2 screens (optional) | Design chapter | — |

## 3. Manuscript and defense (Phase 26)

Claude can draft most of the written parts from the repo; the team edits and owns them.

1. **Technical docs:** architecture overview and diagram, ERD, API reference, deployment runbook,
   environment variables, kiosk and retraining guides (some exist in `docs/`).
2. **Model docs:** dataset card, model card, training configs, results tables, confusion matrix.
3. **User and admin guides** (mobile, kiosk, library, missions, admin dashboard).
4. **Manuscript mapping:** methodology from Phases 3–10, results from 7, 23 and 25, and
   accounts/points as future work (D16/D20). State that points reward learning, not proven
   disposal (D26), and that library entries are AI-drafted and still being reviewed (D25).
5. **Defense demo:** a script (scan → library card → missions → kiosk → dashboard), a backup
   video, devices with the model cached.
6. **Handover:** account and repo ownership, archived dataset and weights with licenses.

## Suggested order

```
now      Supabase email setting (team, 2 minutes)  ·  Phase 33 (Claude)
next     Phase 34 (Claude)  ·  library review + campus info (team, ongoing)
then     pilot (team)  ·  Phase 35 release (Claude)
finally  Phase 26 manuscript + defense (team, Claude drafts)
```
