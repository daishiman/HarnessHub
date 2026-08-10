"""The published spec-state schema mirrors the writer's version boundary."""
from __future__ import annotations

import copy
import json
from pathlib import Path

import jsonschema


ROOT = Path(__file__).resolve().parents[3]
SCHEMA = ROOT / "plugins" / "system-spec-harness" / "schemas" / "spec-state.schema.json"
LIVE_STATE = ROOT / "system-spec" / "spec-state.json"


def validator() -> jsonschema.Draft202012Validator:
    return jsonschema.Draft202012Validator(json.loads(SCHEMA.read_text(encoding="utf-8")))


def test_live_state_validates_against_published_schema() -> None:
    validator().validate(json.loads(LIVE_STATE.read_text(encoding="utf-8")))


def test_current_state_requires_design_application_contract_marker() -> None:
    """schema 1.1 は marker 必須。live state の version に依存せず構築して検査する。"""
    state = json.loads(LIVE_STATE.read_text(encoding="utf-8"))
    state["schema_version"] = "1.1"
    state.pop("design_application_contract_version", None)
    with __import__("pytest").raises(jsonschema.ValidationError):
        validator().validate(state)
    state["design_application_contract_version"] = "1.0"
    validator().validate(state)


def test_legacy_state_must_not_carry_the_marker() -> None:
    """1.0 と marker の混成は schema 側でも拒否する (migrate-legacy と同じ境界)。"""
    state = json.loads(LIVE_STATE.read_text(encoding="utf-8"))
    state["schema_version"] = "1.0"
    state["design_application_contract_version"] = "1.0"
    with __import__("pytest").raises(jsonschema.ValidationError):
        validator().validate(state)


def test_legacy_exempt_entries_and_migration_record_are_representable() -> None:
    """migrate-legacy が書く形状が published schema で表現できる。"""
    state = json.loads(LIVE_STATE.read_text(encoding="utf-8"))
    exempt = [entry for entry in state["qa_log"] if entry.get("legacy_exempt")]
    assert exempt, "live state に legacy_exempt entry が無い (移行記録の回帰)"
    assert all(entry["legacy_exempt_reason"].strip() for entry in exempt)
    record = state["legacy_migration"][0]
    assert record["from_schema_version"] == "1.0"
    assert record["to_schema_version"] == "1.1"
    validator().validate(state)

    broken = copy.deepcopy(state)
    broken["legacy_migration"][0]["unexpected_key"] = True
    with __import__("pytest").raises(jsonschema.ValidationError):
        validator().validate(broken)


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
