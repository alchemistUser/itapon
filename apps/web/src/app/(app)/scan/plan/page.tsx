// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Metadata } from "next";

import { PlanView } from "@/components/scan/plan-view";

export const metadata: Metadata = { title: "What to do next" };

// S5/S7 (phone) and iPad master–detail with the primary item selected, from the last scan.
export default function PlanPage() {
  return <PlanView mobile="summary" />;
}
