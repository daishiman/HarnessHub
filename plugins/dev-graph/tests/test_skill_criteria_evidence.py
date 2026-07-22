from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path

import jsonschema
import pytest
import yaml


PLUGIN = Path(__file__).resolve().parents[1]
REPO = PLUGIN.parents[1]
INVENTORY = REPO / "plugin-plans" / "dev-graph" / "component-inventory.json"
EVALS = PLUGIN / "EVALS.json"
LINT = REPO / "scripts" / "lint-content-review.py"
CRITERIA_SCHEMA = PLUGIN / "schemas" / "criteria-scenario-verdict.schema.json"
LIVE_TRIAL_ROOT = (
    REPO / "plugins" / "harness-creator" / "skills" / "run-skill-live-trial"
)
LIVE_TRIAL_SCHEMA = LIVE_TRIAL_ROOT / "schemas" / "live-trial-verdict.schema.json"
LIVE_TRIAL_VERDICT = LIVE_TRIAL_ROOT / "scripts" / "live-trial-verdict.py"
POSITIVE_SCENARIOS = PLUGIN / "tests" / "fixtures" / "live-trial-positive-scenarios.json"


def _load_content_lint():
    spec = importlib.util.spec_from_file_location("dev_graph_content_review_lint", LINT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _load_live_trial_verdict():
    spec = importlib.util.spec_from_file_location(
        "dev_graph_live_trial_verdict", LIVE_TRIAL_VERDICT
    )
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _skill_criteria(skill_path: Path) -> dict[str, dict]:
    text = skill_path.read_text(encoding="utf-8")
    assert text.startswith("---\n")
    _opening, frontmatter, _body = text.split("---", 2)
    metadata = yaml.safe_load(frontmatter)
    criteria = metadata["feedback_contract"]["criteria"]
    return {criterion["id"]: criterion for criterion in criteria}


def _contained_repo_ref(value: str) -> Path:
    ref = Path(value)
    assert not ref.is_absolute(), f"evidence ref must be repo-relative: {value}"
    path = (REPO / ref).resolve(strict=True)
    path.relative_to(REPO.resolve())
    return path


def _targets() -> list[tuple[str, str, Path, set[str]]]:
    inventory = json.loads(INVENTORY.read_text(encoding="utf-8"))
    by_id = {item["id"]: item for item in inventory["components"]}
    evals = json.loads(EVALS.read_text(encoding="utf-8"))["criteria_tests"]["components"]
    return [
        (
            component_id,
            Path(contract["skill"]).parent.name,
            PLUGIN / contract["skill"],
            {item["id"] for item in by_id[component_id]["feedback_contract"]["criteria"]},
        )
        for component_id, contract in sorted(evals.items())
    ]


@pytest.mark.parametrize(
    ("component_id", "skill_name", "skill_path", "criteria_ids"),
    _targets(),
    ids=lambda value: value if isinstance(value, str) else None,
)
def test_independent_scenario_receipt_covers_exact_criteria(
    component_id: str,
    skill_name: str,
    skill_path: Path,
    criteria_ids: set[str],
) -> None:
    receipt_path = (
        REPO / "eval-log" / "dev-graph" / skill_name / "criteria-test" / "scenario-verdict.json"
    )
    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    receipt_schema = json.loads(CRITERIA_SCHEMA.read_text(encoding="utf-8"))
    jsonschema.Draft202012Validator(receipt_schema).validate(receipt)
    current_sha = hashlib.sha256(skill_path.read_bytes()).hexdigest()
    assert receipt["target"] == {
        "plugin": "dev-graph",
        "skill": skill_name,
        "component_id": component_id,
        "skill_md_sha256": current_sha,
    }
    assert receipt["verdict"] == "PASS"
    assert receipt["reviewer"].strip()
    assert receipt["reviewer"] != "root"
    assert receipt["loop_scope"] == "both"
    assert receipt["iteration_limit"] == 3
    results = receipt["criteria_results"]
    assert set(results) == criteria_ids
    criteria = _skill_criteria(skill_path)
    assert set(criteria) == criteria_ids
    live_verdict_module = _load_live_trial_verdict()
    live_schema = json.loads(LIVE_TRIAL_SCHEMA.read_text(encoding="utf-8"))
    for criterion_id, result in results.items():
        assert result["status"] == "PASS", f"{component_id}/{criterion_id}"
        expected_verify_by = criteria[criterion_id]["verify_by"]
        assert result["verify_by"] == expected_verify_by, (
            f"{component_id}/{criterion_id}: receipt verify_by must equal SKILL frontmatter"
        )
        assert result["evidence_kind"] in {
            "pytest", "independent-scenario-review", "hybrid", "live-trial"
        }
        assert result["test_refs"]
        assert result["observed"]
        if expected_verify_by != "live-trial":
            continue

        assert result["evidence_kind"] == "live-trial"
        verdict_ref = result["live_trial_verdict_ref"]
        assert verdict_ref in result["test_refs"]
        verdict_path = _contained_repo_ref(verdict_ref)
        expected_live_root = (
            REPO / "eval-log" / "dev-graph" / skill_name / "live-trial"
        ).resolve()
        verdict_path.relative_to(expected_live_root)
        assert verdict_path.name == "verdict.json"
        verdict = json.loads(verdict_path.read_text(encoding="utf-8"))
        jsonschema.Draft202012Validator(live_schema).validate(verdict)
        assert verdict["scenario_id"] == result["scenario_id"]
        assert verdict["target_skill"] == f"dev-graph:{skill_name}"
        assert verdict["tier"] == "live"
        assert verdict["downgrade_reason"] is None
        assert verdict["actual_model"]
        assert verdict["transcript_sha256"] is not None
        assert verdict["environment"]["transcript_layer"] == "jsonl"
        assert verdict["goal_verdict"] == {"result": "PASS", "blockers": []}
        assert verdict["overall"] == {
            "launch": "PASS",
            "completion": "PASS",
            "goal_fit": "PASS",
            "verdict": "PASS",
        }
        assert verdict["skill_dir_tree_sha"] == live_verdict_module.skill_dir_tree_sha(
            skill_path.parent
        ), f"{component_id}/{criterion_id}: stale behavior closure digest"


def test_positive_live_trial_scenarios_cover_out1_without_eval_log_fixture_coupling() -> None:
    suite = json.loads(POSITIVE_SCENARIOS.read_text(encoding="utf-8"))
    scenarios = suite["scenarios"]
    assert suite["schema_version"] == "1.0.0"
    # C01/C15 は 2026-07-21 追加。r13 で「拒否対象が1件も無い空っぽの検証」で OUT1 が
    # 成立していたため、fixture_contract を強化して衝突・blocked・lease を実際に行使させる。
    # C05/C14/C18 は 2026-07-22 追加。9 skill 全ての live-trial 再取得時に、OUT1 が
    # live-trial verify_by なのに scenario 契約を持たない 3 skill を発見したため補完した
    # (C05 は render の進捗 X/Y、C14 は decompose の dry-run マクロ分解、C18 は status の
    # read-only 一致)。
    assert {(item["component_id"], item["criterion_id"]) for item in scenarios} == {
        ("C01", "OUT1"),
        ("C02", "OUT1"),
        ("C03", "OUT1"),
        ("C04", "OUT1"),
        ("C05", "OUT1"),
        ("C14", "OUT1"),
        ("C15", "OUT1"),
        ("C18", "OUT1"),
        ("C19", "OUT1"),
    }
    assert len({item["scenario_id"] for item in scenarios}) == len(scenarios)
    inventory_targets = {
        component_id: (skill_name, skill_path)
        for component_id, skill_name, skill_path, _criteria_ids in _targets()
    }
    for scenario in scenarios:
        assert scenario["mode"] == "positive"
        args = scenario["task_args_template"]
        assert args.strip()
        # dry-run 単独で positive を成立させる vacuous 検証を防ぐ。ただし
        # (a) --apply を併せ持つ多段実行 (C03 sync の dry-run→apply→確認 dry-run で
        #     2 回目 changes=0 を観測) と、(b) dry-run preview 自体が成果物の skill
        #     (C14 decompose: 評価前 draft の起票 0 件を観測する) は、副作用ではなく
        #     「副作用が起きないこと」を観測するのが scenario の本質なので許容する。
        if "--dry-run" in args:
            assert "--apply" in args or scenario["component_id"] == "C14", (
                f"{scenario['component_id']}: dry-run 単独の positive scenario は "
                "vacuous 検証になりうる (apply 併存か dry-run preview が本質の skill に限る)"
            )
        assert len(scenario["required_observations"]) >= 3
        assert all(item.strip() for item in scenario["required_observations"])
        skill_name, skill_path = inventory_targets[scenario["component_id"]]
        assert scenario["skill"] == skill_name
        criterion = _skill_criteria(skill_path)[scenario["criterion_id"]]
        assert criterion["loop_scope"] == "outer"
        assert criterion["verify_by"] == "live-trial"


@pytest.mark.parametrize(
    ("component_id", "skill_name", "skill_path", "criteria_ids"),
    _targets(),
    ids=lambda value: value if isinstance(value, str) else None,
)
def test_canonical_content_reviews_are_current_and_complete(
    component_id: str,
    skill_name: str,
    skill_path: Path,
    criteria_ids: set[str],
) -> None:
    lint = _load_content_lint()
    review_dir = REPO / "eval-log" / "dev-graph" / skill_name / "content-review"
    for filename in ("elegance-verdict.json", "rubric-verdict.json"):
        error = lint._check_verdict(
            review_dir / filename,
            "dev-graph",
            skill_name,
            filename,
        )
        assert error is None, f"{component_id}/{filename}: {error}"
        verdict = json.loads((review_dir / filename).read_text(encoding="utf-8"))
        loop = verdict["feedback_loop"]
        assert set(loop["criteria_evaluated"]) == criteria_ids
        assert loop["loop_scope"] == "both"
        assert loop["iteration_limit"] == 3
        assert loop["next_action"] == "none"


def test_positive_scenarios_are_not_vacuous_by_contract() -> None:
    """positive シナリオが「拒否対象0件」で自明成立しない fixture 契約を持つ。

    2026-07-21 live-trial r13 で、C15 は ready 3件 < --max-parallel 4 かつ resource_scope が
    入力側で完全排他だったため conflict/lease 判定が一度も行使されず、C01 は空グラフで
    C11 が vacuous に成立していた。「除外されるべき対象が実在すること」を fixture 契約へ要求する。
    """
    suite = json.loads(POSITIVE_SCENARIOS.read_text(encoding="utf-8"))
    exclusion_markers = (
        "blocked", "overlap", "conflict", "stale", "reject", "fail-closed",
        "exceeds", "differ", "outside", "not ", "no ", "never", "zero",
        "=0", "unchanged",
    )
    for scenario in suite["scenarios"]:
        observations = " ".join(scenario["required_observations"]).lower()
        assert any(marker in observations for marker in exclusion_markers), (
            f"{scenario['scenario_id']}: required_observations must assert on a case that is "
            "excluded, rejected or converges to zero; otherwise the criterion can hold vacuously"
        )
