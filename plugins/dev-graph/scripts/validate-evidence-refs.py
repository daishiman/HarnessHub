#!/usr/bin/env python3
# /// script
# name: validate-evidence-refs
# purpose: graph 全 node の confirmation_evidence.evidence_ref 実在を走査する決定論ゲート (R3-import の完了条件)。
# inputs: [argv --repo-root --graph --registered]
# outputs: [stdout JSON {registered_dangling, existing_dangling}, exit 0 ok, exit 2 fail-closed]
# contexts: [E]
# network: false
# write-scope: none
# requires-python: ">=3.11"
# ///
"""evidence_ref の dangling を機械検査する。

- `--registered` (本 run が登録・更新した node id 群) に dangling があれば exit 2 (fail-closed)。
- それ以外の既存 node の dangling は `existing_dangling` として JSON 出力する (exit 0)。
  呼出し元 (R3-import) は existing_dangling を import report / progress.json へ
  blocker として転記する義務を負う (握り潰し禁止)。散文契約でなく本 script の
  実行と exit code を完了条件にすることで「読んだが実行しない」抜け道を塞ぐ。
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", required=True, type=Path)
    parser.add_argument("--graph", type=Path, default=None)
    parser.add_argument("--registered", default="", help="本 run が登録・更新した node id (カンマ区切り)")
    args = parser.parse_args()
    root = args.repo_root.resolve()
    graph_path = args.graph if args.graph else root / ".dev-graph" / "state" / "graph.json"

    try:
        graph = json.loads(graph_path.read_text(encoding="utf-8"))
        nodes = graph["nodes"]
    except Exception as exc:
        print(f"[validate-evidence-refs] FAIL: graph を読めない: {exc}", file=sys.stderr)
        return 2

    registered = {s.strip() for s in args.registered.split(",") if s.strip()}
    registered_dangling: list[dict] = []
    existing_dangling: list[dict] = []
    scanned = 0
    for node in nodes:
        if not isinstance(node, dict):
            continue
        ce = node.get("confirmation_evidence")
        ref = ce.get("evidence_ref") if isinstance(ce, dict) else None
        if not ref:
            continue
        scanned += 1
        node_id = str(node.get("graph_node_id", "?"))
        if (root / str(ref)).is_file():
            continue
        entry = {"graph_node_id": node_id, "evidence_ref": str(ref)}
        (registered_dangling if node_id in registered else existing_dangling).append(entry)

    print(json.dumps(
        {
            "scanned_nodes_with_evidence": scanned,
            "registered_dangling": registered_dangling,
            "existing_dangling": existing_dangling,
        },
        ensure_ascii=False, indent=2,
    ))
    if registered_dangling:
        print(
            f"[validate-evidence-refs] FAIL: 本 run 登録分に dangling {len(registered_dangling)} 件",
            file=sys.stderr,
        )
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
