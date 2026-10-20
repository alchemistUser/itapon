# Staff guide (iTapon v2)

For **institution admins**: the school or office staff who run iTapon for their members.
Everything here is on **`/admin`** once you sign in with an admin account. The iTapon project
team makes someone an admin. Ask them if you don't see the dashboard.

## 1. Members and the join code

- **Members** panel → your **join code** (e.g. `7KQ2-MXPA`). Share it with a class, on a
  poster or in a group chat. Members enter it on **Account → School or office**.
- Members' scans then count in your dashboard. You see each member's handle or display name and
  the date they joined. You **never** see their email, birth year or consent records.
- **Code leaked?** Press **New code**. The old one stops working at once; current members stay.
- **Remove** a member with the person icon. Their own data stays with them.
- **Kiosks** are registered under Devices (pair with the 6-digit code shown on the kiosk).

## 2. Campus notes and drop-off points

**Campus notes and drop-off points** panel. Members see them labelled "Your campus" on library
pages, the scan card and the drop-off finder.

- **Note:** choose an item (e.g. "AA or AAA battery") or a whole material (e.g. "Batteries"),
  write one or two sentences in English (Filipino optional) and **Add note**. It starts as a
  **draft**; press **Publish** when it's right.
- **Drop-off point:** name, type (e-waste, hazardous waste, junk shop, …), where (building,
  floor), an optional `https://` map link and hours. Publish it when ready.
- **Only add places you have checked.** Unpublish or delete anything that changes.

## 3. Running a points programme

Points come from daily and weekly missions (scan different items, read the library, quizzes,
"Which one is yours?", ideas). Rules: [points.md](points.md).

- **Turn points on or off** for your members: the **Points and leaderboard for members** switch
  in the Members panel. When it's off, missions and quizzes still work, but claims and the
  leaderboard pause.
- **Leaderboard:** weekly and monthly, top 10, for your members only. People appear only if
  they turned on a public profile (adults only), have a handle, and their account is at least
  3 days old. The kiosk shows the top 5 this week when idle.
- **Abusive handle?** Hide it from the leaderboard with the eye icon in the Members panel, and
  ask the person to change it (Account → Public profile). Tell the iTapon team if it's serious.
- **Prizes** aren't built into iTapon (D26). If your school or office wants them, run them
  yourselves using the leaderboard, with your own rules. Points have no cash value.

## 4. Disputes and cheating

- The **Points** panel shows **flags** (e.g. many scans in one minute). Scan missions are
  automatically paused for that person that day.
- **Reverse** an award with the undo icon and a short reason. The award stays in the history
  next to the reversal, so every point remains traceable. The member sees "Reversed: …" in
  their points history.
- If someone says their points are wrong, check their recent awards in the Points panel before
  reversing anything.

## 5. Watching how it goes

- **Missions and search insights:** active players, points, how many of the previous period's
  players came back, and missions claimed.
- **Searches with no result:** what people looked for and didn't find. Download the CSV and
  send it to the iTapon team so they can add those items to the library.
- **Disposal library:** the most viewed entries, "Which one?" use and ideas done.

## 6. The knowledge test (evaluation)

Only if your site takes part in the study ([pilot/](pilot/README.md)):
1. Sign in with your admin account on the test device and open **`/evaluate`**.
2. Each participant enters their code (e.g. `P07`), chooses **Before (pre)** or
   **After (post)** and answers 12 questions. No answers are shown.
3. Results appear in the **Knowledge test** panel. Download `knowledge.csv` for the report.

## Getting help

Password forgotten: the iTapon team resets it in Supabase (there are no reset emails, D24).
Anything else: the project's GitHub page (no personal details there; ask for a private contact).
