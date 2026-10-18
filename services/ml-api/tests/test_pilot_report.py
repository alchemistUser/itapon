# SPDX-License-Identifier: AGPL-3.0-or-later
"""Pilot analysis (Phase 25): scoring rules that go into Chapter 4."""

import math

import pytest

from scripts.pilot_report import (
    likert_label,
    section_contamination,
    section_tasks,
    sus_grade,
    sus_score,
    two_proportion_p,
)


def test_sus_scoring_follows_brooke():
    assert sus_score([5, 1] * 5) == 100.0  # best possible
    assert sus_score([1, 5] * 5) == 0.0  # worst possible
    assert sus_score([3] * 10) == 50.0
    assert sus_score([4, 2, 4, 2, 4, 2, 4, 2, 4, 2]) == 75.0
    with pytest.raises(ValueError):
        sus_score([3] * 9)
    with pytest.raises(ValueError):
        sus_score([0] * 10)


def test_sus_grade_and_adjective():
    assert sus_grade(68.0) == ("C", "OK")
    assert sus_grade(85.0) == ("A+", "Good")
    assert sus_grade(86.0)[1] == "Excellent"
    assert sus_grade(40.0) == ("F", "Poor")


def test_likert_interpretation_boundaries():
    assert likert_label(4.21) == ("Strongly agree", "Excellent")
    assert likert_label(4.20) == ("Agree", "Very good")
    assert likert_label(3.0) == ("Neutral", "Good")
    assert likert_label(1.0) == ("Strongly disagree", "Poor")


def test_two_proportion_test():
    # 30/100 → 10/100 is clearly significant; equal rates are not
    assert two_proportion_p(30, 100, 10, 100) < 0.01
    assert two_proportion_p(20, 100, 20, 100) == pytest.approx(1.0)
    assert math.isnan(two_proportion_p(1, 0, 1, 10))


def test_task_and_contamination_sections():
    tasks = [
        {"task_id": "T1", "success": "1", "time_s": "20", "errors": "0"},
        {"task_id": "T1", "success": "0", "time_s": "60", "errors": "2"},
        {"task_id": "T2", "success": "1", "time_s": "", "errors": "0"},
    ]
    text = "\n".join(section_tasks(tasks))
    assert "| T1 | 2 | 50% | 40.0 | 40.0 | 1.00 |" in text
    assert "Overall task success 67%" in text and "not met" in text

    cont = [
        {"phase": "before", "bin": "Blue", "items_total": "100", "items_wrong": "30"},
        {"phase": "during", "bin": "Blue", "items_total": "100", "items_wrong": "10"},
    ]
    text = "\n".join(section_contamination(cont))
    assert "| Blue | 30.0% (30/100) | 10.0% (10/100) | -20.0 pts |" in text
