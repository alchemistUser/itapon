# SPDX-License-Identifier: AGPL-3.0-or-later
"""The model's classes and the Supabase content (Bin Guide / bin mapping) must agree."""

import json
from pathlib import Path

from app.classes import WASTE_CLASSES

CONTENT = Path(__file__).resolve().parents[3] / "supabase" / "content" / "waste_content.json"


def load():
    return json.loads(CONTENT.read_text(encoding="utf-8"))


def test_every_model_class_has_content_with_same_bin():
    items = {i["class_key"]: i for i in load()["items"]}
    for c in WASTE_CLASSES:
        assert c.key in items, f"{c.key} missing from waste_content.json"
        assert items[c.key]["detectable"] is True, c.key
        assert items[c.key]["category"] == c.default_category, c.key


def test_detectable_items_are_exactly_the_model_classes():
    detectable = {i["class_key"] for i in load()["items"] if i["detectable"]}
    assert detectable == {c.key for c in WASTE_CLASSES}


def test_every_item_has_instruction_and_aliases():
    for i in load()["items"]:
        assert i["short_instruction"].strip(), i["class_key"]
        assert i["aliases"], i["class_key"]
