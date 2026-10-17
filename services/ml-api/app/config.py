# SPDX-License-Identifier: AGPL-3.0-or-later
"""Runtime settings, read from environment variables (see .env.example)."""

import os
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _float(name: str, default: float) -> float:
    return float(os.getenv(name, default))


def _int(name: str, default: int) -> int:
    return int(os.getenv(name, default))


@dataclass(frozen=True)
class Settings:
    weights_path: Path = field(
        default_factory=lambda: Path(
            os.getenv("WEIGHTS_PATH", ROOT / "weights" / "itapon-world-v0.pt")
        )
    )
    allowed_origins: tuple[str, ...] = field(
        default_factory=lambda: tuple(
            o.strip()
            for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
            if o.strip()
        )
    )
    # Lowest confidence returned at all. Zero-shot scores run lower than trained-model scores.
    min_confidence: float = field(default_factory=lambda: _float("MIN_CONFIDENCE", 0.10))
    # Client display tiers (Phase 7 two-tier rule), served by /v1/model.
    confident_threshold: float = field(default_factory=lambda: _float("CONFIDENT_THRESHOLD", 0.35))
    possible_threshold: float = field(default_factory=lambda: _float("POSSIBLE_THRESHOLD", 0.15))
    iou_threshold: float = field(default_factory=lambda: _float("IOU_THRESHOLD", 0.5))
    max_detections: int = field(default_factory=lambda: _int("MAX_DETECTIONS", 10))
    image_size: int = field(default_factory=lambda: _int("IMAGE_SIZE", 640))
    max_upload_bytes: int = field(default_factory=lambda: _int("MAX_UPLOAD_BYTES", 2 * 1024 * 1024))


settings = Settings()
