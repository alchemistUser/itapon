// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Metadata } from "next";

import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

// Phase 19: institution analytics + kiosk management. Data is protected by RLS (admins see
// only their own institution); the page itself just hides the UI from non-admins.
export default function AdminPage() {
  return <AdminDashboard />;
}
