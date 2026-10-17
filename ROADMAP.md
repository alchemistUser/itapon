# iTapon: Development Roadmap

**Project:** iTapon, an AI-powered computer vision system for automated waste classification and segregation
**Course:** CS 406 Machine Learning, TIP Quezon City, 1st Sem S.Y. 2026–2027
**Team:** Basilio, Baldovino, Hofilena, Gantang, Gison
**Inputs:** Concept Proposal, Laboratory Activity 5.1 (UI/UX), Figma prototype (mobile, tablet/kiosk, desktop web, "What to do next" recommendation flow)
**Status:** Final, v1.0 (October 17, 2026)
**License:** Open source, AGPL-3.0

---

## Decisions log

These decisions are settled. Reopen one only for a concrete reason, and add a dated row here when you do.

| # | Decision | Choice | Date |
|---|---|---|---|
| D1 | Product name | **iTapon**, used everywhere: repo, domain, PWA manifest, UI copy, manuscript. The "HIWALAY" label in the Figma frames gets replaced with iTapon during Phase 1. | 2026-10-17 |
| D2 | Source code license | **Open source under AGPL-3.0**, matching Ultralytics YOLO's license. Public GitHub repo, `LICENSE` file at the root, license noted in the README and model card. | 2026-10-17 |
| D3 | Handling HF Space cold starts | **Warming-up / loading screen** in the app (Phase 12), plus a background `/health` ping on app load to start waking the Space early. No paid hardware upgrade. | 2026-10-17 |
| D4 | Frontend stack | Next.js (React, App Router) + Tailwind CSS, hosted on Vercel, mobile-first | 2026-10-17 |
| D5 | ML / API stack | Python, FastAPI, PyTorch, Ultralytics YOLO, hosted on a Hugging Face Space (Docker) | 2026-10-17 |
| D6 | Auth & database | Supabase (Auth, Postgres with RLS, Storage) | 2026-10-17 |
| D7 | ML task type | Object detection with item-level classes; the item → bin mapping lives in the database | 2026-10-17 |
| D8 | v1 class list | **23 classes** (7 recyclable, 4 biodegradable, 8 residual, 4 hazardous), frozen in [`docs/spec.md`](docs/spec.md) §3. Pending sign-off. | 2026-10-17 |
| D9 | Dirty vs. clean items | The model detects the item type only. Contamination is shown as a UI caveat (`contamination_note`), not as separate classes. | 2026-10-17 |
| D10 | Tool versions | Node 20 + pnpm 9, Next.js 16.4 (App Router) + Tailwind v4, Python 3.12 + uv. The repo is under the team member's personal GitHub account (no org). | 2026-10-17 |

---

## 0. How to read this roadmap

Every phase has the same parts:

- **Goal**: the one thing the phase exists to achieve.
- **Why now**: why it comes at this point in the order.
- **Tasks**: concrete work items.
- **Deliverables**: what exists when the phase is done.
- **Exit criteria**: checks that must pass before you move on.
- **Risks / notes**: what is likely to go wrong.

Phases run in order, but some can overlap. The **ML track** (Phases 3–7) and the **Web track** (Phases 10–13) can run in parallel once Phase 2 is done. Section 3 shows the parallel plan.

---

## 1. Product summary (what we are building)

A **mobile-first web app**, also usable on tablets and desktop and installable as a PWA. It:

1. Opens the camera and **detects one or more waste items** in real time (YOLO object detection).
2. Maps each detected item to one of **four bins**, following RA 9003 (Ecological Solid Waste Management Act) as reflected in the Figma guide:

   | Category       | Bin colour | Examples (from Bin Guide)                                   |
   |----------------|-----------|-------------------------------------------------------------|
   | Biodegradable  | Green     | Food scraps, fruit peels, leaves, used tissue paper          |
   | Recyclable     | Blue      | Plastic bottles, glass, metal, clean paper                   |
   | Residual       | Black     | Mixed garbage, soiled packaging, sanitary waste              |
   | Hazardous      | Red       | Chemicals, batteries, busted light bulbs, expired medicines  |

3. Shows a **large, colour-coded instruction** ("Blue Bin" with an arrow) plus a confidence score and a **Read aloud** button for PWD users.
4. Gives **"What to do next" recommendations** for multi-item scans: reuse first, preparation steps, and the reason for each.
5. Has a searchable **Bin Guide**, a per-user **Scan History**, and a **Kiosk mode** for tablets or monitors mounted above bins.
6. **Logs scans** so institutions can see waste analytics (proposal Expected Output #3).

### Screen inventory (from Figma)

| # | Screen                              | Form factors                  |
|---|-------------------------------------|-------------------------------|
| S1 | Scanning (live camera + bottom sheet) | Mobile, tablet split, desktop split |
| S2 | Result (big bin colour + arrow)     | Mobile                        |
| S3 | Bin Guide (search + 4 categories)   | Mobile, desktop               |
| S4 | History (recent scans)              | Mobile, desktop               |
| S5 | What to do next (multi-item plan)   | Mobile (3 screens), iPad (master/detail) |
| S6 | Before you sort (prep steps + why)  | Mobile, iPad detail pane      |
| S7 | Other scanned items list            | Mobile, iPad left list        |
| S8 | Kiosk scan (split, bin row, Next Scan) | Tablet / monitor            |

> **Branding (D1):** the product is **iTapon**. The Figma frames still say "HIWALAY". Update the Figma header/logo text to iTapon so designs and code match.

---

## 2. Target architecture

```mermaid
flowchart LR
  subgraph Client["Browser / PWA (phone, tablet kiosk, desktop)"]
    UI["Next.js App Router + Tailwind<br/>(Vercel)"]
    CAM["Camera module<br/>getUserMedia + canvas"]
    TTS["Web Speech API<br/>(Read aloud)"]
  end

  subgraph HF["Hugging Face Space (Docker)"]
    API["FastAPI<br/>/v1/detect"]
    MODEL["Ultralytics YOLO<br/>(PyTorch / ONNX)"]
  end

  subgraph SB["Supabase"]
    AUTH["Auth"]
    DB[("Postgres + RLS<br/>items, scans, feedback")]
    ST[("Storage<br/>consented images")]
  end

  HUB[("HF Model Hub<br/>versioned weights")]

  CAM --> UI
  UI -- "JPEG frame (≤640px)" --> API
  API --> MODEL
  MODEL -- "detections" --> API
  API -- "JSON: labels, bbox, conf" --> UI
  UI -- "item → bin lookup, history insert" --> DB
  UI --> AUTH
  UI -- "opt-in image upload" --> ST
  HUB -- "weights pulled at startup" --> MODEL
  UI --> TTS
```

### Key architectural decisions (set these early, revisit only with a reason)

| Decision | Choice | Rationale |
|---|---|---|
| ML task type | **Object detection** (not plain classification) | Figma shows "4 items detected" and multi-item plans. Detection gives a label and box per item. |
| Label granularity | **Item-level classes** (e.g. `paper_bag`, `banana_peel`), mapped to a bin through a DB lookup | The UI shows the item name ("Paper Bag") *and* its bin. Bin rules can change per LGU without retraining. |
| Where the bin mapping lives | Supabase `waste_items` table, cached on the client | Rules are content, not model weights. Admins can edit them. |
| ML API state | **Stateless**: image in, detections out. No DB writes. | Easy to scale and cache. HF Space restarts don't lose data. |
| Who writes scan logs | Frontend, via the Supabase client under RLS | The user's JWT scopes the insert. The ML API never handles user identity. |
| Real-time strategy | Throttled frame upload (~1–3 fps) with a stability gate, not video streaming | Works on free HF CPU hardware and over mobile data. |
| Image retention | **Off by default**. Images are uploaded only with explicit opt-in, for retraining. | Data Privacy Act of 2012 (RA 10173). |
| Recommendations | Rule/content-based, from DB fields (`reuse_tip`, `prep_steps`, `why`) | Deterministic and explainable. No hallucination risk. |

### Proposed repository layout (monorepo)

```
itapon/
├─ apps/
│  └─ web/                 # Next.js + Tailwind (Vercel)
├─ services/
│  └─ ml-api/              # FastAPI + Ultralytics (HF Space, Dockerfile)
├─ ml/
│  ├─ data/                # dataset manifests (NOT raw images; those go to Roboflow/HF Datasets)
│  ├─ configs/             # data.yaml, training hyperparams
│  ├─ notebooks/           # EDA, training, evaluation
│  └─ scripts/             # split, convert, export, evaluate
├─ supabase/
│  ├─ migrations/          # SQL schema + RLS
│  └─ seed.sql             # categories, items, guide content
├─ docs/                   # architecture, API contract, test reports, manuscript assets
└─ .github/workflows/      # CI
```

---

## 3. Phase overview

| Phase | Name | Track | Depends on |
|---|---|---|---|
| 1 | Scope lock, taxonomy & success metrics | Shared | none |
| 2 | Project foundations & tooling | Shared | 1 |
| 3 | Dataset design & collection | ML | 1 |
| 4 | Annotation, QA & dataset versioning | ML | 3 |
| 5 | Baseline model training | ML | 4 |
| 6 | Model improvement & robustness | ML | 5 |
| 7 | Model evaluation, thresholds & export | ML | 6 |
| 8 | Inference API (FastAPI), local | Backend | 5 (baseline weights) |
| 9 | Inference API deployment to Hugging Face | Backend | 8 |
| 10 | Supabase schema, auth & content seed | Backend | 1, 2 |
| 11 | Frontend foundation & design system | Web | 2 |
| 12 | Camera & live scanning | Web | 11, 9 |
| 13 | Result screen & bin guidance | Web | 12, 10 |
| 14 | Multi-item "What to do next" flow | Web | 13 |
| 15 | Bin Guide | Web | 10, 11 |
| 16 | Authentication & Scan History | Web | 10, 13 |
| 17 | Accessibility & PWD features | Web | 13–16 |
| 18 | Kiosk mode (tablet / monitor) | Web | 13, 17 |
| 19 | Institutional analytics dashboard | Web + Backend | 16 |
| 20 | Feedback loop & retraining pipeline | ML + Web | 13, 7 |
| 21 | PWA, performance & offline | Web | 12–18 |
| 22 | Security, privacy & compliance hardening | Shared | 16, 19, 20 |
| 23 | Testing & QA | Shared | all features |
| 24 | CI/CD, production release & monitoring | Shared | 23 |
| 25 | Pilot deployment & user acceptance testing | Shared | 24 |
| 26 | Documentation, manuscript & defense | Shared | 25 |

**Parallel plan for 5 people (suggested):**
- **ML lead + 1:** Phases 3 → 7, then 20.
- **Backend lead:** Phases 8 → 9 and 10, then 19 and 22.
- **Frontend lead + 1:** Phases 11 → 18, then 21.
- **Everyone:** Phases 1, 2, 23–26.

---

## Phase 1: Scope lock, taxonomy & success metrics

> **Status (2026-10-17): In progress.** [`docs/spec.md`](docs/spec.md) is drafted with the frozen 23-class list, bin mapping with instructions, dirty/clean policy, metrics, personas, user stories and MoSCoW. **Still open:** verify rules R2–R5 against QC/TIP guidelines, update Figma to iTapon, reserve the platform names, and get team and adviser sign-off (spec Section 9).

**Goal:** Turn the proposal and Figma into a frozen, testable specification: which items we detect, which bin each goes to, and what "good enough" means.

**Why now:** Every later phase depends on the class list. Changing classes after annotation is expensive, so this decision comes first.

**Tasks**
1. **Apply the name iTapon (D1):** reserve the GitHub org/repo, Vercel project (`itapon`), HF Space (`itapon-api`), and an optional domain. Update the Figma header text from HIWALAY to iTapon.
2. **Define the item class list** (v1 target: 15–25 classes; fewer, well-represented classes beat many weak ones). Start from items visible in the docs and Figma, then add common campus waste:
   - Recyclable: `plastic_bottle`, `plastic_cup`, `aluminum_can`, `glass_bottle`, `paper_bag`, `cardboard`, `paper_sheet`, `tetra_pack`*
   - Biodegradable: `banana_peel`, `fruit_peel_other`, `food_scraps`, `leaves`, `used_tissue`
   - Residual: `snack_wrapper` (multi-layer), `styrofoam`, `plastic_utensil`, `sanitary_napkin`, `soiled_food_container`, `straw`, `candy_wrapper`
   - Hazardous: `battery`, `light_bulb`, `medicine_blister`/`expired_medicine`, `spray_can`
   - (*) Ambiguous items such as Tetra Pak and plastic cups vary by LGU. Write each one down as a **rule decision** with a source citation.
3. **Write the class → bin mapping table** with a source for each rule (RA 9003, QC LGU guidelines, TIP campus policy).
4. **Define "dirty vs clean" policy.** Example: a greasy paper bag is Residual, a clean one is Recyclable. Decide whether v1 models this as separate classes or as a UI caveat. The Figma "Why this recommendation" copy already handles it as a caveat. **Recommended: caveat in v1.**
5. **Set success metrics** (these become the Chapter 4 evaluation criteria):
   - Model: mAP@50 ≥ 0.80, mAP@50-95 ≥ 0.55, per-bin accuracy ≥ 90% on the held-out local test set.
   - Latency: P95 time from capture to result shown ≤ 1.5 s on 4G mobile; ≤ 800 ms on campus Wi-Fi.
   - UX: SUS score ≥ 75; task success ≥ 90% in UAT.
   - Accessibility: WCAG 2.2 AA; Lighthouse Accessibility ≥ 95.
   - Software quality: ISO/IEC 25010 survey (functional suitability, usability, reliability, performance efficiency, security).
6. **Define personas and core user stories** for the general public, PWD users, janitorial staff, and institution admins.
7. **Write the MoSCoW feature list:**
   - *Must:* scan, result, bin guide, read aloud, history, scan logging.
   - *Should:* multi-item plan, kiosk mode, analytics dashboard.
   - *Could:* feedback/active learning, Filipino language, offline guide.
   - *Won't (v1):* on-device inference, hardware actuation.

**Deliverables:** `docs/spec.md` (classes, mapping, metrics, personas, stories, MoSCoW), Figma updated to iTapon branding.

**Exit criteria:** Class list signed off by all 5 members and the adviser. Each class has a bin and a cited rule. Metrics are numeric.

**Risks / notes:** Scope creep from adding classes late. Freeze the list at v1 and park new ideas in a v2 backlog.

---

## Phase 2: Project foundations & tooling

> **Status (2026-10-17): Local setup done; platform setup pending.**
> **Done:** monorepo skeleton, AGPL-3.0 `LICENSE`, README, CONTRIBUTING (branches, Conventional Commits, SPDX headers), PR and issue templates, `.gitignore` (coursework files go in git-ignored `_private/`), `.env.example` files, Prettier/EditorConfig, pre-commit config (gitleaks + ruff), CI workflow (web lint/typecheck/build, API ruff/pytest, gitleaks). Hello-world apps: `apps/web` (Next.js 16.4 + Tailwind v4; lint, typecheck and build pass) and `services/ml-api` (FastAPI `/health` + HF-ready Dockerfile; ruff and pytest pass). First commit is on `main`.
> **Pending (follow [`docs/setup-accounts.md`](docs/setup-accounts.md)):** `gh auth login` and push to a public GitHub repo, branch protection, Vercel/HF/Supabase/Roboflow accounts, GPU choice. CODEOWNERS and collaborators are deferred.

**Goal:** Give everyone the same repo, accounts, conventions and environments before anyone writes feature code.

**Why now:** Five people working in parallel without shared conventions leads to merge conflicts and "works on my machine" bugs.

**Tasks**
1. Create a GitHub organization and a **public** monorepo (`itapon`) using the layout in Section 2. Add branch protection on `main` (PR plus one review).
2. Set conventions: Conventional Commits, PR template, issue templates (bug, feature, dataset task), CODEOWNERS per folder.
3. Create a project board (GitHub Projects) with columns per phase and labels `ml`, `web`, `api`, `db`, `docs`.
4. Create accounts and projects, using shared team emails and **never personal tokens in code**:
   - Vercel team project linked to `apps/web`
   - Hugging Face organization, with one Space (`itapon-api`), one model repo (`itapon-yolo`) and optionally one dataset repo
   - Supabase project, with separate **dev** and **prod** projects if the free tier allows (2 free projects)
   - Roboflow workspace, or self-hosted CVAT/Label Studio for annotation
5. Set up the toolchain:
   - Node LTS (20+), pnpm, TypeScript strict, ESLint, Prettier
   - Python 3.12, `uv`, Ruff, mypy (optional), pytest
   - Pre-commit hooks: lint, format, secret scanning (`gitleaks`)
6. Agree on an environment variable strategy: `.env.example` per app, real secrets only in Vercel/HF/Supabase dashboards.
7. Pick a GPU source for training: Google Colab Pro, Kaggle (free 30 h/week T4/P100), or a lab GPU. Document how to reach it.
8. **Open-source setup (D2):** make the GitHub repo **public** and add an AGPL-3.0 `LICENSE` file at the root (this matches Ultralytics YOLO's license). Add a License section to the README, an SPDX header convention (`// SPDX-License-Identifier: AGPL-3.0-or-later`) for source files, and a footer link to the source code in the deployed app. AGPL requires that source be available to users of a network service, and the footer link covers that. Datasets and weights get their own license notes in Phases 4 and 7, because third-party data (e.g. TACO) keeps its original license.

**Deliverables:** Public repo skeleton, `LICENSE` (AGPL-3.0), CONTRIBUTING.md, `.env.example` files, team access to all platforms.

**Exit criteria:** Every member can clone, install, run `pnpm dev` (empty Next app) and `uvicorn` (hello-world FastAPI) locally, and open a PR that passes CI lint.

---

## Phase 3: Dataset design & collection

**Goal:** Build a **localized** image dataset that matches real campus conditions: Filipino packaging brands, variable lighting, cluttered backgrounds, items held in hand.

**Why now:** Data quality caps model quality. Collection takes calendar time, so it must start early. It can run in parallel with Phase 2.

**Tasks**
1. **Survey public datasets for bootstrapping** and check licenses:
   - TACO (Trash Annotations in Context): detection with segmentation masks
   - TrashNet: classification only; useful for pre-training or crop augmentation
   - Roboflow Universe waste datasets: filter by license (CC BY 4.0 preferred)
2. **Write a capture protocol** (`docs/data-capture-protocol.md`):
   - Devices: at least 3 phone models plus 1 webcam (match the deployment cameras)
   - Lighting: daylight, fluorescent (classroom), dim/evening, backlit
   - Backgrounds: tabletop, floor, hand-held, in front of actual bins
   - Poses: whole, crumpled, partially occluded, multiple items per frame (needed for the multi-item feature)
   - Distance: 20 cm – 1.5 m
   - **Target counts:** ≥ 300 instances per class, ≥ 30% of images with 2+ items
3. **Run the collection sprints:** campus canteen, classrooms, dorm/home waste. Assign classes per member.
4. **Privacy at capture:** no faces, no ID cards, no screens with personal info. Blur anything that slips through.
5. **Hold out a test set at collection time**, before any training: about 15% of images from **different sessions/locations/devices**. This prevents leakage and gives an honest Chapter 4 result.
6. Log metadata per image (device, lighting, location, collector) in a CSV manifest.

**Deliverables:** Raw image pool, capture protocol, metadata manifest, list of public datasets with licenses.

**Exit criteria:** Every v1 class has ≥ 300 raw instances. The test split is physically separated and locked.

**Risks / notes:** Class imbalance (batteries are rare, bottles are everywhere). Run targeted collection for rare classes. Do not over-rely on web-scraped images; they differ from the deployment domain.

---

## Phase 4: Annotation, QA & dataset versioning

**Goal:** Accurate YOLO-format bounding boxes, a written labeling guideline, and reproducible dataset versions.

**Why now:** Training can't start without labels, and label noise is the most common hidden cause of poor mAP.

**Tasks**
1. **Write the labeling guideline:** tight boxes, how to box partially visible items (label if ≥ 30% visible), how to handle stacked or overlapping items, the "ignore" policy for unrecognizable debris, and example images for every class.
2. Annotate in Roboflow, CVAT or Label Studio. Use **model-assisted labeling** once a baseline exists (Phase 5) to speed up later batches.
3. **QA pass:** a second annotator reviews a random 10% of each batch. Track the inter-annotator agreement (IoU ≥ 0.75 on reviewed boxes).
4. Convert public datasets (e.g. TACO) to the **same class list**: remap their categories and drop the ones you don't use.
5. **Split:** train/val from the main pool (stratified by class, grouped by capture session to avoid near-duplicates leaking), plus the locked test set from Phase 3.
6. **Version** the dataset (`itapon-dataset v1.0`) on Roboflow versions or HF Datasets, with a `data.yaml` committed to `ml/configs/`.
7. Run EDA: class distribution, box size distribution, images per lighting condition. Save charts for the manuscript.

**Deliverables:** `data.yaml`, versioned dataset v1.0, labeling guideline, EDA notebook with charts.

**Exit criteria:** All images labeled. QA agreement meets the target. Split counts documented. No test images appear in train/val (verify by hash check).

---

## Phase 5: Baseline model training

**Goal:** A working YOLO detector trained end to end, plus a reproducible training pipeline.

**Why now:** The backend and frontend need real weights to integrate against early, even if accuracy is still modest.

**Tasks**
1. Write a training notebook/script using Ultralytics:
   ```python
   from ultralytics import YOLO
   model = YOLO("yolo11n.pt")          # start small; also try yolo11s
   model.train(data="ml/configs/data.yaml", imgsz=640, epochs=100,
               batch=16, patience=20, seed=42, project="runs", name="baseline_n")
   ```
2. Train **two baselines**: nano (`n`) for speed, small (`s`) for accuracy. Record mAP, per-class AP, and CPU inference time for each.
3. Set up experiment tracking: Ultralytics built-in logging plus a `ml/experiments.md` log, or Weights & Biases / MLflow (optional).
4. Pin the seed and package versions (`requirements-train.txt`) so runs are reproducible.
5. **Publish baseline weights** to the HF model repo (`itapon-yolo`, tag `v0.1-baseline`) so Phase 8 can use them.

**Deliverables:** Baseline weights v0.1, training script, experiment log, first confusion matrix.

**Exit criteria:** The model detects every class at least sometimes (no class with AP = 0) and the val mAP@50 is recorded. Weights load from the HF Hub on a fresh machine.

---

## Phase 6: Model improvement & robustness

**Goal:** Reach the Phase 1 metrics, especially in real-world lighting and clutter.

**Why now:** The baseline shows where the model fails. This phase fixes those failures on purpose instead of guessing.

**Tasks**
1. **Error analysis on the baseline:** confusion matrix, false positives on backgrounds, per-lighting-condition breakdown. List the top 5 failure modes.
2. **Targeted fixes:**
   - Augmentation tuning: HSV/brightness (lighting), mosaic/mixup (multi-item), blur (motion from hand-held phones), rotation/perspective.
   - Collect **hard-negative images** (empty tables, hands with no items, bins with nothing in front) to cut false positives.
   - Collect more data for weak classes, then version the dataset as v1.1.
3. **Hyperparameter search:** image size (480/640), epochs, learning rate, model size (n/s/m). Use `model.tune()` sparingly, since GPU hours are limited.
4. Optional **ablation study** for the manuscript: with vs. without the local data, with vs. without augmentation, and n vs. s vs. m. Report it as a table.
5. Check **per-bin accuracy**. A wrong item label is acceptable if it still maps to the correct bin. Users mostly care about the bin, so report both item-level and bin-level metrics.

**Deliverables:** Best weights candidate (v0.x), ablation table, error-analysis write-up.

**Exit criteria:** Val metrics meet the Phase 1 targets, or the gap is documented with a cause.

---

## Phase 7: Model evaluation, thresholds & export

**Goal:** Measure honestly on the locked test set, choose thresholds for production, and export a deployment-ready model.

**Why now:** Thresholds directly drive the UX ("95% sure" and when to show "Not sure, try again"). They must be set from data before the UI is finalized.

**Tasks**
1. Evaluate **once** on the locked test set: mAP@50, mAP@50-95, precision, recall, F1 per class and per bin, plus the confusion matrix.
2. **Choose the confidence threshold** from the PR curve. Recommended: two tiers.
   - `conf ≥ 0.60` → show the result confidently.
   - `0.35 ≤ conf < 0.60` → show "Possibly *X*. Hold steady or check the Bin Guide."
   - `< 0.35` → treat as no detection.
3. Set the NMS IoU threshold and the max detections per frame (e.g. 10).
4. **Calibration check:** does "95% sure" really mean about 95% correct? Plot a reliability diagram. If it's badly calibrated, display bands ("Very sure / Likely / Unsure") instead of raw percentages.
5. **Export:** keep `.pt` and also export **ONNX** (`model.export(format="onnx", imgsz=640, simplify=True)`). Benchmark CPU latency of PyTorch vs. ONNX Runtime and use the faster one on HF CPU.
6. Write a **model card** (`MODEL_CARD.md` on HF): intended use, classes, data sources, metrics, known limitations (dirty vs. clean, lighting), license.
7. Tag the release as `v1.0` in the HF model repo.

**Deliverables:** Test report, threshold config (`thresholds.json`), ONNX + PT weights v1.0, model card.

**Exit criteria:** Test metrics recorded in `docs/`. Thresholds agreed by the ML and frontend leads. Export verified to give the same detections as `.pt` on 20 sample images.

---

## Phase 8: Inference API (FastAPI), local

**Goal:** A clean, documented, stateless HTTP API that wraps the model.

**Why now:** It can start as soon as baseline weights exist (Phase 5), in parallel with Phases 6–7. Swapping in better weights later is just a config change.

**Tasks**
1. Scaffold `services/ml-api` (FastAPI, Uvicorn, Pydantic v2, Ultralytics, Pillow, optional onnxruntime).
2. **Load the model once at startup** (lifespan handler). Read the weights path/version from env (`MODEL_REPO`, `MODEL_REVISION`) and download via `huggingface_hub`.
3. **Endpoints (contract v1):**

   | Method | Path | Purpose |
   |---|---|---|
   | GET | `/health` | Liveness and model loaded flag |
   | GET | `/v1/model` | Model version, class list, thresholds |
   | POST | `/v1/detect` | `multipart/form-data` image → detections |

   Example response for `POST /v1/detect`:
   ```json
   {
     "model_version": "v1.0",
     "inference_ms": 84,
     "image": { "width": 640, "height": 480 },
     "detections": [
       { "class_key": "paper_bag", "confidence": 0.95,
         "bbox": { "x1": 0.12, "y1": 0.08, "x2": 0.71, "y2": 0.86 } }
     ]
   }
   ```
   - Use **normalized** bbox coordinates (0–1) so the frontend can draw overlays at any size.
   - The API returns `class_key` only. The **bin mapping is done by the client from Supabase**, which keeps the API free of content rules. Optionally include `default_category` as a fallback.
4. **Input validation:** max file size (e.g. 2 MB), accepted MIME types (jpeg/png/webp), and a server-side downscale to `imgsz`.
5. **Performance:** run inference in a threadpool (`run_in_threadpool`) so the event loop doesn't block. Warm up the model at startup with a dummy image.
6. **CORS:** allow only the Vercel production and preview domains plus localhost.
7. **Optional abuse protection:** a simple per-IP rate limit (`slowapi`), and/or require a Supabase JWT or shared key header if the Space is public.
8. **Tests (pytest):** health, schema validation, a known image giving the expected class, oversized-file rejection, wrong-MIME rejection.
9. Auto-generated OpenAPI docs at `/docs`. Export `openapi.json` to `docs/` for the frontend to generate types from.

**Deliverables:** Running local API, OpenAPI spec, test suite, Dockerfile.

**Exit criteria:** `docker build && docker run` serves `/v1/detect`. Tests pass. P95 local CPU inference ≤ 300 ms at 640 px.

---

## Phase 9: Inference API deployment to Hugging Face Spaces

**Goal:** A public, stable HTTPS endpoint for the model.

**Why now:** The frontend camera work (Phase 12) needs a real remote endpoint to measure true latency.

**Tasks**
1. Create a **Docker SDK Space** (`itapon-api`). Add a Space `README.md` with YAML front-matter (`sdk: docker`, `app_port: 7860`).
2. Set Dockerfile details for HF: run as a non-root user (UID 1000), listen on port 7860, install CPU-only PyTorch wheels to keep the image small, and set `HF_HOME` to a writable directory.
3. Store secrets (`HF_TOKEN` if the model repo is private, allowed origins, API key) in **Space Secrets**.
4. **Deploy from CI:** a GitHub Action pushes `services/ml-api` to the Space repo on tag `api-v*`, or use the HF GitHub sync.
5. **Handle cold starts (D3):** free Spaces sleep after inactivity, and waking one can take tens of seconds.
   - `/health` must respond fast and report `{ "status": "ok", "model_loaded": true|false }` so the frontend can tell "awake but loading the model" apart from "ready".
   - The frontend pings `/health` in the background as soon as any page loads, not just `/scan`, so the Space is often awake by the time the user opens the camera.
   - The user sees the **warming-up / loading screen** built in Phase 12 until `/health` reports ready.
   - Measure and record the cold-start time (sleep → first successful `/v1/detect`) so the loading screen copy and timeout values are realistic.
6. Measure latency from the Philippines: P50/P95 round-trip from phone on 4G and campus Wi-Fi. Record the results.

**Deliverables:** Live Space URL, deploy workflow, latency report.

**Exit criteria:** `curl -F image=@sample.jpg https://<space>.hf.space/v1/detect` returns valid JSON. CORS works from a Vercel preview URL. Cold-start time measured and recorded.

**Risks / notes:** HF free CPU is shared and its performance varies. If the warm-state P95 is too high, fall back in this order: ONNX Runtime → smaller `imgsz` (480) → (v2) on-device inference with `onnxruntime-web`. The project stays on free hardware (D3).

---

## Phase 10: Supabase schema, auth & content seed

**Goal:** The database, auth and storage that the app reads from and writes to, secured with Row Level Security from day one.

**Why now:** The Bin Guide, result mapping, history and analytics all need this. It can be built right after Phase 1, in parallel with ML work.

**Tasks**
1. **Schema (SQL migrations in `supabase/migrations/`):**

   ```sql
   -- reference / content
   waste_categories (id, key, name, bin_color, bin_label, description, icon, sort_order)
   waste_items      (id, class_key UNIQUE, display_name, category_id → waste_categories,
                     short_instruction,        -- "Empty it and flatten it, then drop it in the blue bin"
                     reuse_tip,                -- "Reuse it first..."
                     prep_steps JSONB,         -- [{title, detail}, ...]
                     why_text,                 -- "Reusing extends the life of paper fibers..."
                     contamination_note,       -- "Greasy or food-soaked paper goes in the black bin." (D9)
                     search_aliases TEXT[],    -- "straw", "plastic straw", "istro"
                     is_detectable BOOLEAN,    -- true if the model has this class
                     updated_at)

   -- users & orgs
   profiles         (id = auth.users.id, display_name, role ENUM('user','admin','kiosk'),
                     institution_id, prefs JSONB)  -- prefs: tts on/off, language, text size
   institutions     (id, name, location)
   devices          (id, institution_id, label, location_note)  -- kiosks

   -- events
   scan_sessions    (id, user_id NULL, device_id NULL, institution_id NULL,
                     model_version, source ENUM('mobile','kiosk','desktop'),
                     latency_ms, created_at)
   scan_detections  (id, session_id, class_key, category_id, confidence,
                     bbox JSONB, is_primary BOOLEAN)
   feedback         (id, detection_id, user_id, is_correct BOOLEAN,
                     corrected_class_key, image_path NULL, consent BOOLEAN, created_at)
   ```
2. **RLS policies:**
   - `waste_categories`, `waste_items`: public `SELECT`; `admin` only for writes.
   - `scan_sessions`, `scan_detections`: users insert and select **only their own** rows. Kiosk devices insert with their `device_id`. Admins select rows in their own institution.
   - `feedback`: insert own; admin read.
3. **Auth providers:** email magic link plus Google OAuth. Enable **anonymous sign-in** so guests can scan and keep a session-scoped history without registering, then upgrade (link identity) if they sign up later.
4. **Storage bucket** `training-images` (private) for consented feedback images. Policy: insert own, admin read.
5. **Seed** `seed.sql` from the mapping table in [`docs/spec.md`](docs/spec.md) §4: the 4 categories (colours from Figma) and all 23 v1 items, plus the Bin-Guide-only items from §3.3 with `is_detectable = false`, with copy matching Figma ("Empty it and flatten it, then drop it in the blue bin", "Tape the terminals. Take to a battery collection point.", etc.).
6. **Views/RPCs for analytics:** `daily_counts_by_category(institution_id, from, to)`, `top_items(...)`. Mark them `security invoker` so RLS still applies.
7. **Generate TypeScript types** (`supabase gen types typescript`) into `apps/web/lib/database.types.ts`.
8. Use the Supabase CLI for local dev (`supabase start`). Migrations are applied to prod only via CI.

**Deliverables:** Migrations, seed data, RLS policies, generated types, an ERD in `docs/`.

**Exit criteria:** RLS tested. A user cannot read another user's scans (verified with a test script using two JWTs). Seed loads cleanly on a fresh project.

---

## Phase 11: Frontend foundation & design system

**Goal:** A Next.js app shell that matches Figma on phone, tablet and desktop, with reusable components, before any feature logic.

**Why now:** A shared component library stops 2–3 frontend devs from building three different buttons.

**Tasks**
1. Scaffold `apps/web`: Next.js (App Router, TypeScript, `src/`), Tailwind CSS, ESLint, Prettier.
2. **Design tokens** extracted from Figma, defined in the Tailwind theme / CSS variables:
   - Colours: `bin-green`, `bin-blue` (primary `#0A84FF`-like), `bin-black`, `bin-red`, plus faded variants (used for non-selected bins on kiosk), surface `#F2F4F7`-like, text greys.
   - Typography: one geometric sans (e.g. Inter / SF-like) with a scale matching Figma (display "Blue Bin", H1 "What to do next", body, caption).
   - Radius (cards ~16 px, buttons ~10 px), shadows, spacing scale.
3. **Core components:** `Button` (primary/black/outline), `Card`, `Badge` (confidence pill "95% sure"), `BinTile` (icon + label, active/inactive), `CategoryChip`, `ItemRow`, `StepList` (numbered steps), `InfoCallout` (blue "Why this recommendation?"), `BottomSheet`, `SearchInput`, `ReadAloudButton`, `EmptyState`, `Skeleton`, `WarmingUpOverlay` (the loading screen from D3, wired up in Phase 12), and `Footer` (with the source code / AGPL-3.0 link from D2).
4. **Responsive layout shell:**
   - **Mobile (< 768 px):** bottom tab bar (Scan / Guide / History), as in Figma.
   - **Tablet (768–1279 px):** top segmented nav (as in the iPad frame) and two-column master/detail.
   - **Desktop (≥ 1280 px):** top nav "How it works / Bin Guide / History", as in the website frame.
   - Safe-area insets for iOS notch/home indicator (`env(safe-area-inset-*)`).
5. **Routing (App Router):**
   ```
   /                 → landing / How it works (desktop) or redirect to /scan (mobile/PWA)
   /scan             → live scanner
   /scan/result      → result (single) / plan (multi)
   /scan/result/[i]  → item detail ("Before you sort")
   /guide            → bin guide
   /guide/[category] → category detail
   /history          → scan history
   /kiosk            → kiosk mode
   /admin            → analytics (role-gated)
   /login, /account
   ```
6. **State and data:** TanStack Query for server state (items, history), Zustand (or React context) for the current scan session. Supabase client via `@supabase/ssr` for both server and browser.
7. **Icons:** Lucide (matches the outline icon style in Figma) plus a custom recycle SVG for bin tiles.
8. Storybook (optional) or a `/dev/components` page to review components visually against Figma.
9. Connect the repo to Vercel. Every PR gets a **preview deployment**.

**Deliverables:** App shell, component library, tokens, responsive nav, Vercel previews.

**Exit criteria:** Static versions of S1–S8 using mock data match Figma at 375 px, 768 px, 1024 px and 1440 px. Lighthouse ≥ 90 on all categories for the shell.

---

## Phase 12: Camera & live scanning

**Goal:** A reliable, fast scanning experience on real phones (especially iOS Safari) and tablets.

**Why now:** This is the core interaction and the riskiest frontend piece because of browser camera quirks. Doing it early leaves time to fix device issues.

**Tasks**
1. **Camera access** via `navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: {ideal: 1280}, height: {ideal: 720} } })`.
   - HTTPS is required. Vercel previews are HTTPS; for local phone testing use `next dev --experimental-https` or a tunnel.
   - iOS Safari: `<video playsInline muted autoPlay>` is required. Handle `NotAllowedError` and `NotFoundError` with friendly screens and steps to re-enable the camera.
   - Camera switcher (front/back) and a torch toggle where `ImageCapture`/track constraints allow.
2. **Frame capture pipeline:**
   - Draw the video to an offscreen `<canvas>` and downscale so the long edge is 640 px.
   - Encode as JPEG at quality ~0.7 (≈ 40–80 KB) and POST to `/v1/detect`.
   - **Throttle:** one request in flight at a time. Next frame goes only after the response arrives (adaptive rate, ~1–3 fps).
   - **Abort** stale requests with `AbortController` when the user leaves the page.
3. **Stability gate (matches "Hold the item steady in the frame"):** treat a result as **locked** only when the same top class appears in N of the last M frames (e.g. 3 of 4) above the threshold. This prevents flicker.
4. **Scan UI (S1):** dark camera view, corner-bracket guide frame, back button, "Scanning" title, hint text, and a bottom sheet with live item name, category, confidence badge and short instruction (Figma mobile frame 1).
5. **Overlay:** optional bounding-box overlay using normalized bbox values, drawn in the category colour.
6. **Warming-up / loading screen (D3):** shown while the HF Space wakes up.
   - Trigger: `/health` doesn't respond within ~1.5 s, or responds with `model_loaded: false`.
   - Content: iTapon logo, a spinning recycle icon, "Warming up the scanner…", and a secondary line that changes after about 10 s ("This can take up to a minute the first time").
   - The camera preview starts **behind** the overlay so it's ready the moment the API is.
   - Poll `/health` with backoff (1 s, 2 s, 4 s, then every 5 s) and fade out automatically when ready.
   - After about 90 s, show "Scanner is taking longer than usual" with **Retry** and **Browse the Bin Guide** buttons.
   - Accessibility: `role="status"` with `aria-live="polite"`, and a reduced-motion version without the spin.
   - A short version of the same overlay is used in kiosk mode (Phase 18) and as the Next.js `loading.tsx` for route transitions.
7. **Other states:** scanning, low confidence ("Hold steady / move closer / more light"), locked, error/offline, permission denied.
7. **Manual fallback:** a "Take photo" / upload button (`<input type="file" accept="image/*" capture="environment">`) for devices where live video fails.
8. **Haptics/sound on lock:** `navigator.vibrate` (Android) and a short tone (respect settings).
9. **Device test matrix:** iPhone (Safari, iOS 17+), Android mid-range (Chrome), iPad (Safari), desktop Chrome/Edge with webcam.

**Deliverables:** Working `/scan` page connected to the live HF API.

**Exit criteria:** The warming-up screen appears on a cold Space and fades out automatically when it's ready (tested by letting the Space sleep). Item locked within ≤ 2 s of being held steady on 3 of the 4 test devices. No memory leak after 5 minutes of continuous scanning (check heap in DevTools). Permission-denied flow tested.

---

## Phase 13: Result screen & bin guidance

**Goal:** Turn a locked detection into the clear, unmistakable "put it in **this** bin" instruction from the Figma Result screens.

**Why now:** This completes the minimum viable loop: scan → know which bin. After this phase the app is demo-able.

**Tasks**
1. **Client-side mapping:** `class_key` → `waste_items` → `waste_categories` (cached with TanStack Query, `staleTime` long). Unknown `class_key` falls back to "Not sure, check the Bin Guide".
2. **Result screen (S2), mobile:** full-bleed category colour background, huge "Blue Bin" text, down arrow, bin icon. The bottom card shows the item name, category icon and instruction with the bin name highlighted. Buttons: **Read aloud** and **Next Scan**.
3. **Split result (tablet/desktop, S8-style):** camera on the left; on the right, item name, category headline, confidence pill, instruction, and the **row of 4 bin tiles** with the correct one highlighted and arrowed and the other three faded.
4. **Low-confidence variant:** "We think this is *X* (52%)". Show the top-2 alternatives and a link to the Bin Guide category.
5. **Log the scan** (fire-and-forget) to `scan_sessions` + `scan_detections` under the current user (anonymous or signed-in), including `model_version` and `latency_ms`.
6. **Next Scan** resets the session state and returns to the live camera instantly. The camera stream stays alive to avoid a re-permission or startup delay.

**Deliverables:** Working single-item flow: scan → result → next scan.

**Exit criteria:** End-to-end demo on a phone with 5 different real items. Every result shows the correct bin colour and copy. A scan row appears in Supabase.

---

## Phase 14: Multi-item "What to do next" flow

**Goal:** Implement the recommendation experience from the newer Figma frames: multiple items detected, a "best next step" (reuse first), preparation steps, and the reason for each.

**Why now:** It builds directly on Phase 13's mapping and adds the project's educational value (proposal: *"actively teaches users how to segregate properly"*).

**Tasks**
1. **Aggregate detections** from a locked scan (or a short multi-frame window) into a deduplicated item list: merge same-class boxes with high IoU across frames, and keep the highest confidence.
2. **Recommendation logic (deterministic, rule-based):**
   - The primary item is the largest box or highest confidence.
   - If `reuse_tip` exists, the headline is **"Reuse it first."**; otherwise it is the bin instruction.
   - Order items by actionability: hazardous first (safety), then reuse candidates, then the rest.
3. **Mobile (3 screens, Figma "iPhone 17"):**
   - *Recommended action:* header "What to do next", blue summary banner ("4 items. A better next step."), primary action-plan card (thumbnail, detected item, confidence, best next step, Read aloud).
   - *Before you sort:* numbered prep steps plus the "Why this recommendation?" callout.
   - *Other scanned items:* cards for each remaining item with category badge, instruction and "Why:" line, then the disclaimer ("Bin colors follow your app's local guide…") and a **Scan more items** CTA.
4. **iPad (master/detail):** left column "Your scanned items" list with the selected state; right pane "Your recommended next step" (image, best next step, prep steps, why, Read aloud), plus a footer link to the local bin guide.
5. **Thumbnail:** crop each item from the captured frame using its bbox, on the client. Keep it in memory only unless the user opts in.
6. Log all detections with `is_primary` set for the main item.

**Deliverables:** `/scan/result` multi-item views for mobile and tablet.

**Exit criteria:** A 4-item test scene (paper bag, banana peel, snack wrapper, battery) produces the Figma plan with the correct order and copy on both mobile and iPad layouts.

---

## Phase 15: Bin Guide

**Goal:** A searchable, educational reference that is the "ground truth" behind the model's decisions (Lab 5.1 Figure 2).

**Why now:** It depends only on the seeded content (Phase 10) and the components (Phase 11), so it is a good parallel task for a second frontend dev.

**Tasks**
1. **Guide page (S3):** title "Bin Guide", subtitle "What goes where", search input ("Search an item e.g. straw"), and 4 category cards (icon tile, name, bin label, examples). Mobile uses a single column; desktop uses a 2×2 grid as in the desktop Figma frame.
2. **Search:** client-side fuzzy search (Fuse.js) over `display_name` + `search_aliases`, including Filipino/Taglish aliases (e.g. "balat ng saging", "bote", "upos"). Results show the item, its bin and its instruction.
3. **Category detail page:** the full item list for a category, with an instruction per item.
4. CTA block "Not sure where an item belongs? Scan it to get a sorting suggestion" linking to `/scan` (desktop frame).
5. **SEO/static:** render the guide with **SSG/ISR** (`revalidate`) since the content changes rarely. This also makes the guide work fast and offline (Phase 21).

**Deliverables:** `/guide` and `/guide/[category]`.

**Exit criteria:** Searching "straw", "battery" or "saging" returns the correct item and bin. Pages are statically generated. Lighthouse SEO ≥ 95.

---

## Phase 16: Authentication & Scan History

**Goal:** Let users keep and review their scan history across devices, while guests can still scan with no friction.

**Why now:** Logging already happens from Phase 13. This phase exposes it and adds account features.

**Tasks**
1. **Auth UX:** guests start as Supabase **anonymous users** automatically, with no sign-up wall before scanning. An "Save your history" prompt offers email magic link or Google sign-in and links the anonymous identity so history is kept.
2. Next.js **middleware** refreshes the Supabase session cookie (`@supabase/ssr`) and protects `/account` and `/admin`.
3. **History page (S4):** "History / Recent" list with category-coloured icon, item name and timestamp (Figma). Group by day, paginate with infinite scroll, and show an empty state.
4. **History detail:** tap a row to see that session's items and instructions again (reuse the Phase 14 components).
5. **Account page:** display name, preferences (Read aloud auto-play, text size, language), **delete my data** (cascade-delete scans and feedback via RPC), and sign out.
6. On the kiosk, history is **device/institution-level**, not personal (see Phase 18).

**Deliverables:** `/history`, `/login`, `/account`, anonymous → registered upgrade.

**Exit criteria:** A guest scans 3 items, signs up, and still sees those 3 items. A second account cannot see them. "Delete my data" removes all rows.

---

## Phase 17: Accessibility & PWD features

**Goal:** Make the app genuinely usable by PWD users, as the proposal requires ("accessible to all users, especially for PWD personnel").

**Why now:** All main screens exist by now. An audit at this point catches issues before kiosk and pilot work hardens the UI. Accessibility basics (semantic HTML, contrast) should still be followed from Phase 11 onward.

**Tasks**
1. **Read aloud** using the Web Speech API (`speechSynthesis`):
   - Script: "{Item}. Put it in the {colour} bin, {category}. {instruction}."
   - Language/voice selection (English; Filipino `fil-PH` where a voice is available) with an English fallback.
   - Optional auto-read on result for kiosk and for users who enable it in preferences.
   - A visible playing state and a stop button.
2. **Don't rely on colour alone:** every bin indication pairs colour with a **text label + icon + arrow**, for colour-blind users. Test with a colour-blindness simulator.
3. **Screen reader support:** semantic landmarks, `aria-live="polite"` region announcing detection results, labelled icon buttons, logical focus order, and focus moved to the result heading on lock.
4. **Motor:** touch targets ≥ 44×44 px. Bottom-sheet actions are reachable one-handed. Kiosk works with **no touch** (auto-scan).
5. **Vision:** supports 200% zoom and OS text scaling without layout breakage, WCAG AA contrast (check white text on `bin-blue` and the faded tiles), and a high-contrast mode toggle (optional).
6. **Cognitive:** short, plain-language instructions (already in Figma copy) and consistent layout.
7. **Motion:** respect `prefers-reduced-motion` for the arrow and sheet animations.
8. **Optional Filipino localization** (`next-intl`): UI strings and item copy (add `display_name_fil` and `instruction_fil` columns).
9. **Audit:** axe DevTools, Lighthouse, manual VoiceOver (iOS) and TalkBack (Android) passes. Recruit at least 1–2 PWD testers for UAT (Phase 25).

**Deliverables:** Accessibility audit report, fixes, TTS feature, optional i18n.

**Exit criteria:** No critical or serious axe violations. A full scan → result flow is completable with VoiceOver only. Lighthouse Accessibility ≥ 95.

---

## Phase 18: Kiosk mode (tablet / monitor above bins)

**Goal:** Deliver the institutional deployment from the proposal (*"a tablet or monitor connected to a webcam placed above standard waste bins"*) as a hands-free experience.

**Why now:** It reuses the scanner, result and TTS from Phases 12, 13 and 17, and adds only kiosk behavior.

**Tasks**
1. **`/kiosk` route:** landscape split layout (Figma tablet frame). Camera on the left; on the right, the result panel and the 4-bin tile row.
2. **Device registration:** an admin creates a `devices` row and the kiosk signs in with a **kiosk role** account or a device token stored on the device. Every scan is tagged with `device_id` + `institution_id`.
3. **Hands-free loop:** continuous scanning, auto-lock, auto-read aloud, show the result for N seconds (e.g. 6 s), then auto-reset to scanning. "Next Scan" is still available for touch.
4. **Idle/attract screen:** after inactivity, show a "Hold your trash up to the camera" animation. Pause inference on idle to save API calls; resume when motion is detected (simple frame-difference check on the client).
5. **Fullscreen and screen wake:** Fullscreen API plus **Screen Wake Lock API**. Document guided access (iPad) or kiosk mode (Android/ChromeOS) setup.
6. **Resilience:** on boot and after any long idle, show the `WarmingUpOverlay` until `/health` reports ready (D3); auto-reconnect when the network drops, retry with backoff, and show a "Scanner offline, please use the bin labels" fallback screen.
7. **External webcam support:** pick the camera by `deviceId` and remember it in localStorage.
8. **Admin-configurable bin layout:** order the 4 tiles to match the physical bin arrangement under the kiosk, saved per device.

**Deliverables:** `/kiosk` with hands-free operation and a kiosk setup guide.

**Exit criteria:** Kiosk runs unattended for 2 hours with no crash, memory growth or stuck state. Scans are tagged with `device_id`.

---

## Phase 19: Institutional analytics dashboard

**Goal:** Fulfill proposal Expected Output #3: *"records the types and frequencies of waste disposed of, providing institutions with valuable analytics."*

**Why now:** By now there is real scan data from testing, and the data model (Phase 10) and kiosk tagging (Phase 18) are in place.

**Tasks**
1. **`/admin` route**, gated by `role = 'admin'` (server-side check and RLS).
2. **Widgets:**
   - KPI tiles: total scans (today/week/month), % per bin, active kiosks.
   - Stacked bar chart of daily scans by category; line chart of trends.
   - Top 10 items.
   - Heatmap of hour of day × weekday (peak disposal times, useful for janitorial scheduling).
   - Per-device/location breakdown.
   - **Model health:** average confidence over time, low-confidence rate, and feedback "wrong" rate per class.
3. Use Recharts (or Tremor) with Tailwind. Data comes from the Supabase RPCs in Phase 10.
4. **Filters:** date range, device, category.
5. **Export:** CSV download of filtered data for institutional reports.
6. **Content admin (optional):** CRUD UI for `waste_items` (edit instructions, aliases, reuse tips) so LGU-specific rules need no redeploy.

**Deliverables:** Admin dashboard, CSV export, optional content editor.

**Exit criteria:** The dashboard numbers match manual SQL counts on a test dataset. Non-admins get 403/redirect and RLS blocks their direct API calls.

---

## Phase 20: Feedback loop & retraining pipeline

**Goal:** Let the model get better from real-world use without breaking privacy.

**Why now:** It needs the deployed model (Phase 9) and the result UI (Phase 13). It turns pilot usage into data for a v1.1 model.

**Tasks**
1. **"Was this right?" UI** on the result: 👍 / 👎. On 👎, the user picks the correct item from a searchable list.
2. **Explicit consent checkbox:** "Share this photo anonymously to help improve iTapon". The image is uploaded to the private `training-images` bucket **only** if the box is checked.
3. Store the feedback row with `corrected_class_key`, `model_version` and the image path.
4. **Review queue (admin):** list feedback images, approve or relabel them (or export them to Roboflow/CVAT for box correction).
5. **Retraining script:** merge the approved feedback into dataset v1.x+1, retrain, and evaluate on the **same locked test set** plus a new "field" test set.
6. **Promotion rule:** a new model ships only if test mAP and per-bin accuracy are ≥ the current model's. Bump `MODEL_REVISION` in the Space secrets; the API reports the new `model_version`.
7. Track the model version per scan so the dashboard can compare v1.0 vs. v1.1 in the field.

**Deliverables:** Feedback UI, consented image pipeline, retraining runbook, a v1.1 model if time permits.

**Exit criteria:** One full loop has been completed: feedback → review → retrain → evaluate → (promote or reject), with the decision documented.

---

## Phase 21: PWA, performance & offline

**Goal:** Make the web app feel like a native app on phones and stay usable on weak networks.

**Why now:** All features exist, so it is time to optimize the real bundle and real flows.

**Tasks**
1. **PWA:** `manifest.webmanifest` (name, icons, `display: standalone`, theme colour = bin-blue, portrait for mobile) and a service worker (Serwist / `@serwist/next`). "Add to Home Screen" prompt on Android, plus instructions for iOS.
2. **Offline:** precache the app shell, the Bin Guide pages and the item/category JSON. The scanner shows "You're offline. Browse the Bin Guide instead." Queue scan logs in IndexedDB and sync when back online.
3. **Performance budgets:** JS for `/scan` ≤ 200 KB gzipped. LCP ≤ 2.5 s and INP ≤ 200 ms on a mid-range Android over 4G (measure with Lighthouse and Vercel Speed Insights).
4. **Optimizations:** `next/image` for all assets, dynamic import for heavy pieces (charts, Fuse.js), preconnect to the HF Space domain, keep the camera stream alive between scans, and resize frames to ≤ 640 px (already done).
5. **Network-aware behavior:** reduce frame rate or JPEG quality on slow connections (`navigator.connection.effectiveType` where supported).
6. **Optional stretch, on-device inference:** run the ONNX model in the browser with `onnxruntime-web` (WebGPU/WASM) for zero-latency or offline scanning, with the HF API as a fallback. Treat this as a v2 experiment only if time allows.

**Deliverables:** Installable PWA, offline guide, performance report.

**Exit criteria:** Installs on Android and iOS. The guide works in airplane mode. Performance budgets are met.

---

## Phase 22: Security, privacy & compliance hardening

**Goal:** Protect users, institutions and the infrastructure before real people use the app.

**Why now:** Auth, storage, admin and feedback image features now exist, and each one adds attack surface.

**Tasks**
1. **RLS audit:** test every table with the anon, user, kiosk and admin roles. Make sure no table has RLS disabled. Confirm the `service_role` key is never shipped to the client.
2. **Secrets:** all secrets live only in the Vercel/HF/Supabase env settings. Rotate any key that was ever committed (gitleaks history scan).
3. **API protection:** CORS allowlist, request size limits, rate limiting, and optionally require a Supabase JWT on `/v1/detect` (verify the JWT signature using the Supabase JWT secret/JWKS).
4. **HTTP security headers** in Next.js: CSP (allow the HF Space and Supabase origins), `Permissions-Policy: camera=(self)`, HSTS, `X-Content-Type-Options`, `Referrer-Policy`.
5. **Data Privacy Act (RA 10173) alignment:**
   - Privacy notice page (what is collected, why, retention, rights).
   - Consent for image sharing (Phase 20), separate from general terms.
   - Data minimization: by default no images are stored, only labels and timestamps.
   - User data deletion (Phase 16) and retention policy (e.g. raw feedback images deleted after 12 months).
6. **Dependency scanning:** Dependabot / `pnpm audit` / `pip-audit` in CI.
7. **Abuse cases:** malformed images and huge payloads against the API (fuzz test), and a kiosk device token being stolen (scope its permissions to insert-only for its own device).

**Deliverables:** Security checklist (signed off), privacy notice, RLS test suite.

**Exit criteria:** No high or critical findings open. RLS tests pass in CI.

---

## Phase 23: Testing & QA

**Goal:** Confidence that the system works across devices, and evidence for the manuscript.

**Why now:** Features are complete. Testing has also been happening along the way, and this phase makes it systematic and documented.

**Tasks**
1. **Unit tests:**
   - Web (Vitest + Testing Library): mapping logic, stability gate, detection aggregation/dedup, recommendation ordering.
   - API (pytest): endpoints, validation, threshold application.
2. **Integration tests:** API contract tests against `openapi.json` (generated TS types plus a schema check), and Supabase RLS tests.
3. **E2E (Playwright):** guide search, history, auth upgrade, admin gating. Use a **fake camera stream** (`--use-fake-device-for-media-stream --use-file-for-fake-video-capture=sample.y4m`) to test the scan → result flow automatically.
4. **Model regression test:** a fixed set of ~50 images with expected classes runs in CI on every model change and fails if accuracy drops.
5. **Device/browser matrix (manual):** iPhone Safari, Android Chrome (low- and mid-range), iPad Safari, desktop Chrome/Edge/Firefox. Record results in a checklist table.
6. **Load test:** k6 or Locust against the HF Space (e.g. 10 concurrent kiosks at 2 fps) to find the throughput ceiling.
7. **Field test:** real items under real campus lighting, recording the true bin vs. predicted bin. This produces the "real-world accuracy" result.

**Deliverables:** Test suites in CI, device matrix results, load test report, field accuracy report.

**Exit criteria:** All automated tests green. No P1 bugs open. Field bin accuracy measured and recorded.

---

## Phase 24: CI/CD, production release & monitoring

**Goal:** A repeatable, low-risk path from merged PR to production, plus visibility into production health.

**Why now:** You need a stable production version before the pilot and the defense.

**Tasks**
1. **GitHub Actions:**
   - `web.yml`: lint, typecheck, unit tests, Playwright on PR. Vercel auto-deploys previews and promotes `main` to production.
   - `api.yml`: Ruff, pytest, Docker build; on tag `api-v*`, push to the HF Space.
   - `db.yml`: on merge to `main`, `supabase db push` to prod (migrations only, never manual edits in prod).
   - `model-regression.yml`: runs when `MODEL_REVISION` changes.
2. **Environments:** dev (local + Supabase dev), preview (Vercel preview + Supabase dev), production (Vercel prod + Supabase prod + HF Space). Use a separate staging Space if resources allow.
3. **Monitoring:**
   - Frontend errors: Sentry (free tier) or Vercel logs; Vercel Analytics and Speed Insights.
   - API: structured JSON logs (latency, model version, detection count, never images), and an uptime check on `/health` (UptimeRobot / Better Stack free).
   - Supabase: dashboard usage alerts (DB size, egress, auth MAU).
4. **Release process:** semantic versioning, a CHANGELOG, and a release checklist (migrations applied, env vars set, smoke test).
5. **Rollback plan:** Vercel instant rollback, HF Space revert to the previous commit/tag, and roll-forward migrations only.
6. Custom domain (optional), e.g. `itapon.app` / `itapon.vercel.app`.

**Deliverables:** CI/CD workflows, monitoring dashboards, release v1.0.0.

**Exit criteria:** A change merged to `main` reaches production with no manual steps. The uptime monitor reports 99%+ over one week.

---

## Phase 25: Pilot deployment & user acceptance testing

**Goal:** Validate with real users in a real setting and collect the evaluation data the study needs.

**Why now:** The system is stable, secure and monitored, so it's safe to put in front of people.

**Tasks**
1. **Pilot setup:** 1–2 kiosks (tablet + stand, or monitor + webcam) above actual bins at a TIP location (canteen/lobby), with adviser/admin permission. Mobile access via QR code posters.
2. **Recruit participants** covering each beneficiary group: students/general public, janitorial staff, admin/facility staff, and PWD users (with informed consent).
3. **Test protocol:**
   - Task-based UAT: "scan this item and dispose of it correctly", "find where a straw goes", "check your history".
   - Measure task success rate, time on task, and errors.
4. **Questionnaires:**
   - **SUS** (System Usability Scale)
   - **ISO/IEC 25010** quality survey (Likert, interpreted with weighted mean)
   - Open-ended feedback
5. **Operational data:** scans per day, bin distribution, low-confidence rate, feedback "wrong" rate, and kiosk uptime from the analytics dashboard.
6. **Optional before/after study:** sample bin contamination rates (wrong items per bin) before and during the pilot. This directly tests the proposal's core claim.
7. Triage the feedback, fix critical issues, and release v1.0.x.

**Deliverables:** UAT results, SUS/ISO scores, pilot analytics, contamination comparison (if done), bug-fix release.

**Exit criteria:** The Phase 1 metric targets are evaluated (met or explained). All data is ready for Chapter 4.

---

## Phase 26: Documentation, manuscript & defense

**Goal:** Package the work so it can be graded, defended, maintained and handed over.

**Why now:** It closes the project. Collect artifacts throughout (charts, screenshots, test results) so this phase is assembly, not reconstruction.

**Tasks**
1. **Technical docs (`docs/`):**
   - Architecture overview (diagram from Section 2), ERD, API reference (OpenAPI), deployment runbook, kiosk setup guide, retraining runbook, environment variable reference.
   - `README.md` with a quick start for each app.
2. **Model documentation:** dataset card (sources, counts, splits, licenses), model card, training configs, results tables (Phases 5–7), ablation, and the confusion matrix.
3. **User docs:** a short user guide (mobile + kiosk) and an admin guide (dashboard, content editing, device registration).
4. **Manuscript alignment:** map deliverables to the chapters (Introduction from the proposal; RRL; Methodology from Phases 3–8 and 10; Results from Phases 7, 23 and 25; Conclusions and Recommendations from the v2 backlog).
5. **Defense demo prep:**
   - Scripted live demo (mobile scan → multi-item plan → kiosk → dashboard).
   - A **backup demo video** in case Wi-Fi or a cold start fails.
   - Open the app about 10 minutes before the demo so the HF Space is awake and the loading screen doesn't appear mid-demo. Keep a local Docker instance of the API as a fallback.
6. **v2 backlog:** on-device inference, more classes, dirty/clean detection, smart-bin hardware integration, multi-LGU rule sets, gamification/eco-points.
7. **Handover:** transfer ownership of accounts and repos to the adviser or the next cohort if needed. Archive the dataset and weights with licenses.

**Deliverables:** Complete docs, manuscript-ready figures and tables, demo script and video, v2 backlog.

**Exit criteria:** A new developer can deploy the whole stack from the README alone (test this with someone outside the team). Defense rehearsed at least twice.

---

## 4. Suggested timeline (adjust to the academic calendar)

Assumes about 16–18 weeks of development. Bars show parallel tracks.

| Week | ML track | Backend track | Web track | Shared |
|---|---|---|---|---|
| 1 | P3 collection starts | | | **P1** scope, **P2** setup |
| 2 | P3 collection | P10 schema draft | P11 scaffold + tokens | P2 |
| 3 | P3 → P4 annotation | P10 RLS + seed | P11 components + layouts | |
| 4 | P4 annotation/QA | P8 API skeleton (mock model) | P11 static screens | |
| 5 | **P5 baseline** | P8 with real weights | P12 camera | |
| 6 | P6 error analysis | **P9 HF deploy** | P12 connected to live API | |
| 7 | P6 augmentation/data | P9 latency tuning | **P13 result** (MVP demo) | MVP review |
| 8 | P6 tuning | P10 analytics RPCs | P14 multi-item | |
| 9 | **P7 eval + export** | swap to v1.0 weights | P15 guide, P16 history | |
| 10 | P20 feedback design | P19 dashboard API | P16 auth, P17 a11y | |
| 11 | P20 pipeline | P19 dashboard UI | P17 a11y, **P18 kiosk** | |
| 12 | P20 v1.1 retrain | P22 security | P18 kiosk, P21 PWA | |
| 13 | | P24 CI/CD | P21 performance | **P23 testing** |
| 14 | | P24 monitoring | bug fixes | P23 |
| 15 | | | | **P25 pilot/UAT** |
| 16 | | | | P25 + fixes |
| 17–18 | | | | **P26 docs & defense** |

### Milestones

| Milestone | When | Definition |
|---|---|---|
| M1: Spec frozen | End of week 1 | Phase 1 exit criteria met |
| M2: Data ready | End of week 4 | Dataset v1.0 versioned |
| M3: MVP | End of week 7 | Phone scan → correct bin result, live on Vercel + HF |
| M4: Feature complete | End of week 12 | Phases 13–19 done |
| M5: Release candidate | End of week 14 | Tests green, security signed off |
| M6: Pilot complete | End of week 16 | UAT data collected |
| M7: Defense | Week 17–18 | Docs and demo ready |

---

## 5. Top risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Not enough local training data for rare classes (battery, bulb) | High | High | Targeted collection early (P3); merge public datasets; reduce the v1 class list if needed |
| HF free Space cold starts / slow CPU | High | Medium | Warming-up / loading screen (D3), background `/health` ping on page load, ONNX, 480 px input, open the app before demos so the Space is awake |
| iOS Safari camera quirks | Medium | High | Start P12 early; `playsInline`; photo-capture fallback; test on real iPhones weekly |
| "Dirty vs clean" items misclassified by bin | High | Medium | Caveat copy in UI ("if greasy → residual"); per-bin metrics; v2 classes |
| Poor model calibration ("95% sure" is misleading) | Medium | Medium | Reliability diagram in P7; show confidence bands instead of raw percentages if needed |
| Supabase RLS misconfiguration leaks history | Low | High | RLS from day one; automated two-user RLS tests in CI (P10, P22) |
| Ultralytics AGPL-3.0 obligations | Resolved | None | Project is open source under AGPL-3.0 (D2); public repo, LICENSE file, source link in the app footer |
| Team bandwidth / exams | High | High | MVP by week 7; MoSCoW cuts "Could" features first (P20, i18n, on-device) |
| Bin rules differ across LGUs | Medium | Low | Mapping lives in the DB, editable by admin (P19); cite sources per rule |

---

## 6. Definition of Done (applies to every feature)

- [ ] Matches Figma at mobile, tablet and desktop breakpoints
- [ ] Works on iOS Safari and Android Chrome
- [ ] Keyboard and screen-reader accessible; colour is not the only signal
- [ ] Loading, empty and error states handled
- [ ] Unit/E2E tests added and CI green
- [ ] RLS / auth implications reviewed
- [ ] No secrets in code; env vars documented in `.env.example`
- [ ] Reviewed and approved by at least one other member
- [ ] Docs updated (README, API, or runbook as relevant)
