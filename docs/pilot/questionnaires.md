# Questionnaires (Phase 25, task 4)

Build these as Google Forms (one form, three sections). **Use the item codes as the
question titles' prefix** (e.g. "q1. …", "FS1. …") and rename the CSV columns to the codes
before running `pilot_report.py`. Every scale is 1 = Strongly disagree … 5 = Strongly agree.
Start the form with **participant code** and **group** (same codes as the task sheet).

## Section A: System Usability Scale (SUS)

Standard wording (Brooke, 1996), used unchanged so scores compare with published benchmarks.
"System" = iTapon. Optional Filipino translation in brackets: have it checked before use.

| Code | Item |
|---|---|
| q1 | I think that I would like to use this system frequently. *(Gusto kong gamitin ito nang madalas.)* |
| q2 | I found the system unnecessarily complex. *(Masyadong komplikado ang app.)* |
| q3 | I thought the system was easy to use. *(Madaling gamitin ang app.)* |
| q4 | I think that I would need the support of a technical person to be able to use this system. *(Kailangan ko ng tulong ng teknikal na tao para magamit ito.)* |
| q5 | I found the various functions in this system were well integrated. *(Maayos na nagkakaugnay ang mga bahagi ng app.)* |
| q6 | I thought there was too much inconsistency in this system. *(Maraming hindi magkakatugma sa app.)* |
| q7 | I would imagine that most people would learn to use this system very quickly. *(Mabilis itong matututunan ng karamihan.)* |
| q8 | I found the system very cumbersome to use. *(Nakakaabala at mabigat itong gamitin.)* |
| q9 | I felt very confident using the system. *(Kumpiyansa ako habang ginagamit ito.)* |
| q10 | I needed to learn a lot of things before I could get going with this system. *(Marami akong kailangang matutunan bago ito magamit.)* |

Score: odd items (answer − 1), even items (5 − answer), sum × 2.5 (0–100). The script does
this and reports the grade and adjective. **Target ≥ 75.**

## Section B: ISO/IEC 25010 quality survey

Items written for this study, grouped by characteristic. The prefix is used by the script.
`MA` (maintainability) items are for IT-background respondents only (adviser/panel or CS
students); leave them blank for others.

| Code | Characteristic | Item |
|---|---|---|
| FS1 | Functional suitability | iTapon told me the correct bin for the items I scanned. |
| FS2 | Functional suitability | The disposal instructions (rinse, flatten, tape, etc.) were correct and useful. |
| FS3 | Functional suitability | The Bin Guide had the items I looked for. |
| PE1 | Performance efficiency | Results appeared quickly after I pointed the camera. |
| PE2 | Performance efficiency | The app did not make my phone slow or hot. |
| CO1 | Compatibility | iTapon worked on my phone and browser without problems. |
| US1 | Usability | It was easy to learn how to scan an item. |
| US2 | Usability | The bin colours, icons and words were clear. |
| US3 | Usability | Read-aloud / large text / Filipino helped me (or would help others). |
| US4 | Usability | I could recover easily when something went wrong. |
| RE1 | Reliability | The app worked every time I used it during the test. |
| RE2 | Reliability | The kiosk (or app) kept working without needing a restart. |
| SE1 | Security | I trust that iTapon handles my data properly. |
| SE2 | Security | I understood that photos are shared only if I choose. |
| PO1 | Portability (flexibility) | I could use iTapon on different devices (phone, kiosk, computer). |
| MA1 | Maintainability | The system is structured so it can be updated (e.g. new items, new model). |
| MA2 | Maintainability | Problems can be found and fixed easily (tests, monitoring). |

The script reports the weighted mean per characteristic and overall, interpreted as
4.21–5.00 strongly agree (excellent) · 3.41–4.20 agree (very good) · 2.61–3.40 neutral (good)
· 1.81–2.60 disagree (fair) · 1.00–1.80 strongly disagree (poor).

## Section C: Open-ended

1. What did you like most about iTapon?
2. What was confusing or difficult?
3. Was there an item it got wrong? Which one?
4. Would you use it (or the kiosk) at school/work? Why or why not?
5. Anything else we should change?

Code the answers into themes (e.g. accuracy, speed, clarity, accessibility, trust) and count
mentions per theme for Chapter 4.
