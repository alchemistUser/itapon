# SPDX-License-Identifier: AGPL-3.0-or-later
# iTapon ML API, built for a Hugging Face Docker Space (non-root UID 1000, port 7860).

FROM python:3.12-slim AS base
# libgl/glib: required by OpenCV, which Ultralytics imports
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir uv==0.13.1
ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    PYTHONUNBUFFERED=1

# --- builder: bake the 23-class text prompts into YOLO-World weights (needs CLIP) ---
FROM base AS builder
RUN apt-get update \
    && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /build
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --group build --no-install-project
COPY app ./app
COPY scripts ./scripts
RUN uv run --no-sync python scripts/build_world_model.py

# --- runtime: API only; no CLIP, no git ---
FROM base AS runtime
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    YOLO_CONFIG_DIR=/home/user/.config/Ultralytics \
    PATH=/home/user/app/.venv/bin:$PATH
WORKDIR /home/user/app

COPY --chown=user pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --no-install-project
COPY --chown=user app ./app
COPY --from=builder --chown=user /build/weights/itapon-world-v0.pt /build/weights/itapon-world-v0.json ./weights/

EXPOSE 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
