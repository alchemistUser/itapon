import type { NextConfig } from "next";

import pkg from "./package.json" with { type: "json" };

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

// Phase 22 security headers. The CSP is production-only (dev needs eval for Fast Refresh).
// 'unsafe-inline' scripts: Next streams RSC data in inline <script> tags and pages are
// prerendered, so per-request nonces aren't available; every other source is pinned.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'", // onnxruntime-web WASM (D12)
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co", // feedback photos (signed URLs)
  "font-src 'self'",
  // Supabase (REST, auth, storage, realtime) and the model on the Hugging Face CDN
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://huggingface.co https://*.huggingface.co https://*.hf.co",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self), screen-wake-lock=(self)",
  },
];

const nextConfig: NextConfig = {
  // Changes every deploy; the service worker re-caches the offline pages when it changes.
  env: {
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA ?? `local-${Date.now()}`,
    NEXT_PUBLIC_APP_VERSION: pkg.version, // Phase 24: shown in the footer and /api/health
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
      {
        source: "/:path*",
        headers: [
          ...crossOriginIsolation,
          ...(process.env.NODE_ENV === "production" ? securityHeaders : []),
        ],
      },
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
