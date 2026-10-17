# iTapon ML API

A stateless FastAPI service: **image in, waste detections out**. It runs **zero-shot YOLO-World** (decision D11): the 23 spec classes are given as text prompts and baked into custom-vocabulary weights, so no training is needed. Trained weights from Phases 5–7 can replace them later with no change to the API contract.

> **D12: production inference runs in the browser.** Free Hugging Face accounts can no longer host Docker Spaces, so the web app runs an **ONNX export** of this model with `onnxruntime-web`. This FastAPI service stays as the **reference implementation**: it defines the detection contract the browser module copies, and it's used for tests, batch evaluation, and as a fallback for any future paid host.

## Run locally

```bash
uv sync --group build                                   # first time only: installs CLIP for the build step
uv run --group build python scripts/build_world_model.py  # → weights/itapon-world-v0.pt (~26 MB)
uv sync                                                 # back to runtime deps (removes CLIP)
uv run uvicorn app.main:app --reload --port 7860        # http://localhost:7860/docs
```

The model loads in the background. `/health` reports `model_loaded: false` until it's ready (a few seconds), and `/v1/detect` returns `503` with `Retry-After: 5` until then.

## Export for the browser (ONNX)

```bash
uv sync --group build
uv run --group build python scripts/export_onnx.py --imgsz 640 --check path/to/photo.jpg
```

This writes `weights/itapon-world-v0-640.onnx` and `weights/itapon-world-v0.labels.json`.

| Item | Value |
|---|---|
| Input | `images` float32 `[1, 3, 640, 640]`, RGB scaled 0–1, letterboxed (gray 114 padding) |
| Output | `[1, 10, 6]` = `x1, y1, x2, y2` (input pixels), `score`, `class_index`, with class-agnostic NMS built in (cutoff 0.10) |
| Labels | `labels.json`: class index → `class_key`, `default_category` (46 prompts → 23 classes) |
| Size | **50.5 MB** (fp32). Shrinking it is a Phase 9 task |

Parity on the 3 smoke photos (raw `onnxruntime`, browser-style preprocessing): `paper_bag` 0.59 / 0.64 and `plastic_cup` 0.37 (+ `paper_bag` 0.26), at ~125–150 ms per image on a laptop CPU. That's the same top result as PyTorch.

## Endpoints (contract v1)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | `{status, model_loaded, error}` |
| GET | `/v1/model` | Model version, the 23 classes with default bins, display thresholds |
| POST | `/v1/detect` | `multipart/form-data` field `image` (JPEG/PNG/WebP, ≤ 2 MB) → detections |

```bash
curl -F "image=@bag.jpg;type=image/jpeg" http://localhost:7860/v1/detect
```

```json
{
  "model_version": "world-v0 (yolov8s-worldv2)",
  "inference_ms": 157,
  "image": { "width": 431, "height": 640 },
  "detections": [
    { "class_key": "paper_bag", "confidence": 0.5761,
      "bbox": { "x1": 0.03, "y1": 0.12, "x2": 0.97, "y2": 0.80 },
      "default_category": "recyclable" }
  ]
}
```

- `bbox` values are normalized (0–1).
- The client maps `class_key` → bin through Supabase. `default_category` is only a fallback.
- Display tiers: `confidence ≥ 0.35` confident, `≥ 0.15` "possibly", otherwise ignore (from `/v1/model`).

## Changing classes or prompts

Edit `app/classes.py`, then rebuild the weights. Prompt order defines the model's class indices, so the API refuses to start if the weights and `classes.py` disagree.

## Tests

```bash
uv run pytest            # fast tests (fake detector)
uv run pytest -m slow    # loads the real weights
uv run ruff check . && uv run ruff format --check .
```

## Phase 8 results (2026-10-17, local CPU)

| Check | Result |
|---|---|
| Crumpled paper bag (Figma test photos) | `paper_bag` 0.58 / 0.67 → Recyclable ✅ |
| Paper bag + plastic cup | `plastic_cup` 0.57 ✅, `paper_bag` 0.13 (shown as "possibly") |
| Stray guesses | ≤ 0.12, below the 0.15 "possibly" cutoff |
| Inference latency (30 runs) | p50 157 ms · p95 165 ms (target ≤ 300 ms ✅) |
| Runs without CLIP installed | ✅ (text embeddings are baked into the weights) |
| Docker image | Not built (Docker Desktop not set up). Kept for an optional paid host; not used in production under D12. |

These are smoke tests on 3 photos, not an accuracy evaluation. Real accuracy is measured in Phase 7 or 23.
