#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""validate-build-trace.py: ビルドトレース JSON の doc_coverage を検証する。

Usage:
  validate-build-trace.py build-trace.json

実データ (issue-build-trace-doc-coverage-schema-drift-20260723) には 3 形式が
存在するため、本 validator は形式を自動判別して検証する:

1. dict 形式 (旧 B-3 契約):
     {"doc_coverage": {"ch11_templates": true, ...}}
   REQUIRED_DOC_COVERAGE_KEYS がすべて存在し、値が true / "true" であること。

2. list 形式 (skill 単位 skill-build-trace.json。正本:
   plugins/harness-creator/skills/run-build-skill/references/reproducibility-trace-schema.md):
     {"doc_coverage": [{"doc": "11-templates", "status": "PASS", "evidence": "..."}, ...]}
   必須章 (REQUIRED_DOC_CHAPTERS: 11/13/14/15/16 = 旧 ch* キーと同章) が存在し、
   status=PASS は evidence 必須、status=N/A は reason または evidence 必須
   (harness-creator 側 validate-build-trace.py の _completion_status_ok と同契約)。

3. component trace 形式 (plugin 単位 eval-log/<plugin>/_plugin/build-evidence/*/build-trace.json):
     {"components": [{"id": ..., "sha256": ...}, ...], "components_total": N, ...}
   doc_coverage を持たない別種の成果物。components[] の id/sha256 と
   components_total / components_existing の整合のみ検証する。

いずれかの検証に失敗した場合 exit 1。doc_coverage も components も無い場合も
fail-closed で exit 1。
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

REQUIRED_DOC_COVERAGE_KEYS: list[str] = [
    "ch11_templates",
    "ch13_checklists",
    "ch14_dynamic_injection",
    "ch15_official_spec_checked",
    "ch16_frontmatter_spec",
]

# list 形式の必須章。doc 名の章番号 prefix ("11-templates" -> "11") で照合する。
# 値は旧 dict 形式 (B-3) の対応キーで、エラー文中の対応付けにのみ使う。
REQUIRED_DOC_CHAPTERS: dict[str, str] = {
    "11": "ch11_templates",
    "13": "ch13_checklists",
    "14": "ch14_dynamic_injection",
    "15": "ch15_official_spec_checked",
    "16": "ch16_frontmatter_spec",
}


def _is_true(v: object) -> bool:
    if isinstance(v, bool):
        return v
    return str(v).strip().lower() == "true"


def _entry_status_ok(entry: dict) -> bool:
    """harness-creator validate-build-trace.py の _completion_status_ok と同契約。

    PASS は evidence 必須、N/A は reason または evidence 必須。FAIL・未知 status は不可。
    """
    status = str(entry.get("status", "")).strip().upper()
    evidence = str(entry.get("evidence", "") or "").strip()
    reason = str(entry.get("reason", "") or "").strip()
    if status == "PASS":
        return bool(evidence)
    if status == "N/A":
        return bool(reason or evidence)
    return False


def _chapter_of(doc: str) -> str:
    return doc.split("-", 1)[0]


def _is_non_negative_int(value: object) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value >= 0


def _validate_doc_coverage_dict(doc_cov: dict) -> list[str]:
    errs: list[str] = []
    for key in REQUIRED_DOC_COVERAGE_KEYS:
        if key not in doc_cov:
            errs.append(f"doc_coverage missing required key: {key}")
        elif not _is_true(doc_cov[key]):
            errs.append(
                f"doc_coverage.{key} = {doc_cov[key]!r} (expected true)"
            )
    return errs


def _validate_doc_coverage_list(doc_cov: list) -> list[str]:
    errs: list[str] = []
    by_chapter: dict[str, dict] = {}
    for i, entry in enumerate(doc_cov):
        if not isinstance(entry, dict):
            errs.append(f"doc_coverage[{i}] must be an object/dict")
            continue
        doc = str(entry.get("doc", "") or "").strip()
        if not doc:
            errs.append(f"doc_coverage[{i}] missing required key: doc")
            continue
        by_chapter[_chapter_of(doc)] = entry

    for chapter, legacy_key in REQUIRED_DOC_CHAPTERS.items():
        entry = by_chapter.get(chapter)
        if entry is None:
            errs.append(
                f"doc_coverage missing required chapter {chapter} ({legacy_key})"
            )
        elif not _entry_status_ok(entry):
            errs.append(
                f"doc_coverage chapter {chapter} ({entry.get('doc')}) invalid: "
                f"status = {entry.get('status')!r} "
                "(expected PASS with evidence, or N/A with reason)"
            )
    return errs


def _validate_component_trace(trace: dict) -> list[str]:
    """plugin 単位 build-evidence の component trace。doc_coverage は対象外。"""
    errs: list[str] = []
    comps = trace.get("components")
    if not isinstance(comps, list) or not comps:
        errs.append("components must be a non-empty list")
        return errs

    for i, comp in enumerate(comps):
        if not isinstance(comp, dict):
            errs.append(f"components[{i}] must be an object/dict")
            continue
        for key in ("id", "sha256"):
            if not str(comp.get(key, "") or "").strip():
                errs.append(f"components[{i}] missing required key: {key}")

    total = trace.get("components_total")
    total_is_valid = total is None or _is_non_negative_int(total)
    if not total_is_valid:
        errs.append("components_total must be a non-negative integer")
    elif total is not None and total != len(comps):
        errs.append(
            f"components_total = {total!r} but components has {len(comps)} entries"
        )

    existing = trace.get("components_existing")
    existing_is_valid = existing is None or _is_non_negative_int(existing)
    if not existing_is_valid:
        errs.append("components_existing must be a non-negative integer")
    elif (
        existing is not None
        and total is not None
        and total_is_valid
        and existing > total
    ):
        errs.append(
            f"components_existing = {existing!r} exceeds components_total = {total!r}"
        )
    return errs


def _is_component_trace(trace: dict) -> bool:
    return trace.get("doc_coverage") is None and isinstance(
        trace.get("components"), list
    )


def validate(trace: dict) -> list[str]:
    doc_cov = trace.get("doc_coverage")
    if doc_cov is None:
        if _is_component_trace(trace):
            return _validate_component_trace(trace)
        return ["missing top-level key: doc_coverage"]

    if isinstance(doc_cov, dict):
        return _validate_doc_coverage_dict(doc_cov)
    if isinstance(doc_cov, list):
        return _validate_doc_coverage_list(doc_cov)
    return ["doc_coverage must be an object/dict or a list of entries"]


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: validate-build-trace.py build-trace.json", file=sys.stderr)
        return 2

    p = Path(sys.argv[1])
    if not p.exists():
        print(f"not found: {p}", file=sys.stderr)
        return 2

    try:
        trace = json.loads(p.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}", file=sys.stderr)
        return 1

    errs = validate(trace)
    if errs:
        for e in errs:
            print(e, file=sys.stderr)
        return 1

    skill_name = (
        trace.get("skill") or trace.get("skill_name") or trace.get("name") or p.stem
    )
    if _is_component_trace(trace):
        print(f"ok: {skill_name} component trace PASS (doc_coverage not applicable)")
    else:
        print(f"ok: {skill_name} doc_coverage PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
