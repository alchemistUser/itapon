# iTapon 5-minute demo guide

One presenter, one phone (or laptop) and, if possible, a second screen for the kiosk.
Live app: **itapon.vercel.app**

---

## Before the demo (do this the day before)

**Accounts and setup**
- [ ] Supabase → Authentication → Email: **Confirm email off** (otherwise sign-up fails).
- [ ] Create two demo accounts **at least 3 days before** (the leaderboard skips newer
      accounts):
  - **Admin**: made admin of a demo institution by the team ([runbook](system-documentation.md#12-common-operations-runbook)).
  - **Player**: joined the institution with its join code; has a handle, an adult birth year
    and the **public profile on**; has claimed a few missions so the leaderboard isn't empty.
- [ ] Kiosk device paired to the institution (`/kiosk` → **Get pairing code** → `/admin` →
      Kiosks).

**Devices**
- [ ] Open every page below once on each demo device. This caches the model and pages, so the
      demo works even if the Wi-Fi drops.
- [ ] On demo day, open **Missions** as the player and make sure one mission is **ready to
      claim** (e.g. scan 3 different items beforehand). Missions change daily.
- [ ] Volume up, silent mode off, screen brightness up, battery charged.

**Props on the table**
- [ ] A **plastic bottle**, an **AA battery**, a **banana peel** (or any fruit peel). Try each once beforehand on the demo device with good light and a plain background; the scanner skips blank walls and needs a clear view.

**Tabs to have open (in order)**
1. `/scan` (phone)
2. `/library`
3. `/missions` (signed in as the player)
4. `/kiosk` (second screen, already started)
5. `/admin` (signed in as the admin, on the laptop)

---

## The script (5:00)

### 0:00 – 0:30 · The problem and the idea
> "Filipinos often aren't sure which bin trash goes in, so recyclables get contaminated.
> iTapon recognises an item with your phone camera and tells you the right bin under RA 9003,
> in English or Filipino. No install, no account needed."

Show the home screen and the four bin colours: green, blue, black, red.

### 0:30 – 1:45 · Scan (the core feature)
1. **Scan** → hold up the **plastic bottle**.
2. Point out: **Recyclable** (blue bin), the instruction, "92% sure", and **Read aloud** (tap
   it).
   > "Recognition runs on the phone itself. The camera image never leaves the device."
3. Under the result, the library card points to the **Plastics** group with the tip "check the
   number in the triangle". Tap it to jump into the library.
   > "The camera knows it's plastic; the library tells you exactly which type and how to
   > prepare it."
4. Scan the **battery** → **Hazardous waste** (red bin). Here the card shows **"Which one is
   yours?"**: tap **AA or AAA battery**, then show **Where else it can go**.
5. Hold up the **banana peel** → **Biodegradable** (green bin).
   > "One item at a time: the scanner names what is in the frame."

### 1:45 – 2:30 · Disposal library
1. Open **Library**: 175 items in 16 materials, from plastics by resin code to e-waste and
   medicine.
2. Search **`#5`** → the PP items. Then search **`baterya`** (Filipino works).
3. Open an item: steps, **Don't**, hazard box, sources. Flip **English → Filipino**.
   > "Every entry cites RA 9003, DENR or Quezon City rules. The ones still waiting for our
   > team's review say 'Not reviewed yet'."

### 2:30 – 3:30 · Missions and points
1. **Missions** (signed in as the player): points, **level**, **streak**.
   > "Daily and weekly missions reward learning: scanning different items, reading the
   > library, quizzes."
2. Answer **Today's question** live (pick a bin).
3. Tap **Claim** on the ready mission → the points go up.
4. Scroll: **badges** and the **leaderboard** for the school.
   > "Fair play is enforced on the server: each mission pays once, caps per day, no points for
   > guests, and leaderboards are opt-in and adults only."

### 3:30 – 4:15 · Kiosk
Turn to the second screen (`/kiosk`) and hold up the **banana peel**.
- It shows **Biodegradable** (green) big and says it aloud: hands-free, for a canteen or lobby.
- Point out the **QR code** to the full entry, and (when idle) **Top recyclers this week**.
  > "The bin tiles follow the order of the real bins next to it."

### 4:15 – 4:45 · Admin dashboard
On the laptop, `/admin`:
- **Charts**: items per day by bin, top items, when people scan.
- **Members**: the join code, and the switch that pauses points.
- **Searches with no result**: what people looked for that the library doesn't have yet.
  > "Schools see their own totals, never personal details like emails."

### 4:45 – 5:00 · Close
> "iTapon works offline, is accessible, and respects the Data Privacy Act. Next: training our
> own model on Philippine waste, and the team's review of the library."

---

## If something goes wrong

| Problem | Do this |
|---|---|
| Camera won't start | Tap **Take a photo instead** and photograph the item, or open `/scan/result/plastic_bottle` |
| Wrong or unsure result | Say "it shows how sure it is"; hold the item closer, label side up; answer **No** to show feedback |
| No internet | Keep going: scanner, guide and library work offline (if opened beforehand) |
| Nothing to claim on Missions | Answer today's question and show the progress bars instead |
| Kiosk not available | Skip it; show `/kiosk` on the laptop for 10 seconds, or just describe it |
| Running late | Drop the admin section; always keep **Scan** and **Library** |

**Backup:** record a screen video of this script beforehand and play it if the devices fail.
