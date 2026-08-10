#!/usr/bin/env python3
"""Read-only fail-closed check run immediately before the C14 completion marker."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

RUN = Path(
    "/private/tmp/harnesshub-o4zi.Gv5hFK/eval-log/dev-graph/"
    "run-dev-graph-decompose/live-trial/20260808T190000Z-o4zi-c14r11"
)
TRANSCRIPT = Path(
    "/Users/dm/.claude/projects/-private-tmp-harnesshub-o4zi-Gv5hFK/"
    "b1361ecc-d2b5-495f-a6ec-7653ae796bcd.jsonl"
)
TARGET = "dev-graph:run-dev-graph-decompose"
WANT = (
    "社内向けの業務ポータルを作りたい。利用者は自分のアカウントでログインでき、"
    "ログイン後のダッシュボードで自分に割り当てられた作業と期限を一覧できる。"
    "期限が近い作業は通知として届き、管理者は全社の進捗を集計したレポートを閲覧できる。"
)


def tool_uses() -> list[dict]:
    uses: list[dict] = []
    for line in TRANSCRIPT.read_text(encoding="utf-8", errors="replace").splitlines():
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        message = event.get("message")
        content = message.get("content") if isinstance(message, dict) else None
        if not isinstance(content, list):
            continue
        for block in content:
            if isinstance(block, dict) and block.get("type") == "tool_use":
                uses.append(block)
    return uses


def graph_result(name: str) -> dict:
    graph = json.loads(
        (RUN / f"fixture-{name}/.dev-graph/state/graph.json").read_text(encoding="utf-8")
    )
    features = [node for node in graph["nodes"] if node["artifact_kind"] == "feature"]
    candidates = [
        node["graph_node_id"]
        for node in features
        if node["confirmation_status"] == "confirmed"
        and node["evaluation_status"] == "pass"
        and node["implementation_readiness"]["status"] == "complete"
    ]
    excluded = [node["graph_node_id"] for node in features if node["graph_node_id"] not in candidates]
    return {
        "candidate_count": len(candidates),
        "candidates": candidates,
        "draft_excluded_count": len(excluded),
        "draft_excluded": excluded,
        "graph_revision": graph["graph_revision"],
        "node_count": len(graph["nodes"]),
    }


uses = tool_uses()
skills = [
    block.get("input", {})
    for block in uses
    if block.get("name") == "Skill"
    and isinstance(block.get("input"), dict)
    and block["input"].get("skill") == TARGET
]
agents = [block for block in uses if block.get("name") in {"Agent", "Task"}]
args = [item.get("args", "") for item in skills]
graphs = {name: graph_result(name) for name in ("beads", "none")}

goal_path = RUN / "fixture-beads/eval-log/run-dev-graph-decompose-goal-spec.json"
rows_path = RUN / "fixture-beads/eval-log/run-dev-graph-decompose-intermediate.jsonl"
goal = json.loads(goal_path.read_text(encoding="utf-8"))
rows = [json.loads(line) for line in rows_path.read_text(encoding="utf-8").splitlines() if line]
goal_hash = hashlib.sha256(goal["original_goal"].encode("utf-8")).hexdigest()
external_before_path = RUN / "external-before.json"
external_after_path = RUN / "external-after.json"
external_before = (
    json.loads(external_before_path.read_text(encoding="utf-8"))
    if external_before_path.is_file()
    else None
)
external_after = (
    json.loads(external_after_path.read_text(encoding="utf-8"))
    if external_after_path.is_file()
    else None
)

preview_inputs = sorted(
    str(path.relative_to(RUN))
    for path in RUN.rglob("*")
    if path.is_file()
    and path.name in {"preview-graph.json", "preview-beads.json", "preview-none.json"}
)
checks = {
    "literal_target_skill_calls": len(skills) == 2,
    "same_literal_want": len(args) == 2 and all(arg.startswith(WANT + " --repo-root ") for arg in args),
    "fixture_paths": len(args) == 2 and "fixture-beads" in args[0] and "fixture-none" in args[1],
    "task_agent_calls_zero": len(agents) == 0,
    "candidate_counts": all(item["candidate_count"] == 1 for item in graphs.values()),
    "draft_excluded": all(item["draft_excluded_count"] >= 1 for item in graphs.values()),
    "goal_rows": len(rows) == 2,
    "goal_hash": len(rows) == 2 and all(row["original_goal_hash"] == goal_hash for row in rows),
    "independent_verification_exists": (RUN / "independent-verification.json").is_file(),
    "status_absent_before_marker": not (RUN / "out/status.json").exists(),
    "preview_inputs_never_materialized": preview_inputs == [],
    "external_snapshots_exist": external_before is not None and external_after is not None,
    "external_snapshots_equal": external_before is not None and external_before == external_after,
    "external_counts_zero": external_after is not None
    and external_after["beads_issue_count"] == 0
    and external_after["github_issue_count"] == 0
    and external_after["projects_item_count"] == 0,
}
result = {
    "check": "C14-immediate-pre-marker",
    "transcript": str(TRANSCRIPT),
    "transcript_bytes": TRANSCRIPT.stat().st_size,
    "literal_target_skill_call_count": len(skills),
    "target_skill_args": args,
    "task_agent_call_count": len(agents),
    "graphs": graphs,
    "goal_rows": len(rows),
    "goal_hash": goal_hash,
    "preview_input_files": preview_inputs,
    "external_before": external_before,
    "external_after": external_after,
    "checks": checks,
    "pass": all(checks.values()),
}
print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
raise SystemExit(0 if result["pass"] else 1)
