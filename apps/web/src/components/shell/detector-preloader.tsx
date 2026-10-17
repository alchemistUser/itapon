// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { preloadDetectorWhenIdle } from "@/lib/detector/store";

/** Starts downloading the scanner model in the background on any page (F9-1, D3). */
export function DetectorPreloader() {
  const path = usePathname();
  const skip = path.startsWith("/dev"); // dev pages manage their own detectors
  useEffect(() => (skip ? undefined : preloadDetectorWhenIdle()), [skip]);
  return null;
}
