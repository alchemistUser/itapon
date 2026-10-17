# SPDX-License-Identifier: AGPL-3.0-or-later
"""Bake iTapon's text prompts into YOLO-World weights (decision D11).

Run once (needs the `build` dependency group for CLIP):
    uv run --group build python scripts/build_world_model.py

Writes weights/itapon-world-v0.pt. The API loads that file without CLIP,
because set_classes() stores the text embeddings inside the model.
"""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ultralytics import YOLOWorld  # noqa: E402

from app.classes import PROMPTS, WASTE_CLASSES  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--base", default="yolov8s-worldv2.pt", help="Ultralytics YOLO-World weights"
    )
    parser.add_argument("--out", default=str(ROOT / "weights" / "itapon-world-v0.pt"))
    args = parser.parse_args()

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)

    model = YOLOWorld(str(out.parent / args.base))
    model.set_classes(list(PROMPTS))
    model.save(str(out))

    meta = {
        "model_version": f"world-v0 ({Path(args.base).stem})",
        "base": args.base,
        "prompts": list(PROMPTS),
        "classes": [c.key for c in WASTE_CLASSES],
    }
    out.with_suffix(".json").write_text(json.dumps(meta, indent=2))
    print(f"Saved {out} with {len(PROMPTS)} prompts / {len(WASTE_CLASSES)} classes")


if __name__ == "__main__":
    main()
