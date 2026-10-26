# iTapon user manual

**Version 2.0.0 · October 2026 · <https://itapon.vercel.app>**

iTapon tells you which bin your trash goes in. Point your phone's camera at an item and iTapon
shows the bin, reads it aloud, and explains how to prepare it. It follows the Philippine
Ecological Solid Waste Management Act (RA 9003):

| Bin | Colour | What goes in |
|---|---|---|
| **Biodegradable** | green | food scraps, fruit peels, leaves, used tissue |
| **Recyclable** | blue | clean plastic bottles, cans, glass, clean paper and cardboard |
| **Residual** | black | mixed or soiled packaging, styrofoam, sachets, sanitary waste |
| **Hazardous** | red | batteries, broken bulbs, chemicals, expired medicine, e-waste |

> Local rules can differ by city or barangay. When they do, follow your barangay or LGU.

---

## Who this manual is for

| You are… | Read |
|---|---|
| Anyone using iTapon (no account needed) | [Part 1](#part-1-everyday-use) |
| Someone who wants to keep their scans or earn points | [Part 2](#part-2-your-account) and [Part 3](#part-3-missions-and-points) |
| A student or employee whose school or office uses iTapon | Parts 1–3, especially [joining your school or office](#24-join-your-school-or-office) |
| Someone using a kiosk next to the bins | [Part 4](#part-4-using-a-kiosk) |
| Staff who set up a kiosk | [Part 5](#part-5-setting-up-a-kiosk-staff) |
| An institution admin | [Part 6](#part-6-institution-admins) |
| A facilitator running the study | [Part 7](#part-7-facilitators-pilot-and-knowledge-test) |
| The iTapon project team | [Part 8](#part-8-project-team-tasks) |

Help: [Troubleshooting](#troubleshooting) · [FAQ](#frequently-asked-questions) · [Glossary](#glossary)

---

## Part 1: Everyday use

### 1.1 Open iTapon

1. Open **itapon.vercel.app** in Chrome, Safari, Edge or Firefox on your phone, tablet or
   computer.
2. Optional: tap **Add to Home Screen** when iTapon offers it (or use your browser's
   *Install* / *Add to Home Screen* menu). It then opens like an app and works offline.
3. The bottom bar on phones (top bar on bigger screens) has **Scan**, **Guide**, **Missions**
   and **History**. To reach **Account**, open **History** and tap **Account** at the top right.

You don't need an account. iTapon quietly creates a private guest session the first time you
scan, so your scans are saved on this device.

### 1.2 Scan an item

1. Tap **Scan**. The first time, your browser asks to use the camera: choose **Allow**.
2. The first scan downloads the scanner (about 9 MB) and shows a warming-up screen. After that
   it starts quickly, even offline.
3. Hold **one item** in the frame, about 30–50 cm away, in good light. Hold it steady.
4. When iTapon is sure, it locks the result:
   - the **bin** (name and colour),
   - a short **instruction** (e.g. "Empty it, remove the cap, and flatten it"),
   - how sure it is (e.g. "92% sure").

**Buttons on the scanner**
- **Torch** (flash) on/off, and **Switch camera** (front/back).
- **Take a photo instead**: if the live camera doesn't work, take or upload a photo.
- **Read aloud**: hear the result. To hear every result automatically, turn on *Read results
  aloud automatically* under **Account → Preferences**.
- **Scan again / Next Scan**: start over.

**When iTapon isn't sure**, it says "We think this is…" with the percentage and what else it
could be. Check the **Bin Guide** if in doubt.

**Several items at once?** Show **one item at a time**. iTapon names what it sees in the whole
photo, so a mix of items can give a wrong answer. (If the main scanner can't load on your
device, iTapon switches to a backup scanner that finds several items and offers **What to do
next**: a short plan for each item.)

### 1.3 "Which one is yours?" and the library card

Under many results you'll see a card:
- **Which one is yours?** Some items look alike to the camera. A plastic bottle could be a PET
  water bottle (#1), a cooking oil bottle or an HDPE shampoo bottle (#2). Tap the one you have.
  *Tip: check the number in the triangle on the bottom.* If your choice goes in a different bin,
  iTapon tells you.
- **Where else it can go**, e.g. "Junk shops buy this", e-waste drop-off, take-back.
- **A reuse or reduce idea**, with **I'll do this** and **Done it** buttons.
- **The local rule**, e.g. a Quezon City programme, and "Your campus" notes if your school or
  office added them.
- **How to dispose of…**: opens the full library entry.

### 1.4 "Was this right?"

Below a result you can answer **Yes** or **No**.
- **No** lets you pick the right item from a list.
- You may tick **"Share this photo anonymously to help improve iTapon"**. It's unticked by
  default and applies to that one photo only. Shared photos help train a better model; photos
  with people, faces, IDs or screens are rejected. Saying no never limits anything.

### 1.5 Bin Guide

**Guide** shows the four bins and the common items in each.
- **Search** in English, Filipino or Taglish (e.g. "bote", "baterya", "upos"). Typos are fine.
- Tap a bin to see every item with its instruction, a reuse tip and a cleanliness note.
- **Look up an item by material** takes you into the disposal library.

### 1.6 Disposal library

**Guide → Disposal library**, or go to `/library`: 175 specific items in 16 material groups
(plastics, paper, metals, glass, ceramics, textiles, e-waste, batteries, lighting, organics,
wood, rubber, composites, medical, household hazardous, bulky).

**Search tips**
- Item names and brands: "shampoo bottle", "power bank", "tetra pack".
- Filipino: "mantika", "baterya", "kutson".
- **Plastic codes:** "#5", "5", "PP", "PET", "HDPE". Plastics usually have a number in a triangle
  on the bottom.
- Spelled it wrong? iTapon suggests **Did you mean…?**

**On an item page**
- The bin, the item's name in English and Filipino, and the resin number for plastics.
- **English | Filipino** switch and **Read aloud**.
- A **red warning box** for hazardous items: read it first.
- **How to prepare it** (steps), **Don't** (common mistakes), **Where else it can go**.
- **Local rules** (e.g. Quezon City) and "Your campus" notes.
- **Reuse and reduce** ideas with **I'll do this** / **Done it**.
- **Commonly confused with**: look-alikes that go in a different bin (e.g. a ceramic mug vs a
  drinking glass).
- **Sources**: the laws and guides the entry is based on.

> **"Not reviewed yet"** means the entry was drafted from official sources with AI help and
> the iTapon team hasn't checked it yet. If your barangay or city says otherwise, follow them.

### 1.7 Drop-off finder

**Library → Drop-off finder** lists places by type: **E-waste**, **Hazardous waste**,
**Junk shops**, **Health centre**, **Take-back** and **City programmes**. iTapon shows only
places someone has checked. If none are listed yet, it tells you what to do instead (e.g.
"ask your barangay about the next hazardous waste collection"). Call ahead: hours change.

### 1.8 History

**History** shows your scans by day: item, bin, time. A guest's history stays on that device
and browser. To keep it and see it anywhere, create an account ([Part 2](#part-2-your-account)).

### 1.9 Using iTapon offline

After you've opened iTapon once online:
- the **Bin Guide**, **result pages** and the whole **disposal library** work offline,
- the **scanner** works offline (the model is saved on your device),
- scans made offline are saved and sent automatically when you're back online.

Missions, claims and account changes need a connection.

### 1.10 Preferences

**Account → Preferences**:
- **Read results aloud automatically**
- **Language:** English or Filipino (read aloud, and the library's language)
- **Text size:** Normal or Large

---

## Part 2: Your account

An account keeps your scans across devices and lets you earn points. iTapon doesn't send
emails, so there's no confirmation step. **Write down your password:** there are no reset
emails yet.

### 2.1 Create an account

1. **Account → Create an account**.
2. Enter your email and a password of **at least 8 characters** (tick *Show password* to check
   it).
3. Tap **Create account**. You're signed in right away, and the scans you made as a guest on
   this device **stay with you**.

### 2.2 Sign in on another device

**Account → Already have an account? Sign in**, then enter your email and password. Scans made
as a guest on *that* device before signing in don't move over.

**Forgot your password?** Ask the iTapon team (or your school or office admin, who contacts
the team) to reset it. They'll check it's really you first.

**Change password:** **Account → Profile → Change password**.

### 2.3 About you (age and consent)

**Account → About you**:
- **Birth year**: only to keep accounts of people under 18 private. Nobody sees it, not even
  admins. You can correct it **once**; after that, ask the team.
- Tick **I've read the privacy notice** and **Save**.
- If you're under 18 (or skip the birth year), your profile stays **private** and you won't
  appear on leaderboards. Show the **note for your parent or guardian** and tap **My guardian
  has seen this**.

> iTapon counts you as 18 from **1 January of the year after you turn 18**, because it only
> asks for the year.

### 2.4 Join your school or office

1. Get the **join code** from your school or office (e.g. `7KQ2-MXPA`).
2. **Account → School or office**, enter the code and tap **Join**.
3. Your scans now count in your institution's totals, and you can appear on its leaderboard.

Admins see your handle or display name and when you joined, but **never your email, birth
year or consent records**. Tap **Leave** any time. (Guests can join too.)

### 2.5 Public profile (handle and avatar)

**Account → Public profile**:
- **Handle**: 3–20 lowercase letters, numbers or `_`. Don't use your real name or student
  number. You can change it once every 30 days. Some words are reserved or not allowed.
- **Avatar**: pick one of the 12 icons (no photo uploads).
- **Show my handle and avatar publicly**: off by default, adults only. When on, your handle,
  avatar and points appear on your institution's leaderboard and its kiosk screen. Your badges,
  level and streak stay private.

### 2.6 Your data

**Account → Your data**:
- **Export my data (JSON)**: everything iTapon stores about you. **Scans as CSV**: your scans
  for a spreadsheet. The file is saved on this device, so don't leave it on a shared computer.
- **Delete my data**: deletes all your scans, feedback and shared photos. Your account stays.
- **Sign out everywhere**: signs you out on all devices.
- **Delete my account**: deletes your account and everything linked to it (scans, answers,
  photos, profile, points, badges, consent records). Type **DELETE** to confirm. This can't be
  undone. (Admin and kiosk accounts are removed by the team.)

More in the **Privacy notice** (`/privacy`): what's collected, why, who sees it, how long it's
kept, and your rights under RA 10173.

---

## Part 3: Missions and points

**Missions** turn good sorting habits into points. Points show what you've learned in the app.
They have no cash value.

### 3.1 How missions work

- Everyone gets the **same 3 missions a day** (reset at midnight, Philippine time) and **3 a
  week** (reset Monday).
- Each mission shows your progress, e.g. "2 / 3". When it's full, tap **Claim**. Each mission
  pays once.
- **Guests** can make progress. **Create an account to claim**; your progress stays.
- At most **30 points a day** and **150 a week**.

| Daily (10 points each) | Weekly (50 points each) |
|---|---|
| Scan 3 different kinds of items | Scan items for all 4 bins |
| Read a library entry you haven't read before | Complete 5 daily missions |
| Answer today's quiz question correctly | Pass a 5-question quiz on one material group |
| Use "Which one is yours?" after a scan | Read entries from 3 different material groups |
| Mark a reuse or reduce idea "I'll do this" | Mark 2 ideas "Done it" |

**What counts (fair play)**
- Only **different** items count. Scanning the same bottle again doesn't.
- Scans need to be a few seconds apart. **Ten or more scans in one minute** pauses that day's
  scan missions.
- Each quiz question gets **one** try.
- Admins can reverse points that were earned unfairly. You'll see it in your points history.

### 3.2 Quizzes

- **Today's question:** "Which bin does … go in?" Pick a bin. You'll see whether you were right
  and a **Why?** link to the entry.
- **Material quiz:** choose a material (e.g. Plastics), answer 5 questions, and get **4 right to
  pass**. You get one try per question each week, and you can try another material.

### 3.3 Level, streak, badges and leaderboard

- **Level:** from your lifetime points: 1 Seedling, 2 Sprout (50), 3 Sapling (150), 4 Sorter
  (300), 5 Recycler (500), 6 Composter (800), 7 Eco Guide (1,200), 8 Eco Champion (1,700),
  9 Zero-Waste Hero (2,300), 10 Earth Keeper (3,000).
- **Streak:** days in a row with a claimed mission. Missing **one** day doesn't break it.
- **Badges:** 11 to collect, from *First points* to *All 16 materials*. Locked badges show how
  to earn them.
- **Leaderboard:** this week or this month, top 10 of your school or office, plus your own rank.
  To appear, you need all of these:
  - you joined your school or office,
  - you have a handle,
  - your profile is public (adults only),
  - your account is at least 3 days old.

**"Points are paused"** means the iTapon team or your school or office has paused points for a
while. You can still do missions and quizzes.

---

## Part 4: Using a kiosk

A kiosk is a screen with a camera next to the bins (e.g. in a canteen).

1. **Hold your item up to the camera.** No need to touch the screen.
2. The screen shows the **bin** in big colours, in the same order as the real bins, and says it
   aloud.
3. It may add one line, such as "Junk shops buy this" or a reuse idea, plus a **QR code**: scan
   it with your phone to open the full entry.
4. After a few seconds it's ready for the next item. Take your item out of the frame before
   scanning the next one.

When nobody is around, the kiosk shows "Hold your trash up to the camera" and, if your school
or office uses points, **Top recyclers this week**. Move in front of the camera to wake it.

---

## Part 5: Setting up a kiosk (staff)

You need a tablet or laptop with a camera, a stand near the bins, power and (ideally) Wi-Fi.
Detailed guide: [kiosk-setup.md](../docs/kiosk-setup.md).

1. Open **itapon.vercel.app/kiosk** on the device, ideally in its own browser profile.
2. **Pair it:** tap **Get pairing code**. A 6-digit code appears for 15 minutes. An admin
   enters it on **/admin → Kiosks**. The kiosk then shows its name.
3. Open **⚙ Kiosk settings** to choose the **Camera** and turn sound on or off.
4. Tap **Start kiosk** once. It goes full screen, turns on sound and keeps the screen awake.
   From then on it runs hands-free.
5. **Bin order:** on /admin, use the arrows under the kiosk to match the physical bins, then
   **Save bin order**. The kiosk picks it up on its next reload.

**Daily check:** the camera view is live; a test bottle locks and is read aloud; there's no
"Scanner offline" or "Camera not available" message. If there's a problem, open ⚙ and check
the camera, reload the page, and tap **Start kiosk** again. If the kiosk shows "Scanner offline.
Please use the bin labels", people can still use the colour labels on the bins.

---

## Part 6: Institution admins

You're an admin if the iTapon team gave your account the admin role for your school or office.
Open **/admin** (sign in first). A short version of this part is in
[staff-guide.md](../docs/staff-guide.md).

### 6.1 Dashboard

Pick a period (7, 30 or 90 days) and, optionally, a device or bin.
- **KPIs**, **Items per day by bin**, **Share by bin**, **Top items**, **When people scan**
  (a weekday × hour heatmap) and **By device**.
- **Model health:** average confidence, how often people said "No", model versions, and speed
  on real devices.
- **Export CSV** of the scans in the period.

### 6.2 Kiosks

Register a kiosk with its **pairing code** (or a kiosk account email), give it a **name** and
an optional **location**, set the physical **bins, left to right**, and see its **online hours**
and whether it's online now.

### 6.3 Feedback review

Answers to "Was this right?" from your institution's kiosks and members, with any shared
photos. For each, confirm the right item and press **Approve** (or **Save label** to change an
approved one), or **Reject** it, always rejecting photos that show people, faces, IDs or
screens. Approved answers with photos feed model retraining ([retraining.md](../docs/retraining.md)).

### 6.4 Disposal library and search insights

- **Disposal library:** the most viewed entries, how often "Which one?" was used, and ideas
  planned and done, for *Your institution* or *All users*.
- **Missions and search insights:** active players, points earned, how many of last period's
  players **came back**, players per day, and missions claimed.
- **Searches with no result:** what people looked for and didn't find. Download the **CSV** and
  send it to the iTapon team so they can add those items.

### 6.5 Members, join code and points switch

- **Join code:** share it with a class (e.g. on a poster). **Copy** it, or press **New code** if
  it leaks; the old code stops working and current members stay.
- **Members:** each member's handle or display name and join date. Use the **eye icon** to hide
  an abusive handle from the leaderboard, or the **person icon** to remove a member (their own
  data stays with them).
- **Points and leaderboard for members:** switch it off to pause claims and the leaderboard for
  your institution. Missions and quizzes keep working.

### 6.6 Points: flags and reversals

- **Flags:** members who scanned 10+ times in a minute. Their scan missions were already paused
  for that day.
- **Top members** and **recent awards**.
- **Reverse** an award with the undo icon and a short reason. The award stays in the history
  next to the reversal, so every point is traceable.

### 6.7 Campus notes and drop-off points

Your members see these labelled **"Your campus"** on library pages, the scan card and the
drop-off finder.
- **Add a note:** choose an item or a whole material, write it in English (Filipino optional),
  **Add note**, then **Publish**. Example: *"Bring dead batteries to the library e-waste box,
  2nd floor."*
- **Add a drop-off point:** name, type, where (building, floor), an optional `https://` map link
  and hours, then **Publish**.
- **Only add places you've checked.** Unpublish or delete anything that changes.

### 6.8 Running a points programme

- Points are on by default. Introduce missions in class and share the join code.
- **Prizes aren't built into iTapon.** If you want them, run them yourselves using the
  leaderboard, with your own written rules. Points have no cash value.
- **Disputes:** check the member's recent awards before reversing; always give a reason.

---

## Part 7: Facilitators (pilot and knowledge test)

The pilot kit is in [docs/pilot/](../docs/pilot/README.md): protocol, consent form, task sheet,
questionnaires (SUS, ISO/IEC 25010, v2 screens) and the bin contamination audit.

**Knowledge test (pre/post)**
1. Sign in with your institution's **admin account** on the test device, so results appear on
   your dashboard.
2. Open **/evaluate**.
3. Enter the participant code (**P07**, never a name), choose **Before (pre)** or **After
   (post)**, and let the participant answer the 12 "which bin?" questions. No answers are shown.
4. Tap **Submit**. The participant's score appears; tap **Next participant**.
5. Later: **/admin → Knowledge test** shows the means and gain. Download **knowledge.csv** into
   the data folder and run `pilot_report.py` for the Chapter 4 tables.

Each code can take one pre and one post test per institution.

---

## Part 8: Project team tasks

Technical details: [system-documentation.md](system-documentation.md) §12 (runbook).

| Task | Where |
|---|---|
| Make someone an institution admin | SQL editor (runbook) |
| Reset a forgotten password | Supabase → Authentication → Users |
| Review and publish library entries | `supabase/content/library/items/*.csv` → `build_library.py` → commit ([library/README.md](../docs/library/README.md)) |
| Add new entries from the "no result" backlog | same pipeline |
| Pause points for everyone | `update public.feature_flags set enabled = false where key = 'points';` |
| Release and rollback | [release.md](../docs/release.md) |

---

## Troubleshooting

| Problem | Try this |
|---|---|
| "Camera access is blocked" | Allow the camera in your browser's site settings (lock icon in the address bar), then reload. Or use **Take a photo instead**. |
| "Camera needs a secure connection" | Use the `https://` address. |
| "No camera available" / black preview | Close other apps using the camera; tap **Switch camera**; reload. |
| The scanner takes long to start | The first start downloads the model; wait on Wi-Fi. If it says *"The scanner is taking longer than usual"*, reload. |
| Wrong or unsure result | Move closer, add light, show one item at a time, show the label side. Answer **No** to help improve iTapon. Check the Bin Guide. |
| "Move closer or add more light" | The item is too small or dark in the frame. |
| Read aloud is silent | Turn up the volume and turn off silent mode. On iPhone, tap once on the page first. Filipino needs a Filipino voice installed; otherwise English is used. |
| My history disappeared | Guest history lives in one browser. Clearing site data or using private mode removes it. Create an account to keep it. |
| "That email already has an iTapon account" | Use **Sign in** instead. |
| "Wrong email or password" | Check both. Forgotten passwords are reset by the team. |
| "That code didn't match" | Check the join code with your admin; it may have been replaced. Too many wrong tries pauses joining for an hour. |
| I can't turn on the public profile | Add a birth year showing you're 18+ (see the age rule in 2.3). |
| I'm not on the leaderboard | You need: a joined institution, a handle, a public profile, an account at least 3 days old, and points this week or month. |
| "Claiming is paused" / "Points are paused" | Points are paused by the team or your institution. Missions still count. |
| "Scan missions are paused today" | 10+ scans within a minute. Scan missions resume tomorrow. |
| A page says "Not available offline" | Open it once while online; then it works offline. |

---

## Frequently asked questions

**Does iTapon upload my camera images?**
No. Recognition runs on your device. Only a single photo you choose to share is uploaded.

**Do I need an account?**
No. Scanning, the guide, the library and missions work as a guest. An account keeps your
scans everywhere and lets you claim points.

**Is the library always right?**
Entries are based on RA 9003, DENR/EMB rules and Quezon City ordinances, with sources listed.
Entries marked "Not reviewed yet" haven't been checked by the team. Your barangay or LGU's
rules come first.

**Why is a ceramic mug residual but a glass bottle recyclable?**
Ceramics don't melt with glass in recycling, so they're treated as residual.

**What does the number in the triangle mean?**
The plastic resin code. #1 PET and #2 HDPE are the easiest to recycle; #6 PS (styrofoam) usually
isn't. Search the code (e.g. "#5") in the library.

**Can I get prizes for points?**
Not from iTapon. Some schools or offices may run their own.

**Who can see my data?**
You. If you joined a school or office, its admins see its scans and your handle or display name.
Never your email, birth year or consent records. Details: `/privacy`.

---

## Glossary

| Term | Meaning |
|---|---|
| Biodegradable / *nabubulok* | Breaks down naturally: food, leaves, tissue (green bin) |
| Recyclable / *nare-recycle* | Can be made into new things when clean: bottles, cans, paper (blue bin) |
| Residual / *residwal* | Can't be composted or recycled here: sachets, styrofoam, soiled packaging (black bin) |
| Hazardous / *mapanganib* | Harmful to people or the environment: batteries, bulbs, chemicals, medicine (red bin or special collection) |
| E-waste | Anything with a plug, battery or circuit board |
| Resin code | The number (1–7) in the triangle on plastics |
| Junk shop | A shop that buys recyclables (bottles, cans, cardboard, scrap) |
| Take-back | A store or brand collecting its own used products |
| Join code | The 8-character code that adds you to a school or office in iTapon |
| Handle | Your public name for leaderboards (not your real name) |
| Mission | A small daily or weekly task that earns points |
| Kiosk | A screen with a camera next to the bins that tells people where items go |
| RA 9003 | Ecological Solid Waste Management Act of 2000 |
| RA 10173 | Data Privacy Act of 2012 |
