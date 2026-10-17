// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Metadata } from "next";

import { KioskScreen } from "@/components/kiosk/kiosk-screen";

export const metadata: Metadata = { title: "Kiosk", robots: { index: false } };

// S8 Kiosk (Phase 18): full-screen, hands-free scanner for a screen above the bins.
export default function KioskPage() {
  return <KioskScreen />;
}
