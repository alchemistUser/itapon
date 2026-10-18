# Platform & Account Setup (Phase 2)

Steps that have to be done by a person, in the browser or a terminal you control. Tick each box when it's done.

> Use the **shared team email**, or invite all 5 members, so that no platform depends on one person. Never paste tokens or keys into code, chat or issues. They go only in each platform's settings.

## 1. GitHub: create the public repo

Repo: https://github.com/alchemistUser/itapon (public, AGPL-3.0)

GitHub CLI is installed at `C:\Program Files\GitHub CLI\gh.exe` (open a new terminal so `gh` is on your PATH).

- [x] Log in (opens the browser):
  ```bash
  gh auth login --hostname github.com --git-protocol https --web
  ```
- [x] From the repo root, create the **public** repo and push the first commit:
  ```bash
  gh repo create itapon --public --source . --remote origin --push --description "iTapon: AI-powered waste classification and segregation (CS 406, TIP QC)"
  ```
- [ ] Protect `main` (PR required, 1 approval, CI must pass). Repo **Settings → Branches → Add branch ruleset**, or:
  ```bash
  gh api -X PUT repos/{owner}/itapon/branches/main/protection --input .github/branch-protection.json
  ```
  Turn this on **after** collaborators are added (otherwise a solo owner can't approve their own PRs).
- [x] Repo **Settings → General**: allow **squash merging** only and enable "Automatically delete head branches".
- [x] Create the labels used by the issue templates:
  ```bash
  for l in web api ml db docs data bug feature; do gh label create "$l" --force; done
  ```
- [ ] Create a GitHub Project (board) named **iTapon Roadmap** with columns *Backlog / This week / In progress / Review / Done*.
- [ ] *(Later)* Add the 4 collaborators (Settings → Collaborators) and add `.github/CODEOWNERS`.

## 2. Vercel: web hosting

- [x] Sign up at vercel.com with GitHub. Live: https://itapon.vercel.app
- [x] **Add New → Project →** import `itapon`.
- [x] Set **Root Directory** = `apps/web`. The framework (Next.js) and pnpm are auto-detected.
- [ ] Add the environment variables from `apps/web/.env.example` (values can stay blank until Phases 9–10, except `NEXT_PUBLIC_SOURCE_URL` = your GitHub repo URL).
- [x] Deploy. Confirm that `itapon.vercel.app` (or the assigned URL) shows the iTapon placeholder page.
- [ ] Confirm that a PR gets a **preview deployment** comment.

## 3. Hugging Face: model files (D12)

- [x] Sign up at huggingface.co. Account: `alchemistUserhf`.
- ~~New Docker Space~~: **not needed**. Free accounts can only create Static Spaces since July 2026, so inference runs in the browser instead (D12).
- [x] Model repo `alchemistUserhf/itapon-yolo` (public, AGPL-3.0), tag `v0.1`. Created via `hf repo create` + `hf upload`.
- [ ] *(Phase 9)* Create a write-scoped access token for CI and store it as GitHub secret `HF_TOKEN`.

## 4. Supabase: auth & database

- [x] Sign up at supabase.com with GitHub.
- [x] Create project **`itapon-dev`** (ref `svvbvkdkgduyphkkaiio`; created in Tokyo, ap-northeast-1). Save the DB password in a team password manager. Anonymous sign-ins enabled.
- [x] ~~Create project `itapon-prod`~~: not needed, one project serves dev and production (D15). Go-live steps: [release.md](release.md#one-time-setup-team).
- [ ] Note each project's URL and anon key for Phase 10. **Never** share the `service_role` key outside the dashboard and CI secrets.

## 5. Annotation tool (for Phase 4)

- [ ] Roboflow: create workspace `itapon` (public workspaces are free).
  *Alternative:* self-hosted CVAT or Label Studio via Docker.

## 6. GPU for training (for Phase 5)

- [ ] Pick one and note who has access:
  - Kaggle Notebooks: free ~30 GPU hrs/week, needs phone verification
  - Google Colab (free, or Pro for longer sessions)
  - TIP lab GPU (ask the adviser)

## 7. Local tools for each teammate

```bash
npm install -g pnpm@9
pip install --user uv
pip install --user pre-commit
```

Then from the repo root:

```bash
pnpm install
pre-commit install
```

## Done when (Phase 2 exit criteria)

- [ ] Every member can clone the repo, run `pnpm dev` (web) and `uv run uvicorn app.main:app --port 7860` (API) locally.
- [x] CI passes all three jobs (web, api, secrets) on `main`.
- [ ] Vercel production + preview deployments work.
- [ ] HF model repo `itapon-yolo` ✅ and both Supabase projects exist (dev ✅, prod in Phase 24).
