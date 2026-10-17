// SPDX-License-Identifier: AGPL-3.0-or-later
// Offline scan-log queue (Phase 21). Scanning works offline (D12); a scan that couldn't be
// logged is kept in IndexedDB on this device and sent, with its original time, once the
// connection is back. Nothing but the log payload is stored (no images).
"use client";

export interface QueuedScan<T> {
  payload: T;
  createdAt: string; // ISO, when the result locked
}

export interface QueueStore<T> {
  all(): Promise<[IDBValidKey, QueuedScan<T>][]>;
  add(item: QueuedScan<T>): Promise<void>;
  remove(key: IDBValidKey): Promise<void>;
}

export const MAX_QUEUED = 500; // ~4 days of a busy kiosk; older entries are dropped first

/** Sends queued items oldest first. Stops at the first network failure; drops rejected ones. */
export async function flushQueue<T>(
  store: QueueStore<T>,
  send: (item: QueuedScan<T>) => Promise<"sent" | "retry" | "drop">,
): Promise<{ sent: number; left: number }> {
  const items = await store.all();
  let sent = 0;
  for (let i = 0; i < items.length; i++) {
    const [key, item] = items[i];
    const r = await send(item);
    if (r === "retry") return { sent, left: items.length - i };
    await store.remove(key);
    if (r === "sent") sent++;
  }
  return { sent, left: 0 };
}

export async function enqueue<T>(store: QueueStore<T>, item: QueuedScan<T>) {
  const items = await store.all();
  for (const [key] of items.slice(0, Math.max(0, items.length - MAX_QUEUED + 1))) {
    await store.remove(key);
  }
  await store.add(item);
}

// ---------------------------------------------------------------------------
// IndexedDB store
// ---------------------------------------------------------------------------

const DB = "itapon";
const STORE = "scan-log-queue";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<R>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<R> | void) {
  return openDb().then(
    (db) =>
      new Promise<R | undefined>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        t.oncomplete = () => {
          db.close();
          resolve(req ? req.result : undefined);
        };
        t.onerror = () => {
          db.close();
          reject(t.error);
        };
      }),
  );
}

export function idbQueue<T>(): QueueStore<T> {
  return {
    async all() {
      const keys = ((await tx("readonly", (s) => s.getAllKeys())) ?? []) as IDBValidKey[];
      const values = ((await tx("readonly", (s) => s.getAll())) ?? []) as QueuedScan<T>[];
      return keys.map((k, i) => [k, values[i]] as [IDBValidKey, QueuedScan<T>]);
    },
    async add(item) {
      await tx("readwrite", (s) => s.add(item));
    },
    async remove(key) {
      await tx("readwrite", (s) => s.delete(key));
    },
  };
}

/** In-memory store (tests, and browsers without IndexedDB). */
export function memoryQueue<T>(): QueueStore<T> {
  const m = new Map<number, QueuedScan<T>>();
  let n = 0;
  return {
    all: async () => [...m.entries()],
    add: async (item) => void m.set(++n, item),
    remove: async (key) => void m.delete(key as number),
  };
}
