"""C19 confirmed-bundle reuse gate tests."""
from __future__ import annotations

import hashlib
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

PLUGIN = Path(__file__).resolve().parents[1]
BUILDER = PLUGIN / "tests" / "fixtures" / "build_live_trial_fixture.py"
SCRIPT = PLUGIN / "scripts" / "validate-system-spec-resume.py"
RUNNER = PLUGIN / "scripts" / "build-system-spec-resume-import.py"
BOUNDARY = PLUGIN / "scripts" / "validate-system-spec-boundary.py"
RECEIPT_WRITER = (
    PLUGIN.parent
    / "system-spec-harness"
    / "skills"
    / "assign-system-spec-completeness-evaluator"
    / "scripts"
    / "build-resume-receipt.py"
)
SESSION_ID = "fixture-c19-resume-session"


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


def capture_snapshot(root: Path) -> dict:
    proc = subprocess.run(
        [
            sys.executable,
            str(RECEIPT_WRITER),
            "--repo-root",
            str(root),
            "--print-artifact-snapshot",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, proc.stdout + proc.stderr
    return json.loads(proc.stdout)


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


def test_self_claimed_report_without_canonical_gates_is_rejected(tmp_path: Path) -> None:
    root = fixture(tmp_path)
    report_path = root / "system-spec" / "completeness-report.json"
    report = json.loads(report_path.read_text(encoding="utf-8"))
    report["gate_results"] = []
    report_path.write_text(json.dumps(report), encoding="utf-8")
    code, result = run(root)
    assert code == 2
    assert "report-gate-not-pass:coverage" in result["failures"]
    assert "report-gate-not-pass:source_citation" in result["failures"]


def test_fork_ledger_mismatch_rejects_resume(tmp_path: Path) -> None:
    root = fixture(tmp_path)
    ledger = root / "eval-log" / "system-spec-harness" / "audit-fork-ledger.jsonl"
    ledger.write_text("", encoding="utf-8")
    code, result = run(root)
    assert code == 2
    assert "evaluator-report-or-ledger-invalid" in result["failures"]


def test_forged_receipt_cannot_replace_actual_coverage_gate(tmp_path: Path) -> None:
    root = fixture(tmp_path)
    state_path = root / "system-spec" / "spec-state.json"
    state = json.loads(state_path.read_text(encoding="utf-8"))
    state["matrix"]["database"]["web"] = {"state": "未収集"}
    state_path.write_text(json.dumps(state), encoding="utf-8")
    receipt_path = root / "system-spec" / "resume-receipt.json"
    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    receipt["artifacts"]["system-spec/spec-state.json"] = hashlib.sha256(
        state_path.read_bytes()
    ).hexdigest()
    receipt_path.write_text(json.dumps(receipt), encoding="utf-8")
    code, result = run(root)
    assert code == 2
    assert "artifact-digest-stale:system-spec/spec-state.json" not in result["failures"]
    assert "coverage-gate-invalid" in result["failures"]


def test_supported_plugin_version_range_is_exact() -> None:
    spec = importlib.util.spec_from_file_location("resume_validator", SCRIPT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    assert module.supported_version("0.1.0")
    assert module.supported_version("0.99.7")
    assert not module.supported_version("0.0.9")
    assert not module.supported_version("1.0.0")
    assert not module.supported_version("latest")


def test_receipt_schema_field_set_and_timestamp_are_enforced(tmp_path: Path) -> None:
    root = fixture(tmp_path)
    receipt_path = root / "system-spec" / "resume-receipt.json"
    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    receipt["unexpected"] = True
    receipt["created_at"] = "not-a-date"
    receipt_path.write_text(json.dumps(receipt), encoding="utf-8")
    code, result = run(root)
    assert code == 2
    assert "receipt-field-set-invalid" in result["failures"]
    assert "receipt-created-at-invalid" in result["failures"]


def test_production_writer_builds_a_digest_and_ledger_bound_receipt(tmp_path: Path) -> None:
    root = fixture(tmp_path)
    output = root / "system-spec" / "resume-receipt.json"
    output.unlink()
    proc = subprocess.run(
        [
            sys.executable,
            str(RECEIPT_WRITER),
            "--repo-root",
            str(root),
            "--session",
            SESSION_ID,
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, proc.stdout + proc.stderr
    receipt = json.loads(output.read_text(encoding="utf-8"))
    assert receipt["schema_version"] == "1.2"
    assert receipt["evaluator"]["session_id"] == SESSION_ID
    code, report = run(root)
    assert code == 0, report


def test_production_writer_requires_passing_knowledge_graph_gate(tmp_path: Path) -> None:
    root = fixture(tmp_path)
    report_path = root / "system-spec" / "completeness-report.json"
    report = json.loads(report_path.read_text(encoding="utf-8"))
    report["gate_results"] = [
        item for item in report["gate_results"] if item.get("id") != "G-knowledge-graph"
    ]
    report_path.write_text(json.dumps(report), encoding="utf-8")
    output = root / "system-spec" / "resume-receipt.json"
    before = output.read_bytes()

    proc = subprocess.run(
        [
            sys.executable,
            str(RECEIPT_WRITER),
            "--repo-root",
            str(root),
            "--session",
            SESSION_ID,
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    assert proc.returncode == 2
    assert "G-knowledge-graph" in proc.stdout
    assert output.read_bytes() == before


def test_production_writer_binds_every_system_spec_markdown_artifact(tmp_path: Path) -> None:
    """indexリンクだけでなく、分割された章本文もresume snapshotへ直接束縛する。"""
    root = fixture(tmp_path)
    appendix = root / "system-spec" / "ui-ux-design-knowledge.md"
    appendix.write_text("# UI-UX design knowledge\n\nBound appendix body.\n", encoding="utf-8")
    report_path = root / "system-spec" / "completeness-report.json"
    report = json.loads(report_path.read_text(encoding="utf-8"))
    report["artifact_snapshot"] = capture_snapshot(root)
    report_path.write_text(json.dumps(report), encoding="utf-8")
    output = root / "system-spec" / "resume-receipt.json"
    output.unlink()

    proc = subprocess.run(
        [
            sys.executable,
            str(RECEIPT_WRITER),
            "--repo-root",
            str(root),
            "--session",
            SESSION_ID,
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, proc.stdout + proc.stderr
    receipt = json.loads(output.read_text(encoding="utf-8"))
    assert "system-spec/ui-ux-design-knowledge.md" in receipt["artifacts"]

    appendix.write_text("# changed after evaluation\n", encoding="utf-8")
    code, report = run(root)
    assert code == 2
    assert "artifact-digest-stale:system-spec/ui-ux-design-knowledge.md" in report["failures"]


def test_production_writer_rejects_markdown_added_after_evaluation_snapshot(tmp_path: Path) -> None:
    root = fixture(tmp_path)
    output = root / "system-spec" / "resume-receipt.json"
    before = output.read_bytes()
    (root / "system-spec" / "late-unreviewed.md").write_text(
        "# added after the PASS report\n", encoding="utf-8"
    )

    proc = subprocess.run(
        [
            sys.executable,
            str(RECEIPT_WRITER),
            "--repo-root",
            str(root),
            "--session",
            SESSION_ID,
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    assert proc.returncode == 2
    assert "artifact snapshot" in proc.stdout
    assert output.read_bytes() == before


def test_production_writer_rejects_noncanonical_report_path(tmp_path: Path) -> None:
    root = fixture(tmp_path)
    alternate = root / "system-spec" / "alternate-report.json"
    alternate.write_bytes((root / "system-spec" / "completeness-report.json").read_bytes())
    proc = subprocess.run(
        [
            sys.executable,
            str(RECEIPT_WRITER),
            "--repo-root",
            str(root),
            "--report",
            str(alternate),
            "--session",
            SESSION_ID,
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 2
    assert "--report must be the canonical path" in proc.stdout


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
    assert report["completion_contract"]["version"] == "system-spec-resume-closure/v1"
    assert all(item["status"] == "pass" for item in report["checklist"])
    assert report["registered_this_run"] == [
        "arch-system-spec-overview",
        "spec-system-spec-index",
    ]
    for suffix in ("goal-spec.json", "progress.json", "intermediate.jsonl"):
        assert (root / "eval-log" / f"run-dev-graph-system-spec-{suffix}").is_file()
    progress = json.loads(
        (root / "eval-log" / "run-dev-graph-system-spec-progress.json").read_text(
            encoding="utf-8"
        )
    )
    assert {item["id"] for item in progress["checklist"]} == {
        "content-root",
        "harness-contract",
        "upstream-selection",
        "upstream-gates",
        "live-trial-outer-closure",
        "c02-node-integrity",
        "source-digest",
        "evidence-refs",
        "logic-boundary",
    }
    outer = next(
        item for item in progress["checklist"]
        if item["id"] == "live-trial-outer-closure"
    )
    assert outer["status"] == "pending-external"
    upstream_gates = next(
        item for item in progress["checklist"]
        if item["id"] == "upstream-gates"
    )
    assert upstream_gates["evidence"] == (
        "digest-bound coverage/source_citation/knowledge_graph/evaluator gates current"
    )

    first = (root / "eval-log" / "run-dev-graph-system-spec-intermediate.jsonl").read_text(
        encoding="utf-8"
    )
    again = subprocess.run(
        [sys.executable, str(RUNNER), "--repo-root", str(root)],
        capture_output=True,
        text=True,
        check=False,
    )
    assert again.returncode == 0, again.stdout + again.stderr
    history = (root / "eval-log" / "run-dev-graph-system-spec-intermediate.jsonl").read_text(
        encoding="utf-8"
    )
    assert history.startswith(first)
    assert len(history.splitlines()) == 2


def test_preflight_failure_does_not_mutate_graph(tmp_path: Path) -> None:
    root = fixture(tmp_path)
    graph_path = root / ".dev-graph" / "state" / "graph.json"
    graph = json.loads(graph_path.read_text(encoding="utf-8"))
    graph["nodes"] = [{"graph_node_id": "invalid-before-import"}]
    graph_path.write_text(json.dumps(graph), encoding="utf-8")
    before = graph_path.read_bytes()
    proc = subprocess.run(
        [sys.executable, str(RUNNER), "--repo-root", str(root)],
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 2
    assert graph_path.read_bytes() == before


def test_boundary_validator_has_positive_controls_and_zero_runtime_duplicates() -> None:
    proc = subprocess.run(
        [sys.executable, str(BOUNDARY)], capture_output=True, text=True, check=False
    )
    assert proc.returncode == 0, proc.stdout + proc.stderr
    report = json.loads(proc.stdout)
    assert all(report["positive_control"].values())
    assert not any(report["dev_graph_hits"].values())
