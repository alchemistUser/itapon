// SPDX-License-Identifier: AGPL-3.0-or-later
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { DropoffFinder } from "@/components/library/dropoff-finder";
import { PageTitle, Skeleton } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Drop-off finder",
  description:
    "Where to bring e-waste, batteries, hazardous waste and recyclables: junk shops, health centres, take-back and city programmes.",
};

async function Finder({ searchParams }: { searchParams: PageProps<"/library/dropoff">["searchParams"] }) {
  const { type } = await searchParams;
  return <DropoffFinder initialType={typeof type === "string" ? type : undefined} />;
}

// Drop-off finder (Phase 30). The list comes from the library index (city points) and,
// for signed-in institution members, their campus points from Supabase.
export default function DropoffPage(props: PageProps<"/library/dropoff">) {
  return (
    <div className="flex flex-col gap-6 md:max-w-3xl">
      <Link
        href="/library"
        className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-medium text-brand-strong"
      >
        <ChevronLeft aria-hidden className="size-4" /> Library
      </Link>
      <PageTitle title="Drop-off finder" subtitle="Where to bring what doesn't go in a bin" />
      <Suspense fallback={<Skeleton className="h-40" />}>
        <Finder searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
