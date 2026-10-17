// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Metadata } from "next";

import { CameraMock, ResultPanel } from "@/components/scan/scan-views";
import { MOCK_ITEMS } from "@/lib/mock";

export const metadata: Metadata = { title: "Kiosk" };

// S8 Kiosk (tablet / monitor above the bins): full-screen split, no navigation.
// Phase 18 adds hands-free scanning, auto read-aloud, auto reset and device binding.
export default function KioskPage() {
  const item = MOCK_ITEMS.paper_bag;
  return (
    <main className="grid min-h-dvh grid-rows-[minmax(320px,1fr)_auto] bg-surface landscape:grid-cols-2 landscape:grid-rows-1">
      <CameraMock />
      <ResultPanel item={item} className="p-6 lg:p-10" />
    </main>
  );
}
