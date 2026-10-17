# SPDX-License-Identifier: AGPL-3.0-or-later
"""iTapon inference API: image in, waste detections out. Stateless (no DB writes)."""

import asyncio
import io
import logging
from collections.abc import Callable
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps, UnidentifiedImageError

from app.classes import WASTE_CLASSES
from app.config import Settings, settings
from app.detector import Detector, YoloDetector, timed_detect
from app.schemas import (
    ClassInfo,
    DetectResponse,
    Health,
    ImageSize,
    ModelInfo,
    Thresholds,
)

log = logging.getLogger("itapon.api")

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
# Phase 22: a few KB of PNG can declare a gigapixel image ("decompression bomb"). Phone
# photos are ≤ ~50 MP; refuse anything bigger before decoding a single pixel.
MAX_PIXELS = 50_000_000
Image.MAX_IMAGE_PIXELS = MAX_PIXELS


def create_app(
    cfg: Settings = settings,
    detector_factory: Callable[[Settings], Detector] = YoloDetector,
) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.detector = None
        app.state.load_error = None

        async def load() -> None:
            # Load in the background so /health answers immediately during cold
            # start; the web app shows its warming-up screen until model_loaded (D3).
            try:
                app.state.detector = await asyncio.to_thread(detector_factory, cfg)
                log.info("Model loaded: %s", app.state.detector.model_version)
            except Exception as exc:  # surfaced via /health instead of crashing the Space
                log.exception("Model failed to load")
                app.state.load_error = str(exc)

        task = asyncio.create_task(load())
        yield
        task.cancel()

    app = FastAPI(title="iTapon ML API", version="0.2.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(cfg.allowed_origins),
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    def get_detector(request: Request) -> Detector:
        detector = request.app.state.detector
        if detector is None:
            detail = request.app.state.load_error or "Model is still loading. Retry shortly."
            raise HTTPException(status_code=503, detail=detail, headers={"Retry-After": "5"})
        return detector

    @app.get("/health", response_model=Health)
    def health(request: Request) -> Health:
        error = request.app.state.load_error
        return Health(
            status="error" if error else "ok",
            model_loaded=request.app.state.detector is not None,
            error=error,
        )

    @app.get("/v1/model", response_model=ModelInfo)
    def model_info(request: Request) -> ModelInfo:
        detector = get_detector(request)
        return ModelInfo(
            model_version=detector.model_version,
            classes=[
                ClassInfo(class_key=c.key, default_category=c.default_category)
                for c in WASTE_CLASSES
            ],
            thresholds=Thresholds(
                confident=cfg.confident_threshold,
                possible=cfg.possible_threshold,
                min=cfg.min_confidence,
            ),
        )

    @app.post("/v1/detect", response_model=DetectResponse)
    async def detect(request: Request, image: Annotated[UploadFile, File()]) -> DetectResponse:
        detector = get_detector(request)

        if image.content_type not in ALLOWED_TYPES:
            raise HTTPException(415, f"Unsupported type {image.content_type}; use JPEG/PNG/WebP.")
        data = await image.read(cfg.max_upload_bytes + 1)
        if len(data) > cfg.max_upload_bytes:
            raise HTTPException(413, f"Image larger than {cfg.max_upload_bytes // 1024} KB.")

        try:
            img = Image.open(io.BytesIO(data))  # lazy: reads the header only
            if img.width * img.height > MAX_PIXELS:
                raise HTTPException(413, "Image dimensions are too large.")
            img = ImageOps.exif_transpose(img).convert("RGB")  # phone photos carry rotation
        except Image.DecompressionBombError as exc:
            raise HTTPException(413, "Image dimensions are too large.") from exc
        except (UnidentifiedImageError, OSError, SyntaxError) as exc:
            raise HTTPException(400, "File is not a readable image.") from exc
        img.thumbnail((cfg.image_size, cfg.image_size))  # cap work for oversized uploads

        detections, ms = await run_in_threadpool(timed_detect, detector, img)
        return DetectResponse(
            model_version=detector.model_version,
            inference_ms=ms,
            image=ImageSize(width=img.width, height=img.height),
            detections=detections,
        )

    return app


app = create_app()
