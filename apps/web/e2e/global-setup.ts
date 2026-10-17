// SPDX-License-Identifier: AGPL-3.0-or-later
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";

import { FAKE_VIDEO, SAMPLE_IMAGE } from "./fixtures";

/** Turns the sample photo into a 4-second Y4M clip for Chrome's fake camera (needs ffmpeg). */
export default function globalSetup() {
  rmSync(FAKE_VIDEO, { force: true });
  if (!existsSync(SAMPLE_IMAGE)) {
    console.log(`[e2e] No sample photo at ${SAMPLE_IMAGE}: the scan test will be skipped.`);
    return;
  }
  mkdirSync(dirname(FAKE_VIDEO), { recursive: true });
  const fit =
    "scale=640:480:force_original_aspect_ratio=decrease,pad=640:480:(ow-iw)/2:(oh-ih)/2,format=yuv420p";
  try {
    execFileSync(
      "ffmpeg",
      ["-y", "-loglevel", "error", "-loop", "1", "-i", SAMPLE_IMAGE, "-t", "4", "-r", "10"].concat([
        "-vf",
        fit,
        FAKE_VIDEO,
      ]),
      { stdio: "inherit" },
    );
  } catch {
    console.log("[e2e] ffmpeg not available: the scan test will be skipped.");
  }
}
