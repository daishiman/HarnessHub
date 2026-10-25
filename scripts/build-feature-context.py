#!/usr/bin/env python3
"""Build features/<id>.context.json from the dev-graph node that owns it.

`features/<id>.md` の frontmatter と `.dev-graph/state/graph.json` は upsert-node.py が
まとめて書くが、sidecar の `features/<id>.context.json` を書く writer は存在しない。
そのため upsert のたびに 3 者 parity が静かに崩れ、CI (tests/test_card_feature_contracts.py)
でしか気付けない。ここが「graph を正本に context.json を揃える」唯一の writer になる。

正本を graph.json 側に置くのは、guard-graph-schema.py が `.dev-graph/state/` への直接書込を
遮断していて writer が upsert-node.py だけに絞られており、値の出所が一意だから。

重要な安全装置: context.json は `/dev-graph plan --feature-context` の入力で、その sha256 が
goal-spec.json / feature-package.json / system-build-handoff.json / locks の digest に束縛される。
束縛済み feature を書き換えると plan 一式の digest が一斉に stale になるため、既定では拒否する。
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


# context.json を digest として束縛しうる成果物の置き場。ここを走査して参照が
# 1 件でも見つかったら「plan 済み」とみなし、--write を fail-closed で止める。
DIGEST_BINDING_ROOTS = ("eval-log", ".dev-graph")

# architecture_refs だけは文字列一致で比較できない。context.json はファイルパス
# (architecture/harness-hub-frontend.md) と node id (arch-harness-hub-frontend) の
# どちらの語彙でも書かれており、さらに register-package.py 由来の context は
# specs/harness-hub-system-specification.md のような architecture 以外の参照も足す。
# graph の architecture_refs は artifact_kind=architecture のノードだけを持つ設計なので、
# 素朴に突合すると 30 件中 20 件が「drift」に見え、本物の 1 件がその中に埋もれる。
# そこで両辺を node id へ正規化し、architecture 種別だけを突合対象にする。
ARCHITECTURE_REF_FIELD = "architecture_refs"
ARCHITECTURE_KIND = "architecture"

REPAIR_HINT = (
    "python3 scripts/build-feature-context.py --write "
    "--feature <feature-id> [--feature <feature-id> ...]"
)


class SyncError(Exception):
    pass


def _load_graph_nodes(repo_root: Path) -> dict[str, dict]:
    path = repo_root / ".dev-graph/state/graph.json"
    if not path.is_file():
        raise SyncError(f"graph state not found: {path}")
    graph = json.loads(path.read_text(encoding="utf-8"))
    return {node["graph_node_id"]: node for node in graph["nodes"] if "graph_node_id" in node}


def _context_path(repo_root: Path, feature_id: str) -> Path:
    return repo_root / "features" / f"{feature_id}.context.json"


def _path_index(nodes: dict[str, dict]) -> dict[str, str]:
    """file_path -> node id。node の file_path が参照解決の正本。

    classification_candidates も候補パスを持つが 1 node が複数候補を挙げることがあり
    (design-system は architecture/ と docs/ の 2 つ)、一意に決まらない。
    """
    index: dict[str, str] = {}
    for node_id, node in nodes.items():
        file_path = node.get("file_path")
        if isinstance(file_path, str) and file_path:
            index.setdefault(file_path, node_id)
    return index


def split_architecture_refs(
    refs: list, nodes: dict[str, dict], path_index: dict[str, str]
) -> tuple[set[str], list, list]:
    """参照を (architecture ノード id, 補助参照, 解決できない architecture 参照) に分ける。

    補助参照 = spec / docs など architecture 種別でないノード。graph の architecture_refs は
    これらを持たない設計なので、context 側にあっても drift ではない。

    3 つ目が要る理由: architecture/ 配下を指しているのにどのノードにも解決できない参照は、
    綴り間違いや移動済みファイルである。これを補助参照へ混ぜると、typo が黙って
    ゲートを素通りする (存在しない設計文書を参照したまま緑になる)。
    """
    architecture: set[str] = set()
    supplementary: list = []
    unresolved: list = []
    for ref in refs:
        node_id = ref if ref in nodes else path_index.get(ref)
        node = nodes.get(node_id) if node_id else None
        if node is not None and node.get("artifact_kind") == ARCHITECTURE_KIND:
            architecture.add(node_id)
        elif node is None and str(ref).startswith(f"{ARCHITECTURE_KIND}/"):
            unresolved.append(ref)
        else:
            supplementary.append(ref)
    return architecture, supplementary, unresolved


def digest_bindings(repo_root: Path, feature_id: str) -> list[str]:
    """この context.json を digest 束縛している成果物の repo 相対パスを返す。"""
    needle = f"features/{feature_id}.context.json"
    hits: list[str] = []
    for root in DIGEST_BINDING_ROOTS:
        base = repo_root / root
        if not base.is_dir():
            continue
        for path in base.rglob("*.json"):
            try:
                if needle in path.read_text(encoding="utf-8", errors="replace"):
                    hits.append(str(path.relative_to(repo_root)))
            except OSError:
                continue
    return sorted(hits)


def plan_feature(repo_root: Path, feature_id: str, nodes: dict[str, dict]) -> dict:
    """1 feature ぶんの差分を算出する。ファイルは書かない。"""
    path = _context_path(repo_root, feature_id)
    if not path.is_file():
        raise SyncError(f"context sidecar not found: features/{feature_id}.context.json")
    context = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(context, dict):
        raise SyncError(f"context sidecar must be an object: {path}")

    node = nodes.get(feature_id)
    if node is None:
        raise SyncError(f"graph node not found for feature: {feature_id}")

    # キー集合は context 側の既存キーを正本にする。context.json のキー数は feature ごとに
    # 9/10/11 と揃っておらず、こちらから固定集合を押し付けると既存 sidecar を壊す。
    path_index = _path_index(nodes)
    drifted: dict[str, dict] = {}
    unmapped: list[str] = []
    supplementary: list = []
    unresolved: list = []
    for key, current in context.items():
        if key not in node:
            # graph に対応フィールドが無いキー (implementation_status 等) は sidecar 固有の
            # 情報なので触らない。黙って捨てると sidecar だけが持つ意味が消える。
            unmapped.append(key)
            continue
        if key == ARCHITECTURE_REF_FIELD:
            context_refs, supplementary, unresolved = split_architecture_refs(
                current if isinstance(current, list) else [], nodes, path_index
            )
            graph_refs, _, graph_unresolved = split_architecture_refs(
                node[key] if isinstance(node[key], list) else [], nodes, path_index
            )
            unresolved += graph_unresolved
            if context_refs != graph_refs:
                drifted[key] = {"context": sorted(context_refs), "graph": sorted(graph_refs)}
            continue
        if node[key] != current:
            drifted[key] = {"context": current, "graph": node[key]}

    blocking = sorted(drifted)
    return {
        "feature_id": feature_id,
        "path": f"features/{feature_id}.context.json",
        "drifted_fields": blocking,
        "drift": drifted,
        "unmapped_fields": sorted(unmapped),
        "supplementary_refs": sorted(map(str, supplementary)),
        "unresolved_refs": sorted(map(str, set(unresolved))),
        # 解決できない architecture 参照は --write では直せない (どのノードを指すか不明) ため
        # in_sync とは別に持ち、check だけを落とす。
        "in_sync": not blocking,
    }


def _rewrite_architecture_refs(current: list, node_refs: list, nodes, path_index) -> list:
    """architecture 参照だけを graph に合わせ、補助参照と既存の語彙形は保つ。

    graph の値 (node id) をそのまま代入すると、context にしか無い specs/... や docs/... の
    参照が消える。既存 context がパス表記なら追加分もパスで書き、id 表記なら id で書く。
    """
    _, supplementary, unresolved = split_architecture_refs(current, nodes, path_index)
    graph_ids, _, _ = split_architecture_refs(node_refs, nodes, path_index)
    id_to_path = {node_id: path for path, node_id in path_index.items()}
    # 解決できない参照は勝手に消さない。人が直す対象なので残して check で鳴らし続ける。
    supplementary = supplementary + unresolved
    kept = [ref for ref in current if ref not in supplementary]
    uses_paths = any(str(ref).endswith(".md") for ref in kept) or not kept
    rendered = sorted(
        id_to_path.get(node_id, node_id) if uses_paths else node_id for node_id in graph_ids
    )
    return rendered + supplementary


def apply_plan(repo_root: Path, plan: dict, nodes: dict[str, dict]) -> None:
    path = _context_path(repo_root, plan["feature_id"])
    context = json.loads(path.read_text(encoding="utf-8"))
    node = nodes[plan["feature_id"]]
    path_index = _path_index(nodes)
    for key in plan["drifted_fields"]:
        if key == ARCHITECTURE_REF_FIELD:
            context[key] = _rewrite_architecture_refs(
                context.get(key) or [], node.get(key) or [], nodes, path_index
            )
            continue
        context[key] = node[key]
    path.write_text(
        json.dumps(context, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", default=".", type=Path)
    parser.add_argument(
        "--feature",
        action="append",
        default=[],
        metavar="FEATURE_ID",
        help="対象 feature id。複数指定可。--all との併用は不可",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="features/*.context.json を全件対象にする (--check 向け)",
    )
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true", help="差分があれば exit 1 (書かない)")
    mode.add_argument("--write", action="store_true", help="graph の値で context.json を上書き")
    parser.add_argument(
        "--skip-frozen",
        action="store_true",
        help="plan digest に束縛済み (=凍結) の feature を検査対象から外す。件数は必ず表示する",
    )
    parser.add_argument(
        "--allow-digest-bound",
        action="store_true",
        help="plan digest に束縛済みの feature でも書き換える (plan 一式の再生成が必要)",
    )
    parser.add_argument("--json", action="store_true", help="結果を JSON で出す")
    args = parser.parse_args(argv)

    repo_root = args.repo_root.resolve()

    if args.all and args.feature:
        parser.error("--all と --feature は併用できない")
    if not args.all and not args.feature:
        parser.error("--feature か --all のどちらかが必要")

    try:
        nodes = _load_graph_nodes(repo_root)
        if args.all:
            feature_ids = sorted(
                path.name[: -len(".context.json")]
                for path in (repo_root / "features").glob("*.context.json")
            )
        else:
            feature_ids = list(dict.fromkeys(args.feature))
        plans = [plan_feature(repo_root, feature_id, nodes) for feature_id in feature_ids]
    except SyncError as error:
        print(f"error: {error}", file=sys.stderr)
        return 2

    frozen: list[str] = []
    if args.skip_frozen:
        kept = []
        for plan in plans:
            if digest_bindings(repo_root, plan["feature_id"]):
                frozen.append(plan["feature_id"])
            else:
                kept.append(plan)
        plans = kept

    drifted = [plan for plan in plans if not plan["in_sync"]]
    # 解決できない architecture 参照は --write で直せない (どのノードを指すか決められない)。
    # drifted と混ぜると write が「直したつもり」で終わるので、check 専用の別枠にする。
    unresolved = [plan for plan in plans if plan["unresolved_refs"]]

    if args.write:
        # 書く前に digest 束縛を確認する。ここを通してしまうと goal-spec / handoff / lock の
        # source_feature_digest が一斉に stale になり、原因が context.json だと分からなくなる。
        blocked = {}
        if not args.allow_digest_bound:
            for plan in drifted:
                bindings = digest_bindings(repo_root, plan["feature_id"])
                if bindings:
                    blocked[plan["feature_id"]] = bindings
        if blocked:
            for feature_id, bindings in sorted(blocked.items()):
                print(
                    f"error: {feature_id} は plan digest に束縛済み "
                    f"({len(bindings)} 件、例: {bindings[0]})。"
                    "書き換えると plan 一式の digest が stale になる。"
                    "plan を作り直す前提なら --allow-digest-bound を付ける",
                    file=sys.stderr,
                )
            return 3
        for plan in drifted:
            apply_plan(repo_root, plan, nodes)

    report = {
        "mode": "write" if args.write else "check",
        "checked": len(plans),
        "frozen_skipped": frozen,
        "drifted": [plan["feature_id"] for plan in drifted],
        "features": plans,
    }
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True))
    elif args.write:
        for plan in drifted:
            print(f"synced {plan['path']}: {', '.join(plan['drifted_fields'])}")
        if not drifted:
            print(f"already in sync ({len(plans)} feature)")
    else:
        # 検査した件数と外した件数を必ず出す。0 件検査で緑になるのが一番危ない失敗の仕方。
        print(f"checked {len(plans)} feature (frozen skipped: {len(frozen)})")
        for plan in drifted:
            for field in plan["drifted_fields"]:
                delta = plan["drift"][field]
                print(
                    f"{plan['path']}: {field} drifted\n"
                    f"  context: {json.dumps(delta['context'], ensure_ascii=False)}\n"
                    f"  graph  : {json.dumps(delta['graph'], ensure_ascii=False)}"
                )
        for plan in unresolved:
            print(
                f"{plan['path']}: architecture_refs にどのノードにも解決できない参照がある: "
                f"{json.dumps(plan['unresolved_refs'], ensure_ascii=False)}\n"
                "  綴りか移動先を確認すること (--write では直せない)"
            )
        if drifted:
            print(f"\nrepair: {REPAIR_HINT}", file=sys.stderr)

    if args.check and (drifted or unresolved):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
