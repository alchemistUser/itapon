# SPDX-License-Identifier: AGPL-3.0-or-later
# ruff: noqa: E501  (SQL/CSV templates and data tables read better unwrapped)
"""Validate the disposal library CSVs and generate the seed, web copy and coverage report.

    python supabase/scripts/build_library.py          # validate + write outputs
    python supabase/scripts/build_library.py --check  # validate + fail if outputs are stale (CI)

Inputs  (supabase/content/library/):  sources.csv, materials.csv, destinations.csv,
                                      items/<GROUP>.csv, local_rules.csv, dropoff_points.csv
Outputs: supabase/seed_library.sql               (all rows; RLS shows only published ones)
         apps/web/src/content/library.json       (published items only: offline copy)
         docs/library/coverage.md                (what's written, reviewed, missing)

Rules come from docs/library/style-guide.md and entry-template.md. Errors stop the build;
warnings are listed but allowed (mostly drafts that aren't finished yet).
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / "supabase" / "content" / "library"
V1_CONTENT = ROOT / "supabase" / "content" / "waste_content.json"
SEED = ROOT / "supabase" / "seed_library.sql"
WEB = ROOT / "apps" / "web" / "src" / "content" / "library.json"
COVERAGE = ROOT / "docs" / "library" / "coverage.md"

BINS = {"biodegradable", "recyclable", "residual", "hazardous"}
STATUSES = ("draft", "reviewed", "published")
VALUES = {"", "buys", "accepts", "none"}
GROUP_TARGET = 10  # v1.1: >= 10 items per material group

# Subgroups whose items count as hazardous even if the bin says otherwise (D18: 2 reviewers).
HAZARDOUS_MATERIALS = re.compile(
    r"^(BAT|HHW|ELE)-|^(LIG-FLUO|LIG-LED|LIG-STRING|MED-SHARP|MED-DRUG|MET-AERO|ORG-OIL|BLK-APPL)$"
)
# Dangerous advice that must never appear in instructions, ideas or summaries (style guide).
FORBIDDEN = re.compile(
    r"\b(burn|sunugin|sinunog|incinerate)\b|pour [^.]{0,30}(drain|sink|toilet|kanal)|flush [^.]{0,20}(toilet|drain)",
    re.I,
)
NEGATION = re.compile(r"\b(do not|don't|never|avoid|huwag|bawal)\b", re.I)


def unsafe(text: str) -> bool:
    """True if a sentence recommends burning or draining (warnings like "Don't burn it" are fine)."""
    for sentence in re.split(r"(?<=[.!?|])\s*|::", text):
        if FORBIDDEN.search(sentence) and not NEGATION.search(sentence):
            return True
    return False


SAFETY_FIELDS = (
    "summary_en",
    "summary_fil",
    "prep_en",
    "prep_fil",
    "reuse_en",
    "reuse_fil",
    "reduce_en",
    "reduce_fil",
)
# English field -> its Filipino twin (required once an item is reviewed).
FIL_TWINS = {
    "name_en": "name_fil",
    "summary_en": "summary_fil",
    "prep_en": "prep_fil",
    "note_en": "note_fil",
    "dont_en": "dont_fil",
    "hazard_en": "hazard_fil",
    "reuse_en": "reuse_fil",
    "reduce_en": "reduce_fil",
    "fact_en": "fact_fil",
}


@dataclass
class Report:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def err(self, where: str, msg: str) -> None:
        self.errors.append(f"{where}: {msg}")

    def warn(self, where: str, msg: str) -> None:
        self.warnings.append(f"{where}: {msg}")


# ---------------------------------------------------------------- parsing


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as f:
        return [{k: (v or "").strip() for k, v in row.items()} for row in csv.DictReader(f)]


def split(value: str, sep: str) -> list[str]:
    return [p.strip() for p in value.split(sep) if p.strip()]


def parse_prep(value: str) -> list[dict[str, str]] | None:
    """'Title :: detail | Title :: detail' -> [{title, detail}]; None if malformed."""
    steps = []
    for part in split(value, "|"):
        if "::" not in part:
            return None
        title, detail = (s.strip() for s in part.split("::", 1))
        steps.append({"title": title, "detail": detail})
    return steps


@dataclass
class Library:
    sources: list[dict]
    materials: list[dict]
    destinations: list[dict]
    items: list[dict]
    local_rules: list[dict]
    dropoffs: list[dict]


def load(content: Path = CONTENT) -> Library:
    items = []
    for path in sorted((content / "items").glob("*.csv")):
        for row in read_csv(path):
            row["_file"] = path.name
            items.append(row)
    return Library(
        sources=read_csv(content / "sources.csv"),
        materials=read_csv(content / "materials.csv"),
        destinations=read_csv(content / "destinations.csv"),
        items=items,
        local_rules=read_csv(content / "local_rules.csv"),
        dropoffs=read_csv(content / "dropoff_points.csv"),
    )


def v1_detectable() -> set[str]:
    data = json.loads(V1_CONTENT.read_text(encoding="utf-8"))
    return {i["class_key"] for i in data["items"]}


# ---------------------------------------------------------------- validation


def is_hazardous(item: dict) -> bool:
    return item["bin"] == "hazardous" or bool(HAZARDOUS_MATERIALS.search(item["material"]))


def validate(lib: Library, class_keys: set[str]) -> Report:
    r = Report()
    sources = {s["id"]: s for s in lib.sources}
    for s in lib.sources:
        if not re.fullmatch(r"S-[A-Z0-9-]+", s["id"]):
            r.err(f"sources {s['id']}", "bad id")
        if s["level"] not in ("P", "S", "I"):
            r.err(f"sources {s['id']}", "level must be P, S or I")
        if s["url"] and not s["url"].startswith("https://"):
            r.err(f"sources {s['id']}", "url must be https")

    mats = {m["code"]: m for m in lib.materials}
    for m in lib.materials:
        if m["parent_code"] and m["parent_code"] not in mats:
            r.err(f"materials {m['code']}", f"unknown parent {m['parent_code']}")
        if not m["name_fil"]:
            r.err(f"materials {m['code']}", "missing name_fil")
        if m["default_bin"] and m["default_bin"] not in BINS:
            r.err(f"materials {m['code']}", f"bad default_bin {m['default_bin']}")
    dests = {d["code"] for d in lib.destinations}

    slugs: dict[str, dict] = {}
    for it in lib.items:
        where = f"{it['_file']} {it.get('slug') or '?'}"
        slug = it["slug"]
        if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", slug):
            r.err(where, "slug must be lowercase words joined by '-'")
        if slug in slugs:
            r.err(where, "duplicate slug")
        slugs[slug] = it

    for it in lib.items:
        where = f"{it['_file']} {it['slug']}"
        status = it["status"]
        if status not in STATUSES:
            r.err(where, f"status must be one of {STATUSES}")
        if not it["name_en"]:
            r.err(where, "missing name_en")
        mat = mats.get(it["material"])
        if not mat or not mat["parent_code"]:
            r.err(where, f"material must be a subgroup code, got {it['material']!r}")
        elif it["_file"] != f"{mat['parent_code']}.csv":
            r.err(where, f"belongs in {mat['parent_code']}.csv")
        if it["bin"] not in BINS:
            r.err(where, f"bad bin {it['bin']!r}")
        ds = split(it["destinations"], ";")
        if not ds:
            r.err(where, "needs at least one destination")
        for d in ds:
            if d not in dests:
                r.err(where, f"unknown destination {d!r}")
        if len(ds) != len(set(ds)):
            r.err(where, "duplicate destination")
        if not it["summary_en"]:
            r.err(where, "missing summary_en")
        elif len(it["summary_en"]) > 140:
            r.err(where, f"summary_en is {len(it['summary_en'])} chars (max 140)")
        if it["summary_fil"] and len(it["summary_fil"]) > 160:
            r.err(where, f"summary_fil is {len(it['summary_fil'])} chars (max 160)")
        if it["resin_code"]:
            if not it["material"].startswith("PLA"):
                r.err(where, "resin_code only applies to plastics")
            elif mat and mat["resin_code"] and mat["resin_code"] != it["resin_code"]:
                r.err(where, f"resin_code {it['resin_code']} doesn't match {it['material']}")
        if it["value"] not in VALUES:
            r.err(where, f"value must be one of {sorted(VALUES - {''})}")
        for lang in ("en", "fil"):
            steps = parse_prep(it[f"prep_{lang}"])
            if steps is None:
                r.err(where, f"prep_{lang}: each step must be 'Title :: detail'")
            else:
                for s in steps:
                    if len(s["title"]) > 40 or len(s["detail"]) > 160:
                        r.err(where, f"prep_{lang}: step too long ({s['title'][:20]}…)")
        en_steps, fil_steps = parse_prep(it["prep_en"]) or [], parse_prep(it["prep_fil"]) or []
        if fil_steps and len(fil_steps) != len(en_steps):
            r.err(where, "prep_fil must have the same number of steps as prep_en")

        # sources
        cited = split(it["sources"], ";")
        if not cited:
            r.err(where, "needs at least one source")
        for sid in cited:
            if sid not in sources:
                r.err(where, f"unknown source {sid}")
        # safety
        hazardous = is_hazardous(it)
        for f in SAFETY_FIELDS:
            if it[f] and unsafe(it[f]):
                r.err(
                    where,
                    f"{f}: unsafe advice (burning or pouring into drains); put warnings in dont_*",
                )
        if hazardous:
            if it["reuse_en"] or it["reuse_fil"]:
                r.err(where, "hazardous items can't have reuse ideas (no DIY)")
            if not it["hazard_en"]:
                r.err(where, "hazardous items need hazard_en")
        # links
        for rel in split(it["related"], ";"):
            if rel not in slugs:
                r.err(where, f"related item {rel!r} doesn't exist")
            elif rel == it["slug"]:
                r.err(where, "related to itself")
        if it["detectable_class_key"] and it["detectable_class_key"] not in class_keys:
            r.err(where, f"unknown model class {it['detectable_class_key']!r}")

        # readiness for review / publishing
        missing_fil = [fil for en, fil in FIL_TWINS.items() if it[en] and not it[fil]]
        if status == "draft":
            if missing_fil:
                r.warn(where, f"draft: Filipino missing ({', '.join(missing_fil)})")
            unverified = [s for s in cited if s in sources and sources[s]["verified"] != "true"]
            if unverified:
                r.warn(where, f"draft: cites unverified source(s) {', '.join(unverified)}")
        else:
            if missing_fil:
                r.err(where, f"{status}: Filipino required ({', '.join(missing_fil)})")
            reviewers = split(it["reviewed_by"], ";")
            if not reviewers or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", it["reviewed_at"]):
                r.err(where, f"{status}: needs reviewed_by and reviewed_at (YYYY-MM-DD)")
            if hazardous and len(set(reviewers)) < 2:
                r.err(where, f"{status}: hazardous items need two different reviewers")
            for sid in cited:
                if sid in sources and sources[sid]["verified"] != "true":
                    r.err(where, f"{status}: source {sid} is not verified yet")
            if hazardous and not any(sources.get(s, {}).get("level") == "P" for s in cited):
                r.err(where, f"{status}: hazardous items need a primary (P) source")
            if status == "published":
                for rel in split(it["related"], ";"):
                    if rel in slugs and slugs[rel]["status"] != "published":
                        r.warn(where, f"related item {rel} isn't published yet")

    for i, lr in enumerate(lib.local_rules, 2):
        where = f"local_rules.csv line {i}"
        if lr["institution"]:
            r.err(where, "institution rules are managed by admins in the app, not in this file")
        if not re.fullmatch(r"[A-Z]{2,6}", lr["lgu"]):
            r.err(where, "lgu must be a short code like QC")
        if bool(lr["item_slug"]) == bool(lr["material_code"]):
            r.err(where, "set exactly one of item_slug or material_code")
        if lr["item_slug"] and lr["item_slug"] not in slugs:
            r.err(where, f"unknown item {lr['item_slug']}")
        if lr["material_code"] and lr["material_code"] not in mats:
            r.err(where, f"unknown material {lr['material_code']}")
        if not lr["note_en"] or len(lr["note_en"]) > 280:
            r.err(where, "note_en required, max 280 chars")
        cited = split(lr["sources"], ";")
        if not cited or any(s not in sources for s in cited):
            r.err(where, "needs known source(s)")
        if lr["status"] not in STATUSES:
            r.err(where, "bad status")
        if lr["status"] != "draft" and any(
            sources[s]["verified"] != "true" for s in cited if s in sources
        ):
            r.err(where, f"{lr['status']}: cites an unverified source")

    for i, dp in enumerate(lib.dropoffs, 2):
        where = f"dropoff_points.csv line {i}"
        if dp["destination"] not in dests:
            r.err(where, f"unknown destination {dp['destination']!r}")
        if dp["map_url"] and not dp["map_url"].startswith("https://"):
            r.err(where, "map_url must be https")
        if not split(dp["sources"], ";"):
            r.err(where, "needs a source (where this information comes from)")
        if dp["status"] == "published" and not dp["verified_at"]:
            r.err(where, "published drop-off points need verified_at (YYYY-MM-DD)")
    return r


# ---------------------------------------------------------------- outputs


def q(v: object) -> str:
    if v is None or v == "":
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, int):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def arr(values: list[str]) -> str:
    return "array[" + ", ".join(q(v) for v in values) + "]::text[]" if values else "'{}'::text[]"


def js(value: object) -> str:
    return q(json.dumps(value, ensure_ascii=False)) + "::jsonb"


def item_record(it: dict) -> dict:
    return {
        "slug": it["slug"],
        "name_en": it["name_en"],
        "name_fil": it["name_fil"],
        "aliases": split(it["aliases"], ";"),
        "material": it["material"],
        "resin_code": int(it["resin_code"]) if it["resin_code"] else None,
        "bin": it["bin"],
        "destinations": split(it["destinations"], ";"),
        "summary_en": it["summary_en"],
        "summary_fil": it["summary_fil"] or None,
        "prep_en": parse_prep(it["prep_en"]) or [],
        "prep_fil": parse_prep(it["prep_fil"]) or [],
        "note_en": it["note_en"] or None,
        "note_fil": it["note_fil"] or None,
        "dont_en": split(it["dont_en"], "|"),
        "dont_fil": split(it["dont_fil"], "|"),
        "hazard_en": it["hazard_en"] or None,
        "hazard_fil": it["hazard_fil"] or None,
        "value": it["value"] or None,
        "reuse_en": split(it["reuse_en"], "|"),
        "reuse_fil": split(it["reuse_fil"], "|"),
        "reduce_en": split(it["reduce_en"], "|"),
        "reduce_fil": split(it["reduce_fil"], "|"),
        "fact_en": it["fact_en"] or None,
        "fact_fil": it["fact_fil"] or None,
        "related": split(it["related"], ";"),
        "detectable_class_key": it["detectable_class_key"] or None,
        "sources": split(it["sources"], ";"),
        "status": it["status"],
        "reviewed_by": split(it["reviewed_by"], ";"),
        "reviewed_at": it["reviewed_at"] or None,
    }


def content_version(lib: Library) -> str:
    blob = json.dumps(
        [
            lib.sources,
            lib.materials,
            lib.destinations,
            [{k: v for k, v in i.items() if k != "_file"} for i in lib.items],
            lib.local_rules,
            lib.dropoffs,
        ],
        sort_keys=True,
        ensure_ascii=False,
    )
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()[:12]


def build_seed(lib: Library, version: str) -> str:
    out = [
        "-- GENERATED by supabase/scripts/build_library.py from supabase/content/library/.",
        f"-- Do not edit by hand. Content version {version}.",
        "",
    ]
    out.append("insert into public.library_sources (id, title, url, level, verified) values")
    out.append(
        ",\n".join(
            f"  ({q(s['id'])}, {q(s['title'])}, {q(s['url'])}, {q(s['level'])}, {q(s['verified'] == 'true')})"
            for s in lib.sources
        )
    )
    out.append(
        "on conflict (id) do update set title = excluded.title, url = excluded.url, "
        "level = excluded.level, verified = excluded.verified;\n"
    )

    mats = sorted(lib.materials, key=lambda m: (m["parent_code"] != "", int(m["sort_order"] or 0)))
    out.append(
        "insert into public.library_materials (code, parent_code, name_en, name_fil, "
        "description_en, description_fil, resin_code, default_bin, sort_order) values"
    )
    out.append(
        ",\n".join(
            f"  ({q(m['code'])}, {q(m['parent_code'])}, {q(m['name_en'])}, {q(m['name_fil'])}, "
            f"{q(m['description_en'])}, {q(m['description_fil'])}, "
            f"{q(int(m['resin_code'])) if m['resin_code'] else 'null'}, {q(m['default_bin'])}, {int(m['sort_order'] or 0)})"
            for m in mats
        )
    )
    out.append(
        "on conflict (code) do update set parent_code = excluded.parent_code, name_en = excluded.name_en, "
        "name_fil = excluded.name_fil, description_en = excluded.description_en, "
        "description_fil = excluded.description_fil, resin_code = excluded.resin_code, "
        "default_bin = excluded.default_bin, sort_order = excluded.sort_order;\n"
    )

    out.append(
        "insert into public.library_destinations (code, name_en, name_fil, sort_order) values"
    )
    out.append(
        ",\n".join(
            f"  ({q(d['code'])}, {q(d['name_en'])}, {q(d['name_fil'])}, {int(d['sort_order'] or 0)})"
            for d in lib.destinations
        )
    )
    out.append(
        "on conflict (code) do update set name_en = excluded.name_en, name_fil = excluded.name_fil, "
        "sort_order = excluded.sort_order;\n"
    )

    recs = [item_record(i) for i in sorted(lib.items, key=lambda i: i["slug"])]
    cols = [
        "slug",
        "name_en",
        "name_fil",
        "aliases",
        "material_code",
        "resin_code",
        "bin",
        "summary_en",
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
        "sources",
        "status",
        "reviewed_by",
        "reviewed_at",
    ]
    if recs:
        out.append(f"insert into public.library_items ({', '.join(cols)}) values")
        rows = []
        for r in recs:
            vals = [
                q(r["slug"]),
                q(r["name_en"]),
                q(r["name_fil"]),
                arr(r["aliases"]),
                q(r["material"]),
                q(r["resin_code"]),
                q(r["bin"]),
                q(r["summary_en"]),
                q(r["summary_fil"]),
                js(r["prep_en"]),
                js(r["prep_fil"]),
                q(r["note_en"]),
                q(r["note_fil"]),
                arr(r["dont_en"]),
                arr(r["dont_fil"]),
                q(r["hazard_en"]),
                q(r["hazard_fil"]),
                q(r["value"]),
                arr(r["reuse_en"]),
                arr(r["reuse_fil"]),
                arr(r["reduce_en"]),
                arr(r["reduce_fil"]),
                q(r["fact_en"]),
                q(r["fact_fil"]),
                arr(r["related"]),
                q(r["detectable_class_key"]),
                arr(r["sources"]),
                q(r["status"]),
                arr(r["reviewed_by"]),
                q(r["reviewed_at"]),
            ]
            rows.append("  (" + ", ".join(vals) + ")")
        out.append(",\n".join(rows))
        out.append(
            "on conflict (slug) do update set "
            + ", ".join(f"{c} = excluded.{c}" for c in cols if c != "slug")
            + ", updated_at = now();"
        )
    slugs = [r["slug"] for r in recs]
    out.append(f"delete from public.library_items where slug <> all ({arr(slugs)});\n")

    out.append(
        f"delete from public.library_item_destinations where item_slug = any ({arr(slugs)});"
    )
    pairs = [(r["slug"], d, n) for r in recs for n, d in enumerate(r["destinations"], 1)]
    if pairs:
        out.append(
            "insert into public.library_item_destinations (item_slug, destination_code, rank) values"
        )
        out.append(",\n".join(f"  ({q(s)}, {q(d)}, {n})" for s, d, n in pairs) + ";\n")

    # LGU-wide rows are owned by these files; institution rows (admins) are left alone.
    out.append("delete from public.library_local_rules where lgu is not null;")
    if lib.local_rules:
        out.append(
            "insert into public.library_local_rules (lgu, item_slug, material_code, note_en, note_fil, "
            "sources, status) values"
        )
        out.append(
            ",\n".join(
                f"  ({q(lr['lgu'])}, {q(lr['item_slug'])}, {q(lr['material_code'])}, {q(lr['note_en'])}, "
                f"{q(lr['note_fil'])}, {arr(split(lr['sources'], ';'))}, {q(lr['status'])})"
                for lr in lib.local_rules
            )
            + ";"
        )
    out.append("\ndelete from public.library_dropoff_points where lgu is not null;")
    if lib.dropoffs:
        out.append(
            "insert into public.library_dropoff_points (name, destination_code, address, map_url, hours, "
            "lgu, notes, sources, status, verified_at) values"
        )
        out.append(
            ",\n".join(
                f"  ({q(d['name'])}, {q(d['destination'])}, {q(d['address'])}, {q(d['map_url'])}, {q(d['hours'])}, "
                f"{q(d['lgu'])}, {q(d['notes'])}, {arr(split(d['sources'], ';'))}, {q(d['status'])}, {q(d['verified_at'])})"
                for d in lib.dropoffs
            )
            + ";"
        )
    return "\n".join(out) + "\n"


def build_web(lib: Library, version: str) -> str:
    """Offline copy for the app: published content only (drafts never reach users)."""
    published = [
        item_record(i)
        for i in sorted(lib.items, key=lambda i: i["slug"])
        if i["status"] == "published"
    ]
    for p in published:
        for k in ("status", "reviewed_by"):
            p.pop(k)
    data = {
        "content_version": version,
        "sources": [{k: s[k] for k in ("id", "title", "url", "level")} for s in lib.sources],
        "materials": [
            {
                "code": m["code"],
                "parent": m["parent_code"] or None,
                "name_en": m["name_en"],
                "name_fil": m["name_fil"],
                "resin_code": int(m["resin_code"]) if m["resin_code"] else None,
                "default_bin": m["default_bin"] or None,
            }
            for m in sorted(lib.materials, key=lambda m: int(m["sort_order"] or 0))
        ],
        "destinations": [
            {"code": d["code"], "name_en": d["name_en"], "name_fil": d["name_fil"]}
            for d in lib.destinations
        ],
        "items": published,
        "local_rules": [
            {
                "lgu": lr["lgu"],
                "item": lr["item_slug"] or None,
                "material": lr["material_code"] or None,
                "note_en": lr["note_en"],
                "note_fil": lr["note_fil"] or None,
                "sources": split(lr["sources"], ";"),
            }
            for lr in lib.local_rules
            if lr["status"] == "published"
        ],
    }
    return json.dumps(data, ensure_ascii=False, indent=1) + "\n"


def build_coverage(lib: Library, report: Report, version: str) -> str:
    groups = [
        m
        for m in sorted(lib.materials, key=lambda m: int(m["sort_order"] or 0))
        if not m["parent_code"]
    ]
    lines = [
        "# Library coverage",
        "",
        f"GENERATED by `supabase/scripts/build_library.py` (content version `{version}`). Do not edit.",
        "",
        f"Target for v1.1: **≥ {GROUP_TARGET} items per group**, 100% Filipino, every hazardous item reviewed twice.",
        "",
        "| Group | Items | Draft | Reviewed | Published | Filipino complete | Hazardous unreviewed | Target |",
        "|---|---|---|---|---|---|---|---|",
    ]
    tot = {"n": 0, "draft": 0, "reviewed": 0, "published": 0, "fil": 0, "haz": 0}
    for g in groups:
        rows = [i for i in lib.items if i["material"].split("-")[0] == g["code"]]
        n = len(rows)
        by = {s: sum(1 for i in rows if i["status"] == s) for s in STATUSES}
        fil = sum(1 for i in rows if all(i[fil] for en, fil in FIL_TWINS.items() if i[en]))
        haz = sum(1 for i in rows if is_hazardous(i) and i["status"] == "draft")
        for k, v in (("n", n), ("fil", fil), ("haz", haz)):
            tot[k] += v
        for s in STATUSES:
            tot[s] += by[s]
        mark = "✅" if n >= GROUP_TARGET else f"{n}/{GROUP_TARGET}"
        lines.append(
            f"| {g['code']} {g['name_en']} | {n} | {by['draft']} | {by['reviewed']} | "
            f"{by['published']} | {fil}/{n} | {haz} | {mark} |"
        )
    lines.append(
        f"| **Total** | **{tot['n']}** | {tot['draft']} | {tot['reviewed']} | {tot['published']} | "
        f"{tot['fil']}/{tot['n']} | {tot['haz']} | |"
    )
    lines += [
        "",
        f"Local rules: {len(lib.local_rules)} "
        f"({sum(1 for x in lib.local_rules if x['status'] == 'published')} published). "
        f"Drop-off points: {len(lib.dropoffs)}.",
        "",
    ]
    if report.warnings:
        lines += [f"## Warnings ({len(report.warnings)})", ""]
        lines += [f"- {w}" for w in report.warnings]
        lines.append("")
    return "\n".join(lines)


# ---------------------------------------------------------------- main


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--check", action="store_true", help="fail if generated files are out of date")
    args = ap.parse_args()

    lib = load()
    report = validate(lib, v1_detectable())
    for e in report.errors:
        print(f"ERROR   {e}")
    if report.errors:
        print(f"\n{len(report.errors)} error(s); nothing written.")
        return 1

    version = content_version(lib)
    outputs = {
        SEED: build_seed(lib, version),
        WEB: build_web(lib, version),
        COVERAGE: build_coverage(lib, report, version),
    }
    stale = [
        p for p, text in outputs.items() if not p.exists() or p.read_text(encoding="utf-8") != text
    ]
    if args.check:
        for p in stale:
            print(f"STALE   {p.relative_to(ROOT)} (run: python supabase/scripts/build_library.py)")
        print(f"{len(lib.items)} items, {len(report.warnings)} warning(s), content {version}")
        return 1 if stale else 0
    for p, text in outputs.items():
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding="utf-8", newline="\n")
    print(f"{len(lib.items)} items, {len(report.warnings)} warning(s), content {version}")
    for p in outputs:
        print(f"wrote   {p.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
