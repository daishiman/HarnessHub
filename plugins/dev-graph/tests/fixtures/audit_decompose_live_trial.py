#!/usr/bin/env python3
# /// script
# name: audit-decompose-live-trial
# purpose: Derive C14 live-trial evidence from repository state, preview data, and real dry-run adapter receipts.
# inputs: ["snapshot|audit plus explicit repository, preview, scenario, plugin, and output paths"]
# outputs: ["JSON state snapshot or audit report"]
# requires-python = ">=3.10"
# dependencies: []
# contexts: [A, B, C, E]
# network: false
# write-scope: the explicit --output path only
# ///
"""C14 decompose live-trial の決定論的な監査ヘルパー。

このヘルパーは被験 skill の代わりに preview を生成しない。skill 実行前の管理対象状態を
snapshot し、skill が生成した一つの preview と、実 adapter の dry-run receipt だけから
受け入れ証拠を導出する。試験中に監査コードを即席生成して期待値を自己申告することを防ぐ。

状態 snapshot と before/after 比較は audit_live_trial_state.py に分離した (責務分割)。
provenance は両 module の合成 identity で測るため、どちらを試験中に書き換えても
`provenance_valid` が落ちる。
"""

from __future__ import annotations

import argparse
import copy
import importlib.util
import json
import os
import sys
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
STATE_MODULE = "audit_live_trial_state.py"


def _load_sibling(filename: str, module_name: str):
    spec = importlib.util.spec_from_file_location(module_name, HERE / filename)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)  # type: ignore[union-attr]
    return module


STATE = _load_sibling(STATE_MODULE, "audit_live_trial_state")
AuditError = STATE.AuditError
_load_object = STATE.load_object
_write_object = STATE.write_object
_sha256 = STATE.sha256_of
_run_json = STATE.run_json
_git_status = STATE.git_status
_content_inventory = STATE.content_inventory
_state_comparison = STATE.state_comparison

SCENARIO_ID = "C14-OUT1-positive-macro-decomposition"
BINDINGS = ("none", "beads", "github")
AUDIT_MODULES = (Path(__file__).resolve(), HERE / STATE_MODULE)


def _helper_identity() -> dict[str, Any]:
    """監査実装 (本 module + 状態層 module) 全体の同一性を返す。"""
    return STATE.composite_identity(list(AUDIT_MODULES))


def capture_state(repo_root: Path) -> dict[str, Any]:
    return STATE.capture_state(repo_root, audit_implementation=_helper_identity())


def _graph_measurements(nodes: list[dict[str, Any]], threshold: dict[str, Any]) -> dict[str, Any]:
    features = [node for node in nodes if node.get("artifact_kind") == "feature"]
    architectures = [node for node in nodes if node.get("artifact_kind") == "architecture"]
    tasks = [node for node in nodes if node.get("artifact_kind") == "task"]
    ids = {
        node.get("graph_node_id")
        for node in nodes
        if isinstance(node.get("graph_node_id"), str)
    }
    if len(ids) != len(nodes):
        raise AuditError("preview nodes require unique string graph_node_id values")

    dependencies = {
        node["graph_node_id"]: [
            dependency
            for dependency in node.get("depends_on", [])
            if dependency in ids
        ]
        for node in nodes
    }
    visiting: set[str] = set()
    visited: set[str] = set()
    cyclic = False

    def visit(node_id: str) -> None:
        nonlocal cyclic
        if node_id in visiting:
            cyclic = True
            return
        if node_id in visited:
            return
        visiting.add(node_id)
        for dependency in dependencies[node_id]:
            visit(dependency)
        visiting.remove(node_id)
        visited.add(node_id)

    for node_id in dependencies:
        visit(node_id)

    feature_ids = {node["graph_node_id"] for node in features}
    fan_out = {
        node["graph_node_id"]: len(
            [dependency for dependency in node.get("depends_on", []) if dependency in feature_ids]
        )
        for node in features
    }
    measured = max(fan_out.values()) if fan_out else None
    maximum = threshold.get("max_value")
    threshold_pass = (
        isinstance(measured, int)
        and isinstance(maximum, int)
        and measured <= maximum
    )
    return {
        "produced_node_count": len(nodes),
        "feature_count": len(features),
        "architecture_count": len(architectures),
        "task_count": len(tasks),
        "acyclic": not cyclic,
        "metric": threshold.get("metric"),
        "per_feature": fan_out,
        "measured_max": measured,
        "declared_max": maximum,
        "threshold_pass": threshold_pass,
    }


def _is_publication_candidate(node: dict[str, Any]) -> bool:
    return (
        node.get("confirmation_status") == "confirmed"
        and node.get("evaluation_status") == "pass"
        and (node.get("implementation_readiness") or {}).get("status") == "complete"
    )


def _publication_measurements(features: list[dict[str, Any]]) -> dict[str, Any]:
    draft = {
        binding: [
            node["graph_node_id"]
            for node in features
            if _is_publication_candidate(node)
        ]
        for binding in BINDINGS
    }
    if not features:
        raise AuditError("preview must contain at least one produced feature")
    probe = copy.deepcopy(features[0])
    probe["confirmation_status"] = "confirmed"
    probe["evaluation_status"] = "pass"
    readiness = probe.setdefault("implementation_readiness", {})
    if not isinstance(readiness, dict):
        raise AuditError("feature implementation_readiness must be an object")
    readiness["status"] = "incomplete"
    conditions = {
        "confirmation_confirmed": probe.get("confirmation_status") == "confirmed",
        "evaluation_pass": probe.get("evaluation_status") == "pass",
        "readiness_complete": readiness.get("status") == "complete",
    }
    return {
        "draft_candidates": {
            binding: {"ids": ids, "count": len(ids)}
            for binding, ids in draft.items()
        },
        "readiness_probe": {
            "graph_node_id": probe["graph_node_id"],
            "conditions": conditions,
            "candidate": _is_publication_candidate(probe),
            "excluded_only_by_readiness": (
                conditions["confirmation_confirmed"]
                and conditions["evaluation_pass"]
                and not conditions["readiness_complete"]
                and not _is_publication_candidate(probe)
            ),
        },
    }


def _adapter_receipts(
    repo_root: Path,
    plugin_root: Path,
    sample: dict[str, Any],
) -> dict[str, dict[str, Any]]:
    scripts = plugin_root / "scripts"
    node_id = sample.get("graph_node_id")
    title = sample.get("title")
    if not isinstance(node_id, str) or not isinstance(title, str):
        raise AuditError("sample feature requires graph_node_id and title")
    description = sample.get("purpose") if isinstance(sample.get("purpose"), str) else title
    body = json.dumps(
        {
            "graph_node_id": node_id,
            "acceptance": sample.get("acceptance", []),
            "implementation_readiness": sample.get("implementation_readiness"),
        },
        ensure_ascii=False,
        sort_keys=True,
    )
    return {
        "beads": _run_json([
            "python3",
            str(scripts / "bd-bridge.py"),
            "--op",
            "create",
            "--repo-root",
            str(repo_root),
            "--graph-node-id",
            node_id,
            "--title",
            title,
            "--description",
            description,
            "--artifact-kind",
            "feature",
            "--dry-run",
        ]),
        "github_issue": _run_json([
            "python3",
            str(scripts / "gh-bridge.py"),
            "--op",
            "issue-create",
            "--repo",
            "example/dev-graph-live-trial",
            "--title",
            title,
            "--body",
            body,
            "--dry-run",
        ]),
        "github_projects": _run_json([
            "python3",
            str(scripts / "gh-bridge.py"),
            "--op",
            "project-item-add",
            "--content-id",
            node_id,
            "--project-id",
            node_id,
            "--dry-run",
        ]),
    }


def _suppression_from(receipt: dict[str, Any]) -> bool:
    payload = receipt["payload"]
    if payload.get("op") == "create":
        return isinstance(payload.get("dry_run_preview"), dict)
    return payload.get("dry_run") is True and payload.get("mutation_suppressed") is True


def audit(
    *,
    repo_root: Path,
    preview_path: Path,
    scenario_path: Path,
    pre_state_path: Path,
    plugin_root: Path,
) -> dict[str, Any]:
    preview = _load_object(preview_path)
    nodes = preview.get("nodes")
    if not isinstance(nodes, list) or not all(isinstance(node, dict) for node in nodes):
        raise AuditError("preview.nodes must be an object array")
    scenarios = _load_object(scenario_path).get("scenarios")
    if not isinstance(scenarios, list):
        raise AuditError("scenario file requires scenarios[]")
    scenario = next(
        (
            item
            for item in scenarios
            if isinstance(item, dict) and item.get("scenario_id") == SCENARIO_ID
        ),
        None,
    )
    if not isinstance(scenario, dict):
        raise AuditError(f"scenario not found: {SCENARIO_ID}")
    threshold = scenario.get("declared_granularity_threshold")
    if not isinstance(threshold, dict):
        raise AuditError("scenario requires declared_granularity_threshold")

    features = [node for node in nodes if node.get("artifact_kind") == "feature"]
    graph = _graph_measurements(nodes, threshold)
    publication = _publication_measurements(features)
    pre_state = _load_object(pre_state_path)
    local = _state_comparison(pre_state, capture_state(repo_root))
    helper = _helper_identity()
    helper_pre = pre_state.get("audit_implementation")
    helper_provenance_valid = (
        isinstance(helper_pre, dict)
        and helper_pre.get("sha256") == helper["sha256"]
        and helper["tracked_in_index"]
        and helper["index_matches_worktree"]
    )
    adapters = _adapter_receipts(repo_root, plugin_root, features[0])
    adapter_suppression = {
        name: _suppression_from(receipt)
        for name, receipt in adapters.items()
    }
    schema = _run_json(
        [
            "python3",
            str(plugin_root / "scripts/validate-graph-schema.py"),
            "--graph",
            "-",
            "--repo-root",
            str(repo_root),
        ],
        stdin=json.dumps(preview, ensure_ascii=False),
    )
    violations = schema["payload"].get("violations")
    if not isinstance(violations, list):
        raise AuditError("schema receipt requires violations[]")
    structural_violations = [
        item
        for item in violations
        if not isinstance(item, dict) or item.get("code") != "artifact_missing"
    ]

    suppression = {"local": local["mutation_suppressed"], **adapter_suppression}
    write_counts = {
        name: int(not value)
        for name, value in suppression.items()
    }
    draft_empty = all(
        not result["ids"]
        for result in publication["draft_candidates"].values()
    )
    passed = all([
        bool(nodes),
        bool(features),
        bool(graph["architecture_count"]),
        graph["acyclic"],
        graph["threshold_pass"],
        not bool(graph["task_count"]),
        draft_empty,
        publication["readiness_probe"]["excluded_only_by_readiness"],
        all(suppression.values()),
        not structural_violations,
        helper_provenance_valid,
    ])
    return {
        "scenario_id": SCENARIO_ID,
        "preview": str(preview_path),
        "audit_implementation": {
            **helper,
            "same_as_pre_state": (
                isinstance(helper_pre, dict)
                and helper_pre.get("sha256") == helper["sha256"]
            ),
            "provenance_valid": helper_provenance_valid,
        },
        "graph": graph,
        "publication": publication,
        "local_state": local,
        "adapter_receipts": adapters,
        "mutation_suppression": suppression,
        "derived_write_counts": write_counts,
        "schema_validation": {
            "stdin_path_used": True,
            "receipt": schema,
            "violation_count": len(violations),
            "structural_violations": structural_violations,
            "structural_contract_valid": not structural_violations,
        },
        "pass": passed,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest="command", required=True)
    snapshot = commands.add_parser("snapshot")
    snapshot.add_argument("--repo-root", required=True, type=Path)
    snapshot.add_argument("--output", required=True, type=Path)
    audit_parser = commands.add_parser("audit")
    audit_parser.add_argument("--repo-root", required=True, type=Path)
    audit_parser.add_argument("--preview", required=True, type=Path)
    audit_parser.add_argument("--scenario", required=True, type=Path)
    audit_parser.add_argument("--pre-state", required=True, type=Path)
    audit_parser.add_argument("--plugin-dir", required=True, type=Path)
    audit_parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    try:
        if args.command == "snapshot":
            result = capture_state(args.repo_root.resolve(strict=True))
        else:
            result = audit(
                repo_root=args.repo_root.resolve(strict=True),
                preview_path=args.preview.resolve(strict=True),
                scenario_path=args.scenario.resolve(strict=True),
                pre_state_path=args.pre_state.resolve(strict=True),
                plugin_root=args.plugin_dir.resolve(strict=True),
            )
        _write_object(args.output, result)
    except (AuditError, OSError, json.JSONDecodeError) as exc:
        print(str(exc), file=sys.stderr)
        return os.EX_DATAERR
    return os.EX_OK


if __name__ == "__main__":
    raise SystemExit(main())
