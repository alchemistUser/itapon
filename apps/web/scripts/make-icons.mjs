// SPDX-License-Identifier: AGPL-3.0-or-later
// Renders the PWA / home-screen icons (Phase 21) from the in-app logo: the lucide Recycle
// mark in white on bin-blue. Run after changing the logo: node scripts/make-icons.mjs
import { writeFile } from "node:fs/promises";

import { Recycle } from "lucide-react";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { ImageResponse } = await import("next/dist/compiled/@vercel/og/index.node.js");

const BLUE = "#0a84ff";
const svg = renderToStaticMarkup(h(Recycle, { color: "#ffffff", strokeWidth: 2.25, size: 24 }));
const mark = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

// name, size, padding (share of the canvas kept around the mark), rounded corners
const VARIANTS = [
  ["icon-192.png", 192, 0.12, 0.22],
  ["icon-512.png", 512, 0.12, 0.22],
  ["icon-maskable-512.png", 512, 0.22, 0], // Android crops to a circle/squircle: full bleed
  ["apple-touch-icon.png", 180, 0.12, 0], // iOS rounds the corners itself
];

for (const [name, size, pad, radius] of VARIANTS) {
  const inner = Math.round(size * (1 - 2 * pad));
  const el = h(
    "div",
    {
      style: {
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BLUE,
        borderRadius: Math.round(size * radius),
      },
    },
    h("img", { src: mark, width: inner, height: inner }),
  );
  const res = new ImageResponse(el, { width: size, height: size });
  await writeFile(
    new URL(`../public/icons/${name}`, import.meta.url),
    Buffer.from(await res.arrayBuffer()),
  );
  console.log("wrote", name);
}
