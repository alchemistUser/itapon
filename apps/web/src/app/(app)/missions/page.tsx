// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Metadata } from "next";

import { MissionsView } from "@/components/missions/missions-view";

export const metadata: Metadata = {
  title: "Missions",
  description: "Daily and weekly missions: scan, read the disposal library and answer quizzes.",
};

// Missions and points (ROADMAP-v2 Phase 32, D26): read and claimed in the browser under RLS.
export default function MissionsPage() {
  return <MissionsView />;
}
