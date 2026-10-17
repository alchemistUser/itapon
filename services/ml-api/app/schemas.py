# SPDX-License-Identifier: AGPL-3.0-or-later
"""Response models for API contract v1 (ROADMAP Phase 8)."""

from typing import Literal

from pydantic import BaseModel, Field

Category = Literal["biodegradable", "recyclable", "residual", "hazardous"]


class BBox(BaseModel):
    """Normalized to 0–1 so clients can draw overlays at any size."""

    x1: float = Field(ge=0, le=1)
    y1: float = Field(ge=0, le=1)
    x2: float = Field(ge=0, le=1)
    y2: float = Field(ge=0, le=1)


class Detection(BaseModel):
    class_key: str
    confidence: float = Field(ge=0, le=1)
    bbox: BBox
    default_category: Category


class ImageSize(BaseModel):
    width: int
    height: int


class DetectResponse(BaseModel):
    model_version: str
    inference_ms: int
    image: ImageSize
    detections: list[Detection]


class Health(BaseModel):
    status: Literal["ok", "error"]
    model_loaded: bool
    error: str | None = None


class ClassInfo(BaseModel):
    class_key: str
    default_category: Category


class Thresholds(BaseModel):
    confident: float
    possible: float
    min: float


class ModelInfo(BaseModel):
    model_version: str
    classes: list[ClassInfo]
    thresholds: Thresholds
