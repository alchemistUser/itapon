// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Metadata } from "next";

import { HistoryView } from "@/components/history/history-view";

export const metadata: Metadata = { title: "History" };

// S4 History (Phase 16): the user's own scans from Supabase, read in the browser under RLS.
export default function HistoryPage() {
  return <HistoryView />;
}
