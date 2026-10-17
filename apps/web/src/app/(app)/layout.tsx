// SPDX-License-Identifier: AGPL-3.0-or-later
import { BottomTabs, TopNav } from "@/components/shell/nav";
import { SourceFooter } from "@/components/ui/misc";

/** Standard pages: top nav on tablet/desktop, bottom tabs on phones. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <TopNav />
      <main className="pt-safe mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 md:px-8 md:pt-8 md:pb-10">
        {children}
      </main>
      <SourceFooter className="pb-24 md:pb-6" />
      <BottomTabs />
    </>
  );
}
