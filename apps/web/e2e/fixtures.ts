// SPDX-License-Identifier: AGPL-3.0-or-later
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Photo used as the fake camera feed. The dev samples are private (gitignored), so CI skips
 * the scan test unless E2E_SAMPLE_IMAGE points to a photo the team can commit.
 */
export const SAMPLE_IMAGE =
  process.env.E2E_SAMPLE_IMAGE ?? join(__dirname, "..", "public", "dev-samples", "bag_cup.jpg");
export const FAKE_VIDEO = join(__dirname, ".cache", "fake-camera.y4m");
export const hasFakeCamera = () => existsSync(FAKE_VIDEO);
