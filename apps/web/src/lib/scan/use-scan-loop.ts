// SPDX-License-Identifier: AGPL-3.0-or-later
// Live detection loop (Phase 12): one frame in the worker at a time, at most ~4 fps,
// paused while the tab is hidden; stops itself when a result locks.
"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import { detect } from "@/lib/detector/store";
import type { Detection } from "@/lib/detector/types";

import { evaluateStability, topOf, type FrameTop, type Stability } from "./stability";

const MIN_FRAME_INTERVAL_MS = 250;

export interface ScanFrame {
  detections: Detection[];
  inferenceMs: number;
  width: number; // video frame size the boxes are normalized to
  height: number;
}

export interface ScanLoopState {
  frame: ScanFrame | null;
  stability: Stability;
  fps: number;
  error: string | null;
}

const INITIAL: ScanLoopState = {
  frame: null,
  stability: { status: "searching" },
  fps: 0,
  error: null,
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useScanLoop(
  videoRef: RefObject<HTMLVideoElement | null>,
  { enabled, onLock }: { enabled: boolean; onLock?: (s: Stability, frame: ScanFrame) => void },
) {
  const [state, setState] = useState<ScanLoopState>(INITIAL);
  const onLockRef = useRef(onLock);
  useEffect(() => {
    onLockRef.current = onLock;
  }, [onLock]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const history: (FrameTop | null)[] = [];
    const times: number[] = [];

    async function run() {
      while (!cancelled) {
        const video = videoRef.current;
        if (!video || document.hidden || video.readyState < 2 || !video.videoWidth) {
          await sleep(200);
          continue;
        }
        const started = performance.now();
        try {
          const { detections, inferenceMs } = await detect(video);
          if (cancelled) return;
          const frame: ScanFrame = {
            detections,
            inferenceMs,
            width: video.videoWidth,
            height: video.videoHeight,
          };
          history.push(topOf(detections));
          if (history.length > 8) history.shift();
          const stability = evaluateStability(history);
          times.push(performance.now());
          if (times.length > 6) times.shift();
          const fps =
            times.length > 1 ? ((times.length - 1) * 1000) / (times.at(-1)! - times[0]) : 0;
          setState({ frame, stability, fps: Math.round(fps * 10) / 10, error: null });
          if (stability.status === "locked") {
            onLockRef.current?.(stability, frame);
            return; // parent shows the result; it re-enables the loop for the next scan
          }
        } catch (e) {
          if (cancelled) return;
          setState((s) => ({ ...s, error: (e as Error).message }));
          await sleep(1000);
        }
        const elapsed = performance.now() - started;
        if (elapsed < MIN_FRAME_INTERVAL_MS) await sleep(MIN_FRAME_INTERVAL_MS - elapsed);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [enabled, videoRef]);

  return state;
}
