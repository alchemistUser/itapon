import type { NextConfig } from "next";

// Cross-origin isolation lets onnxruntime-web use multi-threaded WASM (D12).
// Site-wide (Phase 12): isolation is decided per document load, so a visit that starts on
// "/" and client-navigates to /scan would otherwise stay single-threaded, and the model is
// preloaded from any page (F9-1). Everything cross-origin we load uses CORS (HF model,
// Supabase); OAuth (Phase 16) must use redirects, not popups, under COOP same-origin.
// Covers /_next/static and /ort too: workers created by an isolated page must also be
// served with COEP or the browser blocks them (ERR_BLOCKED_BY_RESPONSE).
const crossOriginIsolation = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
];

const nextConfig: NextConfig = {
  // Changes every deploy; the service worker re-caches the offline pages when it changes.
  env: {
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA ?? `local-${Date.now()}`,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: crossOriginIsolation },
      {
        // Phase 21: always revalidate the service worker so updates reach users quickly.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
