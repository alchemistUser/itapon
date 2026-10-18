# UAT protocol (Phase 25, task 3)

One participant at a time, about 20 minutes. One facilitator reads the script and one
records (or one person does both, with a phone timer).

## Before the session

- The participant has read and signed the [consent form](consent.md). Give them a code
  (P01, P02, …) and **never write their name on the data sheets**.
- Device: their own phone if they're willing (open https://itapon.vercel.app), otherwise the
  team's test phone. Note the device in the sheet.
- Items on the table (real, clean): plastic bottle, banana peel (or fruit peel), used tissue
  in a bag, battery, snack wrapper, straw, paper cup. Have the 4 bins (or bin pictures) ready.

## Script (read aloud)

> "Thank you for helping us test iTapon. We're testing the app, not you, so there are no
> wrong answers. Please think aloud as you go. I can't help you during the tasks, but you
> can stop at any time. I'll time each task."

## Tasks

| ID | Task (read to the participant) | Success = | Start / stop timer |
|---|---|---|---|
| T1 | "Use iTapon to find out where this **plastic bottle** goes, then put it in that bin." | correct bin used | start on "go" → stop when it is in a bin |
| T2 | "Do the same with this **battery**." | red bin / hazardous instruction followed | same |
| T3 | "Without scanning, find out where a **straw** goes." | finds Bin Guide → straw → black bin | start → stop when they say the bin |
| T4 | "Scan the **banana peel** and listen to the instructions instead of reading them." | read-aloud played | start → stop when audio plays |
| T5 | "The app got something wrong. Tell the app it was wrong." (staged: scan the paper cup; if the result is right, ask them to find where they'd report a mistake) | feedback sent / found | start → stop at "Thanks!" |
| T6 | "Check the items you've scanned today." | History opened, shows today's scans | start → stop on History |
| T7 (kiosk, if available) | "Use the screen above the bins to throw away this **snack wrapper**." | correct bin, no touching needed | start → stop when in bin |
| T8 (admin/facility only) | "Open the dashboard and find which bin was used most this week." | correct bin named | start → stop at answer |
| T9 (janitorial only) | "Find which hours the bins are used most." | heatmap read correctly | start → stop at answer |

**Success** is 1 (done without help), 0.5 (done with one hint; note it) or 0 (gave up or
wrong). The report script averages these. **Errors** = wrong taps/paths that the participant
had to undo.

## Recording sheet (→ `tasks.csv`)

| participant_id | group | task_id | success | time_s | errors | notes |
|---|---|---|---|---|---|---|
| P01 | Student | T1 | 1 | 14 | 0 | |

`group` is one of Student, Public, Janitorial, Admin/facility, PWD (add "(phone)"/"(kiosk)" in
notes if useful).

## After the tasks

1. SUS questionnaire, then the ISO/IEC 25010 survey, then the open questions ([questionnaires.md](questionnaires.md)).
2. A 2-minute debrief: "What was most confusing?" Write quotes verbatim (anonymised).
3. Log any bug in [../qa/README.md](../qa/README.md#bugs) with priority (P1 = wrong bin with
   high confidence, a crash, data exposure, or a blocked core flow).

## Accessibility sessions (PWD participants)

- Let them use their own settings (screen reader, zoom). iTapon's Account → Preferences has
  large text, read-aloud and Filipino.
- Allow extra time and don't count the time for T1–T4 against the targets. Report it separately.
- Note any barrier as a P1/P2 bug even if they complete the task.
