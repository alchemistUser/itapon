# SPDX-License-Identifier: AGPL-3.0-or-later
"""Export the custom-vocabulary YOLO-World weights to ONNX for in-browser inference (D12).

    uv run --group build python scripts/export_onnx.py [--imgsz 640] [--check img1.jpg ...]

Writes, next to the .pt:
  itapon-world-v0-<imgsz>.onnx    NMS embedded (class-agnostic); output [1, max_det, 6] =
                                  x1, y1, x2, y2 (input pixels), score, class index
  itapon-world-v0.labels.json     class index -> class_key / default_category for the web app

--check compares ONNX detections against the PyTorch model on the given images.
"""

import argparse
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ultralytics import YOLO  # noqa: E402

from app.classes import PROMPT_TO_CLASS  # noqa: E402

PREDICT = {"conf": 0.10, "iou": 0.5, "max_det": 10, "agnostic_nms": True, "verbose": False}


def summarize(result) -> list[tuple[str, float]]:
    return [
        (PROMPT_TO_CLASS[int(c)].key, round(float(s), 3))
        for c, s in zip(result.boxes.cls.tolist(), result.boxes.conf.tolist(), strict=True)
    ]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--weights", default=str(ROOT / "weights" / "itapon-world-v0.pt"))
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--max-det", type=int, default=10)
    parser.add_argument("--check", nargs="*", default=[], help="images for a .pt vs .onnx check")
    args = parser.parse_args()

    weights = Path(args.weights)
    model = YOLO(str(weights))
    exported = Path(
        model.export(
            format="onnx",
            imgsz=args.imgsz,
            nms=True,
            agnostic_nms=True,
            conf=PREDICT["conf"],  # embedded NMS cutoff; keep low so the "possibly" tier survives
            max_det=args.max_det,
            simplify=True,
            dynamic=False,
        )
    )
    onnx_path = weights.with_name(f"{weights.stem}-{args.imgsz}.onnx")
    shutil.move(exported, onnx_path)

    meta_file = weights.with_suffix(".json")
    meta = json.loads(meta_file.read_text()) if meta_file.exists() else {}
    labels = {
        "model_version": meta.get("model_version", weights.stem),
        "imgsz": args.imgsz,
        "output": "[1, max_det, 6] = x1, y1, x2, y2 (input px), score, class_index",
        "labels": [
            {"index": i, "class_key": c.key, "default_category": c.default_category}
            for i, c in enumerate(PROMPT_TO_CLASS)
        ],
    }
    weights.with_name(f"{weights.stem}.labels.json").write_text(json.dumps(labels, indent=2))
    print(f"Saved {onnx_path} ({onnx_path.stat().st_size / 1e6:.1f} MB)")

    if args.check:
        onnx_model = YOLO(str(onnx_path), task="detect")
        for img in args.check:
            pt = summarize(model.predict(img, imgsz=args.imgsz, **PREDICT)[0])
            ox = summarize(onnx_model.predict(img, imgsz=args.imgsz, **PREDICT)[0])
            print(f"{Path(img).name}\n  pt:   {pt}\n  onnx: {ox}")


if __name__ == "__main__":
    main()
