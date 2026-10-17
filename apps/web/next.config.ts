import type { NextConfig } from "next";

// Cross-origin isolation lets onnxruntime-web use multi-threaded WASM (D12).
// Scoped to the scanner routes so it can't break OAuth redirects or embeds elsewhere.
const crossOriginIsolation = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
];

const nextConfig: NextConfig = {
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
      { source: "/scan/:path*", headers: crossOriginIsolation },
      { source: "/scan", headers: crossOriginIsolation },
      { source: "/dev/:path*", headers: crossOriginIsolation },
      // A worker created by an isolated page must itself be served with COEP,
      // otherwise the browser blocks it (ERR_BLOCKED_BY_RESPONSE). No effect on normal scripts.
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cross-Origin-Embedder-Policy", value: "require-corp" }],
      },
      // Same for onnxruntime-web's own thread workers, spawned from /ort/*.mjs.
      {
        source: "/ort/:path*",
        headers: [{ key: "Cross-Origin-Embedder-Policy", value: "require-corp" }],
      },
    ];
  },
};

export default nextConfig;
