# iTapon v2 roadmap: disposal library, accounts & points

Planned features on top of v1.0 ([ROADMAP.md](ROADMAP.md), Phases 1–26). **Nothing here is
built yet.** Phases continue the v1 numbering (27–35) and follow the same Definition of Done
(ROADMAP §6: tests, RLS checks, accessibility, docs).

| Feature | In one line |
|---|---|
| **Disposal & suggestion library** | A large, material-based library: plastics (down to resin codes), paper, metals, glass, ceramics, textiles, e-waste, batteries, organics, hazardous and more, with **hundreds of specific items**. Each says exactly how to dispose of it, where it goes in the Philippines (bin, junk shop, drop-off), how to prepare it, and how to reuse or avoid it. It appears right after a scan and can be browsed and searched any time. |
| **Account system v2** | Turn today's anonymous-first accounts into real profiles: a public handle, avatar, school/org membership and account settings, with the anonymous history carried over. |
| **Point system** | Reward good sorting habits with points, badges, streaks and opt-in leaderboards, with rewards an institution can offer. Points are awarded only by the server, with anti-cheat rules. |

## What already exists (reused, not rebuilt)

- **Content:** 36 items (23 detectable) with `short_instruction`, `prep_steps`, `why_text`,
  `contamination_note`, aliases and Filipino names; 16 have a `reuse_tip` (Phases 10/14/15).
  These become the first library entries.
- **Bin Guide** with fuzzy EN/FIL search (Phase 15), offline content (Phase 21).
- **Accounts:** anonymous by default, upgrade with email or Google, history, delete-my-data
  (Phase 16); preferences (Phase 17); roles user/kiosk/admin and institutions (Phases 18–19).
- **Kiosks** have their own identity and pairing (Phase 25), which makes kiosk-verified
  disposals possible.
- **RLS role matrix** (`supabase/tests/rls-roles.sql`, 80 checks) to extend for every new table.
- **Feedback & analytics** (Phases 19–20) to measure whether the features change behaviour.

## The library at a glance

The library is organised by **material**, because that decides how something is disposed
of, and works down to **specific items**. The four bins stay the answer people see first. The
library explains the *why*, the *where* and the *what else*.

| Material group | Subgroups (examples) | Example items | Typical destination (PH) |
|---|---|---|---|
| **Plastics** | by resin code: #1 PET, #2 HDPE, #3 PVC, #4 LDPE, #5 PP, #6 PS, #7 other; films & bags; multilayer | PET water/soda bottle, HDPE shampoo bottle, PP food tub, PS clamshell, LDPE bag, sachet, bubble wrap, PVC pipe offcut | blue bin / **junk shop** (#1, #2, often #5) · black bin (sachets, PS, films, dirty plastic) |
| **Paper & cardboard** | clean paper, cardboard, cartons, coated/waxed, thermal, tissue | office paper, newspaper, corrugated box, egg tray, paper cup, receipt, greasy pizza box, tissue | blue bin / junk shop (clean, dry) · black (waxed, thermal, soiled) · green (tissue, if the LGU composts it) |
| **Metals** | aluminum, steel/tin, scrap, aerosols, foil | soda can, sardine can, bottle cap, foil tray, aerosol can, wire, old pot | blue bin / **junk shop** (good value) · aerosols: red if not empty |
| **Glass** | containers, flat glass, heat-resistant, broken | softdrink bottle, jar, window glass, mirror, Pyrex, drinking glass, broken glass | bottles/jars: blue / "bote-bote" · flat, Pyrex, mirrors: **black** (wrapped) |
| **Ceramics & porcelain** | dishware, tiles, pots | mug, plate, bowl, tile, clay pot, toilet-bowl fragment | **black**, wrapped (not with glass, a common mistake) · reuse/donate if whole |
| **Textiles & footwear** | clothes, fabrics, shoes, bags | T-shirt, jeans, socks, rags, slippers, school bag | donate / repair / rags · black if soiled |
| **Electronics (e-waste)** | small devices, cables, chargers, accessories | phone, charger, earphones, cable, mouse, calculator, power bank | **e-waste drop-off** (never the bin; power banks also battery rules) |
| **Batteries** | alkaline, lithium-ion, button cell, lead-acid | AA/AAA, phone battery, coin cell, power bank, car battery | **red / hazardous drop-off** · tape terminals · Li-ion = fire risk |
| **Lighting** | CFL/fluorescent, LED, incandescent | fluorescent tube, CFL bulb, LED bulb, Christmas lights | **red / hazardous** (mercury in CFL/fluorescent) |
| **Organics** | food scraps, garden, oils | fruit peel, rice, bones, eggshell, coffee grounds, leaves, used cooking oil | **green** / compost · cooking oil: never down the drain, collect |
| **Wood & natural** | wood, bamboo, cork | chopsticks, popsicle stick, broken chair part, bamboo skewer | green (untreated, small) · black/bulky (treated, painted) |
| **Rubber & foam** | rubber, foam, styrofoam | rubber band, tire, slipper, styrofoam box, foam cushion | black · tires: shop take-back |
| **Composites / multilayer** | cartons, sachets, blister packs | Tetra Pak, chip bag, coffee sachet, toothpaste tube, blister pack | black (or special programmes, e.g. carton collection) |
| **Medical & sanitary** | masks, sharps, medicine, diapers | face mask, syringe/needle, expired medicine, diaper, sanitary pad, test kit | black (wrapped) · **sharps: sealed container, health centre** · medicine: take-back |
| **Household hazardous** | paints, chemicals, pesticides, motor oil | paint can, solvent, insecticide, bleach bottle, nail polish, motor oil | **red / hazardous drop-off**, never the drain |
| **Bulky & special** | furniture, appliances, construction | mattress, chair, ref, aircon, hollow blocks, tiles | LGU bulky pickup · appliance take-back · construction debris rules |

Each **item entry** has: names (EN, FIL, aliases, common brand words), material group and
subgroup (and resin code for plastics), the **bin**, **where else** (junk shop, drop-off,
take-back, LGU pickup), **how to prepare** (steps), **do / don't**, **hazards**, **value** (does a
junk shop buy it?), **reuse ideas**, **reduce / alternatives**, a **fact with source**, related
items, an icon, the linked model class (if the scanner can detect it), and review status/date.

**Targets:** v1.1 = **≥ 250 items** across all 16 groups (≥ 10 per group); v2.x = **500+**
(long tail). Everything in English and Filipino. Every hazardous/medical item is reviewed by
someone qualified.

## Decisions needed before Phase 28 (Phase 27 settles them)

| # | Question | Options | Recommendation |
|---|---|---|---|
| Q1 | What does an entry cover? | bin only · + prep · + where else · + reuse/reduce · + facts · + local campus info | **all of them** (the entry template above) |
| Q2 | Who writes and reviews? | project team · + institution admins (local notes only) · + expert reviewers · + user submissions | team writes by material group; **expert review** for hazardous/medical/e-waste; admins add **local** notes; user suggestions later (review queue) |
| Q3 | Which rules apply when places differ? | national only · national + LGU overrides | **national default (RA 9003, DENR/EMB)** + **LGU/institution overrides** (QC first) shown as "In Quezon City: …" |
| Q4 | Email for real accounts | custom SMTP (Resend/Brevo free) · Google-only · username + password | **custom SMTP + Google**: email sign-in needs SMTP (deferred in Phase 24) |
| Q5 | What earns points? | every scan · first scan of each item · confirmed disposal · kiosk-verified disposal · learning (quiz, library) · helpful feedback | **not raw scans** (easy to farm). Kiosk-verified disposals + learning + reviewed feedback + library actions, with caps |
| Q6 | Leaderboards | none · per institution · global | **opt-in, per institution, weekly**, handle only |
| Q7 | Rewards | badges only · institution prizes · partner rewards | badges + **institution-managed** rewards with admin approval |
| Q8 | Minors | allow · parental consent · 18+ only | allow with an **age gate**: under-18s get no public leaderboard and a guardian notice (RA 10173) |
| Q9 | Thesis scope | v2 before the defense · after ("future work") | decide with the adviser. The library (v1.1) fits well; points need their own evaluation |

**Answered 2026-10-20:** Q2 team review against sources (D18), Q3 national + QC overrides (D17),
Q9 library in, points later (D16); authoring: Claude drafts, team publishes (D19). Q1 adopted as
recommended. Q4–Q8 wait for the accounts/points phases.

---

## Phase 27: v2 scope, rules & design

> **Status (2026-10-20): Done for the library; deferred for accounts/points.** Decisions D16–D19 (ROADMAP.md): the library is in the thesis and accounts/points are future work; national rules + QC/TIP overrides; team review against sources; Claude drafts and the team publishes. Deliverables in [`docs/library/`](docs/library/README.md): taxonomy (bins ↔ RA 9003 labels, 12 destination types, 16 groups / 71 subgroups, scanner-class mapping checked against the 23 real classes), entry template with a worked example, style & safety guide, and a **source register** (RA 9003 Secs. 3, 21, 22, 48 quoted from the text; RA 6969; DAO 2013-22; lamp JAO; RA 11898 EPR; QC SP-2876, SP-2868, Trash to Cashback, lamp and cooking-oil ordinances; DOH HCWM manual). 6 sources are marked "verify" and there are 2 gaps (household sharps, medicine) with a safe fallback. **Team:** Figma frames and adviser sign-off. Points spec and the accounts privacy review are deferred with Phases 31–35.

**Goal:** Lock what we build, the library structure and the points rules, so later phases don't churn.

**Tasks**
1. Answer Q1–Q9 with the team and adviser, and record them as decisions D16+ in ROADMAP.md.
2. **Library taxonomy v1**: the material groups and subgroups (table above), the entry
   template, the destination types (bin, junk shop, e-waste drop-off, hazardous drop-off,
   take-back, LGU pickup, donate/repair, compost), and the rule-source list (RA 9003, DENR/EMB
   guidelines, QC ordinances, TIP campus policy).
3. **Content style guide**: tone, reading level, length (summary ≤ 140 characters for the
   result card), Filipino/Taglish conventions, units, how to cite, **safety rules** (no DIY
   with batteries, bulbs, chemicals, medicine or sharps), and no brand bashing.
4. **Points economy spec** (`docs/points.md`): every earning action, its points, caps,
   cooldowns, levels, expiry. Simulate a heavy user and a cheater on paper.
5. **Figma**: library home (browse by material), group page, item page, post-scan card, the
   "which one is yours?" chooser, drop-off finder; profile, points, badges, leaderboard, rewards,
   admin.
6. **Privacy impact review** (RA 10173) for profiles, points and leaderboards; minors.

**Deliverables:** decisions, taxonomy + entry template, style guide, `docs/points.md`, Figma, privacy review.
**Exit criteria:** adviser sign-off on scope (Q9), the taxonomy and the points rules.

---

## Phase 28: Library data model & content pipeline

**Goal:** A structure that can hold 500+ items with local rules, and a way for the team to write
content quickly and safely.

**Tasks**
1. **Schema** (migration):
   - `materials` (group → subgroup tree, resin code, icon, description EN/FIL).
   - `library_items` (all entry fields; `material_id`; `detectable_class_key` nullable, linking
     the 23 model classes; `review_status`, `reviewed_by`, `reviewed_at`).
   - `destinations` (type, description) and `item_destinations` (item, destination, rank, notes).
   - `suggestions` (type ∈ reuse | reduce | fact | tip, EN/FIL, source) and `item_suggestions`.
   - `rule_overrides` (scope = LGU or institution, item or material, bin/destination/notes):
     e.g. "Quezon City: Tetra Pak → black bin", or "TIP: e-waste box at the library".
   - `dropoff_points` (name, type, address, map link, hours, LGU or institution).
   - Keep v1 `waste_items` working: the 36 v1 items become library items, and the scanner
     still reads `class_key` → item.
2. **RLS**: everyone reads published global content; members read their institution's local
   overrides/drop-offs; institution admins manage only those; global content is project-team
   only (finding S1 rule). Extend the role matrix.
3. **Authoring pipeline**: one **CSV/Google Sheet per material group** with a fixed column
   template → `build_library.py` (like `build_seed.py`) → validated seed SQL + bundled JSON, with
   a CI `--check`. The **validator** enforces required fields, lengths, a valid bin and
   destination, Filipino present, a source on facts, no DIY on hazardous items, unique names and
   aliases, and no dangling related-item links.
4. **Coverage report** (generated): items per group and subgroup, missing translations,
   unreviewed hazardous items, items without reuse/reduce ideas, so content gaps are visible.
5. **Content versioning**: `content_version` in the bundle, so the app knows when to refresh
   offline copies (Phase 21 cache).

**Deliverables:** migrations + RLS tests, sheet templates, `build_library.py` + validator + CI check, coverage report.
**Exit criteria:** the 36 v1 items migrate losslessly; the validator rejects bad rows; a test sheet round-trips into the app.

---

## Phase 29: Content production (the big one)

**Goal:** Fill the library: at least 250 high-quality items for v1.1, growing to 500+.

**Tasks**
1. **Split by material group** across the team (e.g. each member owns 3 groups), using the
   style guide and sheet templates. Write a **group page** for each (what it is, how to tell
   the types apart, e.g. "find the number in the triangle", common mistakes).
2. **Wave 1 (~120 items)**: the most common campus and household items across all 16 groups
   (canteen, classroom, dorm, kitchen, bathroom).
3. **Wave 2 (→ 250)**: complete every group to ≥ 10 items; all plastics resin codes, paper
   types, battery types, lighting, medical, household chemicals; **Filipino for everything**.
4. **Wave 3 (→ 500+, ongoing)**: the long tail (bulky items, construction, appliances,
   seasonal items such as Christmas lights or school supplies), more brands/aliases, and
   more reuse/reduce ideas.
5. **Local rules**: QC overrides and TIP campus notes first. Drop-off points: junk shops near
   campus, e-waste and battery drop-offs, health centre for sharps, take-back programmes.
6. **Review**: peer review on every row; **expert review** (adviser, environment office,
   health/safety officer, or LGU ENRO) for hazardous, medical and e-waste items; a fact check
   on every claim with a source.
7. **Icons**: one simple icon per material group/subgroup (no photos needed, so it stays light and
   offline-friendly).

**Deliverables:** ≥ 250 reviewed items (v1.1), group pages, local rules + drop-off points, coverage report at 100% for the v1.1 scope.
**Exit criteria:** ≥ 10 items in every group, 100% EN + FIL, 0 unreviewed hazardous/medical items, 0 validator errors.

---

## Phase 30: Library in the app

**Goal:** The right disposal answer and next step for **any** item, scanned or searched.

**Tasks**
1. **Post-scan card** (phone sheet, desktop panel, kiosk) under the bin result:
   - **"Which one is yours?"** When a model class covers several library items (e.g.
     `plastic_bottle` → PET water bottle, HDPE shampoo bottle, cooking-oil bottle), a quick
     chooser with a tip ("check the number in the triangle"); the choice refines the result.
   - The item's **where else** (e.g. "Junk shops buy this"), **top reuse/reduce idea**, and any
     **local rule** ("In Quezon City: …"); a link to the full item page.
   - **"I'll do this" / "Done it"** on ideas (feeds analytics and later points).
2. **Library pages**: `/library` (browse by material), `/library/[group]`,
   `/library/[group]/[subgroup]`, `/library/item/[slug]` with all entry sections, related items,
   and "commonly confused with" (e.g. mug vs glass, PS vs PET).
3. **Search** across the whole library: names, Filipino/Taglish, aliases, brand words, resin
   codes ("#5", "PP"), materials. Typo-tolerant (extends the Phase 15 search), with "did you mean".
4. **Drop-off finder**: filter by type (e-waste, batteries, hazardous, junk shop), with a list and
   map links. Local points first for institution members.
5. **Bin Guide** (v1) becomes the library's entry point: bins → materials → items.
6. **Kiosk**: one short "where else / idea" line read aloud after the bin, plus a QR to the
   item page.
7. **Offline & performance**: the library is too big to bundle into the page JavaScript, so it
   loads as per-group JSON files into the service-worker cache/IndexedDB on first visit
   (versioned), and the search index loads lazily. Budget: first load of `/scan` unchanged;
   whole library ≤ ~300 KB gzipped text; icons as one SVG sprite.
8. Accessibility (read-aloud of entries, Filipino, large text), SEO-friendly static pages
   (each item page is prerendered), and analytics per item ("viewed", "chooser used", "done").

**Deliverables:** post-scan card + chooser, library pages, search, drop-off finder, kiosk line, offline packs, tests (unit, E2E, axe, offline), `/admin` library analytics.
**Exit criteria:** every scan result links to a library entry; any of the 250 items is found by search in EN and FIL; the library works in airplane mode; `/scan` first-load JS unchanged.

**→ Ship Phases 27–30 as v1.1** (no accounts or points needed).

---

## Phase 31: Account system v2

**Goal:** Real, safe accounts that points and leaderboards can rely on.

**Tasks**
1. **Email delivery**: custom SMTP (Q4) and branded sign-in emails (EN/FIL); keep Google
   sign-in. Email confirmation required for points-eligible accounts.
2. **Profile**: unique **handle** (validated, reserved words, profanity filter), avatar from a
   preset set (no photo uploads in v2), display preferences, public/private toggle.
3. **Institution membership**: join with a **join code** from the admin (same pattern as kiosk
   pairing), leave, and admin member management.
4. **Age gate & consent**: birth year at sign-up; under-18s are private by default with no
   leaderboard and a guardian notice; consent records stored with version and date.
5. **Account lifecycle**: anonymous → full account keeps history and points, sign-out
   everywhere, **data export** (JSON/CSV, RA 10173 portability), delete account (extends
   delete-my-data).
6. **Security**: sign-in/sign-up rate limits, handle-change cooldown, RLS (public fields
   readable, private fields owner-only), role-matrix checks.

**Exit criteria:** an anonymous user upgrades without losing data; export and delete are verified; no private profile field is readable by others (matrix).

---

## Phase 32: Points engine

**Goal:** Fair, cheat-resistant points, computed only on the server.

**Tasks**
1. **Ledger** (append-only): `point_events` (user, action, points, reference, created_at, unique
   per user + action + reference) and balances. Clients can never write points directly; awards
   come from triggers or SECURITY DEFINER RPCs with the Phase 27 rules.
2. **Earning actions** (per Q5, final values in `docs/points.md`):
   - **Kiosk-verified disposal**: after a kiosk result, the kiosk shows a one-time **claim QR**
     (short-lived, single use, bound to that scan). Scanning it with your phone awards points.
   - **Library learning**: first time reading each material group page, short quizzes built
     from library entries ("Which bin does a Pyrex dish go in?"), daily cap.
   - First scan of each item type ("discovery"), capped.
   - Library idea "done", capped. Feedback a reviewer **approves** (Phase 20).
3. **Anti-abuse**: caps, cooldowns, the duplicate guard, no points for anonymous or
   unconfirmed accounts, anomaly flags with an admin review queue and reversal events.
4. **Transparency**: a points history page and the rules page; toasts announced to screen readers.
5. Offline: claims and actions queue like scan logs; the server decides on sync.

**Exit criteria:** a scripted cheater (repeat scans, replayed claims, parallel requests) earns no more than the caps; every point is traceable.

---

## Phase 33: Badges, levels, leaderboards & rewards

**Goal:** Motivation that lasts, without shaming anyone.

**Tasks**
1. **Levels** from lifetime points, and **badges**, many from the library: e.g. "Plastics
   expert" (quiz on all resin codes), "Hazard handler" (battery + bulb + chemical done
   right), "All 16 materials", "7-day streak".
2. **Streaks** with a grace day.
3. **Leaderboards**: opt-in, per institution, weekly/monthly, top 10 + your rank; handle and
   avatar only; under-18s excluded; admins can hide abusive handles.
4. **Rewards**: institution-created rewards, redemption codes, admin fulfilment; points deducted
   by a ledger event; no cash value; terms page.
5. **Kiosk**: "Top recyclers this week" idle slide (opt-in users only) and the claim-QR prompt.

**Exit criteria:** leaderboards show only opted-in adults; a reward goes from created to fulfilled; balances reconcile with the ledger.

---

## Phase 34: Admin, analytics & evaluation for v2

**Goal:** Institutions can run it, and we can show whether it works.

**Tasks**
1. `/admin`: library usage (top items searched, "not found" searches → content gaps, chooser
   picks, ideas done), local rules and drop-offs, points by action, active players, flagged
   accounts, rewards, members and join codes.
2. **"Not found" loop**: searches with no result go to a content backlog that feeds Phase 29
   Wave 3.
3. **Evaluation** (if in the thesis): knowledge pre/post quiz on materials; contamination
   before vs after the library/points (Phase 25 audit + `pilot_report.py`); retention; SUS for
   the new screens.
4. Update the privacy notice, consent forms, RLS matrix and security checklist.
5. QA: unit, E2E (chooser, search, claim-QR flow, leaderboard privacy, rewards), axe, offline,
   and load on the points RPCs (busy canteen kiosk at lunch).

**Exit criteria:** all v2 checks green; evaluation results recorded.

---

## Phase 35: v2 release

**Goal:** Ship safely and reversibly.

**Tasks**
1. Feature flags per institution (library on for everyone; points opt-in per institution).
2. Migrations through `db.yml` (backward compatible, roll-forward only).
3. CHANGELOG `1.1.0` (library) and `2.0.0` (accounts + points), release checklist, rollback plan
   (turn off the flags first).
4. Staff guide: maintaining local rules and drop-offs, running a points programme, rewards,
   disputes.

**Exit criteria:** v2 live for at least one institution with points enabled; no P1 bugs open.

---

## Order, effort & dependencies

```
27 decisions ─┬─> 28 library data + pipeline ─> 29 content production ─> 30 library in app ──> v1.1
              └─> 31 accounts v2 ─> 32 points engine ─> 33 badges/leaderboards/rewards ─┐
                                    (32 also uses 30's "done" + quizzes)                 │
                                                       34 admin + evaluation ─> 35 v2.0 release
```

| Phase | Rough effort (team of 5, part-time) | Can start after |
|---|---|---|
| 27 | 1 week | now (decisions) |
| 28 | 1–2 weeks | 27 |
| 29 | **3–5 weeks** for 250 items (≈ 10–15 items per person per week incl. Filipino + review); ongoing after | 28 (Wave 1 can start on the sheet templates during 28) |
| 30 | 2–3 weeks | 28 (UI), 29 Wave 1 (real content) |
| 31 | 2 weeks | 27 (needs SMTP) |
| 32 | 2 weeks | 31, 30 |
| 33 | 2 weeks | 32 |
| 34 | 1–2 weeks + evaluation period | 30, 33 |
| 35 | 3–5 days | 34 |

Content is the critical path: start writing (Phase 29 Wave 1) as soon as the templates exist,
in parallel with building the pages.

## Risks

| Risk | Mitigation |
|---|---|
| **Wrong or unsafe disposal advice** at scale | Style guide; validator; peer + expert review for hazardous/medical/e-waste; sources on every fact; "last reviewed" dates; a "report a problem" link on each item |
| Rules differ by city | National default + LGU/institution overrides, labelled ("In Quezon City: …") |
| Content never gets finished | Waves with fixed targets; coverage report; "not found" searches drive Wave 3 |
| Library bloats the app | Per-group offline packs, lazy search index, budgets in Phase 30 |
| Points get farmed | No points for raw scans; kiosk claim QR; caps; server-only awarding; anomaly review |
| Gamification pushes speed over correctness | Points for kiosk-verified correct disposal, approved feedback and library learning, not volume |
| Privacy / minors on leaderboards | Opt-in, handle-only, under-18 excluded, privacy review in Phase 27 |
| Scope creep before the defense | Q9 with the adviser; ship the library as v1.1 first; points can be "future work" |
| Email deliverability | Custom SMTP with a proper sender domain (Phase 31) |
