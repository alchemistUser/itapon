// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

// Live scanner (Phase 12): camera → in-browser detector → stability gate → result.
// Phone: full-screen camera + bottom sheet. Tablet/desktop: camera above (md) or beside (lg)
// the result panel. Falls back to "take a photo" when the camera can't be used.
import { Camera, Flashlight, FlashlightOff, RefreshCw, SwitchCamera } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { BinTile } from "@/components/bins/bins";
import {
  CameraChrome,
  ResultPanel,
  ResultSheet,
  SheetShell,
  type ResultView,
} from "@/components/scan/scan-views";
import { Button, ButtonLink } from "@/components/ui/button";
import { WarmingUpOverlay } from "@/components/ui/warming-up-overlay";
import { BINS } from "@/lib/bins";
import { cn } from "@/lib/cn";
import { getItem } from "@/lib/content";
import { CONFIDENT_THRESHOLD, POSSIBLE_THRESHOLD } from "@/lib/detector/models";
import { detect, ensureDetector, retryDetector, useDetectorState } from "@/lib/detector/store";
import type { Detection } from "@/lib/detector/types";
import { topOf } from "@/lib/scan/stability";
import { useCamera, type CameraStatus } from "@/lib/scan/use-camera";
import { useScanLoop, type ScanFrame } from "@/lib/scan/use-scan-loop";

const SLOW_AFTER_MS = 10_000;
const GIVE_UP_AFTER_MS = 90_000;

function toView(classKey: string, confidence?: number): ResultView | null {
  const item = getItem(classKey);
  return item
    ? {
        classKey,
        name: item.name,
        category: item.category,
        instruction: item.instruction,
        confidence,
      }
    : null;
}

/** Seconds since the detector started loading, ticking while it loads. */
function useLoadingElapsed(startedAt: number | null, loading: boolean) {
  // Clock is read only inside the timer: reading Date.now() during render would be frozen
  // into the prerendered page (Next "blocking-prerender-current-time-client").
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!loading) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [loading]);
  return loading && startedAt && now ? Math.max(0, now - startedAt) : 0;
}

/** Element size of the camera box (to map normalized boxes onto an object-cover video). */
function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setSize({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

function BoxOverlay({
  detections,
  frameW,
  frameH,
  boxW,
  boxH,
}: {
  detections: Detection[];
  frameW: number;
  frameH: number;
  boxW: number;
  boxH: number;
}) {
  if (!frameW || !frameH || !boxW || !boxH) return null;
  // object-cover: scale to fill, crop the overflow equally on both sides
  const scale = Math.max(boxW / frameW, boxH / frameH);
  const offX = (boxW - frameW * scale) / 2;
  const offY = (boxH - frameH * scale) / 2;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
      {detections
        .filter((d) => d.confidence >= POSSIBLE_THRESHOLD)
        .map((d, i) => {
          const left = offX + d.bbox.x1 * frameW * scale;
          const top = offY + d.bbox.y1 * frameH * scale;
          const width = (d.bbox.x2 - d.bbox.x1) * frameW * scale;
          const height = (d.bbox.y2 - d.bbox.y1) * frameH * scale;
          const bin = BINS[d.default_category];
          const confident = d.confidence >= CONFIDENT_THRESHOLD;
          return (
            <div
              key={`${d.class_key}-${i}`}
              className={cn(
                "absolute rounded-lg border-[3px] transition-all duration-200",
                confident ? "border-solid" : "border-dashed",
                bin.border,
              )}
              style={{ left, top, width, height }}
            >
              <span
                className={cn(
                  "absolute -top-6 left-0 rounded-md px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap text-white",
                  bin.solid,
                )}
              >
                {getItem(d.class_key)?.name ?? d.class_key} {Math.round(d.confidence * 100)}%
              </span>
            </div>
          );
        })}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur hover:bg-black/40"
    >
      {children}
    </button>
  );
}

const CAMERA_PROBLEMS: Partial<Record<CameraStatus, { title: string; text: string }>> = {
  denied: {
    title: "Camera access is blocked",
    text: "Allow camera access for this site in your browser settings (tap the lock or ⓘ icon next to the address), then reload. Or take a photo instead.",
  },
  unavailable: {
    title: "No camera available",
    text: "We couldn't find a camera, or another app is using it. You can take a photo instead.",
  },
  insecure: {
    title: "Camera needs a secure connection",
    text: "Open iTapon over https:// to use the live camera. You can still take a photo.",
  },
  error: {
    title: "The camera didn't start",
    text: "Try reloading the page, or take a photo instead.",
  },
};

export function ScanScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [camBoxRef, camSize] = useElementSize<HTMLDivElement>();
  const camera = useCamera(videoRef);
  const det = useDetectorState();
  const loadingMs = useLoadingElapsed(det.startedAt, det.status === "loading");

  const [locked, setLocked] = useState<{ view: ResultView; frame: ScanFrame | null } | null>(null);
  const [photo, setPhoto] = useState<{ url: string; frame: ScanFrame } | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => ensureDetector(), []);

  const ready = det.status === "ready";
  const scanning = ready && camera.status === "live" && !locked && !photo && !photoBusy;

  const onLock = useCallback((s: { classKey: string; confidence: number }, frame: ScanFrame) => {
    const view = toView(s.classKey, s.confidence);
    if (!view) return;
    // Browsers ignore (and log) vibrate() before the user has interacted with the page.
    if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(40);
    setLocked({ view, frame });
  }, []);

  const loop = useScanLoop(videoRef, {
    enabled: scanning,
    onLock: (s, frame) => s.status === "locked" && onLock(s, frame),
  });

  function next() {
    setLocked(null);
    setPhotoError(null);
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto(null);
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoError(null);
    setPhotoBusy(true); // pauses the live loop while the photo is analysed
    const url = URL.createObjectURL(file);
    try {
      const img = await createImageBitmap(file);
      const frame: ScanFrame = {
        detections: [],
        inferenceMs: 0,
        width: img.width,
        height: img.height,
      };
      const result = await detect(img);
      frame.detections = result.detections;
      frame.inferenceMs = result.inferenceMs;
      setPhoto({ url, frame });
      const top = topOf(result.detections);
      if (top && top.confidence >= POSSIBLE_THRESHOLD) {
        const view = toView(top.classKey, top.confidence);
        if (view) setLocked({ view, frame });
      } else {
        setPhotoError(
          "We couldn't recognise an item in that photo. Try again closer, or check the Bin Guide.",
        );
      }
    } catch (e) {
      URL.revokeObjectURL(url);
      setPhotoError((e as Error).message);
    } finally {
      setPhotoBusy(false);
    }
  }

  // ---------- what to show ----------
  const cameraProblem = CAMERA_PROBLEMS[camera.status];
  const giveUp = det.status === "error" || loadingMs > GIVE_UP_AFTER_MS;
  const shownFrame = photo?.frame ?? locked?.frame ?? loop.frame;
  const tentative =
    loop.stability.status === "tentative"
      ? toView(loop.stability.classKey, loop.stability.confidence)
      : null;

  let hint = "Hold the item steady in the frame";
  if (tentative && (tentative.confidence ?? 0) < CONFIDENT_THRESHOLD)
    hint = "Move closer or add more light";
  else if (tentative) hint = "Hold steady…";

  const photoInput = (
    <input
      ref={fileRef}
      type="file"
      accept="image/*"
      capture="environment"
      className="hidden"
      onChange={(e) => {
        void onPhoto(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );
  const takePhoto = () => fileRef.current?.click();

  const cameraArea = (
    <div
      ref={camBoxRef}
      className="relative isolate flex-1 overflow-hidden bg-[#0b0d12] md:rounded-[28px]"
    >
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        aria-label="Live camera preview"
        className={cn("absolute inset-0 size-full object-cover", photo && "invisible")}
      />
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- local blob preview
        <img src={photo.url} alt="Your photo" className="absolute inset-0 size-full object-cover" />
      ) : null}
      {shownFrame ? (
        <BoxOverlay
          detections={shownFrame.detections}
          frameW={shownFrame.width}
          frameH={shownFrame.height}
          boxW={camSize.w}
          boxH={camSize.h}
        />
      ) : null}
      <CameraChrome
        title={photo ? "Photo" : "Scanning"}
        hint={locked ? "" : hint}
        showFrame={!locked && !photo}
        actions={
          camera.status === "live" && !photo ? (
            <>
              {camera.torchSupported ? (
                <IconButton
                  label={camera.torchOn ? "Turn torch off" : "Turn torch on"}
                  onClick={camera.toggleTorch}
                >
                  {camera.torchOn ? (
                    <FlashlightOff className="size-5" />
                  ) : (
                    <Flashlight className="size-5" />
                  )}
                </IconButton>
              ) : null}
              {camera.canSwitch ? (
                <IconButton label="Switch camera" onClick={camera.switchCamera}>
                  <SwitchCamera className="size-5" />
                </IconButton>
              ) : null}
            </>
          ) : null
        }
      />

      {/* detector warming up (D3) */}
      {det.status !== "ready" && !giveUp && !cameraProblem ? (
        <WarmingUpOverlay
          className="absolute inset-0 z-20"
          loadedMB={
            det.progress?.phase === "download" ? (det.progress.loaded ?? 0) / 1e6 : undefined
          }
          totalMB={det.progress?.phase === "download" ? (det.progress.total ?? 0) / 1e6 : undefined}
          slow={loadingMs > SLOW_AFTER_MS}
        />
      ) : null}

      {/* detector failed or is taking too long */}
      {giveUp && !photo ? (
        <div
          role="alert"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-ink/90 px-6 text-center text-white"
        >
          <p className="text-lg font-semibold">The scanner is taking longer than usual</p>
          {det.error ? <p className="text-sm text-white/80">{det.error}</p> : null}
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={retryDetector}>
              <RefreshCw aria-hidden className="size-4" /> Retry
            </Button>
            <ButtonLink href="/guide" variant="outline">
              Browse the Bin Guide
            </ButtonLink>
          </div>
        </div>
      ) : null}

      {/* camera can't be used */}
      {cameraProblem && !photo ? (
        <div
          role="alert"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-ink/95 px-6 text-center text-white"
        >
          <Camera aria-hidden className="size-10 text-white/70" />
          <p className="text-lg font-semibold">{cameraProblem.title}</p>
          <p className="max-w-sm text-sm text-white/80">{cameraProblem.text}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={takePhoto} disabled={!ready}>
              <Camera aria-hidden className="size-4" /> Take a photo
            </Button>
            <ButtonLink href="/guide" variant="outline">
              Bin Guide
            </ButtonLink>
          </div>
        </div>
      ) : null}
    </div>
  );

  // ---------- status / result areas ----------
  const statusContent =
    loop.error && !photoError ? (
      // The loop retries every second; tell the user instead of silently showing nothing.
      <div role="alert">
        <p className="font-semibold text-ink">The scanner hit a problem</p>
        <p className="mt-1 text-sm text-ink-3">Retrying… ({loop.error})</p>
        <Button variant="outline" className="mt-3" onClick={retryDetector}>
          <RefreshCw aria-hidden className="size-4" /> Restart scanner
        </Button>
      </div>
    ) : photoError ? (
      <>
        <p className="font-semibold text-ink">Not sure what that is</p>
        <p className="mt-1 text-sm text-ink-3">{photoError}</p>
        <div className="mt-4 flex gap-3">
          <Button variant="outline" onClick={next}>
            Back to camera
          </Button>
          <ButtonLink href="/guide">Bin Guide</ButtonLink>
        </div>
      </>
    ) : tentative ? (
      <div className="flex items-center gap-3">
        <BinTile category={tentative.category} size="md" className="opacity-60" />
        <div>
          <p className="text-xs font-medium text-ink-3">Possibly</p>
          <p className="font-semibold text-ink">{tentative.name}</p>
          <p className="text-sm text-ink-3">{hint}</p>
        </div>
      </div>
    ) : (
      <>
        <p className="font-semibold text-ink">Point your camera at an item</p>
        <p className="mt-1 text-sm text-ink-3">
          Keep it inside the frame. iTapon will tell you which bin it goes in.
        </p>
      </>
    );

  const photoLink = (
    <button
      type="button"
      onClick={takePhoto}
      disabled={!ready}
      className="mt-3 mb-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-strong disabled:opacity-50"
    >
      <Camera aria-hidden className="size-4" /> Take a photo instead
    </button>
  );

  return (
    <>
      {photoInput}
      <p className="sr-only" role="status" aria-live="polite">
        {locked ? `${locked.view.name}. ${BINS[locked.view.category].binLabel}.` : ""}
      </p>

      {/* One camera element for every layout. Phone: camera fills the screen with a bottom
          sheet. md: camera above the panel. lg: side by side (Figma website / tablet). */}
      <div className="flex min-h-dvh flex-col md:grid md:min-h-0 md:grid-rows-[minmax(380px,50vh)_auto] md:gap-8 lg:min-h-[600px] lg:grid-cols-2 lg:grid-rows-1">
        <div className="flex flex-1 flex-col">{cameraArea}</div>

        <div className="md:hidden">
          {locked ? (
            <ResultSheet item={locked.view} onNext={next} />
          ) : (
            <SheetShell label="Scanner status">
              {statusContent}
              {!photoError ? photoLink : null}
            </SheetShell>
          )}
        </div>

        <div className="hidden md:flex md:flex-col">
          {locked ? (
            <ResultPanel item={locked.view} onNext={next} className="flex-1 py-4" />
          ) : (
            <section
              aria-label="Scanner status"
              className="flex flex-1 flex-col justify-center gap-2 py-4"
            >
              {statusContent}
              {!photoError ? photoLink : null}
              <p className="mt-auto text-xs text-ink-3">
                {ready
                  ? `On-device scanner · ${loop.fps || "–"} fps`
                  : "Loading the on-device scanner…"}{" "}
                ·{" "}
                <Link href="/guide" className="underline">
                  Bin Guide
                </Link>
              </p>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
