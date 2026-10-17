// SPDX-License-Identifier: AGPL-3.0-or-later
// Phase 24: target for the uptime monitor. Static (built once per deploy), so a 200 means
// the deployment is up and serving; it also tells you which build and model are live.
import { PINNED_MODEL_BASE_URL } from "@/lib/detector/models";

export function GET() {
  return Response.json({
    status: "ok",
    version: process.env.NEXT_PUBLIC_APP_VERSION,
    build: process.env.NEXT_PUBLIC_BUILD_ID,
    model: PINNED_MODEL_BASE_URL.split("/").pop(),
  });
}
