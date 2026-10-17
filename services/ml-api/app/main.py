# SPDX-License-Identifier: AGPL-3.0-or-later
"""iTapon inference API. Phase 2 skeleton; the model is loaded in Phase 8."""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="iTapon ML API", version="0.1.0")

allowed_origins = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, object]:
    # model_loaded becomes real in Phase 8; the web warming-up screen reads it (D3).
    return {"status": "ok", "model_loaded": False}
