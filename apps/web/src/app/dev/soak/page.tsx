// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Metadata } from "next";

import { SoakTest } from "./soak-test";

export const metadata: Metadata = { title: "Soak test · iTapon", robots: { index: false } };

export default function SoakPage() {
  return <SoakTest />;
}
