// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Metadata } from "next";

import { PlanView } from "@/components/scan/plan-view";
import { MOCK_PLAN } from "@/lib/mock";

export const metadata: Metadata = { title: "What to do next" };

// S5/S7 (phone) and iPad master–detail with the primary item selected. Static mock.
export default function PlanPage() {
  return <PlanView selected={MOCK_PLAN[0]} mobile="summary" />;
}
