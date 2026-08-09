#!/usr/bin/env python3
"""Capture C14 pre-state and initialize append-only goal-seek evidence."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path


RUN = Path(__file__).resolve().parent
FIXTURES = {name: RUN / f"fixture-{name}" for name in ("beads", "none")}
GOAL = (
    "社内向けの業務ポータルを作りたい。利用者は自分のアカウントでログインでき、"
    "ログイン後のダッシュボードで自分に割り当てられた作業と期限を一覧できる。"
    "期限が近い作業は通知として届き、管理者は全社の進捗を集計したレポートを閲覧できる。"
)


def dump(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )


snapshots: dict[str, object] = {}
for name, root in FIXTURES.items():
    graph_path = root / ".dev-graph/state/graph.json"
    graph_bytes = graph_path.read_bytes()
    graph = json.loads(graph_bytes)
    files = sorted(
        str(path.relative_to(root))
        for path in root.rglob("*")
        if path.is_file() and ".git" not in path.relative_to(root).parts
    )
    git_status = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=root,
        check=True,
        capture_output=True,
        text=True,
    ).stdout.splitlines()
    snapshots[name] = {
        "graph_sha256": hashlib.sha256(graph_bytes).hexdigest(),
        "graph_revision": graph["graph_revision"],
        "node_count": len(graph["nodes"]),
        "managed_files": files,
        "git_status": git_status,
    }

external_command = [sys.executable, str(RUN / "support/external-snapshot.py")]
external_result = subprocess.run(
    external_command,
    check=True,
    capture_output=True,
    text=True,
)
external_before = json.loads(external_result.stdout)
dump(RUN / "external-before.json", external_before)
snapshots["external"] = external_before
dump(RUN / "pre-state.json", snapshots)

eval_root = FIXTURES["beads"] / "eval-log"
dump(
    eval_root / "run-dev-graph-decompose-goal-spec.json",
    {
        "skill": "run-dev-graph-decompose",
        "original_goal": GOAL,
        "created_at": "2026-08-08T16:00:00Z",
    },
)
dump(
    eval_root / "run-dev-graph-decompose-progress.json",
    {
        "skill": "run-dev-graph-decompose",
        "scenario": "C14-OUT1-positive-macro-decomposition-r15",
        "checklist": [
            {"id": "macro-dag", "status": "pending", "evidence": None},
            {"id": "publication-gates", "status": "pending", "evidence": None},
            {"id": "binding-routes", "status": "pending", "evidence": None},
            {"id": "write-differences", "status": "pending", "evidence": None},
            {"id": "negative-controls", "status": "pending", "evidence": None},
        ],
        "overall_status": "pending",
        "completed_at": None,
    },
)
goal_hash = hashlib.sha256(GOAL.encode("utf-8")).hexdigest()
first_row = {
    "original_goal": GOAL,
    "original_goal_hash": goal_hash,
    "current_goal_snapshot": "macro decompose の初回実行前。両 graph は 0 node。",
    "delta_from_original": "なし (初回)",
    "merged_directive_for_next": "2 fixture へ同一 want の macro DAG を生成して検証する",
    "drift_signal": "none",
}
intermediate = eval_root / "run-dev-graph-decompose-intermediate.jsonl"
intermediate.write_text(
    json.dumps(first_row, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n",
    encoding="utf-8",
)
print(
    json.dumps(
        {
            "prestate": str(RUN / "pre-state.json"),
            "external_snapshot_command": external_command,
            "external_before": str(RUN / "external-before.json"),
            "goal_hash": goal_hash,
            "rows": 1,
        }
    )
)
