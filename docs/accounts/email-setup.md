# Sign-in email setup (Brevo SMTP, D21)

> **Not used for the prototype demo (D24).** The demo uses email + password with confirmation
> off and no emails at all. Kept for when confirmation and password-reset emails are needed.

Needed for email sign-in and "Save your history" in production (Phase 31). Google sign-in
doesn't need it. **Never paste the SMTP key in chat, code, issues or commits.** It goes only
into the Supabase dashboard.

Menu names below are as of October 2026. If a screen looks different, look for the same words.

## 1. Brevo account and sender

1. Create a free account at brevo.com, using the team's shared email (not a personal one).
2. **Senders, domains & dedicated IPs → Senders → Add a sender.** Use the team email, with
   "iTapon" as the name. Open the verification email Brevo sends and confirm it.
3. **SMTP & API → SMTP.** Note the **SMTP server**, **port** and **login**. Then **Generate a
   new SMTP key** and name it "supabase-itapon". Copy the key straight into step 2.2 below. Don't
   save it anywhere else.

## 2. Supabase

1. Dashboard → project **itapon-dev** → **Authentication → Emails → SMTP Settings** →
   **Enable custom SMTP**.
2. Fill in:
   - **Sender email:** the verified Brevo sender
   - **Sender name:** iTapon
   - **Host:** Brevo's SMTP server (step 1.3)
   - **Port:** 587
   - **Username:** Brevo's SMTP login
   - **Password:** the SMTP key

   Save.
3. **Authentication → Rate Limits:** set *emails sent per hour* to about 30. The built-in mailer
   allowed only a few.
4. **Authentication → Emails → Templates:** for **Magic link**, **Confirm signup** and **Change
   email address**, paste the subject and HTML from `supabase/templates/` (the subjects are in
   `supabase/config.toml`).
5. **Authentication → URL Configuration:** the site URL is `https://itapon.vercel.app`, and the
   redirect URLs include `https://itapon.vercel.app/**`.

## 3. Test

- On the live site, use a guest browser: **Account → Save your history** with a Gmail address
  and a school address that aren't team members.
- Check that the email arrives within a minute, isn't in spam, shows EN + FIL, and that the link
  opens `/account?saved=1` with your scans still there.
- Then **Account → Sign in** on another browser with the same address.
- If it lands in spam: Brevo recommends authenticating a domain you own (DKIM/DMARC). Without
  a domain this can't be fully fixed. Tell testers to check spam.

## 4. If the key leaks

Delete it in Brevo (SMTP & API → SMTP → the key → Delete), generate a new one, and paste it in
step 2.2.
