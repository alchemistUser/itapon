# Archive image classifier (main scanner)

Since D28 (2026-10-26) the **main scanner** is a 12-class whole-image classifier. YOLO-World
(D11/D12) stays in the app as the **fallback**: it takes over only when the classifier can't load.

| | Archive classifier (main) | YOLO-World (fallback) |
|---|---|---|
| Task | One label for the whole image | Boxes and item-level labels |
| Classes | 12: battery, biological, brown-glass, cardboard, clothes, green-glass, metal, paper, plastic, shoes, trash, white-glass | 23 item classes |
| Model | MobileNetV2, 192 × 192, ONNX (9 MB) | YOLO-World int8, 480 px (13 MB) |
| Multi-item "What to do next" | No (one answer per scan) | Yes |
| Boxes on screen | No | Yes |

The model and its training scripts come from the team's package (`ITAPON Model Package`):
`models/browser_onnx/itapon-archive-classifier.onnx` and `.labels.json`, trained from the
group's local garbage-classification image folders. Model version `itapon-archive-mobilenetv2-v1`.

## Measured results

**In-dataset (from the package, `models/keras_tflite/…metrics.json`):** 95.31% top-1 accuracy and
93.27% macro F1 on a held-out 15% split of the same image collection (2,324 images). Weakest
classes: brown-glass 86.8% recall, plastic 86.8%, white-glass 89.7%. These numbers do **not**
show how it does on phone photos in real bins.

**Checked here (2026-10-26):**
- The exported model takes RGB floats 0–255 in NHWC layout and ends in a softmax (probabilities
  sum to 1). 140 of 144 sampled dataset photos (97.2%) were classified correctly with the same
  preprocessing as the browser worker.
- **There is no "nothing here" class.** Blank frames still get a confident answer: black →
  plastic 0.62, white → white-glass 0.78, a beige wall → white-glass 0.78. So the app adds two
  guards (below).
- Through the real camera pipeline (fake camera playing dataset photos), results are in the
  table at the end of this page.

## How it works in the app

- **Hosting (D12 rules):** Hugging Face repo `alchemistUserhf/itapon-yolo`, tag **`archive-v1`**
  (separate from the YOLO tag `v0.1`). SHA-256 of both files is pinned in
  `apps/web/src/lib/detector/models.ts` and checked in the worker before use; a mismatch is
  refused and cached copies are dropped.
- **Worker:** `apps/web/src/lib/detector/archive-classifier.worker.ts`. It uses the same message
  protocol as the YOLO worker, so the scan loop, stability gate, result screens, history,
  missions and kiosk work unchanged. Shared download/cache/verify code lives in
  `model-files.ts`.
- **Engine choice:** `store.ts` tries the archive classifier first and starts YOLO-World only if
  the classifier fails to load (download, integrity check, unsupported browser). Low confidence
  and multi-item photos do **not** trigger the fallback.
- **One detection per frame:** a full-frame "box" for the top class. The app shows no boxes in
  this mode.
- **Bin mapping (approved 2026-10-26, RA 9003):** `apps/web/src/lib/archive-classifier/classes.ts`.

  | Archive class | App item | Bin |
  |---|---|---|
  | battery | battery (v1 item) | Hazardous |
  | biological | biological | Biodegradable |
  | brown-glass, green-glass, white-glass | brown_glass, green_glass, white_glass | Recyclable |
  | cardboard, paper | cardboard (v1 item), paper | Recyclable |
  | metal | metal | Recyclable |
  | plastic | plastic | Recyclable |
  | clothes, shoes | clothes, shoes | Residual |
  | trash | trash | Residual |

  The 10 new items have `waste_items` rows (so scans are logged and missions count them) and
  copy in English and Filipino. They have `is_detectable = false` (that flag means "YOLO can
  return it") and stay out of the Bin Guide.
- **Library card:** for broad classes it links to the matching material group (for plastic it
  adds "check the number in the triangle"). For battery and cardboard the specific library
  chooser still applies.

## The two guards against false answers

1. **Flat frames are skipped** (`isNearlyUniform`): a covered lens, a dark room or a plain wall
   has almost no brightness variation (spread below 6; the lowest of 300 dataset photos was 7).
   The model isn't run at all.
2. **Confidence gate 0.7** (`ARCHIVE_MIN_CONFIDENCE` in `models.ts`): below it the scanner reports
   nothing and keeps searching. The scan loop also needs the same class on 3 of 4 frames.
   At 0.85, 3 of 17 correct photos were refused; at 0.7 they lock.

**Still possible:** a textured background (a table, a patterned wall) could score above the gate
and lock on a wrong class, because the model has no "no item" class. Mitigations are in the app
("Was this right?", the Bin Guide link, the library) and the field test below.

**Resize matters.** The worker draws the camera frame onto a 192 px canvas. With the browser's
default quality the paper test photo scored 0.55 (nearest-neighbour aliasing); with
`imageSmoothingQuality = "high"` it scores about 0.85. The worker sets high quality.

## Replacing or updating the model

1. Retrain/export with the package scripts (`scripts/train_archive_classifier.py`,
   `scripts/export_archive_classifier_onnx.py`).
2. Upload the `.onnx` and `.labels.json` to the Hugging Face repo and create a **new tag** (never
   move an existing one): `hf upload alchemistUserhf/itapon-yolo <folder> .` then
   `hf repo tag create alchemistUserhf/itapon-yolo archive-v2`.
3. Update `ARCHIVE_PINNED_BASE_URL`, `ARCHIVE_PINNED_SHA256` and the copy
   `apps/web/src/lib/archive-classifier/labels.json` (byte-identical; a test checks its hash).
4. If the class list changes, update `classes.ts`, add or change `waste_items` content, and run
   `python supabase/scripts/build_seed.py`.
5. Run `pnpm test`, then the field test below, before merging.

To try a tag without a code change, set `NEXT_PUBLIC_ARCHIVE_MODEL_BASE_URL` on a preview
deployment (hash checks are off for non-pinned URLs).

## Licences to confirm (team)

- The dataset's licence: **do not commit dataset images** (the repo holds only the model and labels).
- The licence of the pretrained MobileNetV2 (ImageNet) weights.
- Record both in the dataset and model cards (Phase 26).

## Field test (needed before claiming accuracy)

Take about 30 real phone photos across the 12 classes (and a few with nothing in frame), in
real light and clutter. Record for each: true class, what iTapon said, the confidence, and
whether it locked. Report per-class accuracy, the no-lock rate and the wrong-lock rate on empty
scenes. If empty scenes lock, raise `ARCHIVE_MIN_CONFIDENCE`; if real items often don't lock,
lower it or improve training data.

## Browser pipeline results (2026-10-26)

Chrome's fake camera played dataset photos into the production build (`e2e/scan.spec.ts`, the
`scan` project, run locally with `E2E_SAMPLE_IMAGE` and `E2E_EXPECT_BIN`). The test checks the
engine is `archive` and the announced bin is the expected one.

| Test | Result |
|---|---|
| 2 random photos per class, all 12 classes (24 runs) | **24 / 24** locked on the correct bin |
| Empty scenes: white, beige, dark, horizontal gradient (`E2E_EXPECT_NOTHING=1`) | **4 / 4** stayed in "searching" |
| Control: a real battery photo in the empty-scene test | fails, as it should (it locks) |

How it got there (what the tests found):
- With the first settings (gate 0.85, default canvas resize) 3 of 17 correct photos were
  refused. The gate is now 0.7 and the canvas resizes at high quality (paper: 0.55 → ~0.85).
- Photos with a low model score (e.g. a metal photo at 0.58 when scored directly) can still
  fail to lock. That's by design: the scanner keeps searching and the user can move closer.

**Caveats:** these are dataset photos, not phone photos taken in real bins and light, and the
empty scenes are flat or smooth. The field test above is still needed before claiming accuracy.
