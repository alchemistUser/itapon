# iTapon: Product Specification (v1)

**Roadmap phase:** 1, Scope lock, taxonomy & success metrics
**Status:** DRAFT. Waiting for team and adviser sign-off (Section 9)
**Last updated:** 2026-10-17
**License:** AGPL-3.0 (decision D2)

This document freezes **what iTapon v1 detects, where each item goes, and how we will judge success**. Every later phase builds on it: dataset collection (Phase 3), annotation (Phase 4), the Supabase seed (Phase 10), the UI copy (Phases 13–15) and the evaluation (Phases 7, 23 and 25).

Once it is signed off, changes go through the change process in Section 10.

---

## 1. Product name & identity

| Item | Value |
|---|---|
| Product name | **iTapon** (decision D1) |
| Tagline (working) | "Scan it. Sort it right." |
| GitHub repo | `itapon` (public, AGPL-3.0) |
| Vercel project | `itapon` → `itapon.vercel.app` |
| Hugging Face model repo | `itapon-yolo` |
| Supabase projects | `itapon-dev`, `itapon-prod` |
| Figma | Replace every "HIWALAY" header/logo with "iTapon" |

---

## 2. Waste categories (bins)

iTapon uses four bins. They follow RA 9003 (Ecological Solid Waste Management Act of 2000), which requires source segregation into biodegradable, recyclable, residual and special wastes. iTapon labels RA 9003 "special waste" as **Hazardous** because ordinary users understand that word better.

| Key | Display name | Bin label | Colour token | Colour (Figma) | RA 9003 term | Bin Guide examples |
|---|---|---|---|---|---|---|
| `biodegradable` | Biodegradable | Green Bin | `bin-green` | Green | Biodegradable / compostable | Food scraps, fruit peels, leaves, used tissue paper |
| `recyclable` | Recyclable | Blue Bin | `bin-blue` | Blue | Recyclable | Plastic bottles, glass, metal, clean paper |
| `residual` | Residual | Black Bin | `bin-black` | Black | Residual | Mixed garbage, soiled packaging, sanitary waste |
| `hazardous` | Hazardous waste | Red Bin | `bin-red` | Red | Special waste | Chemicals, batteries, busted light bulbs, expired medicines |

Display order everywhere (bin row, guide, legends): **Biodegradable → Recyclable → Residual → Hazardous**, matching Figma. Kiosks can reorder the tiles to match the physical bins (Phase 18).

---

## 3. v1 detection classes (frozen list: 23 classes)

**Selection rules used:**
1. The item is common on a Philippine campus (canteen, classroom, office).
2. It is visually distinct enough for a camera to tell it apart from the others.
3. Enough instances can be collected (≥ 300 each, Phase 3).
4. It is either shown in the Figma/Lab 5.1 screens or is a top campus waste item.

### 3.1 Class list

| ID | `class_key` | Display name | Bin | In Figma/docs? |
|---|---|---|---|---|
| 0 | `plastic_bottle` | Plastic bottle | Recyclable | Bin Guide |
| 1 | `plastic_cup` | Plastic cup | Recyclable | History screen |
| 2 | `aluminum_can` | Aluminum can | Recyclable | Bin Guide ("metal") |
| 3 | `glass_bottle` | Glass bottle | Recyclable | Bin Guide ("glass") |
| 4 | `paper_bag` | Paper bag | Recyclable | Scan, Result, What to do next |
| 5 | `cardboard` | Cardboard | Recyclable | Campus common |
| 6 | `paper_sheet` | Paper | Recyclable | Bin Guide ("clean paper") |
| 7 | `banana_peel` | Banana peel | Biodegradable | History, What to do next |
| 8 | `food_scraps` | Food scraps | Biodegradable | Bin Guide |
| 9 | `leaves` | Leaves | Biodegradable | Bin Guide |
| 10 | `used_tissue` | Used tissue | Biodegradable | Bin Guide |
| 11 | `snack_wrapper` | Snack wrapper | Residual | What to do next |
| 12 | `styrofoam` | Styrofoam | Residual | Campus common |
| 13 | `plastic_utensil` | Plastic utensil | Residual | Campus common |
| 14 | `straw` | Straw | Residual | Bin Guide search hint |
| 15 | `tetra_pack` | Tetra Pak / juice carton | Residual | Campus common |
| 16 | `soiled_food_container` | Soiled food container | Residual | Bin Guide ("soiled packaging") |
| 17 | `sanitary_napkin` | Sanitary napkin | Residual | History, Bin Guide |
| 18 | `face_mask` | Face mask | Residual | Campus common |
| 19 | `battery` | Battery | Hazardous | History, What to do next |
| 20 | `light_bulb` | Light bulb | Hazardous | Bin Guide |
| 21 | `expired_medicine` | Medicine / blister pack | Hazardous | Bin Guide |
| 22 | `spray_can` | Spray / aerosol can | Hazardous | Bin Guide ("chemicals") |

**Per bin:** Recyclable 7 · Biodegradable 4 · Residual 8 · Hazardous 4

### 3.2 Changes from the roadmap's draft list

| Draft class | Decision | Reason |
|---|---|---|
| `candy_wrapper` | **Merged into `snack_wrapper`** | Same material (multi-layer film), same bin, looks similar. Separate classes would split the data and confuse the model for no UX gain. |
| `fruit_peel_other` | **Merged into `food_scraps`** | Too visually varied to learn as one class. Same bin. `banana_peel` stays separate because it is distinctive and shown in Figma. |
| `medicine_blister` / `expired_medicine` | **Merged as `expired_medicine`** | One hazardous class covering blister packs, pill bottles and sachets. |
| `tetra_pack` | **Moved Recyclable → Residual** | Multi-layer (paper + plastic + aluminium) cartons are not accepted by most junk shops and MRFs. The UI notes that some drop-off programs accept them (see R3). |
| `face_mask` | **Added** | Very common campus waste since 2020, and people often get it wrong. |

### 3.3 Not detected in v1 (Bin Guide only)

These items appear in the Bin Guide (searchable, with the correct bin) but the model will **not** detect them in v1. If one is scanned, the app shows the low-confidence / "not sure" flow and points to the Bin Guide.

Paper cups (poly-lined), cigarette butts, chopsticks/bamboo skewers, eggshells, coffee grounds, plastic sachets (shampoo, coffee), rubber bands, e-waste (phones, cables, chargers), paint cans, broken glass, diapers, pens, ink cartridges.

Adding any of these to detection is a **v2** decision (Section 10).

### 3.4 Special classes and non-classes

| Case | Handling |
|---|---|
| Background / no item | No class. Use **hard-negative images** (empty tables, hands, bins) during training (Phase 6). |
| Unknown item | No class. If no detection reaches the threshold, show "Not sure, try again or check the Bin Guide." |
| Person / face in frame | Not a class. Faces must not appear in training data (Phase 3 privacy rule). |

---

## 4. Class → bin mapping, instructions & rule sources

This table is the **source of truth** for the `waste_items` seed in Phase 10. Copy that appears in Figma is reused word for word. Abbreviations for sources are listed after the table.

| `class_key` | Bin | Short instruction (UI) | Reuse tip (optional) | Contamination note | Source |
|---|---|---|---|---|---|
| `plastic_bottle` | Recyclable | Empty it, remove the cap, and flatten it. Drop it in the blue bin. | Refill it for water or use it for plant cuttings. | If it has leftover drink, empty and rinse it first. | RA, FG |
| `plastic_cup` | Recyclable | Empty and rinse it, then drop it in the blue bin. | Reuse as a pen holder or seedling pot. | If it has milk tea residue or food, rinse it or use the black bin. | RA, FG |
| `aluminum_can` | Recyclable | Empty it and crush it, then drop it in the blue bin. | | Empty it fully before sorting. | RA, FG |
| `glass_bottle` | Recyclable | Empty it and keep it whole. Place it in the blue bin. | Reuse it as a container or vase. | Broken glass: wrap it and give it to staff. Do not put it in any bin loose. | RA, FG |
| `paper_bag` | Recyclable | Empty it and flatten it, then drop it in the blue bin. | **Reuse it first.** If it is still clean and sturdy, keep it for another trip. | Greasy or food-soaked paper goes in the black bin. | RA, FG, FW |
| `cardboard` | Recyclable | Flatten it and keep it dry. Place it in the blue bin. | Reuse it for storage or packing. | Wet or greasy cardboard (e.g. pizza box bottom) goes in the black bin. | RA, FG |
| `paper_sheet` | Recyclable | Keep it dry and uncrumpled. Place it in the blue bin. | Use the blank side for notes. | Wet or food-stained paper goes in the black bin. | RA, FG |
| `banana_peel` | Biodegradable | Remove stickers, then compost or use the green bin. | | | RA, FG, FW |
| `food_scraps` | Biodegradable | Scrape food into the green bin. No plastic or packaging. | | Remove any wrapper or container first. | RA, FG |
| `leaves` | Biodegradable | Place in the green bin or compost. | | | RA, FG |
| `used_tissue` | Biodegradable | Place in the green bin. | | Tissue used with chemicals or for blood goes in the black bin. | FG (R2) |
| `snack_wrapper` | Residual | Empty any food, then place it in the black bin. | | | RA, FG, FW |
| `styrofoam` | Residual | Empty any food, then place it in the black bin. | | | RA, FG |
| `plastic_utensil` | Residual | Place it in the black bin. | Wash and reuse it if it is still intact. | | RA, FG |
| `straw` | Residual | Place it in the black bin. | Next time, skip the straw or bring a reusable one. | | RA, FG |
| `tetra_pack` | Residual | Empty and flatten it, then place it in the black bin. | | Some drop-off programs accept clean cartons. Check locally. | RA (R3) |
| `soiled_food_container` | Residual | Scrape leftover food into the green bin, then put the container in the black bin. | | | RA, FG |
| `sanitary_napkin` | Residual | Wrap it in paper, then place it in the black bin. | | | RA, FG |
| `face_mask` | Residual | Fold it inward, cut the ear loops, and place it in the black bin. | | | RA (R4) |
| `battery` | Hazardous | Tape the terminals. Take it to a battery collection point. | | Never mix with regular waste. Batteries can leak or start fires. | RA, FG, FW |
| `light_bulb` | Hazardous | Keep it whole and wrap it. Give it to staff or a collection point. | | Fluorescent bulbs contain mercury. Do not break them. | RA, FG |
| `expired_medicine` | Hazardous | Keep it in its pack. Bring it to a pharmacy or hazardous waste collection point. | | Do not flush or throw it in regular bins. | RA, FG |
| `spray_can` | Hazardous | Do not puncture or burn it. Place it in the red bin or a collection point. | | Can explode under heat or pressure. | RA, FG |

**Source codes**
- **RA**: RA 9003, Ecological Solid Waste Management Act of 2000 (segregation categories and special-waste definition).
- **FG**: iTapon Figma Bin Guide (team design, Lab 5.1 Figure 2).
- **FW**: Wording copied from the Figma "What to do next" screens.
- **R#**: Rule decision, see Section 4.1.

> **Verification task (before sign-off):** check each mapping against the **Quezon City** solid waste guidelines (QC Environmental Protection and Waste Management Department) and **TIP Quezon City campus** bin policy. Record the document name and date in the Source column. Where QC/TIP differs from the table, the QC/TIP rule wins and the row is updated.

### 4.1 Rule decisions (ambiguous items)

| # | Item | Decision | Rationale | Status |
|---|---|---|---|---|
| R1 | Dirty vs. clean recyclables | **Caveat in UI, not separate classes** (Section 5) | Separate "clean"/"dirty" classes would double the classes and need many more images. The camera cannot reliably see grease. | Decided |
| R2 | Used tissue | **Biodegradable** | Matches the Figma Bin Guide. Plain tissue is paper fibre and compostable. Some LGUs treat it as residual for hygiene reasons, so confirm with QC/TIP. | Verify |
| R3 | Tetra Pak | **Residual**, with a note about drop-off programs | Multi-layer packaging is rarely accepted by junk shops/MRFs. | Verify |
| R4 | Face mask | **Residual** | Mixed polypropylene, possibly contaminated. Not recyclable through standard channels. | Verify |
| R5 | Plastic cup | **Recyclable if rinsed** | Figma History shows it with a blue icon. PP/PET cups are accepted by junk shops when clean. | Verify |
| R6 | Hazardous bin wording | Show "red bin **or collection point**" | Many sites have no red bin. Hazardous items often go to staff or a drop-off point. | Decided |

---

## 5. Dirty vs. clean policy (R1)

**v1 decision:** the model predicts the **item type only**. Contamination is handled in the UI.

- Each item has an optional `contamination_note` (Section 4). The result screen shows it as a secondary line under the main instruction. Example for `paper_bag`: *"Greasy or food-soaked paper goes in the black bin."*
- The main bin shown is the **clean-state** bin, because the default instruction already tells users to empty and flatten the item.
- The "Why this recommendation?" callout (Figma) explains the reasoning, e.g. *"Clean, dry paper can then be recycled; grease-soaked paper cannot."*
- The Read aloud script includes the contamination note.
- **Phase 10 impact:** add a `contamination_note TEXT NULL` column to `waste_items`.
- **v2 idea:** a separate "soiled" attribute head, or a user prompt "Is it greasy? Yes/No" that switches the bin.

---

## 6. Success metrics (Chapter 4 evaluation criteria)

| Area | Metric | Target | How measured | Phase |
|---|---|---|---|---|
| Model (item) | mAP@50 | **≥ 0.80** | Ultralytics `val` on the locked test set | 7 |
| Model (item) | mAP@50-95 | **≥ 0.55** | Same | 7 |
| Model (item) | Weakest class AP@50 | **≥ 0.60** | Per-class AP table | 7 |
| Model (bin) | Bin-level accuracy (top detection's bin = true bin) | **≥ 90%** | Script mapping predictions → bins on the test set | 7 |
| Model (bin) | Hazardous recall (bin level) | **≥ 95%** | Hazardous items must almost never be missed | 7 |
| Field | Real-world bin accuracy | **≥ 85%** | ≥ 200 live scans at the pilot site, manually verified | 23, 25 |
| Latency | P95 on-device inference per frame (mid-range phone) | **≤ 1.5 s** | Client timing logged in `scan_sessions.latency_ms` (D12) | 9, 12 |
| Latency | P95 on-device inference per frame (laptop / tablet kiosk) | **≤ 0.5 s** | Same | 9, 12 |
| Latency | Time to lock a held item | **≤ 2 s** | Manual stopwatch on the device test matrix | 12 |
| Model load | First visit (download) / cached visit → scanner ready | **Cached ≤ 3 s**; first visit shown with a progress bar (D3) | Client timing | 9, 21 |
| Model size | ONNX download size | **≤ 25 MB** | File size | 9 |
| UX | SUS score | **≥ 75** ("good") | SUS questionnaire, ≥ 30 participants | 25 |
| UX | Task success rate | **≥ 90%** | UAT task observation | 25 |
| Accessibility | WCAG level | **2.2 AA** | axe + manual VoiceOver/TalkBack | 17 |
| Accessibility | Lighthouse Accessibility | **≥ 95** | Lighthouse on all main routes | 17 |
| Performance | LCP / INP (mid-range Android, 4G) | **≤ 2.5 s / ≤ 200 ms** | Lighthouse + Vercel Speed Insights | 21 |
| Quality | ISO/IEC 25010 survey weighted mean | **≥ 4.0 / 5** ("Agree") on each characteristic | Likert survey: functional suitability, performance efficiency, usability, reliability, security | 25 |
| Reliability | Kiosk unattended run | **2 h** with no crash or stuck state | Soak test | 18 |
| Reliability | Production uptime (warm periods) | **≥ 99%** over one week | Uptime monitor on `/health` | 24 |

Why the hazardous recall target is higher: a battery or bulb in the wrong bin is a safety issue (proposal: *"Promote Occupational Safety"*), so missing one costs more than any other error.

---

## 7. Personas & core user stories

### 7.1 Personas

| Persona | Who | Context | Needs | Main surface |
|---|---|---|---|---|
| **P1: Student / general public** ("Migs", 19) | TIP student or visitor | In a hurry at the canteen, holding lunch trash | Instant answer, no sign-up, works on their phone | Mobile web / kiosk |
| **P2: PWD user** ("Ana", 35, low vision) | Staff member or visitor with low vision; covers other disabilities too | Can't read small bin labels, relies on audio | Read aloud, large text, high contrast, colour-independent cues, hands-free kiosk | Kiosk / mobile with TTS |
| **P3: Janitorial staff** ("Kuya Jun", 48) | Campus utility worker | Re-sorts mixed bins by hand, exposed to sharps and biohazards | Fewer wrong items in bins; a quick reference to check rare items | Kiosk outcome; mobile Bin Guide |
| **P4: Institution admin** ("Ms. Reyes", 41) | Facilities / sustainability officer | Reports on waste and compliance | Waste volume by category, trends, peak hours, exportable data | Admin dashboard (desktop) |
| **P5: Team / ML maintainer** | Project developers | Improve the model after deployment | Feedback data, model health metrics | Admin review queue |

### 7.2 User stories (with acceptance criteria)

**Scanning & results**
- **US-01 (P1):** As a student, I want to point my phone at my trash and see which bin it goes in, so I don't throw it in the wrong one.
  - *AC:* the camera opens on `/scan` without sign-up; a held item locks within 2 s; the bin colour, name and instruction are shown.
- **US-02 (P1):** As a user, I want to see how sure the app is, so I know when to double-check.
  - *AC:* a confidence badge is shown; below the threshold the app shows "Not sure" with alternatives and a Bin Guide link.
- **US-03 (P1):** As a user with several items, I want one plan for all of them, so I can sort everything at once.
  - *AC:* a multi-item scan shows the "What to do next" plan; hazardous items are listed first; reuse tips are shown where available.
- **US-04 (P1):** As a user, I want a clear message if the scanner is still starting, so I don't think the app is broken.
  - *AC:* the warming-up screen shows model download progress on the first visit, fades out when ready, and offers Retry / Take photo / Bin Guide on failure or after 90 s.

**Accessibility**
- **US-05 (P2):** As a low-vision user, I want the result read aloud, so I don't have to read the screen.
  - *AC:* a Read aloud button is on every result; the kiosk auto-reads; the script includes item, bin colour, category and instruction.
- **US-06 (P2):** As a colour-blind user, I want bins identified by more than colour.
  - *AC:* every bin indication has a text label, icon and arrow; it passes colour-blindness simulation.
- **US-07 (P2):** As a screen-reader user, I want results announced automatically.
  - *AC:* an `aria-live` region announces the locked result; focus moves to the result heading.

**Guide & history**
- **US-08 (P1/P3):** As a user, I want to search any item (including Filipino terms), so I can check items the camera doesn't know.
  - *AC:* searching "straw", "battery" or "saging" returns the correct item and bin.
- **US-09 (P1):** As a returning user, I want to see what I scanned before.
  - *AC:* the History list shows item, bin icon and time; guest history is kept after sign-up.
- **US-10 (P1):** As a user, I want to delete my data.
  - *AC:* "Delete my data" removes all of my scans and feedback.

**Kiosk & institution**
- **US-11 (P1/P2):** As a kiosk user, I want to just hold up my trash with no touching, and be told where it goes.
  - *AC:* continuous scan, auto-lock, auto-read, then auto-reset after about 6 s.
- **US-12 (P4):** As an admin, I want daily counts by bin and the top items, so I can report waste generation.
  - *AC:* the dashboard shows KPIs, a daily stacked chart, top items and a peak-hour heatmap, filterable by date and device, with CSV export.
- **US-13 (P3):** As janitorial staff, I want fewer wrong items in bins, so I don't have to dig through trash.
  - *AC:* measured indirectly by field bin accuracy ≥ 85% and the optional contamination before/after study (Phase 25).

**Model improvement**
- **US-14 (P1/P5):** As a user, I want to report a wrong result, so the app gets better.
  - *AC:* thumbs up/down on the result; when it's wrong, I can pick the correct item; the photo is shared only if I tick consent.

---

## 8. Feature scope (MoSCoW)

| Priority | Feature | Stories | Roadmap phase |
|---|---|---|---|
| **Must** | Live camera scanning (in-browser model, D12) + warming-up screen | US-01, US-04 | 9, 12 |
| **Must** | Single-item result with bin guidance + confidence | US-01, US-02 | 13 |
| **Must** | Bin Guide with search | US-08 | 15 |
| **Must** | Read aloud + core accessibility | US-05, US-06, US-07 | 17 |
| **Must** | Scan logging + History (guest + account) | US-09, US-10 | 13, 16 |
| **Must** | Open-source repo + source link (AGPL) | none | 2, 11 |
| **Should** | Multi-item "What to do next" plan | US-03 | 14 |
| **Should** | Kiosk mode (hands-free) | US-11 | 18 |
| **Should** | Institutional analytics dashboard | US-12 | 19 |
| **Could** | Feedback / active learning loop | US-14 | 20 |
| **Could** | Filipino UI localization | none | 17 |
| **Could** | Offline Bin Guide (PWA) | none | 21 |
| **Could** | Admin content editor for items | none | 19 |
| **Won't (v1)** | Hardware actuation (auto-opening bins, robot sorting) | none | v2 |
| **Won't (v1)** | Dirty/clean detection by the model | none | v2 |
| **Won't (v1)** | Gamification / eco-points | none | v2 |
| **Won't (v1)** | Paid inference hosting (D3, D12) | none | none |

**Cut order if the schedule slips:** Could items first (bottom up), then the Should items in this order: dashboard → kiosk → multi-item. The Must items are the MVP (Milestone M3).

---

## 9. Sign-off

Phase 1 is done when every box below is checked.

**Team**

| Member | Role | Approved | Date |
|---|---|---|---|
| Basilio, Matthew | | ☐ | |
| Baldovino, Gabriel | | ☐ | |
| Hofilena, Paul April | | ☐ | |
| Gantang, Rem Gabriel M. | | ☐ | |
| Gison, Reuven James U. | | ☐ | |
| **Adviser:** Mr. Jess N. Garcia | Faculty in-charge | ☐ | |

**Exit checklist**
- [x] Class list defined: 23 classes (Section 3)
- [x] Every class has a bin and a source (Section 4)
- [x] Dirty vs. clean policy decided (Section 5)
- [x] Metrics are numeric (Section 6)
- [x] Personas and user stories written (Section 7)
- [x] MoSCoW list written (Section 8)
- [ ] Rule decisions R2–R5 verified against QC / TIP guidelines and sources recorded
- [ ] Figma updated from "HIWALAY" to "iTapon"
- [ ] Names reserved: GitHub `itapon`, Vercel `itapon`, HF `itapon-api` / `itapon-yolo`, Supabase projects
- [ ] Team and adviser sign-off (table above)

---

## 10. Change process (after sign-off)

- **Adding, removing or merging a class** after annotation has started (Phase 4) needs agreement from all five members **and** an entry in the decisions log in `ROADMAP.md`. New class ideas go to the v2 backlog by default.
- **Changing a bin mapping or instruction** is a content change. It is allowed at any time, because the mapping lives in Supabase and doesn't need retraining. Update Section 4 and the seed together.
- **Changing a metric target** needs adviser approval, since the targets are the Chapter 4 evaluation criteria.
