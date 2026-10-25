"""C19 の upstream gate・独立 evaluator 完走契約を固定する。"""
import hashlib
import importlib.util
import json
from pathlib import Path

PLUGIN = Path(__file__).resolve().parents[1]
SKILL = PLUGIN / "skills" / "run-dev-graph-system-spec" / "SKILL.md"
DELEGATE = PLUGIN / "skills" / "run-dev-graph-system-spec" / "prompts" / "R2-delegate.md"
SCENARIOS = PLUGIN / "tests" / "fixtures" / "live-trial-positive-scenarios.json"
RESUME_VALIDATOR = PLUGIN / "scripts" / "validate-system-spec-resume.py"
EVALS = PLUGIN / "EVALS.json"
INVENTORY = PLUGIN.parents[1] / "plugin-plans" / "dev-graph" / "component-inventory.json"
BUILD_TRACE = (
    PLUGIN.parents[1]
    / "eval-log"
    / "dev-graph"
    / "run-dev-graph-system-spec"
    / "skill-build-trace.json"
)
RESUME_RUNNER = PLUGIN / "scripts" / "build-system-spec-resume-import.py"
CANONICAL_GATE_TEXT = "coverage/source_citation/knowledge_graph/evaluator"
CANONICAL_GATE_EVIDENCE = f"digest-bound {CANONICAL_GATE_TEXT} gates current"


def _resume_validator_module():
    spec = importlib.util.spec_from_file_location(
        "validate_system_spec_resume_gate_contract", RESUME_VALIDATOR
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _matching_line(text: str, marker: str) -> str:
    matches = [line for line in text.splitlines() if marker in line]
    assert len(matches) == 1, (marker, matches)
    return matches[0]


def test_outer_skill_waits_for_forked_evaluator_and_never_substitutes_report() -> None:
    skill = SKILL.read_text(encoding="utf-8")
    delegate = DELEGATE.read_text(encoding="utf-8")

    for text in (skill, delegate):
        assert "完全な `agentId`" in text
        assert "native `task-notification`" in text
        assert "TaskStop" in text
        assert "completeness-report.json" in text
    assert "TaskOutput" not in skill.split("allowed-tools:", 1)[1].split("\n", 1)[0]
    assert "outer session が `completeness-report.json` を Write/Edit" in delegate


def test_bounded_resume_scenario_does_not_rerun_the_evaluator() -> None:
    scenarios = json.loads(SCENARIOS.read_text(encoding="utf-8"))["scenarios"]
    scenario = next(item for item in scenarios if item["component_id"] == "C19")
    fragments = scenario["task_contract"]["required_fragments"]

    assert scenario["scenario_id"].endswith("-bounded")
    assert "validate-system-spec-resume.py" in fragments
    assert "reuse-confirmed" in fragments
    assert any(
        "assign-system-spec-completeness-evaluator" in skill
        for skill in scenario["forbidden_invoked_skills"]
    )


def test_documented_upstream_gate_set_matches_resume_validator_required_gates() -> None:
    """receipt の4 gateと運用文書の停止条件をドリフトさせない。"""
    required_gates = _resume_validator_module().REQUIRED_GATES
    assert required_gates == {
        "coverage",
        "source_citation",
        "knowledge_graph",
        "evaluator",
    }
    assert set(CANONICAL_GATE_TEXT.split("/")) == required_gates

    skill = SKILL.read_text(encoding="utf-8")
    delegate = DELEGATE.read_text(encoding="utf-8")
    evals = json.loads(EVALS.read_text(encoding="utf-8"))

    skill_markers = (
        'text: "system-spec-harnessのcoverage/',
        '- 完了条件:',
        'plugin version・required entry points・',
        '- [ ] coverage/',
        '- `criteria:IN1`:',
    )
    for marker in skill_markers:
        assert CANONICAL_GATE_TEXT in _matching_line(skill, marker)

    delegate_markers = (
        '- resume 時は `validate-system-spec-resume.py`',
        '- [ ] resume/build の条件分岐どおりに coverage/',
    )
    for marker in delegate_markers:
        assert CANONICAL_GATE_TEXT in _matching_line(delegate, marker)

    c19_in1 = evals["criteria_tests"]["components"]["C19"]["criteria"]["IN1"]
    assert f"{CANONICAL_GATE_TEXT} gate" in c19_in1

    stale_gate_phrases = (
        "coverage/source-citation/evaluator",
        "coverage/source/evaluator",
        "required entry points・3 gate",
    )
    for stale in stale_gate_phrases:
        assert stale not in skill
        assert stale not in delegate


def test_inventory_and_build_trace_follow_current_c19_contract() -> None:
    """L3 inventory と build trace が更新済み C19 契約を携帯する。"""
    inventory = json.loads(INVENTORY.read_text(encoding="utf-8"))
    c19 = next(item for item in inventory["components"] if item["id"] == "C19")
    trace = json.loads(BUILD_TRACE.read_text(encoding="utf-8"))

    assert c19["feedback_contract"]["criteria"][0]["text"].startswith(
        f"system-spec-harnessの{CANONICAL_GATE_TEXT} gate"
    )
    assert "generic specification/architecture root" in c19["purpose_background"]
    assert "feature を生成・選択しない" in c19["boundary"]
    assert "C04/C02 の責務" in c19["boundary"]
    assert trace["feedback_contract"]["criteria"] == c19["feedback_contract"]["criteria"]

    for slot in trace["prompt_generation_model"]["per_responsibility"]:
        prompt = PLUGIN.parents[1] / slot["layer_yaml_path"]
        assert hashlib.sha256(prompt.read_bytes()).hexdigest() == slot["sha256"]


def test_resume_runner_emits_only_the_canonical_four_gate_summary() -> None:
    runner = RESUME_RUNNER.read_text(encoding="utf-8")

    assert CANONICAL_GATE_EVIDENCE in runner
    assert "digest-bound evaluator/coverage/source gates current" not in runner
