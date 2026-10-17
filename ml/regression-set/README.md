# Model regression set (Phase 23, task 4)

A fixed, labelled set of about 50 photos that every model build must not get worse on
(`services/ml-api/scripts/model_regression.py`, run by the Model export workflow).

**Status: empty.** The current test photos (`apps/web/public/dev-samples`) are private
coursework material and can't be committed.

## What goes in

- `labels.csv` with columns `file,class_key,category`. Use `category` = `none` (and an empty
  `class_key`) for non-waste photos the model should ignore.
- The images next to it (JPEG, ≤ 640 px on the long side, ≤ 150 KB each).
- `baseline.json`, written by the first run (`--update` after a deliberate model change).

Aim for 2 photos per class (46) plus 4–6 non-waste photos (phone, keys, mug, hand),
under varied light and backgrounds.

## Rules

Only photos the team may publish under the repo's license: taken by the team, or CC0 / CC-BY
with attribution in `CREDITS.md`. **No faces, people, IDs, screens or private places.**
Approved field-test photos qualify only if the sharer consented and a reviewer cleared them.

## Run

```bash
cd services/ml-api
uv run --group build python -m scripts.model_regression \
  --set ../../ml/regression-set --model weights/itapon-world-v0-480-int8.onnx
```
