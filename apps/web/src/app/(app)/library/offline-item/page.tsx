// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Metadata } from "next";

import { OfflineItem } from "@/components/library/offline-item";

export const metadata: Metadata = { title: "Disposal library", robots: { index: false } };

// Served by the service worker in place of an item page that isn't cached (offline).
export default function OfflineItemPage() {
  return <OfflineItem />;
}
