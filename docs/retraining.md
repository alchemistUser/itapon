# Feedback → model update runbook (Phase 20)

How user answers to "Was this right?" become a better model, and how we decide whether a new
model ships. One full loop was run on 2026-10-17. See [the log](#loop-log) at the end.

## 1. Collect (automatic)

- After every locked result on `/scan`, the user can answer **Yes** (one tap) or **No**. A No
  answer comes with the right item (searchable, or "Something else, or not trash").
- On **No**, an unticked box offers: *"Share this photo anonymously to help improve iTapon."*
  Only if it's ticked does a downscaled JPEG (≤ 640 px) of the locked frame go to the private
  `training-images` bucket (`<user_id>/<uuid>.jpg`). Otherwise the frame stays on the device and
  is dropped on **Scan again**.
- Each `feedback` row stores the detection it's about, the model's `model_version`, the user's
  answer, `consent` and `image_path`. RLS: users only send feedback on their own scans and can't
  pre-approve it. **Delete my data** (Account) removes their feedback and photos.
- Kiosks don't ask (hands-free, 6-second reset). Kiosk feedback can be added later as a single
  "👎 wrong" tap.

## 2. Review

| Who | Sees | Where |
|---|---|---|
| Institution admin | Feedback on their own institution's scans (kiosks and members) | `/admin` → **Feedback review**: Approve (with the user's label), relabel, or Reject |
| Project team | Everything, including personal phones | Supabase Table Editor on `feedback` (set `review_status`, `reviewed_class_key`), service role |

`reviewed_class_key = null` on an approved row means "not a waste item" (a negative image).
Reject photos that show people's faces, IDs or screens, or that are unusable.

## 3. Export the field set

In your own terminal (never paste the service role key into chat, code or CI logs):

```bash
cd services/ml-api
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<from Supabase → Settings → API> \
  uv run python scripts/export_feedback.py --out field-set/2026-10
```

This writes `images/` and `labels.csv` (approved, consented photos only). `field-set/` is
git-ignored: it holds user photos, so delete it after evaluating.

## 4. Build a candidate

- **Zero-shot model (D11, now):** change the prompts in `app/classes.py` (e.g. add synonyms
  for items that are often marked wrong in **Model health → Marked wrong by users**, or
  distractors as in v0.2), then `scripts/build_world_model.py` → `export_onnx.py` →
  `shrink_onnx.py`.
- **Trained model (Phases 3–7, later):** add the approved photos to the dataset as v1.x+1
  (draw boxes in CVAT/Roboflow first), retrain, export the same way.

## 5. Evaluate and decide

```bash
uv run --group build python scripts/evaluate_field.py --set field-set/2026-10 \
  --current <published>/itapon-world-v0-640-int8.onnx \
  --candidate weights/itapon-world-v0-640-int8.onnx
```

The script runs the **same ONNX files the browser uses** (same letterbox, NMS, ignore labels,
0.15 floor) and applies the **promotion rule**. The candidate ships only if:

1. the field set has at least **30** labelled images, and
2. its item accuracy is ≥ the current model's, and
3. its accuracy for **every bin** (including "none" = negatives) is ≥ the current model's.

Once a trained model exists, also require test-set mAP ≥ current on the **locked test set**
(Phase 5). Exit code 0 = promote, 1 = keep current.

## 6. Promote

1. Upload the ONNX files and `itapon-world-v0.labels.json` to the HF model repo
   `alchemistUserhf/itapon-yolo` under a **new tag** (e.g. `v0.2`).
2. Bump `PINNED_MODEL_BASE_URL` in `apps/web/src/lib/detector/models.ts` to that tag, then deploy.
3. Each scan logs `model_version` from `labels.json`, so **Model health → By model version** on
   `/admin` compares the old and new models in the field.
4. Record the decision in the log below.

## Loop log

| Date | Current | Candidate | Field set | Result | Decision |
|---|---|---|---|---|---|
| 2026-10-17 | v0.1 (published) | v0.2 (not-waste distractors, F9-2) | 2 approved photos from a dev test (paper bag scenes, via the real UI → review → export query) | Both: item 50%, recyclable bin 100% | **Keep v0.1.** Only 2 images (< 30). The rule would promote at `--min-images 2`, so the gate is what stopped it. Re-run when the pilot has 30+ approved photos. |
