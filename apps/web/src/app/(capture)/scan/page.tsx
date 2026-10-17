// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Metadata } from "next";

import { CameraMock, ResultPanel, ResultSheet } from "@/components/scan/scan-views";
import { MOCK_ITEMS } from "@/lib/mock";

export const metadata: Metadata = { title: "Scan" };

// S1 Scanning. Static mock: the camera + live detection arrive in Phase 12.
export default function ScanPage() {
  const item = MOCK_ITEMS.paper_bag;
  return (
    <>
      {/* phone: camera fills the screen, result in a bottom sheet */}
      <div className="flex min-h-dvh flex-col md:hidden">
        <CameraMock className="flex-1" />
        <ResultSheet item={item} />
      </div>
      {/* tablet / desktop: split view */}
      <div className="hidden gap-8 md:grid md:grid-rows-[minmax(380px,46vh)_auto] lg:min-h-[600px] lg:grid-cols-2 lg:grid-rows-1">
        <CameraMock className="rounded-[28px]" />
        <ResultPanel item={item} className="py-4" />
      </div>
    </>
  );
}
