#!/usr/bin/env python3
# /// script
# name: validate-source-digest
# purpose: 本 run 登録 node の source_lineage.source_digest が自 source_path の実 file sha256 と一致するか検査する決定論ゲート (R3-import の完了条件)。
# inputs: [argv --repo-root --graph --registered --progress]
# outputs: [stdout JSON {registered_mismatch}, exit 0 ok, exit 2 fail-closed]
# contexts: [E]
# network: false
# write-scope: none
# requires-python: ">=3.11"
# ///
"""source_digest の他 file 流用を機械検査する R3-import の完了ゲート。

r8 で「index.md の digest を全 node に流用」する failure mode を検出したため、
散文 checklist ではなく本 script の exit code へ完了条件を係留する。
各 registered node の `source_lineage.source_digest` が、その node 固有の
`source_path` の実 file の sha256 と一致することを検証する。1 件でも不一致
(または source_path 不在) なら exit 2 (fail-closed)。

registered は `--registered` (カンマ区切り) と `--progress` の
`registered_this_run` の和集合。既存 node の digest は本 run の責務外のため検査しない。
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path


def _registered_from_progress(progress_path: Path) -> set[str]:
    try:
        data = json.loads(progress_path.read_text(encoding="utf-8"))
    except Exception:
        return set()
    ids = data.get("registered_this_run")
    return {str(x).strip() for x in ids if str(x).strip()} if isinstance(ids, list) else set()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", required=True, type=Path)
    parser.add_argument("--graph", type=Path, default=None)
    parser.add_argument("--registered", default="")
    parser.add_argument("--progress", type=Path, default=None)
    args = parser.parse_args()
    root = args.repo_root.resolve()
    graph_path = args.graph if args.graph else root / ".dev-graph" / "state" / "graph.json"

    try:
        graph = json.loads(graph_path.read_text(encoding="utf-8"))
        nodes = graph["nodes"]
    except Exception as exc:
        print(f"[validate-source-digest] FAIL: graph を読めない: {exc}", file=sys.stderr)
        return 2

    registered = {s.strip() for s in args.registered.split(",") if s.strip()}
    if args.progress:
        registered |= _registered_from_progress(args.progress)

    mismatch: list[dict] = []
    checked = 0
    for node in nodes:
        if not isinstance(node, dict):
            continue
        node_id = str(node.get("graph_node_id", "?"))
        if node_id not in registered:
            continue
        sl = node.get("source_lineage")
        if not isinstance(sl, dict):
            continue
        source_path = sl.get("source_path")
        recorded = sl.get("source_digest")
        if not source_path or not recorded:
            mismatch.append({"graph_node_id": node_id, "reason": "source_path/source_digest 欠落"})
            continue
        checked += 1
        target = root / str(source_path)
        if not target.is_file():
            mismatch.append({"graph_node_id": node_id, "source_path": str(source_path),
                             "reason": "source_path 実 file 不在"})
            continue
        actual = hashlib.sha256(target.read_bytes()).hexdigest()
        if actual != str(recorded):
            mismatch.append({"graph_node_id": node_id, "source_path": str(source_path),
                             "recorded_digest": str(recorded), "actual_digest": actual,
                             "reason": "digest 不一致 (他 file 流用の疑い)"})

    print(json.dumps({"checked": checked, "registered_mismatch": mismatch},
                     ensure_ascii=False, indent=2))
    if mismatch:
        print(f"[validate-source-digest] FAIL: 本 run 登録分に digest 不一致 {len(mismatch)} 件",
              file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
