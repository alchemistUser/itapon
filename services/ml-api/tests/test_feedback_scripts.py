# SPDX-License-Identifier: AGPL-3.0-or-later
"""Phase 20 feedback export + field evaluation: the pure parts (no network, no model)."""

from scripts.evaluate_field import decide, score, top_prediction
from scripts.export_feedback import manifest_rows

LABELS = [
    {"class_key": "plastic_bottle", "default_category": "recyclable"},
    {"class_key": "banana_peel", "default_category": "biodegradable"},
    {"class_key": "phone", "default_category": "none", "ignore": True},
]


def test_manifest_uses_reviewer_label_and_marks_negatives():
    rows = [
        {
            "id": "a",
            "image_path": "u/a.jpg",
            "reviewed_class_key": "banana_peel",
            "model_version": "v0.1",
            "scan_detections": {"class_key": "plastic_bottle"},
            "waste_items": {"category_key": "biodegradable"},
        },
        {"id": "b", "image_path": "u/b.jpg", "reviewed_class_key": None, "waste_items": None},
        {"id": "c", "image_path": None, "reviewed_class_key": "banana_peel"},
    ]
    m = manifest_rows(rows)
    assert [r["feedback_id"] for r in m] == ["a", "b"]
    assert m[0] | {} == {
        "file": "images/a.jpg",
        "class_key": "banana_peel",
        "category": "biodegradable",
        "predicted_class_key": "plastic_bottle",
        "model_version": "v0.1",
        "feedback_id": "a",
    }
    assert (m[1]["class_key"], m[1]["category"]) == ("", "none")


def test_top_prediction_skips_ignored_and_weak_rows():
    rows = [
        [0, 0, 1, 1, 0.9, 2],  # phone (ignored distractor)
        [0, 0, 1, 1, 0.1, 0],  # below the 0.15 floor
        [0, 0, 1, 1, 0.4, 1],
    ]
    assert top_prediction(rows, LABELS) == ("banana_peel", "biodegradable")
    assert top_prediction([[0, 0, 1, 1, 0.9, 2]], LABELS) == ("", "none")


def test_score_and_promotion_rule():
    truth = [
        {"class_key": "banana_peel", "category": "biodegradable"},
        {"class_key": "", "category": "none"},
    ]
    cur = score([("banana_peel", "biodegradable"), ("plastic_bottle", "recyclable")], truth)
    cand = score([("banana_peel", "biodegradable"), ("", "none")], truth)
    assert cur["item_acc"] == 0.5 and cand["item_acc"] == 1.0
    assert cur["bin_acc"] == {"biodegradable": 1.0, "none": 0.0}
    assert decide(cur, cand, min_images=2) == (True, "promote candidate: no metric is worse")
    assert decide(cand, cur, min_images=2)[0] is False
    assert decide(cur, cand)[1].startswith("keep current: only 2 field images")


def test_regression_gate_flags_any_drop():
    from scripts.model_regression import regressions

    base = {"item_acc": 0.8, "bin_acc": {"recyclable": 0.9, "none": 1.0}}
    same = {"item_acc": 0.8, "bin_acc": {"recyclable": 0.9, "none": 1.0}}
    worse = {"item_acc": 0.82, "bin_acc": {"recyclable": 0.85, "none": 1.0}}
    assert regressions(same, base) == []
    assert regressions(worse, base) == ["recyclable accuracy 85% < 90%"]
