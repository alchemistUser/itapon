# Phase 31 (Account system v2): readiness

Prepared 2026-10-21, before Phase 31 starts. The phase plan is in
[ROADMAP-v2.md](../../ROADMAP-v2.md#phase-31-account-system-v2). Answers to the decisions
below get recorded in ROADMAP.md as D20 onwards.

## What already exists (v1)

| Area | Today | Phase 31 adds |
|---|---|---|
| Sign-in | Anonymous user on first scan; "Save your history" attaches an email to the same user (`updateUser`); email one-time links; Google (`linkIdentity` keeps the anonymous history) | Custom SMTP and branded EN/FIL emails; confirmed email for points-eligible accounts |
| Profile | `profiles`: display_name, role, institution_id, prefs | Unique **handle**, preset avatar, public/private toggle, birth year, consent records |
| Institution | Set by the project team or an admin; kiosks pair with a one-time code (`kiosk_request_pairing`) | Members **join with a code** (same pattern as kiosk pairing), can leave; admins manage members |
| Your data | `delete_my_data()` removes scans, feedback and shared photos | **Export** (JSON/CSV, RA 10173 portability); full **account delete**; sign out everywhere |
| Security | RLS role matrix 112/112; Supabase auth rate limits in `config.toml` | Handle-change cooldown; public vs owner-only profile fields; new matrix checks |

Email sign-in in production waits on SMTP: Phase 24 skipped it. Supabase's built-in mailer is
for testing only. It sends to the project team's own addresses at a very low hourly limit.

## Decisions needed before building

1. **Scope (D16).** D16 put accounts and points out of the thesis as "future work". Starting
   Phase 31 means either changing D16 (with the adviser's OK), or building it after the
   defense and keeping it out of the manuscript.
2. **Email provider (Q4).** Recommended: custom SMTP on a free plan, plus Google.
   - **Brevo**: has a free SMTP plan and can send from one verified sender address, so no
     domain is needed.
   - **Resend**: has a free plan but needs a domain you control to email anyone.

   Check both pricing pages for today's limits. Whoever owns the account puts the SMTP host,
   user and password **only** in Supabase → Authentication → SMTP settings, never in chat or
   code.
3. **Minors (Q8).** Recommended: an age gate with birth year only. Under-18s are private by
   default, with no leaderboard and a guardian notice. Confirm with the adviser, since TIP
   students are mostly 18+ but pilot sites may include minors.
4. **Handles.** Who supplies the reserved-word and profanity list for English, Filipino and
   Taglish (the team), and whether handles are shown anywhere before points (Phase 32+).

## Prerequisites to do first

- [ ] **Accounts privacy review** (deferred from Phase 27). List the new fields (handle, avatar,
      birth year, consent records, memberships) with purpose, retention and who can read them.
      Update the privacy notice and the consent forms. Claude can draft it; the team and adviser
      approve it.
- [ ] **SMTP set up and tested.** One test sign-in email arrives at a non-team address and isn't
      in spam. Then raise `auth.rate_limit.email_sent` from the built-in default.
- [ ] **Email templates.** Branded confirmation, magic-link and email-change templates in EN and
      FIL (Supabase → Authentication → Email templates), then copy them into `supabase/templates/`
      so they're versioned.
- [ ] **Join codes for institutions.** Decide: one standing code per institution that an admin can
      rotate, or one-time codes like kiosk pairing. One standing code is simpler for classes.
- [ ] **Library publishing** (Phase 29 review) can run in parallel. It doesn't block Phase 31.

## Risks to watch

- **Upgrade without data loss**: the anonymous user must become the full user. This is the
  same user id via `updateUser` / `linkIdentity`, which v1 already does. An email that already
  has an account can't be linked; v1 shows an error. Phase 31 needs a merge path or a clear
  message.
- **Email deliverability**: free senders without a domain can land in spam. Test with Gmail and
  school addresses.
- **Ages and consent**: store only the birth year (not the full date) and record the consent
  version and date (RA 10173).
