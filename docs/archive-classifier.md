# Archive image classifier (main scanner)

Since D28 (2026-10-26) the **main scanner** is a 12-class whole-image classifier. Since
2026-11-03 it works **together with YOLO-World** (D11/D12): the classifier answers first, YOLO-World
loads in the background and names the specific items the classifier has no category for, and
YOLO-World becomes the main scanner if the classifier can't load. See "Hybrid" below.

|                              | Archive classifier (main)                                                                                               | YOLO-World (helper, and fallback) |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Task                         | One label for the whole image                                                                                           | Boxes and item-level labels       |
| Classes                      | 12: battery, biological, brown-glass, cardboard, clothes, green-glass, metal, paper, plastic, shoes, trash, white-glass | 23 item classes                   |
| Model                        | MobileNetV2, 192 × 192, ONNX (9 MB)                                                                                     | YOLO-World int8, 480 px (13 MB)   |
| Multi-item "What to do next" | No (one answer per scan)                                                                                                | Yes                               |
| Boxes on screen              | No                                                                                                                      | Yes                               |

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

- **Hosting (D12 rules):** Hugging Face repo `alchemistUserhf/itapon-yolo`, tag **`archive-v3`** (`archive-v1`, the 12-class package model, stays as the rollback)
  (separate from the YOLO tag `v0.1`). SHA-256 of both files is pinned in
  `apps/web/src/lib/detector/models.ts` and checked in the worker before use; a mismatch is
  refused and cached copies are dropped.
- **Worker:** `apps/web/src/lib/detector/archive-classifier.worker.ts`. It uses the same message
  protocol as the YOLO worker, so the scan loop, stability gate, result screens, history,
  missions and kiosk work unchanged. Shared download/cache/verify code lives in
  `model-files.ts`.
- **Engine choice:** `store.ts` loads the archive classifier first. When it is ready, YOLO-World
  loads in the background as a **helper** (skipped on Data Saver / 2G) and each frame goes to both
  models, combined by `hybrid.ts`. If the classifier fails to load (download, integrity check,
  unsupported browser), YOLO-World becomes the main scanner and there is no helper.
- **One detection per frame:** a full-frame "box" for the top class. The app shows no boxes in
  this mode.
- **Bin mapping (approved 2026-10-26, RA 9003):** `apps/web/src/lib/archive-classifier/classes.ts`.

  | Archive class                         | App item                              | Bin           |
  | ------------------------------------- | ------------------------------------- | ------------- |
  | battery                               | battery (v1 item)                     | Hazardous     |
  | biological                            | biological                            | Biodegradable |
  | brown-glass, green-glass, white-glass | brown_glass, green_glass, white_glass | Recyclable    |
  | cardboard, paper                      | cardboard (v1 item), paper            | Recyclable    |
  | metal                                 | metal                                 | Recyclable    |
  | plastic                               | plastic                               | Recyclable    |
  | clothes, shoes                        | clothes, shoes                        | Residual      |
  | trash                                 | trash                                 | Residual      |

  The 10 new items have `waste_items` rows (so scans are logged and missions count them) and
  copy in English and Filipino. They have `is_detectable = false` (that flag means "YOLO can
  return it") and stay out of the Bin Guide.

- **Library card:** for broad classes it links to the matching material group (for plastic it
  adds "check the number in the triangle"). For battery and cardboard the specific library
  chooser still applies.

## archive-v3: 20 classes (2026-11-03)

Retrained in PyTorch (MobileNetV2, ImageNet weights, 192 px; `ml/scripts/archive_v2/prepare.py` and
`train.py`) on the package's 12 classes (up to 700 photos each) plus eight specific items:

| Item             | Photos | Source                                                                                                      |
| ---------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| tetra pack       | 680    | GlobalWasteData `tetra_pak` (CC BY 4.0) + TACO drink/meal cartons                                           |
| expired medicine | 1,032  | GlobalWasteData `medicine_and_strip`                                                                        |
| face mask        | 319    | GlobalWasteData `masks`                                                                                     |
| spray can        | 667    | GlobalWasteData `spray_cans` + TACO aerosol + Kaggle `aerosol_cans`                                         |
| straw            | 473    | Kaggle "Recyclable and Household Waste" `plastic_straws` (MIT; non-commercial per its text)                 |
| plastic utensil  | 375    | Kaggle `disposable_plastic_cutlery`                                                                         |
| styrofoam        | 752    | Kaggle `styrofoam_cups` + `styrofoam_food_containers`                                                       |
| snack wrapper    | 115    | TACO crisp packet / plastic wrapper (bounding-box crops; only 466 of 1,500 TACO images could be downloaded) |

Not enough public data (under 100 photos, or none): soiled food container, used tissue, sanitary
napkin, light bulb. YOLO-World still covers those. They need the team's own phone photos
(about 100 each, `ml/data/raw/own/<item>/`).

Hold-out (same sources, split by source photo, 1,884 photos): **94.2% accuracy, 92.5% macro F1**.
New items (recall/precision %): medicine 92.1/98.6, tetra pack 94.1/96.9, spray can 87.8/90.5,
face mask 89.4/93.3, straw 88.2/89.3, plastic utensil 92.0/90.2, styrofoam 95.1/96.0, snack
wrapper 60.0/64.3 (only 15 test photos: the weakest, treat with care).
Training images are shrunk with anti-aliasing (Lanczos) because the browser does the same; an
earlier run with plain bilinear shrinking scored higher on the hold-out but failed to lock on 6 of 24
browser photos. Tags `archive-v2` and `archive-v2.1` were earlier 17-class runs and are unused.
Browser check: the 17-class run locked 8 of 8 new-class photos (training-set photos, so wiring
only). **archive-v3 has not been run through the browser regression** (24 photos); do that, then the
phone field test, before relying on it.
These are in-dataset numbers, not field
accuracy. Licences: GlobalWasteData and TACO are CC BY 4.0 (attribution needed); GlobalWasteData's
paper says the dataset may not be modified and commercial use follows each source's licence, so the
team should confirm with the adviser (images are not redistributed; only the model is).

## Hybrid: classifier + YOLO-World (2026-11-03)

(Written for the 12-class model. v3 learned eight of these items; YOLO now only matters for the four
left: soiled food container, used tissue, sanitary napkin, light bulb, plus the hazardous safety net.)

**Why.** The classifier has 12 categories; the app has 23 specific items. Twelve of them have no
matching class: straw, plastic utensil, snack wrapper, styrofoam, soiled food container, tetra
pack, used tissue, sanitary napkin, face mask, and three **hazardous** ones: light bulb, expired
medicine, spray can. The classifier files them under plastic, paper, glass, metal or trash, so it
could send a bulb or medicine to the blue bin.

**The rule** (`apps/web/src/lib/archive-classifier/hybrid.ts`, one answer per frame):

| Situation                                                                                                                                                                                                                        | Answer                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| The classifier is sure, and YOLO sees one of the 12 items above that the classifier's answer could plausibly be (e.g. straw vs plastic)                                                                                          | The YOLO item, if YOLO ≥ 0.45 (**≥ 0.40 for light bulb, medicine, spray can**) |
| The classifier is sure and YOLO names a specific item of the **same bin** (plastic → plastic bottle, metal → aluminum can, glass → glass bottle, paper → paper sheet/bag, biological → banana peel/food scraps/leaves) at ≥ 0.45 | The specific item (same bin; the classifier's confidence is kept)              |
| Anything else                                                                                                                                                                                                                    | The classifier                                                                 |
| The classifier has no confident answer (odd angle, small item)                                                                                                                                                                   | YOLO, if ≥ 0.35 (≥ 0.30 hazardous)                                             |

**Why not just "YOLO wins when it's sure"?** Measured on 300 dataset photos (25 per class), through
the deployed files: the classifier alone gets the right bin on **100%** (in-dataset); YOLO alone
on **30%**, fires on 25% of photos at 0.35 and finds only 1 of 25 batteries. A plain override
would change 8% of correct classifier answers (24 of 300 at 0.35), and raise a false hazardous
alarm on 3.6% of non-battery photos. The restricted rule above changes **1.0%** (3 of 300) at
the defaults, and never lets YOLO override a battery, shoe or clothes answer.

**What is not measured.** There are no labelled photos of the 12 specific items on hand, so how
often YOLO recognises them is unknown (the zero-shot model is weak: see the battery figure). The
rule limits the damage; the field test below must include those items. The thresholds are in
`hybrid.ts` and tested.

**Cost.** The classifier answers every frame and sets the frame rate. The YOLO helper runs in the
background on whichever frame finds it idle (about 3 per second on a desktop); its latest look is
used if it is under 1.5 s old, so the scan loop never waits for it. The helper (13 MB) and its CPU
are only used on the scanner and kiosk screens; the idle preload on other pages loads the 9 MB
classifier alone, and the classifier worker uses 2 threads so the helper gets the other cores.
Multi-item "What to do next" is still not offered on the main path (one answer per scan).

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

## Browser pipeline results

### Hybrid (2026-11-03)

| Test                                                                         | Result                                |
| ---------------------------------------------------------------------------- | ------------------------------------- |
| Sample photo of a plastic cup (`bag_cup.jpg`, small image): classifier alone | does **not** lock (scores it "shoes") |
| Same photo with the YOLO helper                                              | **locks** (YOLO: plastic cup 0.45)    |
| Empty scenes with both models running (white, beige, dark, gradient)         | **4 / 4** stay in "searching"         |

| 2 random photos per class, all 12 classes (24 runs), helper ready, scanned again | **22 / 24** correct bin, **0 wrong bins**; the 2 misses did not lock (see below) |

The two misses are not the hybrid's doing: a metal photo the classifier itself calls "plastic"
at 0.55 (below the gate, YOLO sees nothing), and a 194 × 259 portrait photo that the fake camera
squeezes between black bars (it fails the same way with the classifier alone). Real phone frames
are not letterboxed like that. Without the helper the same kind of sample was 24 / 24, a
different draw of photos, so treat the two figures as "similar", not as a change.

### Classifier alone (2026-10-26)

Chrome's fake camera played dataset photos into the production build (`e2e/scan.spec.ts`, the
`scan` project, run locally with `E2E_SAMPLE_IMAGE` and `E2E_EXPECT_BIN`). The test checks the
engine is `archive` and the announced bin is the expected one.

| Test                                                                           | Result                                |
| ------------------------------------------------------------------------------ | ------------------------------------- |
| 2 random photos per class, all 12 classes (24 runs)                            | **24 / 24** locked on the correct bin |
| Empty scenes: white, beige, dark, horizontal gradient (`E2E_EXPECT_NOTHING=1`) | **4 / 4** stayed in "searching"       |
| Control: a real battery photo in the empty-scene test                          | fails, as it should (it locks)        |

How it got there (what the tests found):

- With the first settings (gate 0.85, default canvas resize) 3 of 17 correct photos were
  refused. The gate is now 0.7 and the canvas resizes at high quality (paper: 0.55 → ~0.85).
- Photos with a low model score (e.g. a metal photo at 0.58 when scored directly) can still
  fail to lock. That's by design: the scanner keeps searching and the user can move closer.

**Caveats:** these are dataset photos, not phone photos taken in real bins and light, and the
empty scenes are flat or smooth. The field test above is still needed before claiming accuracy.
