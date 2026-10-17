# SPDX-License-Identifier: AGPL-3.0-or-later
"""Delete shared feedback photos older than the retention period (ROADMAP Phase 22).

The privacy notice promises shared photos are deleted after 12 months. This removes the
files from the private `training-images` bucket through the Storage API, then clears
`image_path`/`consent` on their feedback rows (the answer itself is kept, without a photo).

    SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=... \\
      uv run python scripts/purge_feedback_photos.py [--months 12] [--dry-run]

Runs monthly in .github/workflows/retention.yml once the two secrets are set there.
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import UTC, datetime, timedelta

import httpx

BATCH = 100


def cutoff(now: datetime, months: int) -> datetime:
    """Start of the retention window (30-day months, so it never keeps a photo too long)."""
    return now - timedelta(days=30 * months)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--months", type=int, default=12)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.", file=sys.stderr)
        return 2
    before = cutoff(datetime.now(UTC), args.months).isoformat()
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}

    total = 0
    with httpx.Client(base_url=url, headers=headers, timeout=60) as http:
        while True:
            res = http.get(
                "/rest/v1/feedback",
                params={
                    "select": "id,image_path",
                    "image_path": "not.is.null",
                    "created_at": f"lt.{before}",
                    "limit": str(BATCH),
                },
            )
            res.raise_for_status()
            rows = res.json()
            if not rows:
                break
            if args.dry_run:
                print(f"would delete {len(rows)} photos (first batch only)")
                return 0
            paths = [r["image_path"] for r in rows]
            rm = http.request(
                "DELETE", "/storage/v1/object/training-images", json={"prefixes": paths}
            )
            rm.raise_for_status()
            ids = ",".join(r["id"] for r in rows)
            up = http.patch(
                "/rest/v1/feedback",
                params={"id": f"in.({ids})"},
                json={"image_path": None, "consent": False},
            )
            up.raise_for_status()
            total += len(rows)
    print(f"Deleted {total} shared photos older than {args.months} months (before {before}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
