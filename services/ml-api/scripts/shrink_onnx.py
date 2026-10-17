# SPDX-License-Identifier: AGPL-3.0-or-later
"""Make smaller variants of an exported ONNX model for the browser (Phase 9).

    uv run --group build python scripts/shrink_onnx.py weights/itapon-world-v0-640.onnx \
        [--check img1.jpg ...]

Writes <name>-int8.onnx (dynamic INT8 weight quantization, ~4x smaller; float32 in/out).
--check prints detections, latency and size for the original and the INT8 variant, using
the same preprocessing as the web app.

FP16 was tried and dropped (2026-10-17): onnxconverter-common produces graphs ORT refuses
to load (Resize cast/type errors), and INT8 already meets the size target.
"""

import argparse
import sys
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort
from onnxruntime.quantization import QuantType, quantize_dynamic
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.classes import PROMPT_TO_CLASS  # noqa: E402

MIN_CONFIDENCE = 0.10


def to_int8(src: Path) -> Path:
    dst = src.with_name(f"{src.stem}-int8.onnx")
    quantize_dynamic(str(src), str(dst), weight_type=QuantType.QUInt8)
    return dst


def letterbox(img: Image.Image, size: int) -> np.ndarray:
    """Same preprocessing as apps/web/src/lib/detector (gray 114 padding, RGB 0–1, CHW)."""
    s = size / max(img.size)
    w, h = round(img.width * s), round(img.height * s)
    canvas = Image.new("RGB", (size, size), (114, 114, 114))
    canvas.paste(img.resize((w, h), Image.BILINEAR), ((size - w) // 2, (size - h) // 2))
    return (np.asarray(canvas, dtype=np.float32) / 255).transpose(2, 0, 1)[None]


def run(path: Path, images: list[Path]) -> None:
    sess = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    inp = sess.get_inputs()[0]
    size = inp.shape[-1]
    print(f"\n{path.name}  ({path.stat().st_size / 1e6:.1f} MB)")
    for img_path in images:
        x = letterbox(Image.open(img_path).convert("RGB"), size)
        sess.run(None, {inp.name: x})  # warm-up
        times = []
        for _ in range(5):
            t = time.perf_counter()
            out = sess.run(None, {inp.name: x})[0][0]
            times.append((time.perf_counter() - t) * 1000)
        dets = [
            (PROMPT_TO_CLASS[int(c)].key, round(float(sc), 3))
            for *_, sc, c in out
            if sc >= MIN_CONFIDENCE
        ]
        print(f"  {img_path.name:16} {sorted(times)[2]:6.0f} ms  {dets}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("onnx", type=Path)
    parser.add_argument("--check", nargs="*", type=Path, default=[])
    args = parser.parse_args()

    variants = [args.onnx, to_int8(args.onnx)]
    for v in variants:
        print(f"Saved {v.name} ({v.stat().st_size / 1e6:.1f} MB)")
    for v in variants if args.check else []:
        try:
            run(v, args.check)
        except Exception as exc:  # a variant ORT can't run is a result too
            print(f"\n{v.name}: FAILED to run: {exc}")


if __name__ == "__main__":
    main()
