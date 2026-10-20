# SPDX-License-Identifier: AGPL-3.0-or-later
# ruff: noqa: E501  (SQL/CSV templates and data tables read better unwrapped)
"""Disposal library validator (ROADMAP-v2 Phase 28): the safety and review rules."""

import copy
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "supabase" / "scripts"))
import build_library as bl  # noqa: E402

SOURCES = [
    {"id": "S-LAW", "title": "Law", "url": "https://example.org", "level": "P", "verified": "true"},
    {"id": "S-NEWS", "title": "News", "url": "", "level": "S", "verified": "false"},
]
MATERIALS = [
    {
        "code": "PLA",
        "parent_code": "",
        "name_en": "Plastics",
        "name_fil": "Plastik",
        "resin_code": "",
        "default_bin": "",
        "sort_order": "10",
        "description_en": "",
        "description_fil": "",
    },
    {
        "code": "PLA-1",
        "parent_code": "PLA",
        "name_en": "#1 PET",
        "name_fil": "#1 PET",
        "resin_code": "1",
        "default_bin": "recyclable",
        "sort_order": "11",
        "description_en": "",
        "description_fil": "",
    },
    {
        "code": "BAT",
        "parent_code": "",
        "name_en": "Batteries",
        "name_fil": "Baterya",
        "resin_code": "",
        "default_bin": "hazardous",
        "sort_order": "20",
        "description_en": "",
        "description_fil": "",
    },
    {
        "code": "BAT-LI",
        "parent_code": "BAT",
        "name_en": "Li-ion",
        "name_fil": "Li-ion",
        "resin_code": "",
        "default_bin": "hazardous",
        "sort_order": "21",
        "description_en": "",
        "description_fil": "",
    },
]
DESTS = [
    {"code": c, "name_en": c, "name_fil": c, "sort_order": "1"}
    for c in ("bin", "junkshop", "hazdrop")
]
EMPTY = dict.fromkeys(
    [
        "name_fil",
        "aliases",
        "resin_code",
        "summary_fil",
        "prep_en",
        "prep_fil",
        "note_en",
        "note_fil",
        "dont_en",
        "dont_fil",
        "hazard_en",
        "hazard_fil",
        "value",
        "reuse_en",
        "reuse_fil",
        "reduce_en",
        "reduce_fil",
        "fact_en",
        "fact_fil",
        "related",
        "detectable_class_key",
        "reviewed_by",
        "reviewed_at",
    ],
    "",
)


def item(**kw) -> dict:
    base = {
        **EMPTY,
        "_file": "PLA.csv",
        "slug": "pet-bottle",
        "name_en": "PET bottle",
        "material": "PLA-1",
        "resin_code": "1",
        "bin": "recyclable",
        "destinations": "junkshop;bin",
        "summary_en": "Empty it and put it in the blue bin.",
        "sources": "S-LAW",
        "status": "draft",
        "prep_en": "Empty it :: Pour out the drink.",
    }
    base.update(kw)
    return base


def check(*items: dict) -> bl.Report:
    lib = bl.Library(SOURCES, MATERIALS, DESTS, [copy.deepcopy(i) for i in items], [], [])
    return bl.validate(lib, {"plastic_bottle", "battery"})


def errors(*items: dict) -> list[str]:
    return check(*items).errors


def test_a_good_draft_passes_with_filipino_warning():
    r = check(item())
    assert r.errors == []
    assert any("Filipino missing" in w for w in r.warnings)


@pytest.mark.parametrize(
    "text, bad",
    [
        ("Burn it in the backyard.", True),
        ("Pour it down the drain.", True),
        ("Sunugin ito.", True),
        ("Do not puncture or burn it.", False),
        ("Huwag sunugin.", False),
        ("Never pour oil down the sink.", False),
        ("Rinse it in the sink.", False),
    ],
)
def test_unsafe_advice_is_rejected_but_warnings_are_fine(text, bad):
    assert bl.unsafe(text) is bad


def test_hazardous_items_need_hazard_text_and_no_reuse_ideas():
    battery = item(
        _file="BAT.csv",
        slug="power-bank",
        material="BAT-LI",
        resin_code="",
        bin="hazardous",
        destinations="hazdrop",
        reuse_en="Use it as a paperweight",
    )
    errs = errors(battery)
    assert any("no DIY" in e for e in errs)
    assert any("need hazard_en" in e for e in errs)


def test_published_needs_filipino_reviewers_and_verified_sources():
    pub = item(status="published", sources="S-LAW;S-NEWS")
    errs = errors(pub)
    assert any("Filipino required" in e for e in errs)
    assert any("needs reviewed_by" in e for e in errs)
    assert any("S-NEWS is not verified" in e for e in errs)


def test_hazardous_published_needs_two_reviewers():
    bat = item(
        _file="BAT.csv",
        slug="power-bank",
        material="BAT-LI",
        resin_code="",
        bin="hazardous",
        destinations="hazdrop",
        hazard_en="Can catch fire.",
        hazard_fil="Puwedeng magliyab.",
        name_fil="Power bank",
        summary_fil="Dalhin sa koleksyon.",
        prep_en="",
        status="published",
        reviewed_by="AB",
        reviewed_at="2026-10-20",
    )
    assert any("two different reviewers" in e for e in errors(bat))
    bat["reviewed_by"] = "AB;CD"
    assert errors(bat) == []


def test_structure_errors():
    errs = errors(
        item(slug="Bad Slug"),
        item(slug="wrong-file", _file="BAT.csv"),
        item(slug="bad-resin", resin_code="5"),
        item(slug="bad-dest", destinations="moon"),
        item(slug="bad-src", sources="S-NOPE"),
        item(slug="bad-related", related="ghost"),
        item(slug="bad-prep", prep_en="no separator here"),
        item(slug="long", summary_en="x" * 141),
    )
    joined = "\n".join(errs)
    for needle in [
        "slug must be",
        "belongs in PLA.csv",
        "doesn't match PLA-1",
        "unknown destination",
        "unknown source",
        "doesn't exist",
        "Title :: detail",
        "max 140",
    ]:
        assert needle in joined, needle


def test_repo_content_is_valid():
    lib = bl.load()
    report = bl.validate(lib, bl.v1_detectable())
    assert report.errors == []
    assert len(lib.items) >= 36
