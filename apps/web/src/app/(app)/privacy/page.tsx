// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { PageTitle } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What iTapon collects, why, how long it's kept, and your rights under RA 10173.",
};

const SOURCE = process.env.NEXT_PUBLIC_SOURCE_URL || "https://github.com/alchemistUser/itapon";
const UPDATED = "21 October 2026"; // keep in step with PRIVACY_VERSION (src/lib/accounts.ts)

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="flex flex-col gap-2 text-ink-2 [&_li]:ml-5 [&_li]:list-disc">{children}</div>
    </section>
  );
}

// Phase 22: privacy notice aligned with the Data Privacy Act of 2012 (RA 10173).
export default function PrivacyPage() {
  return (
    <article className="flex max-w-2xl flex-col gap-6">
      <PageTitle title="Privacy notice" subtitle={`Last updated ${UPDATED}`} />

      <p className="text-ink-2">
        iTapon is a student project (CS 406, Technological Institute of the Philippines, Quezon
        City) that tells you which bin your waste goes in. We collect as little as possible. This
        notice follows the Data Privacy Act of 2012 (Republic Act No. 10173).
      </p>

      <Section title="The camera stays on your device">
        <p>
          The scanner runs <strong>on your phone or computer</strong>. Camera frames are analysed in
          your browser and are <strong>never uploaded</strong>, unless you choose to share one photo
          (see below).
        </p>
      </Section>

      <Section title="What we collect">
        <ul>
          <li>
            <strong>An anonymous account id</strong>, created the first time you scan, so your scans
            can be stored privately. No name or email is needed.
          </li>
          <li>
            <strong>Scan records:</strong> which items were recognised, how sure the model was,
            where they were in the frame (box coordinates, not the image), the time, phone or
            desktop, and the model version.
          </li>
          <li>
            <strong>Your answers</strong> to &quot;Was this right?&quot; and, only if you tick the
            box, <strong>that one photo</strong> (see &quot;Shared photos&quot;).
          </li>
          <li>
            <strong>Your email</strong>, only if you choose to save your history or sign in.
          </li>
          <li>
            <strong>Preferences</strong> such as read-aloud, language and text size.
          </li>
          <li>
            <strong>Optional profile:</strong> a handle (not your real name), a preset avatar and
            whether to show them publicly (off by default). Nothing is shown publicly yet.
          </li>
          <li>
            <strong>Birth year</strong> (not your birthday), only to keep accounts of people under
            18 private. Nobody else can see it, not even admins.
          </li>
          <li>
            <strong>Consent records:</strong> which version of this notice you agreed to and when.
          </li>
          <li>
            <strong>Institution membership</strong>, if you join a school or office with its code.
          </li>
        </ul>
        <p>
          We don&apos;t collect your location, contacts or advertising ids, and there are no ads or
          third-party trackers. To keep the app working we log app errors without any account or
          device id. The disposal library counts how often each entry is read and how often its
          ideas are marked &quot;I&apos;ll do this&quot; or &quot;Done it&quot;, without any
          account, device or scan id; if you already belong to an institution, the count is tagged
          with it so its admins see totals. Your browser keeps your session, preferences and offline
          copies of the app in its own storage on your device.
        </p>
      </Section>

      <Section title="Why">
        <ul>
          <li>To show your scan history and keep your preferences (only you can see them).</li>
          <li>
            To give schools and offices that run iTapon kiosks anonymous totals: what is thrown
            away, when, and how often.
          </li>
          <li>To measure and improve the accuracy of the model.</li>
        </ul>
      </Section>

      <Section title="Who can see it">
        <ul>
          <li>You. Other users can&apos;t see your scans, answers or photos.</li>
          <li>
            If your account belongs to an institution (you joined with its code, or it&apos;s a
            school kiosk), that institution&apos;s admins can see its scans and the feedback on
            them, your handle or display name and when you joined, but never your email, birth year
            or consent records. You can leave at any time, and admins can remove members.
          </li>
          <li>
            The project team, to run and fix the service and to review shared photos for model
            training.
          </li>
        </ul>
        <p>
          Data is stored with Supabase (database and private file storage) and the app is served by
          Vercel. Sign-in emails are sent through Brevo, which handles your email address only to
          deliver them. The model files come from Hugging Face. We don&apos;t sell or share your
          data.
        </p>
      </Section>

      <Section title="Shared photos (separate consent)">
        <p>
          After a scan you may answer &quot;No&quot; and tick{" "}
          <em>&quot;Share this photo anonymously to help improve iTapon&quot;</em>. The box is
          unticked by default and applies to that one photo only. Shared photos go to a private
          bucket that only reviewers can open. Photos showing people, faces, IDs or screens are
          rejected. Saying no never limits what you can do in the app.
        </p>
      </Section>

      <Section title="Under 18">
        <p>
          Accounts of people under 18, and accounts without a birth year, are always private and
          will never appear on leaderboards. We count someone as 18 only from 1 January of the year
          after they turn 18, because we only ask for the year. We show a notice to share with a
          parent or guardian.
        </p>
      </Section>

      <Section title="How long we keep it">
        <ul>
          <li>
            <strong>Shared photos:</strong> deleted after <strong>12 months</strong>, or sooner if
            you delete them.
          </li>
          <li>
            <strong>Scan records and answers:</strong> kept while your account exists, so your
            history and the institution totals work. Delete them any time.
          </li>
          <li>
            <strong>Profile, birth year, consent records and membership:</strong> kept while your
            account exists. Deleting your account removes them at once (short database backups are
            kept by our provider and expire on their own).
          </li>
          <li>
            <strong>Exported training sets</strong> are kept only for an evaluation and then
            deleted.
          </li>
        </ul>
      </Section>

      <Section title="Your rights">
        <p>
          Under RA 10173 you have the right to be informed, to access, to object, to correct, to
          have your data erased or blocked, to data portability, and to claim damages. You can:
        </p>
        <ul>
          <li>
            See your scans on{" "}
            <Link href="/history" className="text-brand-strong underline">
              History
            </Link>
            .
          </li>
          <li>
            Delete all your scans, answers and shared photos at once on{" "}
            <Link href="/account" className="text-brand-strong underline">
              Account → Delete my data
            </Link>
            .
          </li>
          <li>
            Download a copy of your data (JSON, and your scans as CSV), or delete your whole
            account, on{" "}
            <Link href="/account" className="text-brand-strong underline">
              Account
            </Link>
            .
          </li>
          <li>
            Ask anything else through the project&apos;s{" "}
            <a href={`${SOURCE}/issues`} className="text-brand-strong underline" rel="noreferrer">
              GitHub page
            </a>{" "}
            (don&apos;t post personal details there; ask for a private contact).
          </li>
          <li>
            File a complaint with the National Privacy Commission (privacy.gov.ph) if you believe
            your rights were violated.
          </li>
        </ul>
      </Section>

      <Section title="Changes">
        <p>
          If this notice changes, the date at the top changes too. Important changes will be shown
          in the app.
        </p>
      </Section>
    </article>
  );
}
