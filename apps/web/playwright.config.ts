// SPDX-License-Identifier: AGPL-3.0-or-later
// End-to-end tests (Phase 23) against the production build: `pnpm build && pnpm e2e`.
import { defineConfig, devices } from "@playwright/test";

import { FAKE_VIDEO } from "./e2e/fixtures";

const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  webServer: {
    command: `pnpm exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"] }, testIgnore: /(scan|soak)\.spec/ },
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /(scan|soak)\.spec/ },
    {
      // Fake camera: a looped sample photo (see global-setup.ts).
      name: "scan",
      testMatch: /(scan|soak)\.spec/,
      use: {
        ...devices["Desktop Chrome"],
        permissions: ["camera"],
        launchOptions: {
          args: [
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
            `--use-file-for-fake-video-capture=${FAKE_VIDEO}`,
          ],
        },
      },
    },
  ],
});
