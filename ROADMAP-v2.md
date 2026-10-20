# iTapon v2 roadmap: suggestion library, accounts & points

Planned features on top of v1.0 ([ROADMAP.md](ROADMAP.md), Phases 1–26). **Nothing here is
built yet.** Phases continue the v1 numbering (27–34) and follow the same Definition of Done
(ROADMAP §6: tests, RLS checks, accessibility, docs).

| Feature | In one line |
|---|---|
| **Post-scan suggestion library** | After a scan, show what *else* the person can do with the item (reuse it, avoid it next time, where to drop it off, a quick fact), from a curated, bilingual library that can also be browsed. |
| **Account system v2** | Turn today's anonymous-first accounts into real profiles: a public handle, avatar, school/org membership and account settings, with the anonymous history carried over. |
| **Point system** | Reward good sorting habits with points, badges, streaks and opt-in leaderboards, with rewards an institution can offer. Points are awarded only by the server, with anti-cheat rules. |

## What already exists (reused, not rebuilt)

- **Content:** every item has `short_instruction`, `prep_steps`, `why_text`,
  `contamination_note`; 16 of 36 items already have a `reuse_tip` (Phase 10/14). The library
  grows from this.
- **Accounts:** anonymous by default, upgrade with email or Google, history, delete-my-data
  (Phase 16); preferences (Phase 17); roles user/kiosk/admin and institutions (Phases 18–19).
- **Kiosks** have their own identity and pairing (Phase 25), which makes kiosk-verified
  disposals possible.
- **RLS role matrix** (`supabase/tests/rls-roles.sql`, 80 checks) to extend for every new table.
- **Feedback & analytics** (Phases 19–20) to measure whether the features change behaviour.

## Decisions needed before Phase 28 (Phase 27 settles them)

| # | Question | Options | Recommendation |
|---|---|---|---|
| Q1 | What does "suggestion" cover? | reuse/upcycle · reduce/swap ("bring a tumbler") · where to drop off (junk shops, e-waste, hazardous) · quick facts · local campus info | all five as **suggestion types**, start with reuse + reduce + drop-off |
| Q2 | Who writes suggestions? | project team only · + institution admins (their campus only) · + users submit for review | team + institution admins for **local** ones; user submissions later |
| Q3 | Email for real accounts | custom SMTP (Resend/Brevo free) · Google-only sign-in · username + password | **custom SMTP + Google**: email sign-in needs SMTP (it was deferred in Phase 24) |
| Q4 | What earns points? | every scan · first scan of each item · confirmed disposal · kiosk-verified disposal · learning (quiz, guide) · helpful feedback | **not raw scans** (easy to farm). Kiosk-verified disposals + learning + reviewed feedback + suggestion actions, with caps |
| Q5 | Leaderboards | none · per institution · global | **opt-in, per institution, weekly**, handle only |
| Q6 | Rewards | badges only · institution prizes (merit, canteen voucher) · partner rewards | badges + **institution-managed** rewards with admin approval |
| Q7 | Minors | allow · parental consent · 18+ only | allow with an **age gate**: under-18s get no public leaderboard and a guardian notice (RA 10173) |
| Q8 | Thesis scope | v2 before the defense · after (v2 = "future work") | decide with the adviser: it changes Chapter 1 scope and needs its own evaluation |

---

## Phase 27: v2 scope, rules & design

**Goal:** Lock what we build and the rules for points, so later phases don't churn.

**Tasks**
1. Answer Q1–Q8 with the team and adviser, and record them as decisions D16+ in ROADMAP.md.
2. **Points economy spec** (`docs/points.md`): every earning action, its points, daily and
   weekly caps, cooldowns, what can't earn points, levels and thresholds, and how points
   expire (if at all). Simulate a heavy user and a cheater on paper.
3. **Suggestion types & style guide**: tone, length (≤ 140 characters on the result card),
   Filipino/English, a source rule for facts, and safety rules (no unsafe DIY with
   hazardous items such as batteries, bulbs or medicine).
4. **Figma**: post-scan suggestion card, library pages, profile, points toast, badges,
   leaderboard, rewards, admin screens.
5. **Privacy impact review** (RA 10173): new data (handle, avatar, points history,
   leaderboard), lawful basis, consent text, retention, and minors. Update the privacy notice
   draft.

**Deliverables:** decisions D16+, `docs/points.md`, suggestion style guide, Figma frames, privacy review.
**Exit criteria:** adviser sign-off on scope (Q8) and the points rules.

---

## Phase 28: Suggestion library: data & content

**Goal:** A curated, sourced, bilingual library that the app and the admin can manage without redeploying.

**Tasks**
1. **Schema** (migration): `suggestions` (id, type ∈ reuse | reduce | dropoff | fact | local,
   title/body EN + FIL, source, image optional, active, `institution_id` null = global),
   `item_suggestions` (class_key, suggestion_id, rank) so one suggestion can serve several
   items (e.g. "bring a tumbler" for cups and bottles), and `dropoff_points` (name, type
   e.g. e-waste / junk shop / hazardous, address, map link, hours, institution or LGU).
2. **RLS**: everyone reads active global suggestions; members read their institution's
   local ones; institution admins manage their own; global content stays project-team only
   (same rule as finding S1). Extend the role matrix.
3. **Content**: move the existing 16 `reuse_tip`s in; write at least **3 suggestions per
   detectable item** (69+) and 2 per category; Filipino review; sources for facts. Keep it in
   `supabase/content/` with the seed generator and CI `--check`, like v1 content.
4. **Admin authoring** on `/admin` (local suggestions and drop-off points: create, edit,
   preview, publish) with length checks and a "hazardous: no DIY" guard.
5. Offline: bundle the global library like the v1 content (Phase 21) so suggestions work in
   airplane mode.

**Deliverables:** migration + seed, content files, admin editor, RLS checks.
**Exit criteria:** every detectable item has ≥ 3 reviewed suggestions; admins can add a campus drop-off point that only their members see.

---

## Phase 29: Suggestion library: in the app

**Goal:** People see a useful next step right after scanning, and can browse ideas any time.

**Tasks**
1. **Post-scan card** under the result (phone sheet, desktop panel, kiosk): the top 1–2
   suggestions for the item (local first, then global), "More ideas" to the full list, and
   a **"I'll do this" / "Done it"** button (this feeds points in Phase 31 and analytics).
2. **Multi-item plan** (Phase 14): a suggestion per item, grouped by type.
3. **Library pages**: `/ideas` (browse by type and bin, search with the Bin Guide's fuzzy
   search), `/ideas/[id]`, item pages linking to their ideas, and a **drop-off finder**
   (list + map link, filtered by type such as e-waste or batteries).
4. **Kiosk**: one short suggestion on the result screen, read aloud after the bin (respects
   the sound setting), plus a QR to "more ideas" for the phone.
5. **Rotation & relevance**: don't repeat the same suggestion every time (per-device memory),
   and prefer types the user hasn't seen.
6. Accessibility (read-aloud includes the suggestion, Filipino), offline, analytics events
   ("shown", "opened", "done": no personal data, counted per suggestion).

**Deliverables:** suggestion card, `/ideas`, drop-off finder, kiosk integration, tests (unit, E2E, axe).
**Exit criteria:** suggestions appear on 100% of results for detectable items, work offline, and pass axe; `/admin` shows top suggestions by "done" rate.

---

## Phase 30: Account system v2

**Goal:** Real, safe accounts that points and leaderboards can rely on.

**Tasks**
1. **Email delivery**: set up custom SMTP (Q3) and branded sign-in emails (EN/FIL); keep
   Google sign-in. Email confirmation required for points-eligible accounts.
2. **Profile**: unique **handle** (validated, reserved words, profanity filter), avatar from
   a preset set (no photo uploads in v2), display preferences, and a public/private toggle.
3. **Institution membership**: join a school/org with a **join code** from its admin (same
   pattern as kiosk pairing), leave it, and admin member management (remove, roles).
4. **Age gate & consent**: birth year at sign-up; under-18s are private by default with no
   leaderboard and a guardian notice; consent records stored with version and date.
5. **Account lifecycle**: anonymous → full account keeps history and points (Phase 16
   linking), sign-out everywhere, **data export** (JSON/CSV of scans, points, profile; RA 10173
   portability), delete account (extends delete-my-data to profile, points and handle).
6. **Security**: rate limits on sign-in/sign-up (Supabase), handle-change cooldown, RLS for
   profiles (public fields readable, private fields owner-only), role-matrix checks for each.

**Deliverables:** SMTP, profile & settings pages, join codes, age gate, export/delete, migrations + RLS tests.
**Exit criteria:** an anonymous user upgrades without losing data; export and delete are verified; no private profile field is readable by others (matrix).

---

## Phase 31: Points engine

**Goal:** Fair, cheat-resistant points, computed only on the server.

**Tasks**
1. **Ledger** (append-only): `point_events` (user, action, points, reference id, created_at,
   unique per user + action + reference so retries can't double-award), and a
   `point_balances` view/materialized table. Clients can never insert or update directly;
   awards come from triggers or SECURITY DEFINER RPCs with the rules from Phase 27.
2. **Earning actions** (per Q4, final values in `docs/points.md`):
   - **Kiosk-verified disposal**: after a kiosk result, the kiosk shows a one-time **claim QR**
     (short-lived, single use, bound to that scan). Scanning it with your phone awards the points.
     This is the strongest signal, because it needs you physically at the bin.
   - First scan of each item type ("discovery"), a few per day.
   - Suggestion "done" (Phase 29), capped per day.
   - Feedback that a reviewer **approves** (Phase 20).
   - Learning: short bin quizzes built from the content (correct answers, daily cap).
3. **Anti-abuse**: daily and weekly caps, cooldowns, the duplicate guard (the same item
   can't score twice in a row), no points for anonymous or unconfirmed accounts, anomaly flags
   (e.g. > N claims per hour) with an admin review queue and reversal events (never deletions).
4. **Transparency**: a points history page ("+10 kiosk disposal, Canteen, 09:12") and
   the rules page. Points toasts are announced to screen readers.
5. Offline: claim tokens and actions queue like scan logs (Phase 21); the server decides on
   sync (expired tokens are refused with a clear message).

**Deliverables:** ledger + rules + RPCs, claim QR on kiosks, history page, abuse review, unit tests for every rule, role-matrix checks (no client can mint points).
**Exit criteria:** a scripted "cheater" (repeat scans, replayed claims, parallel requests) earns no more than the caps; every point is traceable to an event.

---

## Phase 32: Badges, levels, leaderboards & rewards

**Goal:** Motivation that lasts beyond the first week, without shaming anyone.

**Tasks**
1. **Levels** from lifetime points (named after bins or eco-ranks), and **badges** (first
   hazardous item handled right, 7-day streak, all four bins, 10 suggestions done, …) shown
   on the profile.
2. **Streaks** (days with at least one points action), with a grace day so one missed day
   doesn't wipe progress.
3. **Leaderboards**: opt-in only, per institution, weekly and monthly, top 10 plus "your
   rank". Handle and avatar only; under-18s excluded (Q7); admins can hide abusive handles.
4. **Rewards** (Q6): institution admins create rewards (name, cost, stock, dates); users
   redeem, which generates a one-time code; admins mark it fulfilled. Points are deducted
   by a ledger event. No cash value; terms page.
5. **Kiosk**: "Top recyclers this week" idle-screen slide (opt-in users only) and the claim
   QR prompt.

**Deliverables:** badges/levels/streaks, leaderboards, rewards + redemption, kiosk slides, tests.
**Exit criteria:** leaderboards show only opted-in adults; a reward can be created, redeemed and fulfilled end to end; points balances reconcile with the ledger.

---

## Phase 33: Admin, analytics & evaluation for v2

**Goal:** Institutions can run the programme, and we can show whether it works.

**Tasks**
1. `/admin` additions: suggestion performance (shown → done), points issued by action,
   active players, flagged accounts, rewards stock and redemptions, members and join codes.
2. **Evaluation design** (needed if v2 goes in the thesis): compare contamination and
   correct-disposal rates **before vs with points**, or between two locations (one with
   points, one without), using the Phase 25 audit and `pilot_report.py` (add a points
   section). Also measure retention (7/30-day return rate) and SUS for the new screens.
3. Update the privacy notice, consent forms and RLS matrix; run the security checklist
   (docs/security.md) for the new tables, RPCs and claim tokens.
4. QA: unit, E2E (claim QR flow, leaderboard privacy, rewards), axe, offline, load on the
   points RPCs (a busy canteen kiosk at lunch).

**Deliverables:** admin screens, evaluation protocol + results, updated privacy/security docs, test suites.
**Exit criteria:** all v2 checks green; evaluation results recorded.

---

## Phase 34: v2 release

**Goal:** Ship safely and reversibly.

**Tasks**
1. Feature flags per institution (suggestions on by default; points opt-in per institution).
2. Migrations through `db.yml` (backward compatible, roll-forward only).
3. CHANGELOG `2.0.0`, release checklist, rollback plan (turn off the flags first).
4. Staff guide: how to run a points programme, set rewards and handle disputes.

**Exit criteria:** v2 live for at least one institution with points enabled; no P1 bugs open.

---

## Order, effort & dependencies

```
27 decisions ─┬─> 28 library data ─> 29 library UI ──────────────┐
              └─> 30 accounts v2 ─> 31 points engine ─> 32 badges/leaderboards/rewards ─┤
                                                                  33 admin + evaluation ─> 34 release
```

| Phase | Rough effort (team of 5, part-time) | Can start after |
|---|---|---|
| 27 | 1 week | now (decisions) |
| 28 | 1–2 weeks (mostly content writing) | 27 |
| 29 | 1–2 weeks | 28 |
| 30 | 2 weeks | 27 (needs SMTP) |
| 31 | 2 weeks | 30, and 29 for "done" points |
| 32 | 2 weeks | 31 |
| 33 | 1–2 weeks + evaluation period | 29, 32 |
| 34 | 3–5 days | 33 |

The **suggestion library (27 → 29)** doesn't need accounts or points, so it can ship first
as its own release (v1.1), e.g. during or right after the pilot.

## Risks

| Risk | Mitigation |
|---|---|
| Points get farmed (repeat scans, fake claims) | No points for raw scans; kiosk claim QR; caps; server-only awarding; anomaly review (Phase 31) |
| Gamification pushes speed over correctness | Points for *correct* disposal (kiosk-verified) and approved feedback, not volume; quizzes reward knowledge |
| Privacy / minors on leaderboards | Opt-in, handle-only, under-18 excluded, privacy review in Phase 27 |
| Scope creep before the defense | Q8 with the adviser. Ship the library as v1.1 first; points can be "future work" |
| Email deliverability | Custom SMTP with a proper sender domain (Phase 30) |
| Suggestion quality / unsafe DIY | Style guide + review; no DIY for hazardous items; sources for facts |
