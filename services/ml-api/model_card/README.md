---
license: agpl-3.0
library_name: onnx
pipeline_tag: object-detection
tags:
  - yolo-world
  - ultralytics
  - onnx
  - onnxruntime-web
  - waste-classification
  - zero-shot-object-detection
base_model: Ultralytics/YOLOv8
---

# iTapon YOLO-World (v0, zero-shot)

The waste detector behind **[iTapon](https://github.com/alchemistUser/itapon)**, a mobile-first web app that tells users which bin an item goes in (Biodegradable / Recyclable / Residual / Hazardous, following the Philippine RA 9003 categories). It's a CS 406 Machine Learning project at the Technological Institute of the Philippines, Quezon City.

> **v0 is zero-shot, not trained on our own data.** It is Ultralytics `yolov8s-worldv2` with the 23 iTapon classes baked in as 46 text prompts (custom vocabulary), exported to ONNX for in-browser inference. A model trained on a local dataset is planned and will replace it under a new tag.

## Files

| File | Size | Use |
|---|---|---|
| `itapon-world-v0-480-int8.onnx` | 13.2 MB | **Default** for the web app (dynamic INT8 quantization, 480 px input) |
| `itapon-world-v0-640-int8.onnx` | 13.3 MB | Option for strong devices / kiosks (640 px input: slower, higher scores) |
| `itapon-world-v0.labels.json` | 5 KB | Output class index → `class_key`, `default_category` |
| `SHA256SUMS` | — | Checksums |

## Input / output

- **Input** `images`: float32 `[1, 3, 480, 480]` (or 640 for the 640 file), RGB scaled 0–1, letterboxed (aspect ratio kept, gray `114` padding, centered).
- **Output**: float32 `[1, 10, 6]`, one row per detection: `x1, y1, x2, y2` (input pixels), `score`, `class_index`. Class-agnostic NMS is built in (IoU 0.5, score ≥ 0.10). Rows with lower scores are padding.
- Map `class_index` through `labels.json`. Several prompts map to the same `class_key`.

## Classes (23)

Recyclable: plastic_bottle, plastic_cup, aluminum_can, glass_bottle, paper_bag, cardboard, paper_sheet ·
Biodegradable: banana_peel, food_scraps, leaves, used_tissue ·
Residual: snack_wrapper, styrofoam, plastic_utensil, straw, tetra_pack, soiled_food_container, sanitary_napkin, face_mask ·
Hazardous: battery, light_bulb, expired_medicine, spray_can

The bin shown to users comes from the app's database, not from this model, so local rules can differ without retraining.

## Usage (browser)

```js
import * as ort from "onnxruntime-web/wasm";
const session = await ort.InferenceSession.create(
  "https://huggingface.co/alchemistUserhf/itapon-yolo/resolve/v0.1/itapon-world-v0-480-int8.onnx",
);
const out = await session.run({ images: new ort.Tensor("float32", chw, [1, 3, 480, 480]) });
```

See `apps/web/src/lib/detector/` in the repo for the full pre- and post-processing.

## Evaluation

There's no accuracy evaluation yet. v0 has only been smoke-tested on a few photos (paper bag and plastic cup detected correctly). Desktop Chrome (WASM, 4 threads): ~420 ms per frame at p50.

## Limitations

- Zero-shot accuracy is uneven. Visually similar classes (wrappers, Tetra Pak, clean vs. greasy paper) are weak.
- The model can't judge contamination (greasy vs. clean). The app shows a caveat instead.
- Scores are not calibrated probabilities. The app uses display tiers (≥ 0.35 confident, ≥ 0.15 "possibly").

## License

AGPL-3.0, matching Ultralytics YOLO. Source: https://github.com/alchemistUser/itapon
