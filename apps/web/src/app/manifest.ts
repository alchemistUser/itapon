// SPDX-License-Identifier: AGPL-3.0-or-later
import type { MetadataRoute } from "next";

// Phase 21. orientation "any" rather than portrait: the same app runs landscape on kiosks.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "iTapon: which bin does it go in?",
    short_name: "iTapon",
    description: "Scan your waste and find out which bin it goes in. Works offline.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f2f4f7",
    theme_color: "#0a84ff",
    lang: "en",
    categories: ["education", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Scan", url: "/scan", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      {
        name: "Bin Guide",
        url: "/guide",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
