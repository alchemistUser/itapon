// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Metadata } from "next";

import { AccountView } from "@/components/account/account-view";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

// Phase 16: save history (email), sign in, preferences, delete my data.
export default function AccountPage() {
  return <AccountView />;
}
