// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { useEffect } from "react";

import { reportError } from "@/lib/monitoring";

// Phase 24: last-resort screen when the root layout itself fails. It renders its own document
// without the app's stylesheet, so styles are inline.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => reportError("react", error), [error]);
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f2f4f7",
          color: "#0f1115",
        }}
      >
        <title>Something went wrong · iTapon</title>
        <main style={{ textAlign: "center", padding: 24, maxWidth: 360 }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "#565d69", marginBottom: 20 }}>
            iTapon hit an unexpected error. It has been reported.
          </p>
          <button
            onClick={() => retry()}
            style={{
              background: "#0a84ff",
              color: "#fff",
              border: 0,
              borderRadius: 10,
              padding: "12px 20px",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
