// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Metadata } from "next";

import { ScanScreen } from "@/components/scan/scan-screen";

export const metadata: Metadata = { title: "Scan" };

// S1 Scanning: live camera + on-device detection (Phase 12).
export default function ScanPage() {
  return <ScanScreen />;
}
