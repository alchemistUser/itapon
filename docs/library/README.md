# Disposal & suggestion library (v1.1)

Planning and content rules for the material-based disposal library (ROADMAP-v2, Phases 27–30).

| Document | What |
|---|---|
| [taxonomy.md](taxonomy.md) | bins (↔ RA 9003 labels), destinations, 16 material groups and their subgroups, scanner class → item mapping |
| [entry-template.md](entry-template.md) | the columns of a library row, with a worked example (PET water bottle) |
| [style-guide.md](style-guide.md) | voice, Filipino, accuracy and **safety rules**, review workflow, rules for AI-drafted content |
| [sources.md](sources.md) | the source register every entry must cite (laws, DENR/EMB, Quezon City), with verification status and known gaps |
| [coverage.md](coverage.md) | **generated**: items per group by status, Filipino completeness, hazardous items awaiting review, warnings |

## Editing content (Phase 28 pipeline)

Content lives in [`supabase/content/library/`](../../supabase/content/library):
`items/<GROUP>.csv` (one row per item, columns in [entry-template.md](entry-template.md)),
`materials.csv`, `destinations.csv`, `sources.csv`, `local_rules.csv` (city-wide notes, e.g.
QC) and `dropoff_points.csv`. Edit them in Google Sheets or any spreadsheet (save as CSV,
UTF-8), then:

```bash
python supabase/scripts/build_library.py
```

It **validates** every row (required fields, lengths, bins and destinations, sources, Filipino,
safety rules, reviewers) and writes `supabase/seed_library.sql`, the app's offline copy
`apps/web/src/content/library.json` (**published items only**) and [coverage.md](coverage.md).
CI runs it with `--check`. Merging to `main` applies the seed to the database (`db.yml`).
Institution-specific notes and drop-off points are added by admins in the app (Phase 30), not
in these files.

## Decisions (ROADMAP D16–D19)

- **D16** The library (v1.1) is in the thesis scope; accounts v2 and points are future work.
- **D17** Rules: national default (RA 9003, DENR/EMB) with **Quezon City / TIP overrides** labelled "In Quezon City: …".
- **D18** Review is by the **team**, against cited sources. Hazardous/medical/e-waste rows need two reviewers. Items with unresolved gaps (household sharps, medicine) use a safe fallback text.
- **D19** Claude drafts entries from the source register into the content sheets (`status = draft`). The team reviews and publishes. No invented programmes, addresses or schedules.

## Privacy (library only)

The library collects **no personal data**. Usage is counted per item ("viewed", "chooser
used", "idea done") without account or device ids, like the scan logs. No privacy notice change
is needed for v1.1. (Accounts v2 and points will need the full review in their own phase.)

## Phase 29 status (2026-10-20): Wave 1 drafted

- **175 draft items**, ≥ 10 in every group, English and Filipino complete, 0 validator errors.
  See [`coverage.md`](coverage.md) for each group.
- **Group descriptions** (EN + FIL) for the 16 groups and the 7 resin codes in `materials.csv`.
- **Everything is a draft.** Before publishing, the team must:
  1. Peer-review every row against its sources (D19).
  2. Get **two reviewers and an expert** for the 50 hazardous and medical items.
  3. Verify the 3 sources marked "verify" (DAO 2013-22, lamp JAO, DOH manual). These cause
     the 32 warnings.
  4. Add TIP campus notes and real drop-off points to `local_rules.csv` and
     `dropoff_points.csv` (Claude did not invent any).
- To publish an item, set `status`, `reviewed_by` and `reviewed_at` in its CSV row, then run
  the build. The production workflow re-applies the library seed on every change.

## Phase 28 status (2026-10-20): done

- **Database** (migration `20261020100000_library.sql`): `library_sources`, `library_materials`
  (16 groups + 71 subgroups), `library_destinations` (12), `library_items`,
  `library_item_destinations`, `library_local_rules`, `library_dropoff_points`. RLS: everyone
  reads **published** content only; global content can't be written by any client; institution
  admins manage notes and drop-off points for their own institution only. Role matrix
  **102/102** (15 new library checks).
- **Pipeline**: `build_library.py` with a validator, seed, offline JSON (`content_version`),
  coverage report and CI `--check`; 13 validator tests.
- **Content**: the 36 v1 items migrated as **drafts** (material, destinations, sources, hazard
  text for the 7 hazardous items, reduce ideas), plus 8 Quezon City notes (drafts). No group is
  at the 10-item target yet, and Filipino is missing on the new fields. That's Phase 29.

## Phase 27 status

| Task | Status |
|---|---|
| Decisions Q1–Q9 | ✅ Q2, Q3, Q9 + authoring answered by the user (D16–D19); Q1 adopted as recommended (full entry template); Q4–Q8 deferred with accounts/points (future work) |
| Taxonomy + entry template | ✅ |
| Style & safety guide | ✅ |
| Rule-source register | ✅ 16 sources; 6 marked "verify" before use; 2 gaps (household sharps, medicine) |
| Points spec, accounts privacy review | ⏸ deferred with Phases 31–35 (D16) |
| Figma frames | ⏳ team (library home, group page, item page, post-scan card, "which one is yours?" chooser) |
| Adviser sign-off on scope | ⏳ team |
