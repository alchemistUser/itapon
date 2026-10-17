# SPDX-License-Identifier: AGPL-3.0-or-later
"""API contract (Phase 23): the served OpenAPI schema must match the committed openapi.json,
so any change to request/response shapes is deliberate and reviewed."""

import json

from scripts.dump_openapi import OUT, schema


def test_openapi_matches_committed_contract():
    committed = json.loads(OUT.read_text(encoding="utf-8"))
    assert schema() == committed, "API changed: run `uv run python -m scripts.dump_openapi`"


def test_contract_has_the_endpoints_the_app_documents():
    paths = json.loads(OUT.read_text(encoding="utf-8"))["paths"]
    assert {"/health", "/v1/model", "/v1/detect"} <= set(paths)
    detect = paths["/v1/detect"]["post"]["responses"]
    assert "200" in detect and "422" in detect
