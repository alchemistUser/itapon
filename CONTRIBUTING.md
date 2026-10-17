# Contributing to iTapon

## Repo layout

| Path | What | Owner track |
|---|---|---|
| `apps/web` | Next.js + Tailwind frontend (Vercel) | Web |
| `services/ml-api` | FastAPI + Ultralytics inference API (Hugging Face Space) | Backend |
| `ml/` | Dataset configs, training notebooks and scripts | ML |
| `supabase/` | SQL migrations and seed data | Backend |
| `docs/` | Spec, architecture, API contract, reports | Everyone |

## Prerequisites

- Node 20+ and pnpm 9 (`npm install -g pnpm@9`)
- Python 3.12 and uv (`pip install --user uv`)
- Docker (optional; used to test the ML API image locally)
- Supabase CLI (from Phase 10)

## Getting started

```bash
pnpm install          # installs the web app
pnpm dev              # http://localhost:3000

cd services/ml-api
uv sync --group build                                     # first time: deps + CLIP
uv run --group build python scripts/build_world_model.py  # builds weights/itapon-world-v0.pt
uv sync                                                   # runtime deps only
uv run uvicorn app.main:app --reload --port 7860          # http://localhost:7860/docs
```

Copy every `.env.example` to `.env.local` (web) or `.env` (API) and fill in the values. **Never commit real secrets.** Real values live only in the Vercel, Hugging Face and Supabase dashboards.

## Branches

- `main` is protected. Changes go in only through a pull request with **1 approving review** and passing CI.
- Branch names: `<type>/<short-description>`, e.g. `feat/scan-camera`, `fix/history-pagination`, `ml/baseline-yolo11n`, `docs/spec-signoff`.

## Commits: Conventional Commits

```
<type>(<scope>): <summary>

feat(web): add warming-up overlay
fix(api): reject images over 2 MB
ml(train): baseline yolo11n run
docs(spec): verify tetra pak rule
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `ml`, `data`.
Scopes: `web`, `api`, `ml`, `db`, `docs`, `ci`.

## Pull requests

1. Keep PRs small: one feature or fix each.
2. Fill in the PR template, including screenshots for UI changes (mobile + desktop).
3. Link the issue (`Closes #12`).
4. Check the Definition of Done in `ROADMAP.md` §6.
5. Squash-merge into `main`.

## License headers

iTapon is licensed under **AGPL-3.0-or-later**. New source files start with:

```ts
// SPDX-License-Identifier: AGPL-3.0-or-later
```

```python
# SPDX-License-Identifier: AGPL-3.0-or-later
```

Third-party datasets keep their own licenses. Record them in the dataset card (Phase 4).

## Data & privacy rules

- No faces, ID cards or personal info in dataset images (blur them if they slip in).
- Raw images and model weights do **not** go in git. Use Roboflow / Hugging Face Hub.
- Coursework files (proposal, lab PDFs) stay in `_private/`, which is git-ignored.
