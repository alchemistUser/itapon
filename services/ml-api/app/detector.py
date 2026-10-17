# SPDX-License-Identifier: AGPL-3.0-or-later
"""Model wrapper: loads weights once and turns images into Detection objects."""

import json
import time
from pathlib import Path
from typing import Protocol

from PIL import Image

from app.classes import PROMPT_TO_CLASS
from app.config import Settings
from app.schemas import BBox, Detection


class Detector(Protocol):
    model_version: str

    def detect(self, image: Image.Image) -> list[Detection]: ...


class YoloDetector:
    """Wraps the custom-vocabulary YOLO-World weights (D11).

    Trained YOLO weights from Phases 5–7 can replace these later. They only need
    the same class-index → class_key mapping.
    """

    def __init__(self, settings: Settings) -> None:
        from ultralytics import YOLO  # deferred: heavy import, and tests use a fake

        path = Path(settings.weights_path)
        if not path.exists():
            raise FileNotFoundError(
                f"Weights not found at {path}. Run: uv run --group build python "
                "scripts/build_world_model.py"
            )
        self._settings = settings
        self._model = YOLO(str(path))
        n_names = len(self._model.names)
        if n_names != len(PROMPT_TO_CLASS):
            raise RuntimeError(
                f"Weights have {n_names} classes but app/classes.py defines "
                f"{len(PROMPT_TO_CLASS)} prompts. Rebuild the weights."
            )
        meta = path.with_suffix(".json")
        self.model_version = (
            json.loads(meta.read_text())["model_version"] if meta.exists() else path.stem
        )
        self._warm_up()

    def _warm_up(self) -> None:
        # The first inference is slow (graph setup); do it before reporting ready.
        self.detect(Image.new("RGB", (self._settings.image_size, self._settings.image_size)))

    def detect(self, image: Image.Image) -> list[Detection]:
        s = self._settings
        result = self._model.predict(
            image,
            imgsz=s.image_size,
            conf=s.min_confidence,
            iou=s.iou_threshold,
            max_det=s.max_detections,
            # One box per object even when two synonym prompts fire on it.
            agnostic_nms=True,
            verbose=False,
        )[0]

        detections = []
        boxes = result.boxes
        for xyxyn, conf, cls in zip(
            boxes.xyxyn.tolist(), boxes.conf.tolist(), boxes.cls.tolist(), strict=True
        ):
            waste = PROMPT_TO_CLASS[int(cls)]
            x1, y1, x2, y2 = (_clip01(v) for v in xyxyn)
            detections.append(
                Detection(
                    class_key=waste.key,
                    confidence=round(conf, 4),
                    bbox=BBox(x1=x1, y1=y1, x2=x2, y2=y2),
                    default_category=waste.default_category,
                )
            )
        return sorted(detections, key=lambda d: d.confidence, reverse=True)


def _clip01(v: float) -> float:
    return min(1.0, max(0.0, round(v, 4)))


def timed_detect(detector: Detector, image: Image.Image) -> tuple[list[Detection], int]:
    start = time.perf_counter()
    detections = detector.detect(image)
    return detections, int((time.perf_counter() - start) * 1000)
