#!/usr/bin/env python3
# /// script
# name: validate-system-spec-resume
# purpose: Validate a digest-bound system-spec-harness PASS bundle before cached C19 import.
# inputs: [argv --repo-root PATH]
# outputs: [stdout JSON receipt, exit 0 valid / 2 invalid]
# contexts: [C, E]
# network: false
# write-scope: none
# dependencies: []
# requires-python = ">=3.11"
# ///
"""Fail closed unless a pre-confirmed system-spec bundle is current and complete."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any


PLUGIN_ROOT = Path(__file__).resolve().parents[1]
HARNESS_ROOT = PLUGIN_ROOT.parent / "system-spec-harness"
REQUIRED_ENTRY_POINTS = {
    "run-system-spec-elicit",
    "run-system-spec-doc-fetch",
    "run-system-spec-compile",
    "assign-system-spec-completeness-evaluator",
}
REQUIRED_ARTIFACTS = {
    "system-spec/index.md",
    "system-spec/00-requirements-definition.md",
    "system-spec/completeness-report.json",
}
REQUIRED_GATES = {"coverage", "source_citation", "evaluator"}


def load_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"cannot read JSON {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise ValueError(f"JSON object required: {path}")
    return value


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def contained_file(root: Path, relative: str) -> Path:
    path = (root / relative).resolve()
    try:
        path.relative_to(root)
    except ValueError as exc:
        raise ValueError(f"artifact escapes repo root: {relative}") from exc
    if not path.is_file():
        raise ValueError(f"artifact is missing: {relative}")
    return path


def validate(root: Path) -> dict[str, Any]:
    root = root.resolve(strict=True)
    receipt_path = contained_file(root, "system-spec/resume-receipt.json")
    receipt = load_json(receipt_path)
    manifest = load_json(HARNESS_ROOT / ".claude-plugin" / "plugin.json")
    package = load_json(HARNESS_ROOT / "references" / "package-contract.json")
    declared = set(package.get("entry_points", {}).get("skills", []))

    failures: list[str] = []
    if manifest.get("name") != "system-spec-harness":
        failures.append("plugin-name-mismatch")
    missing_entry_points = sorted(REQUIRED_ENTRY_POINTS - declared)
    if missing_entry_points:
        failures.append("entry-points-missing:" + ",".join(missing_entry_points))
    producer = receipt.get("producer")
    if not isinstance(producer, dict):
        failures.append("producer-missing")
    else:
        if producer.get("plugin") != manifest.get("name"):
            failures.append("producer-plugin-mismatch")
        if producer.get("version") != manifest.get("version"):
            failures.append("producer-version-stale")
        if producer.get("entry_point") != "assign-system-spec-completeness-evaluator":
            failures.append("producer-entry-point-invalid")
    if receipt.get("verdict") != "PASS":
        failures.append("receipt-verdict-not-pass")

    gates = receipt.get("gates")
    if not isinstance(gates, dict) or set(gates) != REQUIRED_GATES:
        failures.append("gate-set-invalid")
    elif any(gates[name] != "PASS" for name in REQUIRED_GATES):
        failures.append("gate-not-pass")

    artifacts = receipt.get("artifacts")
    if not isinstance(artifacts, dict) or set(artifacts) != REQUIRED_ARTIFACTS:
        failures.append("artifact-set-invalid")
    else:
        for relative in sorted(REQUIRED_ARTIFACTS):
            try:
                actual = sha256(contained_file(root, relative))
            except ValueError as exc:
                failures.append(str(exc))
                continue
            if artifacts.get(relative) != actual:
                failures.append(f"artifact-digest-stale:{relative}")

    try:
        report = load_json(contained_file(root, "system-spec/completeness-report.json"))
        if report.get("verdict") != "PASS":
            failures.append("completeness-verdict-not-pass")
        requirements = contained_file(
            root, "system-spec/00-requirements-definition.md"
        ).read_text(encoding="utf-8")
        if not requirements.startswith("---\n") or "\nstatus: confirmed\n" not in requirements:
            failures.append("requirements-not-confirmed")
    except ValueError as exc:
        failures.append(str(exc))

    return {
        "validator": "validate-system-spec-resume",
        "valid": not failures,
        "mode": "reuse-confirmed",
        "plugin_version": manifest.get("version"),
        "required_entry_points": sorted(REQUIRED_ENTRY_POINTS),
        "artifacts": sorted(REQUIRED_ARTIFACTS),
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
            "validator": "validate-system-spec-resume",
            "valid": False,
            "mode": "reuse-confirmed",
            "failures": [str(exc)],
        }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["valid"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
