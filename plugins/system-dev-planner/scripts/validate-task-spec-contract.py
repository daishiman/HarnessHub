#!/usr/bin/env python3
# /// script
# name: validate-task-spec-contract
# purpose: C12 が package へ適用する契約 version を解決し task spec 本文を当該契約で検証する。
# inputs: argv なし (validate-system-plan.py から読み込まれる library module)
# outputs: 呼び出し側への戻り値のみ (stdout 出力なし)
# contexts: [C, E]
# network: false
# write-scope: none
# dependencies: [../assets/validation-contract-baseline.json]
# requires-python: ">=3.10"
# ///
"""C12 契約 version の正本。

promote 済み package は content-addressed で digest 不変のため、後から強化された契約を
満たすよう修正できない。修正すれば digest が変わり `published_digest` を記録済みの receipt が
偽になる。そこで validator 側が契約 version を持ち、各 package を **promote 時点で妥当だった
契約** で再検証する。この module はその version 定義・台帳解決・version 差のある本文検査を
`validate-system-plan.py` から分離して保持する (責務分離および 1 file 500 行上限の遵守)。
"""
from __future__ import annotations

import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
CONTRACT_BASELINE_ASSET = HERE.parent / "assets" / "validation-contract-baseline.json"

TASK_SPEC_HEADING = re.compile(r"^##[ \t]+(.+?)[ \t]*#*[ \t]*$", re.MULTILINE)
P01_ENTRY_GATE_MARKER = "parent_feature.depends_on all done|closed"
METHODOLOGY_MARKER = "system-task-goal-seek/v1"
GOAL_SEEK_PASS_MARKER = "rubric verdict=PASS"
P13_WRITEBACK_MARKER = "P13 spec/architecture writeback: required"
GOAL_SEEK_SECTION = "Inner goal-seek execution loop"
REQUIRED_TASK_SPEC_SECTIONS = (
    "Machine-readable registration fields",
    "目的",
    "背景",
    "前提条件",
    "Workstream applicability",
    "Architecture and deploy unit",
    "成果物",
    "Tracker publication and completion",
    "Branch and worktree execution",
    "スコープ外",
    "Verification and evidence",
    GOAL_SEEK_SECTION,
    "Rollout and rollback",
    "Handoff",
    "参照情報",
)

CONTRACT_VERSION_LATEST = "1.1.0"
CONTRACT_VERSIONS: dict[str, dict] = {
    # 2026-07-22T13:53:21Z (367ba5c) 以前に promote された content-addressed package が
    # 準拠していた検査集合。digest 不変ゆえ後追い修正できないため、当時の契約で再検証する。
    "1.0.0": {
        "required_sections": tuple(s for s in REQUIRED_TASK_SPEC_SECTIONS if s != GOAL_SEEK_SECTION),
        "inner_goal_seek": False,
        "p13_writeback": False,
    },
    # 367ba5c 以降の現行契約。新規生成 package は必ずこちらで fail-closed 検証される。
    "1.1.0": {
        "required_sections": REQUIRED_TASK_SPEC_SECTIONS,
        "inner_goal_seek": True,
        "p13_writeback": True,
    },
}


def load_contract_baseline(path: Path = CONTRACT_BASELINE_ASSET) -> dict[str, str]:
    """promote 済み package の canonical digest -> 当時の契約 version を読み出す。

    asset が欠落・破損していても例外を投げず空写像を返す。呼び出し側は未知 digest を
    最新契約で検証するため、配布漏れは「免除なし = より厳格」へ倒れて fail-closed が保たれる。
    """
    try:
        document = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    entries = document.get("packages") if isinstance(document, dict) else None
    if not isinstance(entries, list):
        return {}
    baseline: dict[str, str] = {}
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        digest, version = entry.get("canonical_digest"), entry.get("contract_version")
        if isinstance(digest, str) and version in CONTRACT_VERSIONS:
            baseline[digest] = version
    return baseline


def resolve_contract_version(canonical_digest: str | None, baseline: dict[str, str]) -> str:
    """検証対象 package へ適用する契約 version を決める。

    canonical_digest は staging-manifest.json の申告値ではなく実ファイル群から再計算した
    値が渡される。manifest は digest 対象外で改ざん可能なため、申告値で免除を決めてはならない。

    免除は「内容が暗号学的に確定した既 promote package」にのみ与える。digest を計算できない
    対象と台帳未登録の digest は最新契約へ倒し、台帳の欠落や削除が緩和経路にならないようにする。
    """
    if canonical_digest is None:
        return CONTRACT_VERSION_LATEST
    return baseline.get(canonical_digest, CONTRACT_VERSION_LATEST)


def task_spec_violations(text: str, required_sections: tuple[str, ...] = REQUIRED_TASK_SPEC_SECTIONS) -> list[tuple[str, str]]:
    """Return structural violations against the canonical task overlay.

    The template's prose says every standard section must be populated and
    names seven sections as the minimum readiness gate.  Treating all standard
    sections as required keeps C12 fail-closed and prevents a title plus one
    sentence from being promoted as an executable task specification.

    required_sections は適用契約 version が決める。version 間で差があるのは節の集合そのもの
    であり、違反 code 単位で免除すると他節の欠落まで見逃す fail-open になる。
    """
    headings = list(TASK_SPEC_HEADING.finditer(text))
    by_name: dict[str, list[int]] = {}
    for index, heading in enumerate(headings):
        by_name.setdefault(heading.group(1).strip(), []).append(index)

    errors: list[tuple[str, str]] = []
    for name in required_sections:
        occurrences = by_name.get(name, [])
        if not occurrences:
            errors.append(("task-spec-section-missing", name))
            continue
        if len(occurrences) > 1:
            errors.append(("task-spec-section-duplicate", name))
            continue
        heading_index = occurrences[0]
        start = headings[heading_index].end()
        end = headings[heading_index + 1].start() if heading_index + 1 < len(headings) else len(text)
        body = text[start:end].strip()
        if not body:
            errors.append(("task-spec-section-empty", name))
    return errors
