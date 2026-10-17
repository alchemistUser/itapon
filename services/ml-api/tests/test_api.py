# SPDX-License-Identifier: AGPL-3.0-or-later
import io
import threading
import time

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.classes import PROMPT_TO_CLASS, PROMPTS, WASTE_CLASSES
from app.config import Settings
from app.main import create_app
from app.schemas import BBox, Detection


class FakeDetector:
    model_version = "fake-v0"

    def __init__(self, _settings: Settings) -> None:
        pass

    def detect(self, image: Image.Image) -> list[Detection]:
        return [
            Detection(
                class_key="paper_bag",
                confidence=0.91,
                bbox=BBox(x1=0.1, y1=0.1, x2=0.6, y2=0.9),
                default_category="recyclable",
            )
        ]


def wait_until_loaded(client: TestClient) -> dict:
    for _ in range(50):
        body = client.get("/health").json()
        if body["model_loaded"] or body["error"]:
            return body
        time.sleep(0.02)
    raise AssertionError("model never finished loading")


def jpeg_bytes(size: tuple[int, int] = (320, 240)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, "white").save(buf, "JPEG")
    return buf.getvalue()


@pytest.fixture
def client():
    with TestClient(create_app(Settings(), FakeDetector)) as c:
        wait_until_loaded(c)
        yield c


# --- class list ---------------------------------------------------------------


def test_class_list_matches_spec():
    assert len(WASTE_CLASSES) == 23  # docs/spec.md §3
    assert len({c.key for c in WASTE_CLASSES}) == 23
    assert len(PROMPTS) == len(PROMPT_TO_CLASS)
    assert {c.default_category for c in WASTE_CLASSES} == {
        "biodegradable",
        "recyclable",
        "residual",
        "hazardous",
    }


# --- health / loading -----------------------------------------------------------


def test_health_reports_loading_then_ready():
    gate = threading.Event()

    class SlowDetector(FakeDetector):
        def __init__(self, s: Settings) -> None:
            gate.wait(2)

    with TestClient(create_app(Settings(), SlowDetector)) as c:
        assert c.get("/health").json() == {"status": "ok", "model_loaded": False, "error": None}
        res = c.post("/v1/detect", files={"image": ("a.jpg", jpeg_bytes(), "image/jpeg")})
        assert res.status_code == 503
        assert res.headers["retry-after"] == "5"
        gate.set()
        assert wait_until_loaded(c)["model_loaded"] is True


def test_health_reports_load_error():
    def broken(_s: Settings):
        raise FileNotFoundError("weights missing")

    with TestClient(create_app(Settings(), broken)) as c:
        body = wait_until_loaded(c)
        assert body["status"] == "error"
        assert "weights missing" in body["error"]


# --- /v1/model ------------------------------------------------------------------


def test_model_info(client):
    body = client.get("/v1/model").json()
    assert body["model_version"] == "fake-v0"
    assert len(body["classes"]) == 23
    assert body["thresholds"]["confident"] > body["thresholds"]["possible"]


# --- /v1/detect -----------------------------------------------------------------


def test_detect_returns_contract(client):
    res = client.post("/v1/detect", files={"image": ("a.jpg", jpeg_bytes(), "image/jpeg")})
    assert res.status_code == 200
    body = res.json()
    assert body["model_version"] == "fake-v0"
    assert body["image"] == {"width": 320, "height": 240}
    assert isinstance(body["inference_ms"], int)
    det = body["detections"][0]
    assert det["class_key"] == "paper_bag"
    assert det["default_category"] == "recyclable"
    assert set(det["bbox"]) == {"x1", "y1", "x2", "y2"}


def test_detect_downscales_large_images(client):
    res = client.post(
        "/v1/detect", files={"image": ("a.jpg", jpeg_bytes((1920, 1080)), "image/jpeg")}
    )
    assert res.json()["image"] == {"width": 640, "height": 360}


def test_detect_rejects_wrong_type(client):
    res = client.post("/v1/detect", files={"image": ("a.gif", b"GIF89a", "image/gif")})
    assert res.status_code == 415


def test_detect_rejects_oversized(client):
    big = b"\xff\xd8" + b"0" * (2 * 1024 * 1024 + 10)
    res = client.post("/v1/detect", files={"image": ("a.jpg", big, "image/jpeg")})
    assert res.status_code == 413


def test_detect_rejects_corrupt_image(client):
    res = client.post("/v1/detect", files={"image": ("a.jpg", b"not an image", "image/jpeg")})
    assert res.status_code == 400


def test_detect_requires_file(client):
    assert client.post("/v1/detect").status_code == 422


# --- real model (opt-in: uv run pytest -m slow) ---------------------------------


@pytest.mark.slow
def test_real_model_loads_and_detects():
    from app.detector import YoloDetector

    settings = Settings()
    if not settings.weights_path.exists():
        pytest.skip("weights not built")
    detector = YoloDetector(settings)
    assert detector.detect(Image.new("RGB", (640, 480), "white")) == []
