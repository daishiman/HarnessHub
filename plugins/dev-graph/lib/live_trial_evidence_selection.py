#!/usr/bin/env python3
# /// script
# name: live-trial-evidence-selection
# purpose: criteria receipt が採用した PASS live-trial から task.md を安全に選択する。
# inputs: [repository root, dev-graph skill name]
# outputs: [Path | None]
# contexts: [E]
# network: false
# write-scope: none
# dependencies: []
# requires-python: ">=3.11"
# ///
"""Live-trial 証跡の選択を criteria receipt に束縛する小さな read-only module.

run-id の辞書順だけでは、時計ずれで将来日付を持つ古い証跡を fresh PASS より優先する。
criteria-test/scenario-verdict.json は人間・機械双方が採用した evidence を示す正本なので、
OUT1 が参照する schema-valid PASS verdict を優先する。receipt が欠落・破損・不整合なら
呼出側は従来の辞書順 fallback を使い、検査を fail-open にしない。
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def _load_json(path: Path) -> dict[str, Any] | None:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return value if isinstance(value, dict) else None


def verdict_path_from_criteria_receipt(root: Path, plugin: str, skill: str) -> Path | None:
    """OUT1 receipt が参照する containment 済み PASS verdict を返す。"""
    base = root / "eval-log" / plugin / skill / "live-trial"
    receipt = _load_json(
        root / "eval-log" / plugin / skill / "criteria-test" / "scenario-verdict.json"
    )
    if receipt is None:
        return None
    results = receipt.get("criteria_results")
    out1 = results.get("OUT1") if isinstance(results, dict) else None
    ref = out1.get("live_trial_verdict_ref") if isinstance(out1, dict) else None
    if not isinstance(ref, str) or not ref or Path(ref).is_absolute():
        return None

    verdict_path = (root / ref).resolve()
    try:
        verdict_path.relative_to(base.resolve())
    except ValueError:
        return None
    if verdict_path.name != "verdict.json":
        return None
    verdict = _load_json(verdict_path)
    overall = verdict.get("overall") if isinstance(verdict, dict) else None
    if not isinstance(overall, dict) or overall.get("verdict") != "PASS":
        return None
    return verdict_path


def task_path_from_criteria_receipt(root: Path, skill: str) -> Path | None:
    """dev-graph OUT1 receipt が採用した PASS verdict の task.md を返す。"""
    verdict_path = verdict_path_from_criteria_receipt(root, "dev-graph", skill)
    if verdict_path is None:
        return None
    task = verdict_path.parent / "task.md"
    return task if task.is_file() else None
