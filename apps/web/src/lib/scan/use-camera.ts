// SPDX-License-Identifier: AGPL-3.0-or-later
// Camera access for the scanner (Phase 12). Back camera by default; handles permission and
// device errors; supports front/back switching and the torch where the browser allows.
"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export type CameraStatus =
  | "starting"
  | "live"
  | "denied" // user or OS blocked camera permission
  | "unavailable" // no camera, or it's busy in another app
  | "insecure" // camera needs HTTPS (or localhost)
  | "error";

type Facing = "environment" | "user";

interface TorchCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
}

export function useCamera(videoRef: RefObject<HTMLVideoElement | null>) {
  const [status, setStatus] = useState<CameraStatus>("starting");
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<Facing>("environment");
  const [canSwitch, setCanSwitch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    const video = videoRef.current; // the element this effect run attaches the stream to

    async function start() {
      if (!window.isSecureContext) return setStatus("insecure");
      if (!navigator.mediaDevices?.getUserMedia) return setStatus("unavailable");
      setStatus("starting");
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (cancelled || !video) return;
        video.srcObject = stream;
        await video.play(); // needs muted + playsInline on iOS
        if (cancelled) return;

        const track = stream.getVideoTracks()[0];
        trackRef.current = track;
        const caps = (track.getCapabilities?.() ?? {}) as TorchCapabilities;
        setTorchSupported(Boolean(caps.torch));
        setTorchOn(false);
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) setCanSwitch(devices.filter((d) => d.kind === "videoinput").length > 1);
        setError(null);
        setStatus("live");
      } catch (e) {
        if (cancelled) return;
        const name = (e as DOMException).name;
        setError((e as Error).message);
        if (name === "NotAllowedError" || name === "SecurityError") setStatus("denied");
        else if (
          name === "NotFoundError" ||
          name === "NotReadableError" ||
          name === "OverconstrainedError"
        )
          setStatus("unavailable");
        else if (name !== "AbortError") setStatus("error");
      }
    }

    void start();
    // Runs on unmount and when the route is hidden (Next keeps hidden routes mounted with
    // <Activity>, but cleans up effects), so the camera light turns off when you leave.
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      trackRef.current = null;
      if (video) video.srcObject = null;
    };
  }, [facing, videoRef]);

  const switchCamera = useCallback(
    () => setFacing((f) => (f === "environment" ? "user" : "environment")),
    [],
  );

  const toggleTorch = useCallback(async () => {
    const track = trackRef.current;
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  }, [torchOn]);

  return { status, error, facing, canSwitch, switchCamera, torchSupported, torchOn, toggleTorch };
}
