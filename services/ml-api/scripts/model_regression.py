# SPDX-License-Identifier: AGPL-3.0-or-later
"""Model regression test (ROADMAP Phase 23, task 4).

Runs one ONNX model (the browser's exact pipeline, see evaluate_field.py) on a fixed,
labelled image set and fails if accuracy drops below the committed baseline:

    uv run --group build python scripts/model_regression.py \\
      --set ../../ml/regression-set --model weights/itapon-world-v0-480-int8.onnx

The set is `labels.csv` (file, class_key, category; category "none" = no waste item) plus
the images. It must hold only photos the team may publish: own or CC-licensed, no faces,
IDs or screens. `baseline.json` in the set stores the accepted scores; pass --update to
rewrite it after a deliberate model change (reviewed in the PR).
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

from scripts.evaluate_field import fmt, run_model, score

TOLERANCE = 0.0  # any drop fails; the set is fixed, so results are deterministic


def regressions(result: dict, baseline: dict, tol: float = TOLERANCE) -> list[str]:
    """Metrics that fell below the baseline (pure; tested)."""
    out = []
    if result["item_acc"] < baseline["item_acc"] - tol:
        out.append(f"item accuracy {result['item_acc']:.0%} < {baseline['item_acc']:.0%}")
    for b, acc in baseline["bin_acc"].items():
        got = result["bin_acc"].get(b, 0.0)
        if got < acc - tol:
            out.append(f"{b} accuracy {got:.0%} < {acc:.0%}")
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--set", type=Path, required=True)
    ap.add_argument("--model", type=Path, required=True)
    ap.add_argument("--update", action="store_true", help="accept current scores as baseline")
    args = ap.parse_args()

    labels = args.set / "labels.csv"
    if not labels.exists():
        print(f"No regression set at {args.set}; nothing to check.")
        return 0
    truth = list(csv.DictReader(labels.open(encoding="utf-8")))
    result = score(run_model(args.model, [args.set / t["file"] for t in truth]), truth)
    print(f"{args.model.name}: {fmt(result)}")

    base_path = args.set / "baseline.json"
    if args.update or not base_path.exists():
        keep = {k: result[k] for k in ("n", "item_acc", "bin_acc")}
        base_path.write_text(json.dumps(keep, indent=2) + "\n", encoding="utf-8")
        print(f"Baseline written to {base_path}.")
        return 0
    drops = regressions(result, json.loads(base_path.read_text(encoding="utf-8")))
    for d in drops:
        print(f"REGRESSION: {d}", file=sys.stderr)
    return 1 if drops else 0


if __name__ == "__main__":
    raise SystemExit(main())
