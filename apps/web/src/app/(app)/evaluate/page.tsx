// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Metadata } from "next";

import { KnowledgeTest } from "@/components/evaluate/knowledge-test";

export const metadata: Metadata = { title: "Knowledge test", robots: { index: false } };

// Evaluation (ROADMAP-v2 Phase 34): pre/post knowledge test run by a facilitator.
export default function EvaluatePage() {
  return <KnowledgeTest />;
}
