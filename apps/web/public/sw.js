// SPDX-License-Identifier: AGPL-3.0-or-later
// iTapon service worker (Phase 21). Hand-written (no build plugin) so it stays small and
// explicit:
//   - pages:        network first (fresh when online), cached copy offline, else /offline
//   - /_next/static, /ort/*: network first, cached copy offline. Not cache first: Turbopack's
//     worker bootstrap keeps its name across builds and reads its chunk list from the URL
//     fragment, and a worker's location comes from the response URL, so a cached copy
//     would start the previous build's worker (found in Phase 22). Online this is still
//     cheap: these files are "immutable" in the browser's HTTP cache.
//   - other same-origin GETs: stale-while-revalidate
// The model itself is cached by the detector worker (itapon-models-v1, D12), not here.
// Cross-origin requests (Supabase, Hugging Face) pass straight through.
// The page posts {type: "warm", build, urls} once per deploy, and we pre-cache those pages
// (Bin Guide, scanner, item pages) plus the scripts and styles they reference.
// Phase 30: the disposal library's JSON files are pre-cached too, and an item page that was
// never visited falls back to /library/offline-item, which renders it from those files.

const PAGES = "itapon-pages-v1";
const STATIC = "itapon-static-v2"; // v2: drops v1's stale worker bootstrap entries
const RUNTIME = "itapon-runtime-v2";
const KEEP = [PAGES, STATIC, RUNTIME, "itapon-models-v1"];
const MAX_STATIC = 800; // old deploys' chunks are trimmed oldest-first beyond this

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith("itapon-") && !KEEP.includes(name)) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

const isPage = (req) =>
  req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(k);
}

async function networkFirstPage(req) {
  const cache = await caches.open(PAGES);
  const key = new URL(req.url);
  key.search = ""; // one copy per path
  try {
    const res = await fetch(req);
    if (res.ok && res.type === "basic") await cache.put(key.href, res.clone());
    return res;
  } catch {
    const libraryItem = key.pathname.startsWith("/library/item/")
      ? await cache.match(new URL("/library/offline-item", self.location.origin).href)
      : undefined;
    return (
      (await cache.match(key.href)) ||
      libraryItem ||
      (await cache.match(new URL("/offline", self.location.origin).href)) ||
      new Response("You're offline.", { status: 503, headers: { "Content-Type": "text/plain" } })
    );
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok && res.type === "basic") await cache.put(req, res.clone());
    return res;
  } catch (e) {
    const hit = await cache.match(req);
    if (hit) return hit;
    throw e;
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(RUNTIME);
  const hit = await cache.match(req);
  const update = fetch(req)
    .then(async (res) => {
      if (res.ok && res.type === "basic") await cache.put(req, res.clone());
      return res;
    })
    .catch(() => hit || Response.error());
  return hit || update;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js" || url.pathname.startsWith("/dev")) return;
  // Next.js client navigations fetch RSC payloads; if one fails offline, Next falls back to
  // a full navigation, which the page handler below serves from the cache.
  if (req.headers.get("RSC") || url.searchParams.has("_rsc")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/ort/")) {
    event.respondWith(networkFirst(req, STATIC));
  } else if (isPage(req)) {
    event.respondWith(networkFirstPage(req));
  } else if (!url.pathname.startsWith("/models/")) {
    event.respondWith(staleWhileRevalidate(req));
  }
});

// ---------------------------------------------------------------- warm-up (per deploy)

const ASSET_RE = /(?:src|href)="(\/_next\/static\/[^"]+)"/g;

async function warm(build, urls) {
  const meta = await caches.open(RUNTIME);
  const marker = new URL("/__itapon_warm__", self.location.origin).href;
  const done = await meta.match(marker);
  if (done && (await done.text()) === build) return;

  const pages = await caches.open(PAGES);
  const statics = await caches.open(STATIC);
  const assets = new Set();
  for (const path of urls) {
    try {
      const res = await fetch(path, { credentials: "same-origin" });
      if (!res.ok) continue;
      const html = await res.clone().text();
      await pages.put(new URL(path, self.location.origin).href, res);
      for (const m of html.matchAll(ASSET_RE)) assets.add(m[1].replace(/&amp;/g, "&"));
    } catch {
      return; // went offline mid-way: try again next time
    }
  }
  for (const a of assets) {
    if (await statics.match(a)) continue;
    try {
      const res = await fetch(a);
      if (res.ok) await statics.put(a, res);
    } catch {
      return;
    }
  }
  await trim(STATIC, MAX_STATIC);
  if (!(await warmLibrary(meta))) return;
  await meta.put(marker, new Response(build));
}

/** The library index and every group file, at the URLs the app asks for (versioned). */
async function warmLibrary(cache) {
  try {
    const res = await fetch("/library/index.json");
    if (!res.ok) return true; // no library in this build
    const index = await res.clone().json();
    await cache.put(new URL("/library/index.json", self.location.origin).href, res);
    const v = encodeURIComponent(index.content_version);
    const pages = await caches.open(PAGES);
    for (const m of index.materials.filter((m) => !m.parent)) {
      const url = `/library/groups/${m.code}.json?v=${v}`;
      if (!(await cache.match(url))) {
        const g = await fetch(url);
        if (g.ok) await cache.put(url, g);
      }
      const page = `/library/${m.code.toLowerCase()}`; // group pages (item pages: offline-item)
      const p = await fetch(page, { credentials: "same-origin" });
      if (p.ok) await pages.put(new URL(page, self.location.origin).href, p);
    }
    return true;
  } catch {
    return false; // offline mid-way: try again next time
  }
}

self.addEventListener("message", (event) => {
  const d = event.data || {};
  if (d.type === "warm" && typeof d.build === "string" && Array.isArray(d.urls)) {
    event.waitUntil(
      warm(
        d.build,
        d.urls.filter((u) => typeof u === "string" && u.startsWith("/")),
      ),
    );
  }
});
