#!/usr/bin/env python3
# /// script
# name: validate-requirements-system-spec-snapshot
# purpose: Bind C04 requirements handoff to the current C19 system-spec PASS snapshot.
# inputs: [argv --repo-root PATH]
# outputs: [stdout JSON receipt, exit 0 current / 2 stale-or-invalid]
# contexts: [C, E]
# network: false
# write-scope: none
# dependencies: [validate-system-spec-resume.py]
# requires-python = ">=3.11"
# ///
"""Thin C04 consumer adapter over the canonical C19 resume validator."""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path
from typing import Any


HERE = Path(__file__).resolve().parent
UPSTREAM_VALIDATOR = HERE / "validate-system-spec-resume.py"
RECEIPT_RELATIVE = Path("system-spec/resume-receipt.json")
REPORT_RELATIVE = Path("system-spec/completeness-report.json")
SCHEMA_VERSION = "requirements-system-spec-snapshot/v1"
CONSUMER = "run-dev-graph-requirements"


def digest(path: Path) -> str | None:
    try:
        return hashlib.sha256(path.read_bytes()).hexdigest()
    except OSError:
        return None


def snapshot_digest(artifacts: dict[str, str]) -> str:
    encoded = json.dumps(
        artifacts,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def read_json_snapshot(
    path: Path, label: str, failures: list[str]
) -> tuple[str | None, dict[str, Any]]:
    try:
        content = path.read_bytes()
    except OSError:
        failures.append(f"post-validation-{label}-read-failed")
        return None, {}
    sha256 = hashlib.sha256(content).hexdigest()
    try:
        value = json.loads(content)
    except json.JSONDecodeError:
        failures.append(f"post-validation-{label}-invalid-json")
        return sha256, {}
    if not isinstance(value, dict):
        failures.append(f"post-validation-{label}-not-object")
        return sha256, {}
    return sha256, value


def artifact_digest(root: Path, relative: str) -> str:
    if not relative or Path(relative).is_absolute():
        raise ValueError("invalid artifact path")
    path = (root / relative).resolve(strict=True)
    path.relative_to(root)
    if not path.is_file():
        raise ValueError("artifact is not a file")
    return hashlib.sha256(path.read_bytes()).hexdigest()


def capture_post_validation_binding(
    root: Path,
) -> tuple[dict[str, Any], list[str]]:
    """Capture one complete C04 integrity pass without repeating C19 semantic gates."""
    failures: list[str] = []
    receipt_sha256, receipt = read_json_snapshot(
        root / RECEIPT_RELATIVE, "resume-receipt", failures
    )
    report_sha256, report = read_json_snapshot(
        root / REPORT_RELATIVE, "completeness-report", failures
    )

    raw_artifacts = receipt.get("artifacts")
    if not isinstance(raw_artifacts, dict) or not all(
        isinstance(key, str) and isinstance(value, str)
        for key, value in raw_artifacts.items()
    ):
        failures.append("receipt-artifacts-invalid")
        artifacts: dict[str, str] = {}
    else:
        artifacts = dict(raw_artifacts)

    artifact_digests: dict[str, str] = {}
    for relative in sorted(artifacts):
        try:
            artifact_digests[relative] = artifact_digest(root, relative)
        except FileNotFoundError:
            failures.append(f"post-validation-artifact-missing:{relative}")
        except (OSError, RuntimeError, ValueError):
            failures.append(f"post-validation-artifact-unreadable:{relative}")

    try:
        markdown_artifacts = sorted(
            path.relative_to(root).as_posix()
            for path in (root / "system-spec").rglob("*.md")
            if path.is_file()
        )
    except OSError:
        markdown_artifacts = []
        failures.append("post-validation-markdown-inventory-read-failed")

    snapshot = report.get("artifact_snapshot")
    raw_snapshot_artifacts = snapshot.get("artifacts") if isinstance(snapshot, dict) else None
    if not isinstance(raw_snapshot_artifacts, dict) or not all(
        isinstance(key, str) and isinstance(value, str)
        for key, value in raw_snapshot_artifacts.items()
    ):
        failures.append("report-artifact-snapshot-invalid")
        report_artifacts: dict[str, str] = {}
    else:
        report_artifacts = dict(raw_snapshot_artifacts)

    return {
        "resume_receipt_sha256": receipt_sha256,
        "completeness_report_sha256": report_sha256,
        "receipt_artifacts": artifacts,
        "report_artifacts": report_artifacts,
        "artifact_digests": artifact_digests,
        "markdown_artifacts": markdown_artifacts,
    }, failures


def validate(root: Path) -> dict[str, Any]:
    root = root.resolve(strict=True)
    receipt_path = root / RECEIPT_RELATIVE
    report_path = root / REPORT_RELATIVE
    before = {
        "receipt": digest(receipt_path),
        "report": digest(report_path),
    }
    process = subprocess.run(
        [sys.executable, str(UPSTREAM_VALIDATOR), "--repo-root", str(root)],
        capture_output=True,
        text=True,
        check=False,
    )

    failures: list[str] = []
    try:
        upstream = json.loads(process.stdout)
    except json.JSONDecodeError:
        upstream = {}
        failures.append("upstream-output-invalid-json")
    if not isinstance(upstream, dict):
        upstream = {}
        failures.append("upstream-output-not-object")
    if upstream.get("validator") != "validate-system-spec-resume":
        failures.append("upstream-validator-identity-mismatch")
    upstream_failures = upstream.get("failures")
    if isinstance(upstream_failures, list):
        failures.extend(f"upstream:{item}" for item in upstream_failures if isinstance(item, str))
    elif process.returncode != 0 or upstream.get("valid") is not True:
        failures.append("upstream-failures-missing")
    if process.returncode != 0:
        failures.append(f"upstream-exit:{process.returncode}")
    if upstream.get("valid") is not True:
        failures.append("upstream-valid-not-true")

    first_post, first_post_failures = capture_post_validation_binding(root)
    second_post, second_post_failures = capture_post_validation_binding(root)
    failures.extend(first_post_failures)
    failures.extend(second_post_failures)
    if first_post != second_post or first_post_failures != second_post_failures:
        failures.append("post-validation-binding-unstable")

    after = {
        "receipt": second_post["resume_receipt_sha256"],
        "report": second_post["completeness_report_sha256"],
    }
    if before != after:
        failures.append("binding-input-changed-during-validation")

    artifacts = second_post["receipt_artifacts"]
    actual_artifacts = second_post["artifact_digests"]
    for relative, expected in sorted(artifacts.items()):
        actual = actual_artifacts.get(relative)
        if actual is not None and actual != expected:
            failures.append(f"post-validation-artifact-digest-stale:{relative}")

    current_markdown = set(second_post["markdown_artifacts"])
    receipt_markdown = {
        relative for relative in artifacts
        if relative.startswith("system-spec/") and relative.endswith(".md")
    }
    if current_markdown != receipt_markdown:
        failures.append("post-validation-markdown-set-mismatch")

    artifact_snapshot_sha256: str | None = None
    snapshot_artifacts = second_post["report_artifacts"]
    expected_snapshot = {
        key: value
        for key, value in artifacts.items()
        if key != REPORT_RELATIVE.as_posix()
    }
    if snapshot_artifacts != expected_snapshot:
        failures.append("report-artifact-snapshot-mismatch")
    else:
        artifact_snapshot_sha256 = snapshot_digest(snapshot_artifacts)

    upstream_artifacts = upstream.get("artifacts")
    if process.returncode == 0 and upstream.get("valid") is True:
        if not isinstance(upstream_artifacts, list) or sorted(artifacts) != upstream_artifacts:
            failures.append("upstream-artifact-list-mismatch")
        if after["receipt"] is None:
            failures.append("resume-receipt-missing")
        if after["report"] is None:
            failures.append("completeness-report-missing")

    failures = list(dict.fromkeys(failures))
    return {
        "schema_version": SCHEMA_VERSION,
        "validator": "validate-requirements-system-spec-snapshot",
        "valid": not failures,
        "consumer": CONSUMER,
        "upstream_validator": "validate-system-spec-resume",
        "mode": "reuse-confirmed",
        "resume_receipt_sha256": second_post["resume_receipt_sha256"],
        "completeness_report_sha256": second_post["completeness_report_sha256"],
        "artifact_snapshot_sha256": artifact_snapshot_sha256,
        "artifacts": sorted(artifacts),
        "failures": failures,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--repo-root", required=True, type=Path)
    args = parser.parse_args(argv)
    try:
        report = validate(args.repo_root)
    except (OSError, ValueError) as exc:
        report = {
            "schema_version": SCHEMA_VERSION,
            "validator": "validate-requirements-system-spec-snapshot",
            "valid": False,
            "consumer": CONSUMER,
            "upstream_validator": "validate-system-spec-resume",
            "mode": "reuse-confirmed",
            "resume_receipt_sha256": None,
            "completeness_report_sha256": None,
            "artifact_snapshot_sha256": None,
            "artifacts": [],
            "failures": [str(exc)],
        }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["valid"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
