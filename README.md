# iTapon

**Scan it. Sort it right.** iTapon is a mobile-first web app that uses computer vision (YOLO) to recognize waste items through your camera and tell you which bin they go in: **Biodegradable** (green), **Recyclable** (blue), **Residual** (black) or **Hazardous** (red), following RA 9003.

A CS 406 Machine Learning project, Technological Institute of the Philippines, Quezon City (S.Y. 2026–2027).

## Stack

| Part | Tech | Hosting |
|---|---|---|
| Web app (with in-browser inference, ONNX) | Next.js (React) + Tailwind CSS | Vercel |
| Model files | YOLO-World exported to ONNX | Hugging Face |
| ML tools / reference API | Python, FastAPI, PyTorch, Ultralytics YOLO | local / Hugging Face Spaces |
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

- **[docs/user-manual.md](docs/user-manual.md): user manual for everyone** (residents, students,
  kiosk users and staff, institution admins, facilitators)
- **[docs/system-documentation.md](docs/system-documentation.md): how the system works and its
  current state** (architecture, components, data model, security, operations)
- [ROADMAP-remaining.md](ROADMAP-remaining.md): what's left to do
- [ROADMAP.md](ROADMAP.md) (v1, Phases 1–26) and [ROADMAP-v2.md](ROADMAP-v2.md) (v2, Phases 27–35)
- [docs/spec.md](docs/spec.md): v1 classes, bin mapping, metrics, user stories
- [CHANGELOG.md](CHANGELOG.md): release notes

## Team

Basilio · Baldovino · Hofilena · Gantang · Gison

## License

[AGPL-3.0-or-later](LICENSE). iTapon uses [Ultralytics YOLO](https://github.com/ultralytics/ultralytics), which is also AGPL-3.0. Third-party datasets keep their original licenses (see the dataset card).
