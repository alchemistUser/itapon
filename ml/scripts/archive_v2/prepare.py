# SPDX-License-Identifier: AGPL-3.0-or-later
"""Build the archive-v2 training set: the package's 12 classes plus the specific items.

Sources (all under ml/data/raw, git-ignored; see docs/archive-classifier.md for licences):
  - package dataset   12 broad classes (path passed with --package)
  - gwd/x_<item>/     GlobalWasteData folders, CC BY 4.0
  - kaggle-household/ Kaggle "Recyclable and Household Waste" (MIT; studio + real-world photos)
  - taco/             TACO litter photos, CC BY 4.0; bounding boxes are cropped per item
  - own/<item>/       the team's own phone photos (optional)

Writes ml/data/datasets/archive-v2/{images.npy,meta.json}: every image stretched to 192x192
(the same resize the browser worker does), de-duplicated by content hash, split by source photo.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import random
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
from PIL import Image

SIZE = 192
SEED = 20261103
EXT = {".jpg", ".jpeg", ".png"}
MIN_PER_CLASS = 100
OLD_CAP = 700  # per broad class; the specific items are what is new, the old ones only need to stay

# GlobalWasteData folder -> item key (app keys, see archive-classifier/hybrid.ts)
GWD = {"tetra_pak": "tetra_pack", "masks": "face_mask", "medicine_and_strip": "expired_medicine",
       "spray_cans": "spray_can"}
# Kaggle household-waste folder -> item key
KAGGLE = {"plastic_straws": "straw", "disposable_plastic_cutlery": "plastic_utensil",
          "styrofoam_cups": "styrofoam", "styrofoam_food_containers": "styrofoam", "aerosol_cans": "spray_can"}
# TACO category -> item key
TACO = {"Plastic straw": "straw", "Paper straw": "straw", "Plastic utensils": "plastic_utensil",
        "Crisp packet": "snack_wrapper", "Other plastic wrapper": "snack_wrapper",
        "Styrofoam piece": "styrofoam", "Foam food container": "styrofoam", "Foam cup": "styrofoam",
        "Tissues": "used_tissue", "Disposable food container": "soiled_food_container",
        "Drink carton": "tetra_pack", "Meal carton": "tetra_pack", "Aerosol": "spray_can"}


def load(img: Image.Image) -> np.ndarray:
    return np.asarray(img.convert("RGB").resize((SIZE, SIZE), Image.LANCZOS), dtype=np.uint8)


bad = 0


def open_ok(path: Path) -> Image.Image | None:
    global bad
    try:
        im = Image.open(path)
        im.load()
        return im
    except Exception:
        bad += 1
        return None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--package", type=Path, required=True)
    ap.add_argument("--raw", type=Path, default=Path("ml/data/raw"))
    ap.add_argument("--out", type=Path, default=Path("ml/data/datasets/archive-v2"))
    a = ap.parse_args()
    rnd = random.Random(SEED)
    rows: list[tuple[np.ndarray, str, str]] = []  # (pixels, class, group)

    base = a.package / "dataset" / "garbage_classification"
    for cdir in sorted(p for p in base.iterdir() if p.is_dir()):
        files = sorted(f for f in cdir.iterdir() if f.suffix.lower() in EXT)
        for f in rnd.sample(files, min(OLD_CAP, len(files))):
            im = open_ok(f)
            if im:
                rows.append((load(im), cdir.name, f"pkg:{f.name}"))

    for folder, item in GWD.items():
        for f in sorted((a.raw / "gwd" / f"x_{folder}").rglob("*")):
            if f.suffix.lower() in EXT:
                im = open_ok(f)
                if im:
                    rows.append((load(im), item, f"gwd:{folder}:{f.name}"))

    kag = a.raw / "kaggle-household" / "images" / "images"
    for folder, item in KAGGLE.items():
        for f in sorted((kag / folder).rglob("*")):
            if f.suffix.lower() in EXT:
                im = open_ok(f)
                if im:
                    rows.append((load(im), item, f"kaggle:{folder}:{f.parent.name}:{f.name}"))

    taco = a.raw / "taco"
    if (taco / "annotations.json").exists():
        d = json.loads((taco / "annotations.json").read_text(encoding="utf-8"))
        cat = {c["id"]: c["name"] for c in d["categories"]}
        img = {i["id"]: i for i in d["images"]}
        for an in d["annotations"]:
            item = TACO.get(cat[an["category_id"]])
            im = img[an["image_id"]]
            p = taco / "images" / im["file_name"].replace("/", "_")
            if not item or not p.exists():
                continue
            x, y, w, h = an["bbox"]
            if w < 48 or h < 48:
                continue
            k = Image.open(p).width / im["width"]  # the downloaded photo may be a smaller copy
            x, y, w, h = x * k, y * k, w * k, h * k
            pad = 0.15
            full = open_ok(p)
            if not full:
                continue
            if w < 1 or h < 1:
                continue
            full = full.convert("RGB")
            box = (max(0, x - pad * w), max(0, y - pad * h), min(full.width, x + w * (1 + pad)),
                   min(full.height, y + h * (1 + pad)))
            if box[2] - box[0] < 32 or box[3] - box[1] < 32:
                continue  # box falls outside the photo (rotated copy)
            rows.append((load(full.crop(tuple(int(v) for v in box))), item, f"taco:{im['id']}"))

    own = a.raw / "own"
    if own.exists():
        for cdir in sorted(p for p in own.iterdir() if p.is_dir()):
            for f in sorted(cdir.iterdir()):
                if f.suffix.lower() in EXT:
                    im = open_ok(f)
                    if im:
                        rows.append((load(im), cdir.name, f"own:{f.name}"))

    # exact duplicates: keep one; identical pixels under two classes are ambiguous, drop both
    seen: dict[str, int] = {}
    classes_of: dict[str, set[str]] = defaultdict(set)
    for i, (px, c, _) in enumerate(rows):
        h = hashlib.sha256(px.tobytes()).hexdigest()
        classes_of[h].add(c)
        seen.setdefault(h, i)
    keep = [i for h, i in seen.items() if len(classes_of[h]) == 1]
    keep.sort()
    rows = [rows[i] for i in keep]

    counts = Counter(c for _, c, _ in rows)
    kept = {c for c, n in counts.items() if n >= MIN_PER_CLASS}
    dropped = {c: n for c, n in counts.items() if c not in kept}
    rows = [r for r in rows if r[1] in kept]
    names = sorted(kept)

    # split by source photo so crops of one photo never land on both sides
    groups = sorted({g for _, _, g in rows})
    rnd.shuffle(groups)
    split_of = {g: ("train", "val", "test")[0 if k < 0.7 * len(groups) else 1 if k < 0.85 * len(groups) else 2]
                for k, g in enumerate(groups)}
    a.out.mkdir(parents=True, exist_ok=True)
    np.save(a.out / "images.npy", np.stack([r[0] for r in rows]))
    meta = {"class_names": names, "labels": [names.index(r[1]) for r in rows],
            "split": [split_of[r[2]] for r in rows], "group": [r[2] for r in rows]}
    (a.out / "meta.json").write_text(json.dumps(meta), encoding="utf-8")
    print("unreadable files skipped", bad)
    print("classes", len(names), "images", len(rows))
    print("per class", dict(Counter(r[1] for r in rows)))
    print("dropped (too few images)", dropped)
    print("split", dict(Counter(meta["split"])))


if __name__ == "__main__":
    main()
