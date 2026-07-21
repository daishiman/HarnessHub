#!/usr/bin/env python3
# /// script
# name: build-parity-manifest
# purpose: graph から C28 parity manifest (generated_at / source_graph_digest / nodes[]) を決定論的に再生成する正本手順。
# inputs: ["argv: --repo-root DIR --graph FILE? --out FILE --generated-at RFC3339? --check"]
# outputs: ["file: --out の parity manifest", "stdout: JSON receipt", "exit 0 ok / exit 1 fail-closed"]
# requires-python = ">=3.10"
# dependencies: []
# contexts: [A, B, C, E]
# network: false
# write-scope: --out only (repository 内・--check 時は書かない)
# ///
"""parity manifest の生成器 (正本)。

execution-tracker-contract §10 は manifest に由来 (`generated_at` / `source_graph_digest`)
を要求し、C16 schedule-graph は現 graph の canonical digest と突合して stale snapshot を
停止させる。その停止からの回復手順は **manifest の再生成** であり、`source_graph_digest`
だけを現在値へ書き換える回避は stale 検出を恒久的に無効化するため禁止されている。
本 script がその再生成手順の正本。

決定論の要件:

- `nodes[]` は `graph_node_id` の昇順。graph の nodes 配列順に依存させない。並び替えの
  正本をここに置かないと、graph を書き戻すたびに意味の変わらない diff が出る。
- `depends_on` は graph の値を **そのまま** 写す (並べ替えない)。C16 は
  `graph_depends_on == node.depends_on` をリスト等価で突合するため、ここで sort すると
  順序差だけで parity が unconfirmed へ落ち、node が silent に ready から消える。
- `generated_at` だけが実行時刻に依存する。再現検証は `--generated-at` で固定する。

`--check` は書き込まずに「既存 --out が現 graph から再生成した内容と一致するか」だけを
判定する (generated_at は比較対象外)。stale を検出するのは C16 の役目なので、ここでは
内容の同一性だけを見る。
"""
from __future__ import annotations

import argparse
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from _common import ContractError, atomic_json, canonical_digest, contained, dump, load_json

RFC3339_UTC = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$")

# C28 bd-bridge が manifest の graph_status を bd status へ写像できる語彙 (_ready_with_parity
# の status_map と同一)。ここに無い status (現 graph では draft) を持つ node も manifest には
# 載せる — 生成器が graph の事実を間引くと、投影済みの node が snapshot から消えて
# `parity_manifest_missing` (= 取りこぼし) に化けるためである。代わりに receipt へ列挙し、
# 「C28 で conflicts になる node が何件あるか」を実行前に見せる。
MAPPABLE_GRAPH_STATUS = ("active", "blocked", "done", "closed", "tombstoned")


def _now() -> str:
    """§10 の表記どおり秒精度で刻む。_common.utc_now は microsecond を含むため使わない。"""
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _graph_nodes(graph: Any) -> list[dict[str, Any]]:
    nodes = graph.get("nodes", []) if isinstance(graph, dict) else graph
    if not isinstance(nodes, list) or not all(isinstance(node, dict) for node in nodes):
        raise ContractError("graph nodes must be an array of objects")
    return nodes


def _row(node: dict[str, Any]) -> dict[str, Any] | None:
    """1 つの graph node を manifest 行へ写す。載せないなら None を返す。

    manifest は「graph 管理下で Beads に投影済みの node」の snapshot である。判定に使える
    node 側の事実は次の 2 つ:

    - `tracker_binding`: "beads" | "github" | "none"。beads 以外は C28 の突合対象外。
    - `beads_linkage`: {"bd_issue_id": str, "sync_state": str, ...} または None。

    載せる行の形は `{"graph_node_id", "bd_issue_id", "graph_status", "depends_on"}`。
    `graph_status` は node の `status`、`depends_on` は node の `depends_on` (既定 []) を
    そのまま写す。

    binding が beads 以外の node は C28 の突合対象外なので静かに除外する。一方 binding が
    beads なのに linkage が無い node は「投影すべきなのに欠けている」graph 側の欠陥であり、
    黙って落とすと C28 では `parity_manifest_missing` (= 取りこぼし) に化けて原因が遠くなる。
    §10 の「素性のない snapshot を流通させない」に従い、生成側で停止する。
    """
    if node.get("tracker_binding") != "beads":
        return None
    graph_node_id = node.get("graph_node_id")
    bd_issue_id = (node.get("beads_linkage") or {}).get("bd_issue_id")
    if not isinstance(graph_node_id, str) or not graph_node_id:
        raise ContractError("graph node requires a non-empty graph_node_id")
    if not isinstance(bd_issue_id, str) or not bd_issue_id:
        raise ContractError(f"{graph_node_id}: tracker_binding=beads requires beads_linkage.bd_issue_id")
    depends_on = node.get("depends_on", [])
    if not isinstance(depends_on, list) or not all(isinstance(value, str) and value for value in depends_on):
        raise ContractError(f"{graph_node_id}: depends_on must be a string[]")
    return {
        "graph_node_id": graph_node_id,
        "bd_issue_id": bd_issue_id,
        "graph_status": node.get("status"),
        "depends_on": depends_on,
    }


def _rows(nodes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = [row for row in (_row(node) for node in nodes) if row is not None]
    identifiers = [row["graph_node_id"] for row in rows]
    issues = [row["bd_issue_id"] for row in rows]
    if len(set(identifiers)) != len(identifiers) or len(set(issues)) != len(issues):
        raise ContractError("graph yields duplicate graph_node_id or bd_issue_id for parity manifest")
    known = set(identifiers)
    for row in rows:
        # manifest 外の node を指す依存は C28 で「parity manifest dependency lacks a Beads
        # linkage」として conflicts に落ちる。生成側で止めておかないと、原因の遠い受け側で
        # 初めて露見する。
        missing = [dependency for dependency in row["depends_on"] if dependency not in known]
        if missing:
            raise ContractError(
                f"{row['graph_node_id']}: depends_on leaves the Beads-linked node set: {missing}"
            )
    return sorted(rows, key=lambda row: row["graph_node_id"])


def build_manifest(graph: Any, generated_at: str) -> dict[str, Any]:
    if RFC3339_UTC.fullmatch(generated_at) is None:
        raise ContractError("--generated-at must be RFC3339 UTC (YYYY-MM-DDThh:mm:ssZ)")
    return {
        "generated_at": generated_at,
        "source_graph_digest": canonical_digest(graph),
        "nodes": _rows(_graph_nodes(graph)),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Rebuild a C28 parity manifest from the graph")
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--graph", help="default: <repo-root>/.dev-graph/state/graph.json")
    parser.add_argument("--out", required=True, help="parity manifest path (repository 内)")
    parser.add_argument("--generated-at", help="RFC3339 UTC。省略時は現在時刻")
    parser.add_argument("--check", action="store_true", help="書き込まず既存 --out との一致だけ判定する")
    args = parser.parse_args(argv)

    root = Path(args.repo_root).resolve(strict=True)
    graph_path = contained(Path(args.graph) if args.graph else root / ".dev-graph" / "state" / "graph.json", root)
    out_path = contained(Path(args.out) if Path(args.out).is_absolute() else root / args.out, root, must_exist=args.check)
    graph = load_json(graph_path)
    manifest = build_manifest(graph, args.generated_at or _now())

    drift: list[str] = []
    if args.check:
        current = load_json(out_path)
        for key in ("source_graph_digest", "nodes"):
            if current.get(key) != manifest[key]:
                drift.append(key)
        if RFC3339_UTC.fullmatch(str(current.get("generated_at"))) is None:
            drift.append("generated_at")
    else:
        atomic_json(out_path, manifest)

    dump({
        "out": str(out_path.relative_to(root)),
        "graph": str(graph_path.relative_to(root)),
        "mode": "check" if args.check else "write",
        "generated_at": manifest["generated_at"],
        "source_graph_digest": manifest["source_graph_digest"],
        "node_count": len(manifest["nodes"]),
        "unmappable_status": sorted(
            {row["graph_node_id"]: row["graph_status"] for row in manifest["nodes"]
             if row["graph_status"] not in MAPPABLE_GRAPH_STATUS}.items()
        ),
        "drift": sorted(drift),
    })
    return 1 if drift else 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ContractError, OSError) as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)
