// SPDX-License-Identifier: AGPL-3.0-or-later
// Download, cache and integrity-check model files inside a worker. Shared by the YOLO worker
// and the archive classifier worker so both follow the same rules (D12, Phase 22).
import { MODEL_CACHE } from "./models";

export type ProgressFn = (loaded: number, total?: number) => void;

export async function fetchWithCache(url: string, onProgress?: ProgressFn) {
  let cache: Cache | null = null;
  try {
    cache = await caches.open(MODEL_CACHE);
    const hit = await cache.match(url);
    if (hit) return { buffer: await hit.arrayBuffer(), fromCache: true };
  } catch {
    cache = null; // Cache API unavailable (private mode, http): just download
  }

  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Download failed (${res.status}) for ${url}`);
  const total = Number(res.headers.get("content-length")) || undefined;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    onProgress?.(loaded, total);
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  if (cache) {
    await cache.put(url, new Response(bytes, { headers: res.headers })).catch(() => {});
  }
  return { buffer: bytes.buffer, fromCache: false };
}

export async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return Array.from(d, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Phase 22: refuse files that don't match the hash pinned in the app (and drop the cache copy). */
export async function verify(url: string, data: ArrayBuffer, expected: string | null) {
  if (expected === null) return; // dev / preview tag: not pinned
  if ((await sha256Hex(data)) === expected) return;
  try {
    await (await caches.open(MODEL_CACHE)).delete(url);
  } catch {
    /* no cache */
  }
  throw new Error("The scanner model failed its integrity check. Reload to download it again.");
}

/** Small JSON file: network first, cached copy when offline (Phase 21), then verified. */
export async function fetchJsonCached<T>(url: string, sha256: string | null): Promise<T> {
  let cache: Cache | null = null;
  try {
    cache = await caches.open(MODEL_CACHE);
  } catch {
    cache = null;
  }
  let res: Response | undefined;
  try {
    res = await fetch(url);
    if (!res.ok) throw new Error(`Labels download failed (${res.status})`);
    await cache?.put(url, res.clone()).catch(() => {});
  } catch (e) {
    res = await cache?.match(url);
    if (!res) throw e;
  }
  const bytes = await res.arrayBuffer();
  await verify(url, bytes, sha256);
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

/**
 * Drop cached files of other versions of THIS engine's model once the pinned one is loaded
 * (D12). `filePrefix` scopes it, so loading one model never evicts the other engine's files.
 */
export async function evictOtherModels(keep: string[], filePrefix: string) {
  try {
    const cache = await caches.open(MODEL_CACHE);
    for (const req of await cache.keys()) {
      const file = new URL(req.url).pathname.split("/").pop() ?? "";
      if (file.startsWith(filePrefix) && !keep.includes(req.url)) await cache.delete(req);
    }
  } catch {
    /* Cache API unavailable */
  }
}
