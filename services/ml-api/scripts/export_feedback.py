# SPDX-License-Identifier: AGPL-3.0-or-later
"""Export reviewed feedback photos as a labelled field set (ROADMAP Phase 20, task 4-5).

Reads approved feedback rows that have a consented photo, downloads the photos from the
private `training-images` bucket and writes:

    <out>/images/<feedback_id>.jpg
    <out>/labels.csv   file, class_key, category, predicted_class_key, model_version, feedback_id

`class_key` is the reviewer's label; an empty class_key with category "none" means "not a
waste item" (a negative: the model should find nothing). The folder is the "field" test set
for scripts/evaluate_field.py and the seed of the next dataset version. It contains user
photos: keep it out of git (it is in .gitignore) and delete it when the evaluation is done.

Needs the service role (bypasses RLS, so it sees every institution and personal phones):

    SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=... \\
      uv run python scripts/export_feedback.py --out field-set/2026-10

Never commit or paste the service role key; set it only in your own terminal.
"""

from __future__ import annotations

import argparse
import csv
import os
import sys
from pathlib import Path

import httpx

FIELDS = ["file", "class_key", "category", "predicted_class_key", "model_version", "feedback_id"]
SELECT = (
    "id,model_version,image_path,reviewed_class_key,"
    "scan_detections(class_key),waste_items!feedback_reviewed_class_key_fkey(category_key)"
)


def manifest_rows(rows: list[dict]) -> list[dict]:
    """API rows → labels.csv rows (pure; tested)."""
    out = []
    for r in rows:
        if not r.get("image_path"):
            continue
        label = r.get("reviewed_class_key")
        item = r.get("waste_items") or {}
        out.append(
            {
                "file": f"images/{r['id']}.jpg",
                "class_key": label or "",
                "category": item.get("category_key") if label else "none",
                "predicted_class_key": (r.get("scan_detections") or {}).get("class_key", ""),
                "model_version": r.get("model_version") or "",
                "feedback_id": r["id"],
            }
        )
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--since", help="only feedback created on/after this date (YYYY-MM-DD)")
    args = ap.parse_args()

    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your shell.", file=sys.stderr)
        return 2
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    params = {
        "select": SELECT,
        "review_status": "eq.approved",
        "image_path": "not.is.null",
        "consent": "is.true",
        "order": "created_at",
    }
    if args.since:
        params["created_at"] = f"gte.{args.since}"

    with httpx.Client(base_url=url, headers=headers, timeout=60) as http:
        res = http.get("/rest/v1/feedback", params=params)
        res.raise_for_status()
        rows = res.json()
        manifest = manifest_rows(rows)
        paths = {r["id"]: r["image_path"] for r in rows if r.get("image_path")}

        (args.out / "images").mkdir(parents=True, exist_ok=True)
        for m in manifest:
            img = http.get(f"/storage/v1/object/training-images/{paths[m['feedback_id']]}")
            img.raise_for_status()
            (args.out / m["file"]).write_bytes(img.content)

    with (args.out / "labels.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(manifest)
    print(f"Exported {len(manifest)} approved photos to {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
