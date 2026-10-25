#!/usr/bin/env python3
"""QA retirement keeps history immutable and rejects active consumers."""
from __future__ import annotations

import copy
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
    spec = importlib.util.spec_from_file_location("apply_spec_transition_retirement", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


mod = _load_mod()


def _state_with_qa(qa_id: str = "qa-old") -> dict:
    state = mod.init_state(json.loads(TAXONOMY.read_text(encoding="utf-8")))
    mod.apply_turn(
        state,
        {
            "qa_id": qa_id,
            "question": "単体テストだけで十分ですか?",
            "answer": "不十分",
            "source": {"kind": "user-dialogue"},
            "ops": [],
        },
    )
    return state


def test_retire_qa_preserves_historical_question_and_answer():
    state = _state_with_qa()
    before = copy.deepcopy(state["qa_log"][0])

    mod.retire_qa(state, "qa-old", "誘導的な歴史entryでactive consumerは0件")

    retired = state["qa_log"][0]
    assert {key: retired[key] for key in before} == before
    assert retired["retirement"] == {
        "writer": "retire-qa",
        "reason": "誘導的な歴史entryでactive consumerは0件",
    }


def test_retire_qa_rejects_current_matrix_consumer():
    state = _state_with_qa()
    state["matrix"]["database"]["web"] = {
        "state": "確定",
        "qa_ref": "qa-old",
        "serves_goals": ["G1"],
    }
    with pytest.raises(mod.TransitionError, match="active consumer"):
        mod.retire_qa(state, "qa-old", "古い")


def test_retire_qa_rejects_effective_foundation_consumer():
    state = _state_with_qa()
    state["requirements_foundation"]["effective_source_refs"] = {
        "U1": {"qa_ref": "qa-old", "approval_ref": "appr-1"}
    }
    with pytest.raises(mod.TransitionError, match="active consumer"):
        mod.retire_qa(state, "qa-old", "古い")


def test_retire_qa_validates_optional_superseding_entry():
    state = _state_with_qa()
    with pytest.raises(mod.TransitionError, match="superseded_by"):
        mod.retire_qa(state, "qa-old", "古い", superseded_by="qa-missing")


def test_retire_qa_is_idempotent_only_for_identical_payload():
    state = _state_with_qa()
    mod.retire_qa(state, "qa-old", "古い")
    mod.retire_qa(state, "qa-old", "古い")
    with pytest.raises(mod.TransitionError, match="上書き"):
        mod.retire_qa(state, "qa-old", "別の理由")
