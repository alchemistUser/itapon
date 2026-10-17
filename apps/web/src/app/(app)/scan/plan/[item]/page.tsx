// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PlanView } from "@/components/scan/plan-view";
import { MOCK_ITEMS, MOCK_PLAN } from "@/lib/mock";

export function generateStaticParams() {
  return MOCK_PLAN.map((item) => ({ item }));
}

export const metadata: Metadata = { title: "Before you sort" };

// S6 "Before you sort" (phone) / iPad master–detail with this item selected.
export default async function PlanItemPage(props: PageProps<"/scan/plan/[item]">) {
  const { item } = await props.params;
  if (!MOCK_ITEMS[item]) notFound();
  return <PlanView selected={item} mobile="detail" />;
}
