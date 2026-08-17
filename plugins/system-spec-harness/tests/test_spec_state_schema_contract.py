"""The published spec-state schema mirrors the writer's version boundary."""
from __future__ import annotations

import copy
import json
from pathlib import Path

import jsonschema
import pytest


ROOT = Path(__file__).resolve().parents[3]
SCHEMA = ROOT / "plugins" / "system-spec-harness" / "schemas" / "spec-state.schema.json"
LIVE_STATE = ROOT / "system-spec" / "spec-state.json"


def validator() -> jsonschema.Draft202012Validator:
    return jsonschema.Draft202012Validator(json.loads(SCHEMA.read_text(encoding="utf-8")))


def test_live_exact_legacy_state_remains_readable() -> None:
    validator().validate(json.loads(LIVE_STATE.read_text(encoding="utf-8")))


def test_current_state_requires_design_application_contract_marker() -> None:
    # LIVE_STATE がすでに 1.1 + marker を持つ場合でも、marker 欠落を fail にする契約を検査する。
    state = json.loads(LIVE_STATE.read_text(encoding="utf-8"))
    state["schema_version"] = "1.1"
    state.pop("design_application_contract_version", None)
    with __import__("pytest").raises(jsonschema.ValidationError):
        validator().validate(state)
    state["design_application_contract_version"] = "1.0"
    validator().validate(state)


def test_current_confirmed_state_requires_all_effective_source_refs() -> None:
    state = json.loads(LIVE_STATE.read_text(encoding="utf-8"))
    state["schema_version"] = "1.1"
    state["design_application_contract_version"] = "1.0"
    state["requirements_foundation"].pop("effective_source_refs", None)
    with pytest.raises(jsonschema.ValidationError):
        validator().validate(state)


def test_legacy_confirmed_state_may_omit_effective_source_refs() -> None:
    state = json.loads(LIVE_STATE.read_text(encoding="utf-8"))
    state["schema_version"] = "1.0"
    state.pop("design_application_contract_version", None)
    state["requirements_foundation"].pop("effective_source_refs", None)
    validator().validate(state)


def test_unknown_versions_and_malformed_design_applications_are_rejected() -> None:
    state = json.loads(LIVE_STATE.read_text(encoding="utf-8"))
    state["schema_version"] = "2.0"
    with __import__("pytest").raises(jsonschema.ValidationError):
        validator().validate(state)

    current = copy.deepcopy(state)
    current["schema_version"] = "1.1"
    current["design_application_contract_version"] = "1.0"
    current["qa_log"][0]["design_applications"] = [{"principle": "incomplete"}]
    with __import__("pytest").raises(jsonschema.ValidationError):
        validator().validate(current)


# qa entry の出所メタデータは、schema (宣言) と state_transition_matrix.py (writer) の
# 双方が契約を持つ。schema が緩いと、次の writer が schema だけを見て契約外の形状を書き、
# validator で初めて落ちる (あるいは validator を通らない経路なら永久に残る)。
# ここは「実データが通ること」ではなく「契約外が落ちること」を固定する。
# 締めを緩める変更 (additionalProperties を外す等) はこの test が検出する。
MALFORMED_QA_FIELDS = [
    # normalize_qa_source は object 必須。素の文字列は type_repair で 0 件へ修復済み。
    ("source", "対話で確認"),
    # kind は 4 種のみ。増やすなら writer と contract を同時に動かす。
    ("source", {"kind": "ai-guess"}),
    # user-dialogue は付帯情報を持たないことが「その場で答えた」の証拠になる。
    ("source", {"kind": "user-dialogue", "path": "a.md"}),
    # written は path/section/sha256 が揃って初めて原文へ遡及できる。
    ("source", {"kind": "written-requirements", "path": "a.md", "section": "s"}),
    # 是正は trigger が無いと「AI が勝手に足した」と区別できない。
    ("source", {"kind": "harness-remediation"}),
    # 統合は由来 qa と承認証跡の両方を要求する。
    ("source", {"kind": "derived-consolidation", "derived_from": ["qa-1"]}),
    # 後付けであること自体を隠さないための印。mode を自由文字列にすると印が意味を失う。
    ("source_provenance", {"mode": "looks_fine", "writer": "set-qa-source"}),
    # writer 名を const で縛らないと、別経路の後付けを schema 層で検出できない。
    ("source_provenance", {"mode": "metadata_backfill", "writer": "hand-edit"}),
    (
        "knowledge_ref_corrections",
        [{"old_ref": "a", "new_ref": "b", "applied_to": 1, "writer": "hand-edit", "reason": "r"}],
    ),
    # 綴り間違いや新種キーの素通りを塞ぐ (additionalProperties: false)。
    ("sorce", "typo"),
]


@pytest.mark.parametrize(
    "field,value", MALFORMED_QA_FIELDS, ids=[f"{f}-{i}" for i, (f, _) in enumerate(MALFORMED_QA_FIELDS)]
)
def test_qa_provenance_fields_reject_contract_violations(field: str, value: object) -> None:
    state = json.loads(LIVE_STATE.read_text(encoding="utf-8"))
    state["qa_log"][0][field] = value
    with pytest.raises(jsonschema.ValidationError):
        validator().validate(state)


def test_qa_provenance_valid_shapes_are_accepted() -> None:
    """拒否側だけを固定すると、締めすぎて正当な writer 出力まで落とす退行を見逃す。"""
    base = json.loads(LIVE_STATE.read_text(encoding="utf-8"))
    answer = base["qa_log"][0]["answer"]
    digest = __import__("hashlib").sha256(answer.encode("utf-8")).hexdigest()
    for source in (
        {"kind": "user-dialogue"},
        {"kind": "written-requirements", "path": "docs/req.md", "section": "2.1", "sha256": digest},
        {"kind": "harness-remediation", "trigger": "content-review medium"},
        {"kind": "derived-consolidation", "derived_from": ["qa-1"], "approval_ref": "appr-001"},
    ):
        state = copy.deepcopy(base)
        state["qa_log"][0]["source"] = source
        validator().validate(state)


def test_qa_retirement_schema_preserves_a_strict_writer_shape() -> None:
    base = json.loads(LIVE_STATE.read_text(encoding="utf-8"))
    valid = copy.deepcopy(base)
    valid["qa_log"][0]["retirement"] = {
        "writer": "retire-qa",
        "reason": "active consumer 0件の歴史entry",
    }
    validator().validate(valid)

    for retirement in (
        {"writer": "hand-edit", "reason": "x"},
        {"writer": "retire-qa", "reason": ""},
        {"writer": "retire-qa", "reason": "x", "superseded_by": ""},
        {"writer": "retire-qa", "reason": "x", "extra": True},
    ):
        invalid = copy.deepcopy(base)
        invalid["qa_log"][0]["retirement"] = retirement
        with pytest.raises(jsonschema.ValidationError):
            validator().validate(invalid)
