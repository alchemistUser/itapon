// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Metadata } from "next";

import { Poster } from "./poster";

export const metadata: Metadata = { title: "QR poster", robots: { index: false } };

// Phase 25: printable pilot poster (no app chrome; outside the (app) layout).
export default function PosterPage() {
  return <Poster />;
}
