"""C19 confirmed-bundle reuse gate tests."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


PLUGIN = Path(__file__).resolve().parents[1]
BUILDER = PLUGIN / "tests" / "fixtures" / "build_live_trial_fixture.py"
SCRIPT = PLUGIN / "scripts" / "validate-system-spec-resume.py"
RUNNER = PLUGIN / "scripts" / "build-system-spec-resume-import.py"
BOUNDARY = PLUGIN / "scripts" / "validate-system-spec-boundary.py"


def fixture(tmp_path: Path) -> Path:
    root = tmp_path / "fixture"
    proc = subprocess.run(
        [sys.executable, str(BUILDER), "--kind", "system-spec", "--out", str(root), "--force"],
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, proc.stdout + proc.stderr
    return root


def run(root: Path) -> tuple[int, dict]:
    proc = subprocess.run(
        [sys.executable, str(SCRIPT), "--repo-root", str(root)],
        capture_output=True,
        text=True,
        check=False,
    )
    return proc.returncode, json.loads(proc.stdout)


def test_confirmed_bundle_passes_without_network_or_generation(tmp_path: Path) -> None:
    root = fixture(tmp_path)
    code, report = run(root)
    assert code == 0, report
    assert report["valid"] is True
    assert report["mode"] == "reuse-confirmed"
    assert len(report["required_entry_points"]) == 4


def test_changed_artifact_invalidates_resume_receipt(tmp_path: Path) -> None:
    root = fixture(tmp_path)
    with (root / "system-spec" / "index.md").open("a", encoding="utf-8") as handle:
        handle.write("\nchanged after evaluation\n")
    code, report = run(root)
    assert code == 2
    assert "artifact-digest-stale:system-spec/index.md" in report["failures"]


def test_non_pass_evaluator_cannot_be_reused(tmp_path: Path) -> None:
    root = fixture(tmp_path)
    report_path = root / "system-spec" / "completeness-report.json"
    report = json.loads(report_path.read_text(encoding="utf-8"))
    report["verdict"] = "FAIL"
    report_path.write_text(json.dumps(report), encoding="utf-8")
    code, result = run(root)
    assert code == 2
    assert "completeness-verdict-not-pass" in result["failures"]


def test_resume_runner_imports_both_nodes_and_writes_goal_evidence(tmp_path: Path) -> None:
    root = fixture(tmp_path)
    proc = subprocess.run(
        [sys.executable, str(RUNNER), "--repo-root", str(root)],
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, proc.stdout + proc.stderr
    report = json.loads(proc.stdout)
    assert report["status"] == "PASS"
    assert report["network_calls"] == 0
    assert report["upstream_skill_invocations"] == 0
    assert report["registered_this_run"] == [
        "arch-system-spec-overview",
        "spec-system-spec-index",
    ]
    for suffix in ("goal-spec.json", "progress.json", "intermediate.jsonl"):
        assert (root / "eval-log" / f"run-dev-graph-system-spec-{suffix}").is_file()


def test_boundary_validator_has_positive_controls_and_zero_runtime_duplicates() -> None:
    proc = subprocess.run(
        [sys.executable, str(BOUNDARY)], capture_output=True, text=True, check=False
    )
    assert proc.returncode == 0, proc.stdout + proc.stderr
    report = json.loads(proc.stdout)
    assert all(report["positive_control"].values())
    assert not any(report["dev_graph_hits"].values())
