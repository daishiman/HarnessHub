#!/usr/bin/env python3
"""legacy schema 1.0 の脱出口 migrate-legacy の契約。

「移行の入口 (init --state) が移行対象 (確定セル入り legacy state) を拒否する」
到達不能状態が回帰しないことを固定する。
"""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import pytest


SKILL_DIR = Path(__file__).resolve().parents[1]
PLUGIN_ROOT = SKILL_DIR.parents[1]
TAXONOMY = (
    PLUGIN_ROOT
    / "skills"
    / "ref-system-design-knowledge"
    / "references"
    / "system-category-taxonomy.json"
)


def _load_mod():
    path = SKILL_DIR / "scripts" / "apply-spec-transition.py"
    spec = importlib.util.spec_from_file_location("apply_spec_transition_legacy", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


mod = _load_mod()


def _legacy_state() -> dict:
    """確定セルを持つ作業済み legacy 1.0 state を再現する。"""
    state = mod.init_state(json.loads(TAXONOMY.read_text(encoding="utf-8")))
    category = state["categories"][0]["id"]
    state["qa_log"].append({"id": "qa-001", "question": "Q", "answer": "A"})
    state["matrix"][category]["web"] = {"state": "確定", "qa_ref": "qa-001"}
    state["matrix"][category]["mobile"] = {"state": "対象外", "reason": "非対象"}
    mod.recompute_aggregates(state)
    state["schema_version"] = "1.0"
    del state["design_application_contract_version"]
    return state


def test_legacy_state_blocks_every_ordinary_writer_path() -> None:
    state = _legacy_state()
    with pytest.raises(mod.TransitionError, match="読み取り専用"):
        mod._require_writable_state(state)
    with pytest.raises(mod.TransitionError, match="確定セルを含む state"):
        mod.init_state(json.loads(TAXONOMY.read_text(encoding="utf-8")), state)


def test_migrate_legacy_preserves_confirmed_cells_and_unlocks_writer() -> None:
    state = _legacy_state()
    category = state["categories"][0]["id"]

    mod.migrate_legacy_state(state, "UI shell 反映のため", "mig-001")

    assert state["schema_version"] == "1.1"
    assert state["design_application_contract_version"] == "1.0"
    # 確定/対象外セルは 1 件も失われない。
    assert state["matrix"][category]["web"] == {"state": "確定", "qa_ref": "qa-001"}
    assert state["matrix"][category]["mobile"]["state"] == "対象外"
    # 旧 entry は暗黙免除ではなく監査可能な明示記録になる。
    assert state["qa_log"][0]["legacy_exempt"] is True
    assert state["qa_log"][0]["legacy_exempt_reason"] == "UI shell 反映のため"
    record = state["legacy_migration"][0]
    assert record["id"] == "mig-001"
    assert record["exempted_qa_ids"] == ["qa-001"]
    assert record["preserved_confirmed_cells"] == 1
    # 移行後は通常 writer が通る。
    mod._require_writable_state(state)


def test_migrate_legacy_is_single_shot_and_rejects_non_legacy() -> None:
    state = _legacy_state()
    mod.migrate_legacy_state(state, "理由", "mig-001")
    with pytest.raises(mod.TransitionError, match="既に schema 1.1"):
        mod.migrate_legacy_state(state, "理由", "mig-002")

    hybrid = _legacy_state()
    hybrid["design_application_contract_version"] = "1.0"
    with pytest.raises(mod.TransitionError, match="混成 state"):
        mod.migrate_legacy_state(hybrid, "理由", "mig-003")

    with pytest.raises(mod.TransitionError, match="reason は非空"):
        mod.migrate_legacy_state(_legacy_state(), "  ", "mig-004")


def test_migrate_legacy_does_not_exempt_contract_compliant_entries() -> None:
    state = _legacy_state()
    state["qa_log"].append(
        {
            "id": "qa-002",
            "question": "Q2",
            "answer": "A2",
            "design_applications": [
                {
                    "knowledge_ref": "C04#clean-architecture",
                    "principle": "Dependency Rule",
                    "applicability": "applied",
                    "rationale": "章固有理由",
                    "tradeoffs": ["境界追加のコスト"],
                }
            ],
        }
    )
    mod.migrate_legacy_state(state, "理由", "mig-001")
    assert "legacy_exempt" not in state["qa_log"][1]
    assert state["legacy_migration"][0]["exempted_qa_ids"] == ["qa-001"]


def test_confirm_referencing_legacy_exempt_entry_after_reopen_is_rejected() -> None:
    """legacy 確定履歴は保全するが、reopen 後の再確定には流用させない。"""
    state = _legacy_state()
    mod.migrate_legacy_state(state, "理由", "mig-001")
    category = state["categories"][0]["id"]

    mod.apply_turn(
        state,
        {"ops": [{"action": "reopen", "category": category, "platform": "web", "reason": "再検討"}]},
    )
    assert state["matrix"][category]["web"]["state"] == "未収集"

    with pytest.raises(mod.TransitionError, match="legacy_exempt QA は再利用できない"):
        mod.apply_turn(
            state,
            {
                "ops": [
                    {
                        "action": "confirm",
                        "category": category,
                        "platform": "web",
                        "qa_ref": "qa-001",
                    }
                ]
            },
        )
    assert state["matrix"][category]["web"]["state"] == "未収集"


def test_confirm_new_cell_referencing_legacy_exempt_entry_is_rejected() -> None:
    """legacy 免除は、移行後に別セルを確定する根拠にも使えない。"""
    state = _legacy_state()
    mod.migrate_legacy_state(state, "理由", "mig-001")
    category = state["categories"][1]["id"]

    with pytest.raises(mod.TransitionError, match="legacy_exempt QA は再利用できない"):
        mod.apply_turn(
            state,
            {
                "ops": [
                    {
                        "action": "confirm",
                        "category": category,
                        "platform": "web",
                        "qa_ref": "qa-001",
                    }
                ]
            },
        )
    assert state["matrix"][category]["web"]["state"] == "未収集"


def test_new_entries_still_require_full_design_application_contract() -> None:
    """免除は旧 entry 限定で、移行後の新規 confirm には 1.1 契約が完全に効く。"""
    state = _legacy_state()
    mod.migrate_legacy_state(state, "理由", "mig-001")
    category = state["categories"][1]["id"]

    with pytest.raises(mod.TransitionError, match="design_applications は非空配列必須"):
        mod.apply_turn(
            state,
            {
                "qa_id": "qa-100",
                "question": "Q",
                "answer": "A",
                "ops": [{"action": "confirm", "category": category, "platform": "web"}],
            },
        )
