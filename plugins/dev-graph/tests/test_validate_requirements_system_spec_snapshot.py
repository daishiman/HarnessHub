"""C04 system-spec snapshot consumer binding tests."""
from __future__ import annotations

import hashlib
import importlib.util
import json
import subprocess
import sys
from pathlib import Path
from types import ModuleType

import jsonschema
import pytest
import yaml


PLUGIN = Path(__file__).resolve().parents[1]
BUILDER = PLUGIN / "tests" / "fixtures" / "build_live_trial_fixture.py"
SCRIPT = PLUGIN / "scripts" / "validate-requirements-system-spec-snapshot.py"
SCHEMA = PLUGIN / "schemas" / "requirements-system-spec-snapshot.schema.json"
SKILL = PLUGIN / "skills" / "run-dev-graph-requirements" / "SKILL.md"
RESOURCE_MAP = SKILL.parent / "references" / "resource-map.yaml"
INVENTORY = PLUGIN.parents[1] / "plugin-plans" / "dev-graph" / "component-inventory.json"


def fixture(tmp_path: Path) -> Path:
    root = tmp_path / "fixture"
    process = subprocess.run(
        [sys.executable, str(BUILDER), "--kind", "system-spec", "--out", str(root), "--force"],
        capture_output=True,
        text=True,
        check=False,
    )
    assert process.returncode == 0, process.stdout + process.stderr
    return root


def run(root: Path) -> tuple[int, dict]:
    process = subprocess.run(
        [sys.executable, str(SCRIPT), "--repo-root", str(root)],
        capture_output=True,
        text=True,
        check=False,
    )
    assert process.stdout, process.stderr
    return process.returncode, json.loads(process.stdout)


def load_adapter() -> ModuleType:
    spec = importlib.util.spec_from_file_location("requirements_snapshot_validator", SCRIPT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_current_digest_bound_system_spec_snapshot_passes(tmp_path: Path) -> None:
    root = fixture(tmp_path)

    code, report = run(root)

    assert code == 0, report
    assert report["valid"] is True
    assert report["consumer"] == "run-dev-graph-requirements"
    assert report["upstream_validator"] == "validate-system-spec-resume"
    assert "system-spec/backend.md" in report["artifacts"]
    assert report["resume_receipt_sha256"]
    assert report["completeness_report_sha256"]
    assert report["artifact_snapshot_sha256"]
    receipt = json.loads(
        (root / "system-spec/resume-receipt.json").read_text(encoding="utf-8")
    )
    completeness = json.loads(
        (root / "system-spec/completeness-report.json").read_text(encoding="utf-8")
    )
    for relative, expected in receipt["artifacts"].items():
        assert hashlib.sha256((root / relative).read_bytes()).hexdigest() == expected
    expected_snapshot = {
        relative: sha256
        for relative, sha256 in receipt["artifacts"].items()
        if relative != "system-spec/completeness-report.json"
    }
    assert completeness["artifact_snapshot"]["artifacts"] == expected_snapshot
    encoded_snapshot = json.dumps(
        expected_snapshot, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")
    assert report["artifact_snapshot_sha256"] == hashlib.sha256(
        encoded_snapshot
    ).hexdigest()
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    jsonschema.Draft202012Validator(schema).validate(report)


def test_changed_linked_child_invalidates_c04_snapshot_binding(tmp_path: Path) -> None:
    """Feature lineageが直接指さない章だけ変更しても handoff させない。"""
    root = fixture(tmp_path)
    backend = root / "system-spec" / "backend.md"
    backend.write_text(backend.read_text(encoding="utf-8") + "\n評価後の変更\n", encoding="utf-8")

    code, report = run(root)

    assert code == 2
    assert report["valid"] is False
    assert "upstream:artifact-digest-stale:system-spec/backend.md" in report["failures"]
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    jsonschema.Draft202012Validator(schema).validate(report)


def test_added_markdown_invalidates_c04_snapshot_binding(tmp_path: Path) -> None:
    root = fixture(tmp_path)
    (root / "system-spec" / "late-unreviewed.md").write_text(
        "# Added after evaluation\n", encoding="utf-8"
    )

    code, report = run(root)

    assert code == 2
    assert report["valid"] is False
    assert "upstream:artifact-set-invalid" in report["failures"]


def test_deleted_markdown_invalidates_c04_snapshot_binding(tmp_path: Path) -> None:
    root = fixture(tmp_path)
    (root / "system-spec" / "backend.md").unlink()

    code, report = run(root)

    assert code == 2
    assert report["valid"] is False
    assert "upstream:artifact-set-invalid" in report["failures"]


def test_transitive_artifact_changed_immediately_after_upstream_success_is_rejected(
    tmp_path: Path, monkeypatch
) -> None:
    """upstream exit 0 直後の TOCTOU 変更を C04 の post-validation pass で拒否する。"""
    root = fixture(tmp_path)
    backend = root / "system-spec" / "backend.md"
    adapter = load_adapter()
    real_run = adapter.subprocess.run

    def run_then_mutate(*args, **kwargs):
        process = real_run(*args, **kwargs)
        assert process.returncode == 0, process.stdout + process.stderr
        backend.write_text(
            backend.read_text(encoding="utf-8") + "\nchanged after upstream exit 0\n",
            encoding="utf-8",
        )
        return process

    monkeypatch.setattr(adapter.subprocess, "run", run_then_mutate)

    report = adapter.validate(root)

    assert report["valid"] is False
    assert (
        "post-validation-artifact-digest-stale:system-spec/backend.md"
        in report["failures"]
    )


def test_artifact_changed_between_post_validation_captures_is_unstable(
    tmp_path: Path, monkeypatch
) -> None:
    """post-validation pass 自体の途中で変わる snapshot も PASS させない。"""
    root = fixture(tmp_path)
    backend = root / "system-spec" / "backend.md"
    adapter = load_adapter()
    real_capture = adapter.capture_post_validation_binding
    calls = 0

    def capture_then_mutate(repo_root: Path):
        nonlocal calls
        capture = real_capture(repo_root)
        calls += 1
        if calls == 1:
            backend.write_text(
                backend.read_text(encoding="utf-8") + "\nchanged between captures\n",
                encoding="utf-8",
            )
        return capture

    monkeypatch.setattr(
        adapter, "capture_post_validation_binding", capture_then_mutate
    )

    report = adapter.validate(root)

    assert report["valid"] is False
    assert "post-validation-binding-unstable" in report["failures"]


def test_forged_receipt_cannot_detach_the_evaluator_snapshot(tmp_path: Path) -> None:
    """Current file digest だけの後付け書き換えで評価時 snapshot を偽装できない。"""
    root = fixture(tmp_path)
    backend = root / "system-spec" / "backend.md"
    backend.write_text(backend.read_text(encoding="utf-8") + "\n評価後の変更\n", encoding="utf-8")
    receipt_path = root / "system-spec" / "resume-receipt.json"
    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    receipt["artifacts"]["system-spec/backend.md"] = hashlib.sha256(
        backend.read_bytes()
    ).hexdigest()
    receipt_path.write_text(json.dumps(receipt), encoding="utf-8")

    code, report = run(root)

    assert code == 2
    assert "report-artifact-snapshot-mismatch" in report["failures"]


def test_adapter_delegates_canonical_validation_without_gate_duplication() -> None:
    source = SCRIPT.read_text(encoding="utf-8")

    assert "validate-system-spec-resume.py" in source
    assert "validate-coverage-matrix.py" not in source
    assert "validate-source-citation.py" not in source
    assert "aggregate-completeness.py" not in source


def test_post_validation_readers_fail_closed_on_unreadable_or_invalid_inputs(
    tmp_path: Path,
) -> None:
    adapter = load_adapter()
    failures: list[str] = []

    sha256, value = adapter.read_json_snapshot(
        tmp_path / "missing.json", "missing", failures
    )
    assert sha256 is None
    assert value == {}
    assert "post-validation-missing-read-failed" in failures

    invalid = tmp_path / "invalid.json"
    invalid.write_text("{", encoding="utf-8")
    sha256, value = adapter.read_json_snapshot(invalid, "invalid", failures)
    assert sha256
    assert value == {}
    assert "post-validation-invalid-invalid-json" in failures

    non_object = tmp_path / "list.json"
    non_object.write_text("[]", encoding="utf-8")
    sha256, value = adapter.read_json_snapshot(non_object, "list", failures)
    assert sha256
    assert value == {}
    assert "post-validation-list-not-object" in failures

    directory = tmp_path / "directory"
    directory.mkdir()
    with pytest.raises(ValueError):
        adapter.artifact_digest(tmp_path, "")
    with pytest.raises(ValueError):
        adapter.artifact_digest(tmp_path, "directory")


def test_cli_fails_closed_when_repo_root_is_missing(tmp_path: Path, capsys) -> None:
    adapter = load_adapter()

    code = adapter.main(["--repo-root", str(tmp_path / "missing")])

    assert code == 2
    report = json.loads(capsys.readouterr().out)
    assert report["valid"] is False
    assert report["resume_receipt_sha256"] is None


def test_c04_contract_and_resources_anchor_the_snapshot_gate() -> None:
    text = SKILL.read_text(encoding="utf-8")
    _opening, frontmatter, body = text.split("---", 2)
    metadata = yaml.safe_load(frontmatter)

    assert "../../scripts/validate-requirements-system-spec-snapshot.py" in metadata["script_refs"]
    assert "../../schemas/requirements-system-spec-snapshot.schema.json" in metadata["schema_refs"]
    assert "references/resource-map.yaml" in metadata["reference_refs"]
    criterion = metadata["feedback_contract"]["criteria"][0]["text"]
    assert "validate-requirements-system-spec-snapshot.py" in criterion
    assert "post-validation rehash" in criterion
    assert "同一pass中に安定" in criterion
    assert "system-spec/backend.md" in body

    inventory = json.loads(INVENTORY.read_text(encoding="utf-8"))
    c04 = next(item for item in inventory["components"] if item["id"] == "C04")
    assert c04["feedback_contract"]["criteria"] == metadata["feedback_contract"]["criteria"]
    assert "C19" in c04["depends_on"]

    resource_map = yaml.safe_load(RESOURCE_MAP.read_text(encoding="utf-8"))
    for resource in resource_map["resources"]:
        path = (RESOURCE_MAP.parent / resource["file"]).resolve(strict=True)
        path.relative_to(PLUGIN.parents[1].resolve())

    for prompt in ("R2b-readiness.md", "R3-handoff.md"):
        prompt_text = (SKILL.parent / "prompts" / prompt).read_text(encoding="utf-8")
        assert "validate-requirements-system-spec-snapshot" in prompt_text
