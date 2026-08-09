#!/usr/bin/env python3
# /// script
# name: build-system-spec-resume-import
# purpose: Execute C19's deterministic cached PASS validation and C02 import path.
# inputs: [argv --repo-root PATH]
# outputs: [graph nodes, eval-log goal/progress/intermediate/import receipts, stdout JSON]
# contexts: [E]
# network: false
# write-scope: caller-repo graph/specs/architecture/eval-log/.dev-graph/tmp
# dependencies: [resolve-repo-context.py, validate-system-spec-resume.py, validate-system-spec-boundary.py, build-system-spec-import.py, upsert-node.py, validate-graph-schema.py, validate-source-digest.py, validate-evidence-refs.py]
# requires-python = ">=3.11"
# ///
"""Run the no-network, no-LLM C19 resume path as one reproducible command."""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path
from typing import Any


HERE = Path(__file__).resolve().parent
SKILL = "run-dev-graph-system-spec"
ORIGINAL_GOAL = (
    "仕様書・アーキテクチャをplugins/system-spec-harness/の正規フローで構築し、"
    "出典・確定状態・上位目的traceを保ったままdev-graphのspecification/architecture"
    "ノードへ取り込んだ状態になっている"
)


class RunFailure(Exception):
    pass


def write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def run(command: list[str], *, label: str) -> dict[str, Any]:
    proc = subprocess.run(command, capture_output=True, text=True, check=False)
    record = {
        "label": label,
        "command": command,
        "exit_code": proc.returncode,
        "stdout": proc.stdout,
        "stderr": proc.stderr,
    }
    if proc.returncode != 0:
        raise RunFailure(f"{label} failed ({proc.returncode}): {proc.stderr or proc.stdout}")
    return record


def parse_stdout(record: dict[str, Any]) -> dict[str, Any]:
    try:
        value = json.loads(record["stdout"])
    except json.JSONDecodeError as exc:
        raise RunFailure(f"{record['label']} did not emit JSON: {exc}") from exc
    if not isinstance(value, dict):
        raise RunFailure(f"{record['label']} JSON object required")
    return value


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--repo-root", required=True, type=Path)
    args = parser.parse_args(argv)
    root = args.repo_root.resolve()
    eval_root = root / "eval-log"
    import_dir = root / ".dev-graph" / "tmp" / "system-spec-import"
    graph = root / ".dev-graph" / "state" / "graph.json"
    progress_path = eval_root / f"{SKILL}-progress.json"
    steps: list[dict[str, Any]] = []
    try:
        context_step = run(
            [sys.executable, str(HERE / "resolve-repo-context.py"),
             "--repo-root", str(root), "--mode", "write"],
            label="resolve-context",
        )
        steps.append(context_step)
        context = parse_stdout(context_step)
        if Path(context.get("repo_root", "")).resolve() != root:
            raise RunFailure("resolved repo_root does not match requested root")
        write_json(eval_root / f"{SKILL}-receipt.json", context)

        resume_step = run(
            [sys.executable, str(HERE / "validate-system-spec-resume.py"),
             "--repo-root", str(root)],
            label="validate-resume",
        )
        steps.append(resume_step)
        resume = parse_stdout(resume_step)

        build_step = run(
            [sys.executable, str(HERE / "build-system-spec-import.py"),
             "--repo-root", str(root), "--out-dir", str(import_dir)],
            label="build-import",
        )
        steps.append(build_step)
        build = parse_stdout(build_step)

        registered: list[str] = []
        for name in ("architecture", "specification"):
            upsert_step = run(
                [sys.executable, str(HERE / "upsert-node.py"),
                 "--repo-root", str(root),
                 "--input", str(import_dir / f"{name}.node.json"),
                 "--body-file", str(import_dir / f"{name}.body.md")],
                label=f"c02-upsert-{name}",
            )
            steps.append(upsert_step)
            registered.append(str(parse_stdout(upsert_step)["graph_node_id"]))

        goal_hash = hashlib.sha256(ORIGINAL_GOAL.encode("utf-8")).hexdigest()
        write_json(eval_root / f"{SKILL}-goal-spec.json", {
            "original_goal": ORIGINAL_GOAL,
            "mode": "reuse-confirmed",
        })
        write_json(progress_path, {
            "mode": "reuse-confirmed",
            "status": "verifying",
            "registered_this_run": registered,
            "resume_receipt_valid": resume["valid"],
        })

        gates = [
            [sys.executable, str(HERE / "validate-system-spec-boundary.py")],
            [sys.executable, str(HERE / "validate-graph-schema.py"),
             "--repo-root", str(root), "--graph", str(graph),
             "--require-canonical-envelope"],
            [sys.executable, str(HERE / "validate-source-digest.py"),
             "--repo-root", str(root), "--progress", str(progress_path)],
            [sys.executable, str(HERE / "validate-evidence-refs.py"),
             "--repo-root", str(root), "--progress", str(progress_path)],
        ]
        for index, command in enumerate(gates, start=1):
            step = run(command, label=f"gate-{index}")
            steps.append(step)

        progress = json.loads(progress_path.read_text(encoding="utf-8"))
        progress["status"] = "complete"
        progress["gate_exit_codes"] = {step["label"]: step["exit_code"] for step in steps}
        write_json(progress_path, progress)
        intermediate = {
            "original_goal": ORIGINAL_GOAL,
            "original_goal_hash": goal_hash,
            "current_goal_snapshot": "digest-bound PASS bundle imported through C02",
            "delta_from_original": "none",
            "merged_directive_for_next": "stop: all gates passed",
            "drift_signal": False,
        }
        inter_path = eval_root / f"{SKILL}-intermediate.jsonl"
        inter_path.write_text(json.dumps(intermediate, ensure_ascii=False) + "\n", encoding="utf-8")

        report = {
            "runner": "build-system-spec-resume-import",
            "mode": "reuse-confirmed",
            "status": "PASS",
            "network_calls": 0,
            "upstream_skill_invocations": 0,
            "registered_this_run": registered,
            "resume": resume,
            "build": build,
            "steps": [{"label": step["label"], "exit_code": step["exit_code"]} for step in steps],
        }
        write_json(eval_root / f"{SKILL}-resume-report.json", report)
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0
    except (OSError, KeyError, RunFailure, json.JSONDecodeError) as exc:
        print(json.dumps({
            "runner": "build-system-spec-resume-import",
            "mode": "reuse-confirmed",
            "status": "FAIL",
            "error": str(exc),
            "steps": [{"label": step["label"], "exit_code": step["exit_code"]} for step in steps],
        }, ensure_ascii=False, indent=2))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
