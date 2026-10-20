# Accounts v2: privacy review (draft)

**Status:** DRAFT by Claude, 2026-10-21. The team and the adviser must approve it before
Phase 31 goes live (see "Approval" at the end). It follows the shape of a privacy impact
assessment under RA 10173 (Data Privacy Act of 2012) and covers only what Phase 31 adds. Points,
leaderboards and rewards (Phases 32–35) need their own review.

Decisions this builds on: D20 (build now, future work in the manuscript), D22 (age gate), D23
(one rotatable join code per institution) and D24 (email + password, no emails sent; replaces the
Brevo part of D21).

## 1. What changes for users

Today anyone can use iTapon without an account. An anonymous account id is created on the
first scan, and an email can be attached to keep history. Phase 31 adds an optional **profile**
(handle, preset avatar, public/private), a **birth year** (age gate), **consent records**,
**joining an institution with a code**, **export** of your data and **deleting the whole
account**.

Scanning and the Bin Guide stay available **without** an account and without any of the new
fields. **Since Phase 33**, a public profile (opt-in, adults only) shows its handle, avatar and
period points on the leaderboard of its own institution, to that institution's members and on
its kiosk's idle screen. Nothing else is shown to other users.

## 2. Data inventory (new or changed)

| Data | Where | Why (purpose) | Required? | Who can read it | Kept until |
|---|---|---|---|---|---|
| **Handle** (3–20 chars, a–z, 0–9, _) | `profiles.handle` | Name shown on future leaderboards instead of a real name | Optional (needed later for leaderboards) | You; your institution's admins; others only if your profile is public **and** you're 18+ | Account deleted |
| **Handle changed at** | `profiles.handle_changed_at` | 30-day cooldown against impersonation and squatting | Automatic | You | Account deleted |
| **Avatar** (one of a preset set, e.g. `leaf-3`) | `profiles.avatar` | Visual identity without photo uploads | Optional | Same as handle | Account deleted |
| **Public profile toggle** | `profiles.is_public` (default **off**) | Lets adults choose to show handle and avatar | Optional | You | Account deleted |
| **Birth year** (not the full date) | `profile_private.birth_year` (owner-only table) | Age gate (D22): under-18s are kept private | Asked once at sign-up; can be skipped (then treated as under 18) | You; the server's age check | Account deleted |
| **Consent records** (kind, version, date) | `consents` | Proof of what you agreed to and when (privacy notice, terms, guardian notice) | Automatic when you agree | You (and the project team for audits) | Account deleted |
| **Institution membership** (institution, joined at) | `profiles.institution_id`, `profiles.institution_joined_at` | Institution totals and admin dashboards (existing purpose) | Optional; you join with a code | You; that institution's admins | You leave, an admin removes you, or the account is deleted |
| **Join code** (8 characters) | `institutions.join_code` | Lets members join without an admin typing emails | Per institution | That institution's admins and members | Rotated or institution removed |
| **Email** (existing) | Supabase Auth | Sign-in, account recovery | Only for full accounts | You; the project team; **never** shown to admins | Account deleted |
| **Password** | Supabase Auth (stored only as a salted hash) | Sign-in for full accounts (D24: no emails are sent) | Only for full accounts | Nobody, not even the team, can read it | Account deleted |
| **Sign-in emails** | not used in the prototype (D24) | Would send confirmation and reset links via Brevo | — | — | — |

**Added by Phase 32 (points, D26):** `mission_activity` (library entries opened, ideas marked;
owner only), `quiz_answers` (owner only), `point_events` (owner and their institution's admins)
and `point_flags` (scan bursts; admins). See [docs/points.md](../points.md). All are deleted with
the account.

**Not collected:** real name (the existing optional `display_name` stays optional), full date
of birth, photos of people, location, contacts, phone number or school ID numbers.

## 3. Lawful basis (RA 10173, Sec. 12)

- **Account, profile, membership, export, delete:** processing the user asked for, to provide
  the service (Sec. 12(b)). Every field above is optional except what sign-in needs.
- **Consent records:** kept to show compliance (Sec. 12(c)/(b)).
- **Birth year:** asked to protect minors. It is used **only** to decide whether the account
  is under 18. It is never shown to anyone, including admins.
- **Shared photos:** unchanged, separate consent per photo (existing notice).

No data is sold or used for advertising. Supabase and Vercel are processors (no email provider is
used in the prototype, D24). **To confirm (team):** that their terms cover processing for a student project, and whether a
data sharing or processing agreement is needed. Note this in the manuscript's ethics section.

## 4. Minors (D22)

- At sign-up we ask for the **birth year** only. **Conservative rule:** someone born in year Y
  counts as an adult only from 1 January of Y+19. A person turning 18 this year is still
  treated as under 18 until the next year, because one year can't tell 17 from 18.
- Skipping the question means the account is **treated as under 18**.
- Under-18 accounts: profile is **always private** (the toggle is locked), no leaderboards
  (Phase 34), and a **guardian notice** is shown and recorded as a consent row
  (`guardian_notice`). **To confirm with the adviser:** whether pilot sites with minors need
  written guardian consent (the paper form in `docs/pilot/consent.md` already has a guardian
  line).
- No birth year is ever exported to an institution or shown on screens.

## 5. Institution membership (D23)

- Joining uses the institution's **standing code**. Admins can **rotate** it if it leaks; old
  codes stop working, and current members stay.
- Admins see members as **handle or display name, role and date joined**: never email, birth
  year or consent records. Admins can **remove** a member. Members can **leave** at any time.
- Anonymous accounts (no email) may join too, so pilot participants without email still count
  in their institution's totals. Their scans are already visible to that institution's admins
  as today (existing notice).
- Join attempts are rate-limited so codes can't be guessed: each code is 8 random characters
  from a 32-character alphabet (no 0/O or 1/I), and the server refuses after 10 failed tries
  per account per hour.

## 6. Your rights

| Right (RA 10173) | How |
|---|---|
| Be informed | Updated `/privacy` notice; the profile and age screens say why each field is asked |
| Access / portability | **Account → Export my data**: JSON (everything) and CSV (scans). Generated in the browser from your own rows |
| Correct | Edit the handle (30-day cooldown), avatar, public toggle and display name. Birth year can be corrected **once** without help (typos); after that, ask the team |
| Erase / block | **Delete my data** (scans, feedback, photos: existing) and the new **Delete my account** (everything above plus the sign-in identity); **leave institution** |
| Object | Keep the profile private; don't join an institution; use the app without an account |

Deletion is immediate in the database. Database backups on the Supabase free plan are short
and not under our control; say so in the notice.

## 7. Security measures

- RLS: profile rows stay readable only by the owner and that institution's admins (as today);
  admins see handle, avatar and membership columns. **Birth year lives in a separate
  owner-only table** (`profile_private`), so no admin policy reaches it; consents are owner-only
  too. The only thing shown to other users is the Phase 33 leaderboard
  (`institution_leaderboard()`): handle, avatar and points of public, adult members of the
  caller's own institution whose account is at least 3 days old and not hidden by an admin.
- Columns users can't write themselves: `role`, `institution_id` (only via join/leave
  functions) and `handle_changed_at`. A trigger sets them.
- Handle rules on the server: format, reserved words (admin, itapon, tip, support, …) and a
  blocklist (EN/FIL/Taglish profanity, supplied by the team).
- Sign-in, sign-up and email rate limits in Supabase Auth; "Sign out everywhere" revokes all
  refresh tokens.
- New role-matrix checks (`supabase/tests/rls-roles.sql`) for every new column, view and function.

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| A handle reveals a real name or student number | Help text: "Don't use your real name or student number"; blocklist; private by default |
| Minors exposed on a leaderboard | Conservative age rule, locked private profile, no leaderboard for under-18s |
| Join code shared outside the class | Rotation; admins can remove members; membership gives no access to others' data |
| Handle squatting or impersonation | Reserved words, 30-day change cooldown, admins report to the team |
| Export file left on a shared device | Download happens only on request; the notice warns about shared devices |
| Forgotten passwords with no reset email (D24) | The team resets them in the Supabase dashboard after checking the person; the form says so |
| Handles can be enumerated through the "is it available?" check | Returns only true/false and is rate-limited |

## 9. Notice and form changes

- `/privacy`: add the new data, the minors rule, membership and admin visibility, export and
  account deletion, and that passwords are stored hashed and no emails are sent. Update the date at the top.
- `docs/pilot/consent.md`: add one line saying a profile is optional and that minors' profiles
  are private.
- Sign-up screen: a short "why we ask" line under the birth year and handle fields.

## Approval

- [ ] Team read-through (accuracy against the build)
- [ ] Adviser approval (especially §4 Minors and §3 processors)
- [ ] Profanity and reserved-word list supplied by the team (§7)
- [ ] Privacy notice updated and dated (§9)
