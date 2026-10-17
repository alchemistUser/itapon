// SPDX-License-Identifier: AGPL-3.0-or-later
import { TopNav } from "@/components/shell/nav";

/** Scanner + result: full screen on phones (no tab bar, per Figma); header on md+. */
export default function CaptureLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <TopNav />
      <main className="flex w-full flex-1 flex-col md:mx-auto md:max-w-6xl md:px-8 md:py-8">
        {children}
      </main>
    </>
  );
}
