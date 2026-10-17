# Device / browser matrix (Phase 23, task 5)

For each device, use the **production** site (https://itapon.vercel.app) and tick each check.
Note the device model, OS and browser version. ✓ = works, ✗ = bug (add it to
[README.md](README.md#bugs)), – = not applicable.

| # | Check |
|---|---|
| A | Install: Add to Home Screen; opens standalone with the iTapon icon |
| B | Scanner: camera starts (back camera on phones); warming-up screen, then live boxes |
| C | Scan a plastic bottle, a banana peel, a battery: correct bin shown and read aloud |
| D | "Take a photo instead" works |
| E | Was this right? → No → pick item → send (with and without photo consent) |
| F | Bin Guide search: "bote", "baterya", "saging" |
| G | Airplane mode after one visit: Guide, item pages and **scanning** still work; scan syncs after reconnecting |
| H | Large text + read-aloud preference (Account) |
| I | Kiosk (`/kiosk`, tablets only): start, hands-free lock, idle screen, wake on motion |
| J | Rotate / resize: no horizontal scroll, nothing cut off |

| Device | OS / browser | Tester / date | A | B | C | D | E | F | G | H | I | J | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Desktop (Windows 11) | Chrome 14x | Claude / 2026-10-18 | – | ✓ fake camera | ✓ (plastic cup) | ✓ | ✓ | ✓ | ✓ | ✓ | – | ✓ | automated + browser pane |
| iPhone (model?) | iOS ? / Safari | | | | | | | | | | – | | |
| Android low-end (≤ 3 GB RAM) | Android ? / Chrome | | | | | | | | | | – | | |
| Android mid-range | Android ? / Chrome | | | | | | | | | | – | | |
| iPad | iPadOS ? / Safari | | | | | | | | | | | | |
| Desktop | Edge | | – | | | | | | | | – | | |
| Desktop | Firefox | | – | | | | | | | | – | | Firefox has no `beforeinstallprompt` (no install card) |
