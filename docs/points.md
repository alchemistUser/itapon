# Points rules (D26)

Points come from **daily and weekly missions** done in the app. No kiosk or person has to
confirm anything. Points reward **learning and using iTapon correctly**; they don't prove that
an item was physically thrown away. Say so in the manuscript.

All rules are enforced on the server (`supabase/migrations/20261021180000_points.sql`). The app
only shows them.

## Missions

Everyone gets the **same** missions, picked from the date: 3 daily (reset at midnight, Manila
time) and 3 weekly (reset Monday). You can't reroll. Each mission pays **once** per day or week.
Press **Claim** once it's complete.

| Code | Period | Mission | Target | Points |
|---|---|---|---|---|
| `scan_kinds` | daily | Scan 3 different kinds of items | 3 kinds | 10 |
| `read_entry` | daily | Read a library entry you haven't read before | 1 | 10 |
| `daily_quiz` | daily | Answer today's quiz question correctly | 1 | 10 |
| `use_chooser` | daily | Use "Which one is yours?" after a scan | 1 | 10 |
| `plan_idea` | daily | Mark a reuse or reduce idea "I'll do this" | 1 | 10 |
| `all_bins` | weekly | Scan items for all 4 bins | 4 bins | 50 |
| `five_dailies` | weekly | Complete 5 daily missions | 5 | 50 |
| `group_quiz` | weekly | Pass a 5-question quiz on one material group (4 of 5 right) | 1 | 50 |
| `three_groups` | weekly | Read entries from 3 different material groups | 3 groups | 50 |
| `two_done` | weekly | Mark 2 ideas "Done it" | 2 | 50 |

**Caps:** at most **30 points a day** from daily missions and **150 a week** from weekly ones.
That's exactly what the missions pay, so the caps are a second safety net.

## What counts (anti-cheat)

- **Only signed-in accounts can claim** (not guests). A guest's progress carries over when they
  create an account, because it's the same user.
- **Scans:** only your own scans count. The main item must be at least 35% confident, scans must
  be at least 5 seconds apart, and at most 30 count per hour. Only **different** item kinds count
  for `scan_kinds`, and different bins for `all_bins`.
- **Honest limit:** scan results are made on the device, so a determined cheater can fake scans.
  The most that earns is the scan missions' points, which the caps already limit.
- **Scan bursts:** 10 or more scans within one minute are flagged for admins, and that day's scan
  missions can't be claimed.
- **Library activity** (entries read, "Which one is yours?", ideas) is recorded through a
  server function that checks the item exists. It is rate-limited to 300 actions an hour.
- **Quizzes:** answers are checked on the server and each question gets **one** attempt.
  Everyone gets the same daily question. Group quiz questions are picked per person and week.
- **Fake accounts:** sign-up has no email confirmation (D24), so extra accounts are possible.
  Points have no cash value, leaderboards (Phase 33) are per institution and opt-in, and
  institution admins can reverse points.
- **Reversals:** institution admins can reverse a member's points with a reason. The original
  event stays and a reversal event is added, so every point stays traceable.

## Data

| Table | What | Who reads it |
|---|---|---|
| `point_events` | award or reversal, mission, period, points, time | the owner; their institution's admins |
| `mission_activity` | read entry / chooser / idea plan / idea done, with item and time | the owner only |
| `quiz_answers` | question, answer, right or wrong, time | the owner only |
| `point_flags` | reason (e.g. scan burst), day | the owner's institution admins |

Deleting the account deletes all of it (cascade). These are listed in the privacy notice.

## Levels, streaks, badges and leaderboards (Phase 33)

**Levels** come from lifetime points (reversals count). The table is the same in the server
(`private.level_for`) and the app (`src/lib/progress.ts`).

| Level | Name | From |
|---|---|---|
| 1 | Seedling | 0 |
| 2 | Sprout | 50 |
| 3 | Sapling | 150 |
| 4 | Sorter | 300 |
| 5 | Recycler | 500 |
| 6 | Composter | 800 |
| 7 | Eco Guide | 1,200 |
| 8 | Eco Champion | 1,700 |
| 9 | Zero-Waste Hero | 2,300 |
| 10 | Earth Keeper | 3,000 |

**Streak:** the number of days in a row with at least one claimed mission. **One grace day**
per streak: missing a single day doesn't break it (the missed day doesn't count). The streak
is still alive if your last active day was yesterday, or the day before using the grace day.

**Badges** are checked on the server (`refresh_badges()`) and kept once earned:

| Badge | How |
|---|---|
| First points | Claim any mission |
| 3-day streak / 7-day streak | Reach the streak |
| Bin master | Claim "Scan items for all 4 bins" |
| Full week | Claim all 3 weekly missions in one week |
| Quiz whiz | Answer 10 daily questions correctly |
| Plastics expert | Pass the Plastics material quiz |
| Hazard handler | Read entries on batteries, lighting and household hazardous waste |
| All 16 materials | Read an entry in every material group |
| Idea doer | Mark 10 different ideas "Done it" |
| Recycler | Reach level 5 |

**Leaderboards** are per institution (weekly and monthly: top 10, plus your own rank). You
appear only if **all** of these are true:
- your profile is public (opt-in; only adults can turn it on, D22),
- you have a handle,
- you're a member of the institution,
- your account is at least 3 days old (against throwaway accounts),
- an admin hasn't hidden you.

Only the handle, avatar and points are shown, to members of the same institution and on its
kiosk's idle screen. Admins can hide abusive handles.

**Rewards:** badges and levels only (D26). Institution-run prizes aren't built. An institution
that wants them can run them outside the app, using the leaderboard.
