# SPDX-License-Identifier: AGPL-3.0-or-later
"""Pilot / UAT analysis (ROADMAP Phase 25) → Markdown tables for Chapter 4.

Reads the CSV exports described in docs/pilot/ (Google Forms or the templates in
pilot/templates/). Any file that is missing is skipped:

    sus.csv            participant_id, group, q1 … q10            (1–5)
    tasks.csv          participant_id, group, task_id, success, time_s, errors
    iso.csv            participant_id, group, FS1, FS2, …, PE1, …  (1–5; prefix = characteristic)
    contamination.csv  phase (before|during), date, bin, items_total, items_wrong
    knowledge.csv      participant_id, form (pre|post), score, total  (v2 Phase 34: download it
                       from /admin → Knowledge test)

    uv run python -m scripts.pilot_report --data ../../pilot/data --out ../../pilot/data/report.md

Standard library only, so it runs anywhere.
"""

from __future__ import annotations

import argparse
import csv
import math
import re
import statistics as st
import sys
from collections import defaultdict
from pathlib import Path

SUS_TARGET = 75.0  # docs/spec.md metrics
TASK_TARGET = 0.90

ISO_NAMES = {
    "FS": "Functional suitability",
    "PE": "Performance efficiency",
    "CO": "Compatibility",
    "US": "Usability (interaction capability)",
    "RE": "Reliability",
    "SE": "Security",
    "MA": "Maintainability",
    "PO": "Portability (flexibility)",
}

# Common 5-point Likert interpretation (equal intervals of 0.80).
LIKERT_SCALE = [
    (4.21, "Strongly agree", "Excellent"),
    (3.41, "Agree", "Very good"),
    (2.61, "Neutral", "Good"),
    (1.81, "Disagree", "Fair"),
    (1.00, "Strongly disagree", "Poor"),
]


# ---------------------------------------------------------------- pure functions (tested)


def sus_score(answers: list[int]) -> float:
    """Brooke (1996): odd items score-1, even items 5-score, sum × 2.5 → 0–100."""
    if len(answers) != 10 or any(a not in (1, 2, 3, 4, 5) for a in answers):
        raise ValueError(f"SUS needs 10 answers from 1 to 5, got {answers}")
    total = sum(a - 1 if i % 2 == 0 else 5 - a for i, a in enumerate(answers))
    return total * 2.5


def sus_grade(score: float) -> tuple[str, str]:
    """Sauro–Lewis curved grade and Bangor et al. adjective for a mean SUS score."""
    grades = [
        (84.1, "A+"), (80.8, "A"), (78.9, "A-"), (77.2, "B+"), (74.1, "B"), (72.6, "B-"),
        (71.1, "C+"), (65.0, "C"), (62.7, "C-"), (51.7, "D"), (0.0, "F"),
    ]  # fmt: skip
    grade = next(g for cut, g in grades if score >= cut)
    adjectives = [
        (85.5, "Excellent"), (71.4, "Good"), (50.9, "OK"), (35.7, "Poor"), (0.0, "Awful"),
    ]  # fmt: skip
    adjective = next(a for cut, a in adjectives if score >= cut)
    return grade, adjective


def likert_label(mean: float) -> tuple[str, str]:
    return next((agree, quality) for cut, agree, quality in LIKERT_SCALE if mean >= cut)


def two_proportion_p(w1: int, n1: int, w2: int, n2: int) -> float:
    """Two-sided p-value of a two-proportion z-test (pooled)."""
    if not n1 or not n2:
        return float("nan")
    p = (w1 + w2) / (n1 + n2)
    se = math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2))
    if se == 0:
        return 1.0
    z = (w1 / n1 - w2 / n2) / se
    return math.erfc(abs(z) / math.sqrt(2))


def mean_sd(xs: list[float]) -> tuple[float, float]:
    return (st.mean(xs), st.stdev(xs) if len(xs) > 1 else 0.0)


# ---------------------------------------------------------------- sections


def read(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(encoding="utf-8-sig") as f:
        return [{k.strip(): (v or "").strip() for k, v in r.items()} for r in csv.DictReader(f)]


def section_sus(rows: list[dict]) -> list[str]:
    scores: dict[str, list[float]] = defaultdict(list)
    for r in rows:
        s = sus_score([int(r[f"q{i}"]) for i in range(1, 11)])
        scores[r.get("group") or "all"].append(s)
        scores["**All participants**"].append(s)
    out = ["## System Usability Scale (SUS)", "", "| Group | n | Mean | SD | Grade | Adjective |"]
    out.append("|---|---|---|---|---|---|")
    for g, xs in sorted(scores.items(), key=lambda kv: kv[0].startswith("**")):
        m, sd = mean_sd(xs)
        grade, adj = sus_grade(m)
        out.append(f"| {g} | {len(xs)} | {m:.1f} | {sd:.1f} | {grade} | {adj} |")
    m = st.mean(scores["**All participants**"])
    verdict = "met" if m >= SUS_TARGET else "not met"
    out += ["", f"Target SUS ≥ {SUS_TARGET:.0f}: **{verdict}** (mean {m:.1f}).", ""]
    return out


def section_tasks(rows: list[dict]) -> list[str]:
    by_task: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        by_task[r["task_id"]].append(r)
    out = [
        "## Task-based UAT",
        "",
        "| Task | n | Success rate | Mean time (s) | Median time (s) | Mean errors |",
        "|---|---|---|---|---|---|",
    ]
    all_success: list[float] = []
    for task, rs in sorted(by_task.items()):
        succ = [float(r["success"]) for r in rs]
        times = [float(r["time_s"]) for r in rs if r.get("time_s")]
        errs = [float(r["errors"] or 0) for r in rs]
        all_success += succ
        out.append(
            f"| {task} | {len(rs)} | {st.mean(succ):.0%} | "
            f"{st.mean(times):.1f} | {st.median(times):.1f} | {st.mean(errs):.2f} |"
            if times
            else f"| {task} | {len(rs)} | {st.mean(succ):.0%} | – | – | {st.mean(errs):.2f} |"
        )
    rate = st.mean(all_success)
    verdict = "met" if rate >= TASK_TARGET else "not met"
    out += ["", f"Overall task success {rate:.0%}; target ≥ {TASK_TARGET:.0%}: **{verdict}**.", ""]
    return out


def section_iso(rows: list[dict]) -> list[str]:
    per_char: dict[str, list[float]] = defaultdict(list)
    for r in rows:
        for col, v in r.items():
            m = re.fullmatch(r"([A-Z]{2})\d+", col)
            if m and v:
                per_char[m.group(1)].append(float(v))
    out = [
        "## ISO/IEC 25010 quality survey",
        "",
        "| Characteristic | Answers | Weighted mean | Interpretation |",
        "|---|---|---|---|",
    ]
    means = []
    for code in [c for c in ISO_NAMES if c in per_char] + sorted(set(per_char) - set(ISO_NAMES)):
        m = st.mean(per_char[code])
        means.append(m)
        agree, quality = likert_label(m)
        out.append(
            f"| {ISO_NAMES.get(code, code)} | {len(per_char[code])} | {m:.2f} | "
            f"{agree} ({quality}) |"
        )
    if means:
        overall = st.mean(means)
        agree, quality = likert_label(overall)
        out.append(f"| **Overall** | | **{overall:.2f}** | **{agree} ({quality})** |")
    out += ["", "Scale: 4.21–5.00 strongly agree · 3.41–4.20 agree · 2.61–3.40 neutral · "
            "1.81–2.60 disagree · 1.00–1.80 strongly disagree.", ""]  # fmt: skip
    return out


def wilcoxon_p(diffs: list[float]) -> float:
    """Two-sided Wilcoxon signed-rank test, normal approximation with tie correction.
    Zero differences are dropped. Returns nan with fewer than 6 non-zero pairs."""
    d = [x for x in diffs if x != 0]
    n = len(d)
    if n < 6:
        return float("nan")
    order = sorted(range(n), key=lambda i: abs(d[i]))
    ranks = [0.0] * n
    i = 0
    ties = 0.0
    while i < n:
        j = i
        while j + 1 < n and abs(d[order[j + 1]]) == abs(d[order[i]]):
            j += 1
        r = (i + j) / 2 + 1
        for k in range(i, j + 1):
            ranks[order[k]] = r
        t = j - i + 1
        ties += t**3 - t
        i = j + 1
    w_plus = sum(r for r, x in zip(ranks, d, strict=True) if x > 0)
    mean = n * (n + 1) / 4
    var = n * (n + 1) * (2 * n + 1) / 24 - ties / 48
    if var <= 0:
        return float("nan")
    z = (abs(w_plus - mean) - 0.5) / math.sqrt(var)
    return math.erfc(max(z, 0) / math.sqrt(2))


def section_knowledge(rows: list[dict]) -> list[str]:
    by: dict[str, dict[str, float]] = defaultdict(dict)
    total = 12
    for r in rows:
        by[r["participant_id"]][r["form"]] = float(r["score"])
        total = int(r.get("total") or total)
    paired = [(v["pre"], v["post"]) for v in by.values() if "pre" in v and "post" in v]
    out = ["## Knowledge test (pre/post, 12 items)", ""]
    if not paired:
        return out + ["_No participant has both a pre and a post test yet._", ""]
    pre = [a for a, _ in paired]
    post = [b for _, b in paired]
    gains = [b - a for a, b in paired]
    m1, s1 = mean_sd(pre)
    m2, s2 = mean_sd(post)
    mg, sg = mean_sd(gains)
    p = wilcoxon_p(gains)
    out += [
        "| | Mean (SD) | % correct |",
        "|---|---|---|",
        f"| Pre | {m1:.2f} ({s1:.2f}) | {m1 / total:.0%} |",
        f"| Post | {m2:.2f} ({s2:.2f}) | {m2 / total:.0%} |",
        f"| Gain | {mg:+.2f} ({sg:.2f}) | {mg / total:+.0%} |",
        "",
        f"Paired participants: {len(paired)}. Wilcoxon signed-rank p = "
        + (
            "n/a (needs at least 6 changed scores)"
            if math.isnan(p)
            else ("< 0.001" if p < 0.001 else f"{p:.3f}")
        )
        + ".",
        "",
    ]
    return out


def section_contamination(rows: list[dict]) -> list[str]:
    agg: dict[tuple[str, str], list[int]] = defaultdict(lambda: [0, 0])
    for r in rows:
        for b in (r["bin"], "**All bins**"):
            a = agg[(b, r["phase"])]
            a[0] += int(r["items_wrong"])
            a[1] += int(r["items_total"])
    bins = sorted({b for b, _ in agg}, key=lambda b: b.startswith("**"))
    out = [
        "## Bin contamination (wrong items per bin)",
        "",
        "| Bin | Before | During pilot | Change | p (two-proportion z) |",
        "|---|---|---|---|---|",
    ]
    for b in bins:
        w1, n1 = agg[(b, "before")]
        w2, n2 = agg[(b, "during")]
        r1 = w1 / n1 if n1 else float("nan")
        r2 = w2 / n2 if n2 else float("nan")
        p = two_proportion_p(w1, n1, w2, n2)
        out.append(
            f"| {b} | {r1:.1%} ({w1}/{n1}) | {r2:.1%} ({w2}/{n2}) | "
            f"{(r2 - r1) * 100:+.1f} pts | {'< 0.001' if p < 0.001 else f'{p:.3f}'} |"
        )
    out += ["", "p < 0.05 means the change is unlikely to be chance.", ""]
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--data", type=Path, required=True, help="folder with the CSV files")
    ap.add_argument("--out", type=Path, help="write the Markdown report here (UTF-8)")
    args = ap.parse_args()
    parts = ["# iTapon pilot results", ""]
    for name, fn in [
        ("sus.csv", section_sus),
        ("tasks.csv", section_tasks),
        ("iso.csv", section_iso),
        ("contamination.csv", section_contamination),
        ("knowledge.csv", section_knowledge),
    ]:
        rows = read(args.data / name)
        parts += fn(rows) if rows else [f"_{name}: no data yet._", ""]
    text = "\n".join(parts)
    if args.out:
        args.out.write_text(text + "\n", encoding="utf-8")
        print(f"Wrote {args.out}")
    else:
        sys.stdout.reconfigure(encoding="utf-8")  # Windows consoles default to cp1252
        print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
