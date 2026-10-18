# Kiosk setup (Phase 18)

A kiosk is a tablet or monitor + webcam mounted above the bins, running **https://itapon.vercel.app/kiosk**. It works without registration. Registering it makes its scans count for your institution (dashboard, Phase 19) and lets you set the on-screen bin order to match the physical bins.

## 1. Hardware & placement

- **Device:** any tablet or mini-PC with Chrome or Safari. Android tablets and Chromebooks are the easiest to lock down.
- **Camera:** the built-in back camera, or a USB webcam. Point it at chest height where people hold items, **not** at the bins or at faces.
- **Light:** avoid a window behind the person, and add a lamp if the area is dim (low light is the #1 cause of "Hold still…").
- **Screen:** landscape. The camera is on the left and the result on the right, with the bin tiles in the order you set below.
- **Power:** keep it plugged in. The page holds a screen wake lock while running.

## 2. Open the kiosk

1. Open `https://itapon.vercel.app/kiosk` and allow camera access.
2. Tap **Start kiosk** once. This turns on fullscreen, sound (read aloud) and keep-screen-on. Browsers only allow these after a tap.
3. The ⚙ **Kiosk settings** button: pick the camera (for a USB webcam), turn read-aloud on or off, and exit fullscreen. These are saved on the device.

After that it runs hands-free:
- Holding an item steady locks a result. It's read aloud, shown for 6 seconds, then the kiosk resets.
- After 40 seconds with nothing in front of it, it shows an attract screen and **stops running the model**. Any movement in front of the camera wakes it.
- Offline: once the model is cached the kiosk keeps scanning. Scans made while offline aren't logged (an offline queue comes in Phase 21).

## 3. Lock the device to the kiosk page

| Device | How |
|---|---|
| iPad | Settings → Accessibility → **Guided Access** → on. Open the kiosk in Safari, triple-click the side button, Start. |
| Android | Settings → Security → **App pinning** (Screen pinning) → on. Open the kiosk in Chrome, Recents → app icon → Pin. Or use a kiosk-browser app. |
| ChromeOS / Chrome | Chrome's kiosk mode (managed devices), or `chrome --kiosk https://itapon.vercel.app/kiosk`. |

## 4. Register the kiosk (admin)

Registration links a **kiosk account** to a row in `devices`. A database trigger then tags every scan from that account with the device, its institution and `source = 'kiosk'`. The kiosk account can only read its own device row (RLS).

**Pairing code (recommended, no email, Phase 25):**

1. **On the kiosk:** open `/kiosk` in the browser profile the kiosk will keep using → **Get pairing code**. A 6-digit code shows for 15 minutes. The kiosk uses its own anonymous session; don't sign in with a personal or admin account on the kiosk.
2. **On the dashboard (any device):** an institution admin opens `/admin` → **Kiosks** → **Register a kiosk** → *Pairing code*, types the code, a name, an optional location and the left-to-right order of the physical bins. This calls `admin_register_kiosk_code` (admins only, own institution only). The kiosk screen updates by itself within about 5 seconds.

Don't clear the kiosk browser's data: the pairing lives in its session. If it's ever lost, pair again and delete the old kiosk on `/admin`.

**Kiosk email (alternative):** on the kiosk, `/account` → "Already have an account? Sign in" with a dedicated kiosk email → open the link **on the kiosk**. Then on `/admin` choose *Kiosk account email* instead of the code. This needs working email (custom SMTP, or a team member's address).

3. If you used the email method, reload `/kiosk`. The top-left badge shows `iTapon · Canteen kiosk`, and the bin tiles follow `bin_order`.

To change the bin order later, use the arrows under the kiosk on `/admin` and **Save bin order**; the kiosk picks it up on its next reload.

### Making the first admin (project team, once per institution)

Admins can't promote themselves (RLS). Run this in the Supabase SQL editor or with `pnpm exec supabase db query --linked`, after the admin has signed in once with email:

```sql
insert into public.institutions (name, location)
values ('TIP Quezon City', 'Cubao, Quezon City')
returning id;  -- copy this id

update public.profiles
   set role = 'admin', institution_id = '<institution id>'
 where id = (select id from auth.users where email = 'admin@yourschool.edu');
```

## 5. Daily check

`/admin` → Kiosks shows each kiosk's online hours and "online now" (from a heartbeat every 5 minutes while the kiosk runs).


- The camera view is live, and a test item (e.g. a bottle) locks and is read aloud.
- No "Scanner offline" or "Camera not available" message.
- For any problem: ⚙ → check the camera; reload the page; tap Start kiosk again.
