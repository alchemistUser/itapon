# SPDX-License-Identifier: AGPL-3.0-or-later
"""Abuse cases for /v1/detect (Phase 22): malformed files, bombs and oversized uploads must
get a clean 4xx, never a 500 or a hang."""

import io
import random
import zlib

import pytest
from PIL import Image

from tests.test_api import client, jpeg_bytes  # noqa: F401  (fixture)


def post(client, data: bytes, content_type: str = "image/jpeg"):  # noqa: F811
    return client.post("/v1/detect", files={"image": ("x", data, content_type)})


def png_bomb(width: int, height: int) -> bytes:
    """A valid tiny PNG whose header claims width x height (1-bit, all zero)."""

    def chunk(kind: bytes, body: bytes) -> bytes:
        return (
            len(body).to_bytes(4, "big") + kind + body + zlib.crc32(kind + body).to_bytes(4, "big")
        )

    ihdr = width.to_bytes(4, "big") + height.to_bytes(4, "big") + bytes([1, 0, 0, 0, 0])
    row = b"\x00" + b"\x00" * ((width + 7) // 8)
    idat = zlib.compress(row * 64, 9)  # far too little data: decoding would fail/stall
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


@pytest.mark.parametrize(
    "data",
    [
        b"",
        b"not an image at all",
        jpeg_bytes()[:200],  # truncated JPEG
        b"\xff\xd8\xff" + bytes(random.Random(1).randrange(256) for _ in range(4000)),
        b"\x89PNG\r\n\x1a\n" + bytes(random.Random(2).randrange(256) for _ in range(4000)),
        b"GIF89a" + b"\x00" * 100,
    ],
    ids=["empty", "text", "truncated-jpeg", "random-jpeg", "random-png", "gif-as-jpeg"],
)
def test_malformed_images_get_400(client, data):  # noqa: F811
    r = post(client, data)
    assert r.status_code == 400, r.text


def test_decompression_bomb_is_refused_before_decoding(client):  # noqa: F811
    bomb = png_bomb(60_000, 60_000)  # 3.6 gigapixels in a few hundred bytes
    assert len(bomb) < 10_000
    r = post(client, bomb, "image/png")
    assert r.status_code == 413, r.text


def test_oversized_upload_is_refused(client):  # noqa: F811
    r = post(client, b"\xff\xd8" + b"\x00" * (2 * 1024 * 1024 + 10))
    assert r.status_code == 413


def test_wrong_content_type_is_refused(client):  # noqa: F811
    r = post(client, jpeg_bytes(), "application/x-msdownload")
    assert r.status_code == 415


def test_random_fuzz_never_500s(client):  # noqa: F811
    rng = random.Random(406)
    base = jpeg_bytes((64, 64))
    for _ in range(40):
        data = bytearray(base)
        for _ in range(rng.randint(1, 30)):
            data[rng.randrange(len(data))] = rng.randrange(256)
        r = post(client, bytes(data))
        assert r.status_code in (200, 400), (r.status_code, r.text)


def test_valid_image_still_works(client):  # noqa: F811
    buf = io.BytesIO()
    Image.new("RGB", (640, 480), "white").save(buf, "PNG")
    assert post(client, buf.getvalue(), "image/png").status_code == 200
