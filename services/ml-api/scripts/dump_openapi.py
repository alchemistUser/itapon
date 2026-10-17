# SPDX-License-Identifier: AGPL-3.0-or-later
"""Write the API contract to openapi.json (Phase 23). Run after an intended API change:

    uv run python -m scripts.dump_openapi

tests/test_contract.py fails if the app's schema and the committed file differ.
"""

import json
from pathlib import Path

from app.main import create_app

OUT = Path(__file__).resolve().parents[1] / "openapi.json"


def schema() -> dict:
    return create_app().openapi()


if __name__ == "__main__":
    OUT.write_text(json.dumps(schema(), indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"wrote {OUT}")
