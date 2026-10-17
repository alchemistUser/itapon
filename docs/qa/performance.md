# On-device performance (Phase 23, task 6)

Inference runs on the device (D12), so there's no server load test. Instead, each device in
the [matrix](device-matrix.md) scans continuously for **10 minutes**.

## How

1. Open **https://itapon.vercel.app/dev/soak** on the device, plugged out, screen brightness
   at about 50%, other apps closed.
2. Allow the camera and point it at 2–3 items on a table (the detector stays busy; the page
   never locks a result).
3. Set 10 minutes → **Start**. Don't switch apps. Afterwards, **Download CSV** and note the
   summary line (median fps, median inference, heap start → end, battery start → end), plus
   whether the phone felt warm or throttled (fps dropping over time).

Desktop alternative (fake camera, automated):
`E2E_SOAK_MINUTES=10 pnpm --filter web e2e --project=scan` (needs a sample photo + ffmpeg).

**Pass:** no crash or reload, fps doesn't fall by more than a third from the first to the last
minute, JS heap growth < 20 MB, and the result screen still appears within ~2 s.

## Results

Heap is Chrome-only (`performance.memory`). Battery needs the Battery API (Chrome/Android).

| Device | Browser | Model / threads | Duration | Median fps | Median inference | Heap start → end | Battery | Thermal / notes | Pass |
|---|---|---|---|---|---|---|---|---|---|
| Desktop (Windows 11 PC) | Chrome (Playwright, fake camera) | int8-480 / wasm ×4 | 2 min | 3.6 | 279 ms | 10 → 10 MB | plugged in | stable | ✓ |
| Desktop (Windows 11 PC) | Chrome (Playwright, fake camera) | int8-480 / wasm ×4 | 10 min | 3.3 (60 samples) | 299 ms | 10 → 10 MB | plugged in | no crash, fps steady (3.6 at 2 min → 3.3 over 10 min) | ✓ |
| Android low-end | Chrome | | 10 min | | | | | | |
| Android mid-range | Chrome | | 10 min | | | | | | |
| iPhone | Safari | | 10 min | | | – | – | | |
| iPad (kiosk) | Safari | | 10 min | | | – | – | | |

For comparison, Lighthouse page-load results are in ROADMAP Phase 21 (regular 4G: LCP 1.1 s,
TBT 130–160 ms).
