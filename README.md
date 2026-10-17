# iTapon

**Scan it. Sort it right.** iTapon is a mobile-first web app that uses computer vision (YOLO) to recognize waste items through your camera and tell you which bin they go in: **Biodegradable** (green), **Recyclable** (blue), **Residual** (black) or **Hazardous** (red), following RA 9003.

A CS 406 Machine Learning project, Technological Institute of the Philippines, Quezon City (S.Y. 2026–2027).

## Stack

| Part | Tech | Hosting |
|---|---|---|
| Web app | Next.js (React) + Tailwind CSS | Vercel |
| ML / inference API | Python, FastAPI, PyTorch, Ultralytics YOLO | Hugging Face Spaces (Docker) |
| Auth & database | Supabase (Auth, Postgres + RLS, Storage) | Supabase |

## Repo layout

```
apps/web/          Next.js frontend
services/ml-api/   FastAPI inference API
ml/                dataset configs, training notebooks & scripts
supabase/          SQL migrations & seed
docs/              spec, architecture, reports
```

## Quick start

```bash
pnpm install && pnpm dev                       # web → http://localhost:3000
cd services/ml-api && uv sync && uv run uvicorn app.main:app --reload --port 7860
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, branching and commit conventions.

## Docs

- [ROADMAP.md](ROADMAP.md): 26-phase development plan
- [docs/spec.md](docs/spec.md): v1 classes, bin mapping, metrics, user stories

## Team

Basilio · Baldovino · Hofilena · Gantang · Gison

## License

[AGPL-3.0-or-later](LICENSE). iTapon uses [Ultralytics YOLO](https://github.com/ultralytics/ultralytics), which is also AGPL-3.0. Third-party datasets keep their original licenses (see the dataset card).
