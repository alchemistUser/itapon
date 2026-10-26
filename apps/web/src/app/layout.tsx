// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { DetectorPreloader } from "@/components/shell/detector-preloader";
import { OfflineSupport } from "@/components/shell/offline-support";
import { PrefsApplier } from "@/components/shell/prefs-applier";

import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "iTapon", template: "%s · iTapon" },
  description: "Scan your waste and find out which bin it goes in.",
  applicationName: "iTapon",
  appleWebApp: { capable: true, title: "iTapon", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0a84ff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // lets env(safe-area-inset-*) work on notched phones
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <head>
        {/* The models (archive classifier 9 MB, YOLO fallback 13 MB) come from the Hugging Face CDN (D12): open the connection early. */}
        <link rel="preconnect" href="https://huggingface.co" crossOrigin="anonymous" />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <DetectorPreloader />
        <PrefsApplier />
        <OfflineSupport />
      </body>
    </html>
  );
}
