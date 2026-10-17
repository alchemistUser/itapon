// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { ArrowLeft, ArrowRight, Monitor, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";

import { BinTile } from "@/components/bins/bins";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { registerKiosk, updateDevice, type AdminDevice } from "@/lib/admin";
import { CATEGORIES } from "@/lib/analytics";
import { BINS } from "@/lib/bins";
import type { Category } from "@/lib/detector/types";

const inputCls =
  "h-10 w-full rounded-control border border-line bg-white px-3 text-sm text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none";

/** Left-to-right order of the physical bins; arrows swap neighbours. */
function BinOrderEditor({
  order,
  onChange,
}: {
  order: Category[];
  onChange: (o: Category[]) => void;
}) {
  const move = (i: number, d: -1 | 1) => {
    const next = [...order];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Bin order, left to right">
      {order.map((c, i) => (
        <li key={c} className="flex items-center gap-1 rounded-tile border border-line px-1.5 py-1">
          <button
            type="button"
            aria-label={`Move ${BINS[c].name} left`}
            disabled={i === 0}
            onClick={() => move(i, -1)}
            className="flex size-8 items-center justify-center rounded disabled:opacity-30"
          >
            <ArrowLeft aria-hidden className="size-4" />
          </button>
          <BinTile category={c} size="sm" />
          <span className="text-xs text-ink-2">{BINS[c].shortName}</span>
          <button
            type="button"
            aria-label={`Move ${BINS[c].name} right`}
            disabled={i === order.length - 1}
            onClick={() => move(i, 1)}
            className="flex size-8 items-center justify-center rounded disabled:opacity-30"
          >
            <ArrowRight aria-hidden className="size-4" />
          </button>
        </li>
      ))}
    </ol>
  );
}

function DeviceRow({ device, onSaved }: { device: AdminDevice; onSaved: () => void }) {
  const [order, setOrder] = useState(device.binOrder);
  const [status, setStatus] = useState<string | null>(null);
  const dirty = order.join() !== device.binOrder.join();
  return (
    <li className="flex flex-col gap-2 border-t border-line pt-3 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-ink">
          <Monitor aria-hidden className="mr-1.5 inline size-4 text-ink-3" />
          {device.label}
          {device.locationNote ? (
            <span className="ml-2 text-sm font-normal text-ink-3">{device.locationNote}</span>
          ) : null}
        </p>
        <span className="text-xs text-ink-3">
          {device.linked ? "Kiosk account linked" : "No kiosk account"}
        </span>
      </div>
      <BinOrderEditor order={order} onChange={setOrder} />
      {dirty ? (
        <Button
          size="sm"
          className="self-start"
          onClick={async () => {
            const r = await updateDevice(device.id, { bin_order: order });
            setStatus(r.error ?? "Saved. The kiosk picks it up on its next reload.");
            if (!r.error) onSaved();
          }}
        >
          Save bin order
        </Button>
      ) : null}
      {status ? (
        <p className="text-xs text-ink-3" role="status">
          {status}
        </p>
      ) : null}
    </li>
  );
}

export function DevicesPanel({
  devices,
  onChange,
}: {
  devices: AdminDevice[];
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("");
  const [location, setLocation] = useState("");
  const [order, setOrder] = useState<Category[]>(CATEGORIES);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await registerKiosk({ email, label, location, binOrder: order });
    setBusy(false);
    if (r.error) return setMessage({ ok: false, text: r.error });
    setMessage({ ok: true, text: `Registered “${label}”. Reload /kiosk on that device.` });
    setEmail("");
    setLabel("");
    setLocation("");
    setOpen(false);
    onChange();
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">Kiosks</h2>
        <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <Plus aria-hidden className="size-4" /> Register a kiosk
        </Button>
      </div>

      {open ? (
        <form onSubmit={submit} className="flex flex-col gap-3 rounded-tile bg-surface p-4">
          <p className="text-sm text-ink-3">
            First sign in on the kiosk device with its own email (Account → Sign in). Then enter
            that email here. See docs/kiosk-setup.md.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-ink">Kiosk account email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-ink">Name</span>
              <input
                required
                maxLength={60}
                placeholder="Canteen kiosk"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-ink">Location (optional)</span>
              <input
                maxLength={120}
                placeholder="Ground floor, near the exit"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={inputCls}
              />
            </label>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-ink">Physical bins, left to right</span>
            <BinOrderEditor order={order} onChange={setOrder} />
          </div>
          <Button type="submit" disabled={busy} className="self-start">
            {busy ? "Registering…" : "Register kiosk"}
          </Button>
        </form>
      ) : null}

      {message ? (
        <p
          role={message.ok ? "status" : "alert"}
          className={message.ok ? "text-sm text-ink" : "text-sm text-[#c4282d]"}
        >
          {message.text}
        </p>
      ) : null}

      {devices.length ? (
        <ul className="flex flex-col gap-3">
          {devices.map((d) => (
            <DeviceRow key={`${d.id}-${d.binOrder.join()}`} device={d} onSaved={onChange} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-3">No kiosks yet.</p>
      )}
    </Card>
  );
}
