# SPDX-License-Identifier: AGPL-3.0-or-later
"""Compare the current and a candidate ONNX model on a field set (ROADMAP Phase 20, task 5-6).

Runs the exact browser models (same letterbox, embedded NMS, labels.json, ignore labels and
the 0.15 "possible" floor) on images from scripts/export_feedback.py and applies the
promotion rule:

  * at least MIN_IMAGES labelled images (otherwise: keep the current model, not enough data);
  * candidate item accuracy >= current, and
  * candidate accuracy >= current for every bin that has images (including "none" = negatives).

There are no boxes in feedback, so this measures the top prediction (what the user sees),
not mAP. mAP stays the job of a box-labelled test set once a trained model exists.

    uv run --group build python scripts/evaluate_field.py --set field-set/2026-10 \\
      --current v0.1/itapon-world-v0-640-int8.onnx --candidate weights/itapon-world-v0-640-int8.onnx
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from pathlib import Path

POSSIBLE = 0.15
MIN_IMAGES = 30
BINS = ["biodegradable", "recyclable", "residual", "hazardous", "none"]


def top_prediction(rows, labels: list[dict]) -> tuple[str, str]:
    """(class_key, category) of the best usable detection, or ("", "none")."""
    best = None
    for *_, score, cls in rows:
        if score < POSSIBLE:
            continue
        lab = labels[int(round(cls))] if 0 <= int(round(cls)) < len(labels) else None
        if not lab or lab.get("ignore") or lab["default_category"] == "none":
            continue
        if best is None or score > best[0]:
            best = (score, lab)
    return (best[1]["class_key"], best[1]["default_category"]) if best else ("", "none")


def score(preds: list[tuple[str, str]], truth: list[dict]) -> dict:
    """Item and per-bin accuracy of top predictions against labels.csv rows (pure; tested)."""
    per_bin: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    item_ok = 0
    for (cls, cat), t in zip(preds, truth, strict=True):
        ok_item = cls == t["class_key"] if t["category"] != "none" else cls == ""
        item_ok += ok_item
        b = per_bin[t["category"]]
        b[0] += cat == t["category"]
        b[1] += 1
    n = len(truth)
    return {
        "n": n,
        "item_acc": item_ok / n if n else 0.0,
        "bin_acc": {k: v[0] / v[1] for k, v in per_bin.items()},
        "bin_n": {k: v[1] for k, v in per_bin.items()},
    }


def decide(current: dict, candidate: dict, min_images: int = MIN_IMAGES) -> tuple[bool, str]:
    if candidate["n"] < min_images:
        return False, f"keep current: only {candidate['n']} field images (need {min_images})"
    if candidate["item_acc"] < current["item_acc"]:
        return False, "keep current: lower item accuracy"
    worse = [b for b, a in candidate["bin_acc"].items() if a < current["bin_acc"].get(b, 0)]
    if worse:
        return False, f"keep current: lower accuracy for {', '.join(worse)}"
    return True, "promote candidate: no metric is worse"


def run_model(onnx_path: Path, images: list[Path]) -> list[tuple[str, str]]:
    import numpy as np
    import onnxruntime as ort
    from PIL import Image

    labels_path = onnx_path.parent / "itapon-world-v0.labels.json"
    labels = json.loads(labels_path.read_text(encoding="utf-8"))["labels"]
    sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    inp = sess.get_inputs()[0]
    size = inp.shape[-1]
    out = []
    for p in images:
        img = Image.open(p).convert("RGB")
        s = size / max(img.size)
        w, h = round(img.width * s), round(img.height * s)
        canvas = Image.new("RGB", (size, size), (114, 114, 114))
        canvas.paste(img.resize((w, h), Image.BILINEAR), ((size - w) // 2, (size - h) // 2))
        x = (np.asarray(canvas, dtype=np.float32) / 255).transpose(2, 0, 1)[None]
        rows = sess.run(None, {inp.name: x})[0][0].tolist()
        out.append(top_prediction(rows, labels))
    return out


def fmt(r: dict) -> str:
    bins = ", ".join(
        f"{b} {r['bin_acc'][b]:.0%} (n={r['bin_n'][b]})" for b in BINS if b in r["bin_n"]
    )
    return f"item {r['item_acc']:.0%} on {r['n']} images; per bin: {bins}"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--set", type=Path, required=True, help="folder with labels.csv + images/")
    ap.add_argument("--current", type=Path, required=True)
    ap.add_argument("--candidate", type=Path, required=True)
    ap.add_argument("--min-images", type=int, default=MIN_IMAGES)
    args = ap.parse_args()

    truth = list(csv.DictReader((args.set / "labels.csv").open(encoding="utf-8")))
    images = [args.set / t["file"] for t in truth]
    cur = score(run_model(args.current, images), truth)
    cand = score(run_model(args.candidate, images), truth)
    promote, why = decide(cur, cand, args.min_images)
    print(f"current   ({args.current}): {fmt(cur)}")
    print(f"candidate ({args.candidate}): {fmt(cand)}")
    print(f"decision: {why}")
    return 0 if promote else 1


if __name__ == "__main__":
    raise SystemExit(main())
