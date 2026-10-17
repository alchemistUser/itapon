// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";

import { enqueue, flushQueue, MAX_QUEUED, memoryQueue } from "./log-queue";

const item = (n: number) => ({
  payload: n,
  createdAt: `2026-10-18T00:00:${String(n % 60).padStart(2, "0")}Z`,
});

describe("scan log queue", () => {
  it("sends oldest first and stops at the first network failure", async () => {
    const q = memoryQueue<number>();
    for (const n of [1, 2, 3, 4]) await enqueue(q, item(n));
    const seen: number[] = [];
    const r = await flushQueue(q, async (i) => {
      seen.push(i.payload);
      return i.payload === 3 ? "retry" : "sent";
    });
    expect(seen).toEqual([1, 2, 3]);
    expect(r).toEqual({ sent: 2, left: 2 });
    expect((await q.all()).map(([, i]) => i.payload)).toEqual([3, 4]);
  });

  it("drops items the server rejects instead of retrying forever", async () => {
    const q = memoryQueue<number>();
    for (const n of [1, 2]) await enqueue(q, item(n));
    const r = await flushQueue(q, async (i) => (i.payload === 1 ? "drop" : "sent"));
    expect(r).toEqual({ sent: 1, left: 0 });
    expect(await q.all()).toEqual([]);
  });

  it("keeps at most MAX_QUEUED items, dropping the oldest", async () => {
    const q = memoryQueue<number>();
    for (let n = 1; n <= MAX_QUEUED + 3; n++) await enqueue(q, item(n));
    const all = await q.all();
    expect(all).toHaveLength(MAX_QUEUED);
    expect(all[0][1].payload).toBe(4);
  });
});
