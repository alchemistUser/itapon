// SPDX-License-Identifier: AGPL-3.0-or-later
import { readdirSync } from "node:fs";
import { join } from "node:path";

import type { Metadata } from "next";

import { DetectorLab } from "./detector-lab";

export const metadata: Metadata = { title: "Detector test · iTapon" };

// Optional local test photos in public/dev-samples (git-ignored).
function listSamples(): string[] {
  try {
    return readdirSync(join(process.cwd(), "public", "dev-samples"))
      .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
      .map((f) => `/dev-samples/${f}`);
  } catch {
    return [];
  }
}

export default function DetectorPage() {
  return <DetectorLab samples={listSamples()} />;
}
