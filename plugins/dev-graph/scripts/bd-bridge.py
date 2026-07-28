#!/usr/bin/env python3
# /// script
# name: bd-bridge
# purpose: Be the single deterministic CLI choke point for allowed Beads task, edge, mirror and gate operations.
# inputs: ["argv: --op OP and operation fields"]
# outputs: ["stdout: normalized JSON receipt"]
# requires-python = ">=3.10"
# dependencies: []
# contexts: [A, B, C, E]
# network: true
# write-scope: approved bd CLI only; never direct .beads I/O
# ///
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

from _common import ContractError, contained, dump, git, load_json, run

MUTATIONS = {"create", "update", "dep-add", "dep-remove", "close", "claim", "github-push", "gate-add"}
PHASES = [f"P{i:02d}" for i in range(1, 14)]
SHA256 = re.compile(r"^sha256:[0-9a-f]{64}$")
RFC3339_UTC = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$")
# ready 候補が parity manifest に載らなかった理由の exact-set。
# 「graph 管理外の bd 課題」と「graph 管理下なのに manifest から落ちた課題」は
# 対処 owner が違う (前者は放置可・後者は sync 必要) ため、同じ袋へ入れない。
# `graph_node_missing` は「external_ref が指す node が graph から消えている」= C02 案件で、
# sync を何度回しても解消しない。これを `parity_manifest_missing` に混ぜると、GC 削除の
# 残置が「sync すれば直る取りこぼし」を装って常駐し、本物の取りこぼしを覆い隠す
# (HarnessHub-ii90)。逆方向の全数検査は lint-orphan-external-ref.py が担う。
UNMAPPED_REASONS = ("external_ref_absent", "graph_node_missing", "parity_manifest_missing")
# --op orphan-audit が付ける仕分け札の exact-set。UNMAPPED_REASONS と同じ理由で、
# 対処 owner と次の一手が違うものを同じ袋へ入れない。
# restore_node:     spec 実体が content_roots に在るのに graph 未登録 → C02 upsert-node.py で復元。
# merge_pending:    他 ref の graph に node が実在 → 参照は正しい。対処不要、当該 ref のマージ待ち。
# repoint_or_close: どこにも実体が無い → 実在 node への張り替えか失効かを中身から人が決める。
ORPHAN_DISPOSITIONS = ("restore_node", "merge_pending", "repoint_or_close")
# graph node を物理削除するときに人が選べる処分の exact-set。
# bridge 自身は close/detach を実行しない。実状態が選択どおり収束したことを read-only で
# 確認してから削除を許可し、未解決 issue の silent drop を不可能にする。
REMOVAL_DISPOSITIONS = ("cancel_deletion", "close_issue_first", "detach_external_ref_first")
# spec markdown の frontmatter から graph_node_id を読む式。C02 upsert-node.py が graph node
# へ写す field と同名で、spec 実体と node の対応を決める唯一の手がかり。
FRONTMATTER_NODE_ID = re.compile(r"^graph_node_id:\s*[\"']?([^\"'\r\n]+?)[\"']?\s*$", re.M)
# qa-069 MVP-first: ready_set の表示順を schedule-graph.py の選定順と整合させる rank (SI-3)。
# 正本は graph node の mvp_alignment を直接参照する schedule-graph.py 側で、こちらは
# parity manifest 経由の表示順のみを揃える。schedule-graph.py の同名定数と一致必須
# (_common.py が write scope 外のため二重定義し、test_bd_bridge_mvp_ready_order.py が固定する)。
MVP_FIT_RANK: dict[str | None, int] = {"direct": 0, "enabling": 1, None: 2, "deferred": 3}
# --op update が bd update へ転送してよい field の exact-set。
# bridge が単一チョークポイントである以上、ここに無い field は運用上「存在しない」ため、
# 受理する field は網羅的に宣言し、転送忘れ (silent drop) を構造的に起こせなくする。
UPDATE_FIELDS: tuple[tuple[str, str], ...] = (
    ("status", "--status"),
    ("title", "--title"),
    ("description", "--description"),
    ("notes", "--notes"),
    ("append_notes", "--append-notes"),
    ("design", "--design"),
)
PRIORITY_ALIASES = {
    "critical": "0",
    "high": "1",
    "medium": "2",
    "low": "3",
    "backlog": "4",
}


def bd(args: list[str], *, cwd: Path, check: bool = True) -> Any:
    cp = run([os.environ.get("DEV_GRAPH_BD", "bd"), *args], cwd=cwd, check=check)
    raw = cp.stdout.strip()
    if not raw: return {"ok": cp.returncode == 0}
    try:
        value = json.loads(raw)
        if isinstance(value, dict) and "data" in value and "schema_version" in value:
            return value["data"]
        return value
    except json.JSONDecodeError: return {"text": raw, "returncode": cp.returncode}


def _rows(value: Any) -> list[dict[str, Any]]:
    if isinstance(value, list): return [row for row in value if isinstance(row, dict)]
    if isinstance(value, dict):
        for key in ("issues", "results", "data"):
            rows = value.get(key)
            if isinstance(rows, list): return [row for row in rows if isinstance(row, dict)]
        return [value]
    return []


def _workspace_identity(value: Any) -> dict[str, Any]:
    rows = _rows(value)
    if len(rows) != 1: raise ContractError("bd where must identify exactly one workspace")
    row = rows[0]
    identity_keys = ("database_path", "prefix", "schema_version") if row.get("database_path") else ("path", "prefix", "schema_version", "workspace", "id")
    stable = {key: str(row[key]) for key in identity_keys if row.get(key) is not None}
    if not stable: raise ContractError("bd where did not expose a stable workspace identity")
    fingerprint = hashlib.sha256(json.dumps(stable, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    return {"workspace_id": f"bdw_{fingerprint[:24]}", "attributes": stable}


def preflight(root: Path, expected_workspace_id: str | None = None) -> dict[str, Any]:
    version_raw = run([os.environ.get("DEV_GRAPH_BD", "bd"), "version"], cwd=root).stdout
    match = re.search(r"(\d+)\.(\d+)\.(\d+)", version_raw)
    if not match or not ((1, 1, 0) <= tuple(map(int, match.groups())) < (2, 0, 0)):
        raise ContractError(f"unsupported bd version: {version_raw.strip()}")
    where = bd(["where", "--json"], cwd=root, check=False)
    if isinstance(where, dict) and where.get("returncode", 0) not in (0, None): raise ContractError("bd workspace unavailable")
    identity = _workspace_identity(where)
    if expected_workspace_id and identity["workspace_id"] != expected_workspace_id:
        raise ContractError("linked worktree resolves a different Beads workspace")
    return {"version": match.group(0), "workspace_identity": identity}


def _issue(value: Any, issue_id: str) -> dict[str, Any]:
    rows = [row for row in _rows(value) if str(row.get("id")) == issue_id]
    if len(rows) != 1: raise ContractError(f"bd show did not return exactly one issue: {issue_id}")
    return rows[0]


def _dependency_ids(issue: dict[str, Any]) -> set[str]:
    raw = issue.get("dependencies", [])
    if not isinstance(raw, list): raise ContractError("bd show dependencies must be an array")
    result: set[str] = set()
    for item in raw:
        relation = (item.get("dependency_type") or item.get("type")) if isinstance(item, dict) else None
        if relation not in (None, "blocks"):
            continue
        dep = item.get("id") if isinstance(item, dict) else item
        if not isinstance(dep, str) or not dep: raise ContractError("bd dependency is missing its id")
        result.add(dep)
    return result


def verify_parity(issue: dict[str, Any], expected_status: str | None, expected_dependencies: list[str]) -> dict[str, Any]:
    if not expected_status: raise ContractError("parity verification requires --expected-status")
    expected = set(expected_dependencies)
    actual = _dependency_ids(issue)
    status_match = issue.get("status") == expected_status
    edges_match = actual == expected
    receipt = {
        "confirmed": status_match and edges_match,
        "expected_status": expected_status,
        "actual_status": issue.get("status"),
        "expected_depends_on": sorted(expected),
        "actual_depends_on": sorted(actual),
        "missing_edges": sorted(expected - actual),
        "unexpected_edges": sorted(actual - expected),
    }
    if not receipt["confirmed"]: raise ContractError(f"Beads parity conflict: {json.dumps(receipt, sort_keys=True)}")
    return receipt


def _load_manifest(path: str | None, root: Path, *, label: str) -> dict[str, Any] | None:
    if not path:
        return None
    candidate = Path(path)
    candidate = candidate if candidate.is_absolute() else root / candidate
    try:
        candidate = candidate.resolve(strict=True)
        candidate.relative_to(root)
        value = json.loads(candidate.read_text(encoding="utf-8"))
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        raise ContractError(f"invalid {label} manifest: {exc}") from exc
    if not isinstance(value, dict):
        raise ContractError(f"{label} manifest must be an object")
    return value


def _canonical_graph_path(root: Path) -> Path:
    """canonical graph の実体 path を `.dev-graph/config.json` から解決する。

    path を引数で受け取らないのは、bridge が「どの graph を正本とみなすか」を呼び出し側の
    裁量にすると、起票時の実在検証 (`_require_registered_nodes`) を空の graph を指させて
    素通しできてしまうため。解決経路は build-parity-manifest.py `_graph_path` と同一で、
    repository config が単一の正本を決める。
    """
    config = load_json(root / ".dev-graph" / "config.json")
    raw = (config.get("local_state") or {}).get("graph") if isinstance(config, dict) else None
    if not isinstance(raw, str) or not raw:
        raise ContractError("bd-bridge requires config local_state.graph to resolve the canonical graph")
    return contained(root / raw, root, must_exist=True)


def _graph_node_ids(root: Path) -> set[str]:
    """canonical graph に実在する graph_node_id の集合を fail-closed で読む。"""
    graph = load_json(_canonical_graph_path(root))
    nodes = graph.get("nodes") if isinstance(graph, dict) else None
    if not isinstance(nodes, list) or not all(isinstance(node, dict) for node in nodes):
        raise ContractError("canonical graph must contain nodes[] objects")
    ids: set[str] = set()
    for node in nodes:
        node_id = node.get("graph_node_id") or node.get("id")
        if not isinstance(node_id, str) or not node_id:
            raise ContractError("canonical graph node is missing graph_node_id")
        ids.add(node_id)
    return ids


def _registration_status(root: Path, graph_node_ids: list[str]) -> dict[str, Any]:
    """起票対象の graph_node_id が canonical graph に実在するかを判定して返す (raise しない)。

    manifest ではなく canonical graph を読むのは、起票前の node は `beads_linkage` を
    まだ持たず parity manifest の `nodes[]` に載らない (build-parity-manifest.py が
    `unlinked` へ落とす) ため。manifest で検証すると常に「未登録」と誤判定する。
    """
    known = _graph_node_ids(root)
    unregistered = sorted({node_id for node_id in graph_node_ids if node_id not in known})
    return {
        "graph_node_ids": sorted(set(graph_node_ids)),
        "registered": not unregistered,
        "unregistered": unregistered,
        "graph_node_count": len(known),
    }


def _require_registered_nodes(root: Path, graph_node_ids: list[str]) -> dict[str, Any]:
    """書込経路の gate。未登録が 1 件でもあれば bd へ 1 度も書く前に落とす。

    塞いでいる失敗形: `--graph-node-id` は必須だが実在検証が無かったため、任意の文字列で
    `external_ref: dev-graph:<id>` を持つ bd issue を作れた。node 登録 (C02) を伴わずに
    起票すると参照先の無い dangling reference が常駐し、C28 ready の
    `parity_manifest_missing` (本来は manifest 生成側の異常を指す札) に混ざって、
    本物の取りこぼしと区別できなくなる。

    raise するのは書込経路だけ。dry-run が同じ判定で **落ちる** と、C14 decompose の
    ような「C02 登録 → C28 起票」を 1 本のパイプラインで行う skill の全体 dry-run が
    通らなくなる (登録はまだ走っていないので未登録なのが正常)。preview 側は
    `_registration_status` を使い、判定結果を payload に載せて exit 0 で返す。
    """
    status = _registration_status(root, graph_node_ids)
    if status["unregistered"]:
        raise ContractError(
            "create requires every graph_node_id to exist in the canonical graph; "
            f"unregistered: {', '.join(status['unregistered'])}; register the node with C02 upsert-node.py first"
        )
    return status


def _external_ref(row: dict[str, Any]) -> str | None:
    direct = row.get("external_ref") or row.get("externalRef")
    if isinstance(direct, str) and direct:
        return direct.removeprefix("dev-graph:").removeprefix("external_ref:")
    match = re.search(r"(?:^|\s)external_ref:([^\s]+)", str(row.get("description", "")))
    return match.group(1) if match else None


def _find_external(root: Path, graph_node_id: str) -> dict[str, Any] | None:
    # bd 1.1.0 の search は --external-contains を解さずヘルプ文を返すため、
    # 素の text query (external_ref にもマッチ) → list --status all の順で引き完全一致で絞る。
    rows = _rows(bd(["search", graph_node_id, "--status", "all", "--json"], cwd=root, check=False))
    exact = [row for row in rows if _external_ref(row) == graph_node_id]
    if not exact:
        rows = _rows(bd(["list", "--status", "all", "--limit", "10000", "--json"], cwd=root, check=False))
        exact = [row for row in rows if _external_ref(row) == graph_node_id]
    if len(exact) > 1:
        raise ContractError(f"duplicate beads external_ref for {graph_node_id}")
    return exact[0] if exact else None


def _create_one(
    root: Path,
    *,
    graph_node_id: str,
    title: str,
    description: str,
    issue_type: str,
    priority: str | None = None,
    parent: str | None = None,
    source_digest: str | None = None,
) -> dict[str, Any]:
    if source_digest is not None and SHA256.fullmatch(source_digest) is None:
        raise ContractError("projection source_digest must be sha256:<64 lowercase hex>")
    projected_description = description
    if source_digest is not None:
        projected_description = f"{description.rstrip()}\n\ndev_graph_source_digest: {source_digest}"
    existing = _find_external(root, graph_node_id)
    if existing:
        # search/list の row は parent と issue_type を持たないため show で詳細を取り直す。
        existing_id = str(existing.get("id"))
        detail = _issue(bd(["show", existing_id, "--json"], cwd=root), existing_id)
        actual_type = detail.get("issue_type") or detail.get("type")
        if actual_type and actual_type != issue_type:
            raise ContractError(f"existing {graph_node_id} has type {actual_type}, expected {issue_type}")
        actual_parent = detail.get("parent") or detail.get("parent_id")
        if parent and str(actual_parent) != parent:
            raise ContractError(f"existing {graph_node_id} belongs to a different epic")
        metadata = detail.get("metadata") if isinstance(detail.get("metadata"), dict) else {}
        current_digest = metadata.get("dev_graph_source_digest")
        if not current_digest:
            match = re.search(r"dev_graph_source_digest:\s*(sha256:[0-9a-f]{64})", str(detail.get("description", "")))
            current_digest = match.group(1) if match else None
        if source_digest is not None and current_digest != source_digest:
            argv = [
                "update", existing_id, "--title", title,
                "--description", projected_description,
                "--set-metadata", f"dev_graph_source_digest={source_digest}",
            ]
            if parent:
                argv += ["--parent", parent]
            if str(detail.get("status")) == "closed":
                argv += ["--status", "open"]
            argv += ["--json"]
            updated = bd(argv, cwd=root)
            return {
                "id": existing_id, "external_ref": graph_node_id,
                "superseded": True, "source_digest": source_digest, "updated": updated,
            }
        return {"id": existing_id, "external_ref": graph_node_id, "idempotent": True}
    argv = [
        "create", "--title", title, "--description", projected_description,
        "--external-ref", f"dev-graph:{graph_node_id}", "--type", issue_type,
    ]
    if priority is not None:
        argv += ["--priority", _normalize_priority(priority)]
    if parent:
        argv += ["--parent", parent]
    if source_digest is not None:
        argv += ["--metadata", json.dumps({"dev_graph_source_digest": source_digest}, sort_keys=True)]
    argv += ["--json"]
    created = bd(argv, cwd=root)
    rows = _rows(created)
    issue_id = (created.get("id") if isinstance(created, dict) else None) or (rows[0].get("id") if rows else None)
    if not issue_id:
        raise ContractError(f"bd create did not return an id for {graph_node_id}")
    return {"id": issue_id, "external_ref": graph_node_id, "created": created}


def _validate_projection(manifest: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]], str]:
    feature = manifest.get("feature")
    children = manifest.get("children")
    if not isinstance(feature, dict) or not isinstance(children, list) or not all(isinstance(row, dict) for row in children):
        raise ContractError("projection manifest requires feature object and children array")
    source_digest = manifest.get("source_digest")
    if not isinstance(source_digest, str) or SHA256.fullmatch(source_digest) is None:
        raise ContractError("projection manifest requires source_digest=sha256:<64 lowercase hex>")
    feature_id = feature.get("graph_node_id")
    if not isinstance(feature_id, str) or not feature_id:
        raise ContractError("projection feature requires graph_node_id")
    phases = [row.get("phase_ref") for row in children]
    child_ids = [row.get("graph_node_id") for row in children]
    if len(children) != 13 or phases != PHASES or len(set(child_ids)) != 13 or any(not isinstance(value, str) or not value for value in child_ids):
        raise ContractError("projection children must be the ordered P01..P13 exact-set with unique graph_node_id")
    if any(row.get("parent_feature") != feature_id for row in children):
        raise ContractError("projection children must share the feature parent")
    id_set = set(child_ids)
    for row in children:
        dependencies = row.get("depends_on", [])
        if not isinstance(dependencies, list) or any(dep not in id_set for dep in dependencies):
            raise ContractError("projection child dependency escapes the exact-13 package")
    return feature, children, source_digest


def _package_projection(root: Path, manifest: dict[str, Any]) -> dict[str, Any]:
    feature, children, source_digest = _validate_projection(manifest)
    feature_id = feature["graph_node_id"]
    # 14 件を 1 件でも書き始める前に全数の実在を確かめる。途中で落とすと epic だけ
    # dangling reference で残り、再実行の冪等経路 (_find_external) がそれを拾って
    # 「登録済み」に見せてしまう。
    registration = _require_registered_nodes(root, [feature_id, *(str(row["graph_node_id"]) for row in children)])

    epic = _create_one(
        root,
        graph_node_id=feature_id,
        title=str(feature.get("title") or feature_id),
        description=str(feature.get("description") or "dev-graph feature projection"),
        issue_type="epic",
        source_digest=source_digest,
    )
    projected: list[dict[str, Any]] = []
    issue_ids: dict[str, str] = {}
    for row in children:
        projected_row = _create_one(
            root,
            graph_node_id=row["graph_node_id"],
            title=str(row.get("title") or f"{row['phase_ref']} {row['graph_node_id']}"),
            description=str(row.get("description") or f"dev-graph {row['phase_ref']} projection"),
            issue_type="task",
            parent=str(epic["id"]),
            source_digest=source_digest,
        )
        projected_row["phase_ref"] = row["phase_ref"]
        projected.append(projected_row)
        issue_ids[row["graph_node_id"]] = str(projected_row["id"])
    edges: list[dict[str, Any]] = []
    for row in children:
        issue_id = issue_ids[row["graph_node_id"]]
        expected_dependencies = {issue_ids[dependency] for dependency in row.get("depends_on", [])}
        current = _issue(bd(["show", issue_id, "--json"], cwd=root), issue_id)
        actual_dependencies = _dependency_ids(current)
        package_issue_ids = set(issue_ids.values())
        for dependency_id in sorted((actual_dependencies & package_issue_ids) - expected_dependencies):
            result = bd(["dep", "remove", issue_id, dependency_id, "--json"], cwd=root)
            edges.append({"issue_id": issue_id, "depends_on": dependency_id, "operation": "removed", "result": result})
        for dependency_id in sorted(expected_dependencies - actual_dependencies):
            result = bd(["dep", "add", issue_id, dependency_id, "--type", "blocks", "--json"], cwd=root)
            edges.append({"issue_id": issue_id, "depends_on": dependency_id, "operation": "added", "result": result})
        for dependency_id in sorted(expected_dependencies & actual_dependencies):
            edges.append({"issue_id": issue_id, "depends_on": dependency_id, "idempotent": True})
    parity: list[dict[str, Any]] = []
    for row in children:
        issue_id = issue_ids[row["graph_node_id"]]
        current = _issue(bd(["show", issue_id, "--json"], cwd=root), issue_id)
        expected_edges = [issue_ids[dependency] for dependency in row.get("depends_on", [])]
        parity.append({
            "graph_node_id": row["graph_node_id"],
            "bd_issue_id": issue_id,
            "edge_parity": verify_parity(current, current.get("status"), expected_edges),
        })
    return {
        "feature_epic": epic,
        "children": projected,
        "edges": edges,
        "parity": parity,
        "phase_refs": PHASES,
        "expected_count": 13,
        "applied_count": len(projected),
        "source_digest": source_digest,
        "registration": registration,
    }


def _manifest_provenance(manifest: dict[str, Any]) -> dict[str, Any]:
    """parity manifest の由来 (生成時刻・source graph digest) を必須検証する。

    manifest は graph の snapshot にすぎない。いつ・どの graph から作ったかを持たないと、
    古い snapshot が「parity confirmed」を主張しても下流 (C16 schedule) が stale を
    機械判定できず、消えた/増えた node を黙って無視した ready-set が出る。
    由来欠落は fail-closed で落とし、素性のない snapshot を流通させない。
    """
    generated_at = manifest.get("generated_at")
    if not isinstance(generated_at, str) or RFC3339_UTC.fullmatch(generated_at) is None:
        raise ContractError("parity manifest requires generated_at as RFC3339 UTC (YYYY-MM-DDThh:mm:ssZ)")
    source_graph_digest = manifest.get("source_graph_digest")
    if not isinstance(source_graph_digest, str) or SHA256.fullmatch(source_graph_digest) is None:
        raise ContractError("parity manifest requires source_graph_digest=sha256:<64 lowercase hex>")
    return {"generated_at": generated_at, "source_graph_digest": source_graph_digest}


def _manifest_graph_node_ids(manifest: dict[str, Any]) -> set[str]:
    """manifest が申告する「graph に実在する node id の全集合」を fail-closed で読む。

    `nodes[]` (beads 束縛済みの投影) だけでは、候補が manifest に載らない理由が
    「graph から node が消えた」のか「graph には居るが投影から漏れた」のか判別できない。
    前者は C02 (node 復元 / bd close)、後者は C03 sync と対処 owner が異なる。

    欠落を許容して従来の 1 つの札へ丸めると、GC 削除の残置が sync 案件を装って常駐し、
    「sync しても消えない警告」が常態化して本物の取りこぼしを覆い隠す。manifest は
    build-parity-manifest.py の単一経路が毎回作り直す揮発 snapshot なので、
    欠落時の正しい回復は再生成であって黙認ではない。
    """
    raw = manifest.get("graph_node_ids")
    if not isinstance(raw, list) or any(not isinstance(value, str) or not value for value in raw):
        raise ContractError(
            "parity manifest requires graph_node_ids as string[]; "
            "regenerate it with build-parity-manifest.py"
        )
    return set(raw)


def _unmapped_reason(external_ref: str | None, graph_node_ids: set[str] | None) -> str:
    """ready 候補が manifest に載らない理由を、対処 owner が分かる粒度で決める。

    `graph_node_ids` が None なのは manifest 自体が渡されていない場合だけで、そのときは
    「投影が存在しない」ことが原因なので従来どおり `parity_manifest_missing` を返す。
    """
    if not external_ref:
        return "external_ref_absent"
    if graph_node_ids is not None and external_ref not in graph_node_ids:
        return "graph_node_missing"
    return "parity_manifest_missing"


def _ready_with_parity(root: Path, raw: Any, manifest: dict[str, Any] | None) -> dict[str, Any]:
    candidates = _rows(raw)
    provenance = _manifest_provenance(manifest) if manifest is not None else None
    graph_node_ids = _manifest_graph_node_ids(manifest) if manifest is not None else None
    entries = manifest.get("nodes", []) if manifest else []
    if not isinstance(entries, list) or not all(isinstance(row, dict) for row in entries):
        raise ContractError("parity manifest nodes must be an array of objects")
    by_issue = {str(row.get("bd_issue_id")): row for row in entries if row.get("bd_issue_id")}
    if len(by_issue) != len([row for row in entries if row.get("bd_issue_id")]):
        raise ContractError("parity manifest contains duplicate bd_issue_id")
    by_graph = {str(row.get("graph_node_id")): str(row.get("bd_issue_id")) for row in entries if row.get("graph_node_id") and row.get("bd_issue_id")}
    if len(by_graph) != len(entries):
        raise ContractError("parity manifest requires unique graph_node_id and bd_issue_id for every node")
    # graph status → Beads 側の期待 status。graph-node.schema.json の status enum を漏れなく覆う。
    # draft を欠くと、起票済みだが未確定の node が全て conflicts へ落ち、「parity が壊れている」
    # という誤った信号になる。draft が schedule 対象外なのは C16 の is_schedulable が判定する
    # graph 側の事実であって、tracker との突合結果ではない。draft→open は C03 sync
    # (_status_to_remote) の投影と同一で、build-parity-manifest.py の BRIDGE_STATUS_MAP と一致必須。
    status_map = {
        "draft": "open", "active": "open", "blocked": "blocked",
        "done": "closed", "closed": "closed", "tombstoned": "closed",
    }
    ready_set: list[dict[str, Any]] = []
    unmapped: list[dict[str, Any]] = []
    conflicts: list[dict[str, Any]] = []
    for candidate in candidates:
        issue_id = str(candidate.get("id") or "")
        expected = by_issue.get(issue_id)
        if not expected:
            external_ref = _external_ref(candidate)
            unmapped.append({
                "bd_issue_id": issue_id or None, "external_ref": external_ref,
                "reason": _unmapped_reason(external_ref, graph_node_ids),
            })
            continue
        shown = _issue(bd(["show", issue_id, "--json"], cwd=root), issue_id)
        try:
            graph_status = expected.get("graph_status")
            if graph_status not in status_map:
                raise ContractError(f"unsupported graph status in parity manifest: {graph_status}")
            graph_dependencies = expected.get("depends_on", [])
            if not isinstance(graph_dependencies, list) or any(dep not in by_graph for dep in graph_dependencies):
                raise ContractError("parity manifest dependency lacks a Beads linkage")
            # qa-069: キー欠落 / null は未設定 rank へ tolerant fallback、enum 外の非 null は
            # rank 2 へ丸めず per-candidate fail-closed (silent fallback は AC-3 の裏面を破る)。
            mvp_fit = expected.get("mvp_fit")
            if mvp_fit is not None and mvp_fit not in MVP_FIT_RANK:
                raise ContractError(f"unsupported mvp_fit in parity manifest: {mvp_fit!r}")
            parity = verify_parity(shown, status_map[graph_status], [by_graph[dep] for dep in graph_dependencies])
        except ContractError as exc:
            conflicts.append({"bd_issue_id": issue_id, "graph_node_id": expected.get("graph_node_id"), "reason": str(exc)})
            continue
        ready_set.append({
            "bd_issue_id": issue_id,
            "external_ref": expected.get("graph_node_id") or _external_ref(candidate),
            "edge_parity": parity,
            "graph_status": graph_status,
            "graph_depends_on": graph_dependencies,
            "mvp_fit": mvp_fit,
        })
    # qa-069: schedule-graph.py の選定順 (rank → node_id) と表示順を揃える (SI-3)。
    ready_set.sort(key=lambda row: (MVP_FIT_RANK[row.get("mvp_fit")], str(row.get("external_ref") or "")))
    # 理由別件数を receipt へ載せ、unmapped を数えるだけで「graph 管理外が何件・
    # 管理下の取りこぼしが何件」を下流と人間の双方が見分けられるようにする。
    summary = {reason: sum(1 for row in unmapped if row["reason"] == reason) for reason in UNMAPPED_REASONS}
    return {
        "ready_set": ready_set, "unmapped": unmapped, "unmapped_summary": summary,
        "conflicts": conflicts, "candidate_count": len(candidates),
        "parity_provenance": provenance,
    }


def _spec_index(root: Path) -> dict[str, list[str]]:
    """content_roots 配下の markdown が宣言する graph_node_id → 相対 path[] の索引。

    走査範囲を repository config の `content_roots` に限るのは、範囲を固定しないと
    「どこまで探したか」が実行環境で変わり、`disposition` が再現しない診断になるため。
    同じ id を複数ファイルが宣言する多重登録も落とさず全件返す (件数 1 を仮定して
    片方を捨てると、graph 側の整合破れを audit が隠すことになる)。
    """
    config = load_json(root / ".dev-graph" / "config.json")
    roots = config.get("content_roots") if isinstance(config, dict) else None
    if not isinstance(roots, dict) or not roots:
        raise ContractError("bd-bridge requires config content_roots to locate artifact specs")
    index: dict[str, list[str]] = {}
    for relative in sorted({value for value in roots.values() if isinstance(value, str) and value}):
        base = root / relative
        if not base.is_dir():
            continue
        for path in sorted(base.rglob("*.md")):
            try:
                head = path.read_text(encoding="utf-8")[:8192]
            except OSError:
                continue
            if not head.startswith("---"):
                continue
            frontmatter = head[3:].split("\n---", 1)[0]
            match = FRONTMATTER_NODE_ID.search(frontmatter)
            if match:
                index.setdefault(match.group(1), []).append(path.relative_to(root).as_posix())
    return index


def _refs_with_node(root: Path, node_ids: set[str]) -> dict[str, list[str]]:
    """他 ref の canonical graph に実在する node_id → その ref[] を返す。

    作業ツリーだけを見ると、未マージブランチで登録された node が「どこにも無い」に
    見える。その誤判定のまま失効扱いすると、参照が正しい生きた課題を消す。dangling か
    マージ待ちかは **同じ「node が無い」** に見えるため、ref 横断でしか区別できない。

    ref ごとに graph を 1 回だけ読む (node_id ごとに git を叩くと ref 数 × node 数の
    実行になる)。読めない ref は「その ref には無い」として黙って飛ばす — graph を持たない
    古い ref や壊れた ref で audit 全体を落とすと、棚卸しそのものが実行不能になるため。
    """
    if not node_ids:
        return {}
    graph_relative = _canonical_graph_path(root).relative_to(root.resolve()).as_posix()
    refs = git(["for-each-ref", "--format=%(refname)", "refs/heads", "refs/remotes"], root).split()
    found: dict[str, list[str]] = {}
    for ref in refs:
        blob = git(["show", f"{ref}:{graph_relative}"], root, check=False)
        if not blob:
            continue
        try:
            nodes = json.loads(blob).get("nodes")
        except (json.JSONDecodeError, AttributeError):
            continue
        if not isinstance(nodes, list):
            continue
        present = {
            node.get("graph_node_id") or node.get("id")
            for node in nodes if isinstance(node, dict)
        }
        for node_id in sorted(node_ids & present):
            found.setdefault(node_id, []).append(ref)
    return found


def _orphan_disposition(spec_files: list[str], refs: list[str]) -> str:
    """orphan 1 件に付ける仕分け札を決める。

    入力:
      spec_files - 作業ツリーの content_roots で当該 graph_node_id を宣言する markdown[]
      refs       - 当該 node が graph に実在する他 ref[] (--scan-refs 未指定なら常に空)

    返り値は ORPHAN_DISPOSITIONS のいずれか。

    優先順位は「その札を見た人が次に **書き込む** か否か」で決める。

      refs あり → merge_pending
        参照先は実在する。ここで C02 upsert を走らせると、マージで運ばれてくる同じ
        node を先回りで書くことになり graph.json が衝突する。spec 実体がローカルにも
        在る場合 (ブランチとローカル両方に居る) も同じ理由で merge_pending が勝つ。
        「待て」は取り消せるが「書いた」は取り消しに手間がかかる。

      refs 無し + spec あり → restore_node
        復元先が一意に決まる。C02 upsert-node.py 一択で、人の判断は要らない。

      refs 無し + spec 無し → repoint_or_close
        機械には決められない。張り替えか失効かを中身から人が決める。

    refs が常に空 (--scan-refs 未指定) のときは後ろ 2 分岐だけが働き、走査を足す前の
    挙動と一致する。既定実行の意味を変えずに札を 1 つ増やすための形。
    """
    if refs:
        return "merge_pending"
    return "restore_node" if spec_files else "repoint_or_close"


def _orphan_audit(root: Path, *, scan_refs: bool = False) -> dict[str, Any]:
    """dev-graph external_ref を持つ bd issue を canonical graph と全数突合する。

    C28 `--op ready` の `parity_manifest_missing` は「external_ref を持つのに manifest に
    対応 node が無い」だけを見るため、(1) 参照先 node が graph に実在しない dangling
    reference と (2) node は実在するのに manifest から落ちた真の取りこぼし が同じ札に
    混ざる。前者が常駐すると札が恒常的に立ち続け、後者を検出できなくなる。

    本 op は ready 候補に限らず **全 issue** を対象に (1) を切り出して数え、対処 owner が
    分かる `disposition` を付ける。ready と違って silent drop の余地を作らないため、
    closed も含め全件を返し、集計だけを status 別に分ける。
    """
    known = _graph_node_ids(root)
    specs = _spec_index(root)
    rows = _rows(bd(["list", "--status", "all", "--limit", "10000", "--json"], cwd=root))
    referenced: list[dict[str, Any]] = []
    orphans: list[dict[str, Any]] = []
    for row in rows:
        raw = row.get("external_ref") or row.get("externalRef")
        # dev-graph 管轄の参照だけを対象にする。prefix の無い external_ref は
        # 契約 §10 の `external_ref_absent` (graph 管理外・対処不要) 側の事象。
        if not (isinstance(raw, str) and raw.startswith("dev-graph:")):
            continue
        node_id = _external_ref(row)
        if not node_id:
            continue
        referenced.append(row)
        if node_id in known:
            continue
        orphans.append({
            "bd_issue_id": str(row.get("id") or ""),
            "graph_node_id": node_id,
            "status": str(row.get("status") or ""),
            "spec_files": specs.get(node_id, []),
        })
    # 札付けは全 orphan を集めてから一括で行う。ref 走査は ref 単位で graph を 1 回読む
    # 設計なので、行ごとに呼ぶと同じ ref を orphan の数だけ読み直すことになる。
    refs_by_node = (
        _refs_with_node(root, {row["graph_node_id"] for row in orphans}) if scan_refs else {}
    )
    for row in orphans:
        row["node_in_refs"] = refs_by_node.get(row["graph_node_id"], [])
        row["disposition"] = _orphan_disposition(row["spec_files"], row["node_in_refs"])
    orphans.sort(key=lambda row: (row["graph_node_id"], row["bd_issue_id"]))
    non_closed = [row for row in orphans if row["status"] != "closed"]
    by_status: dict[str, int] = {}
    for row in orphans:
        by_status[row["status"]] = by_status.get(row["status"], 0) + 1
    return {
        "graph_node_count": len(known),
        "issue_count": len(rows),
        "dev_graph_reference_count": len(referenced),
        # 走査したかを receipt に残す。未走査を「他 ref に無いことを確認済み」と読まれると、
        # merge_pending が 0 件なのは調べていないからなのか本当に無いのかが区別できない。
        "scanned_refs": scan_refs,
        "orphans": orphans,
        "orphan_summary": {
            "total": len(orphans),
            "non_closed": len(non_closed),
            "by_status": dict(sorted(by_status.items())),
            "by_disposition": {
                disposition: sum(1 for row in non_closed if row["disposition"] == disposition)
                for disposition in ORPHAN_DISPOSITIONS
            },
        },
    }


def _graph_ids_from_document(value: Any, *, label: str) -> set[str]:
    """removal preflight 用に graph_node_id exact-set を fail-closed で読む。"""
    nodes = value.get("nodes") if isinstance(value, dict) else None
    if not isinstance(nodes, list) or not all(isinstance(node, dict) for node in nodes):
        raise ContractError(f"{label} graph must contain nodes[] objects")
    ids: list[str] = []
    for node in nodes:
        node_id = node.get("graph_node_id") or node.get("id")
        if not isinstance(node_id, str) or not node_id:
            raise ContractError(f"{label} graph node is missing graph_node_id")
        ids.append(node_id)
    if len(ids) != len(set(ids)):
        raise ContractError(f"{label} graph contains duplicate graph_node_id")
    return set(ids)


def _graph_ids_from_source(
    root: Path,
    *,
    path: str | None,
    ref: str | None,
    label: str,
    default_current: bool = False,
) -> set[str]:
    """repository 内 path または git ref の graph を読む。両方指定は拒否する。"""
    if path and ref:
        raise ContractError(f"{label} graph accepts path or ref, not both")
    if ref:
        graph_relative = _canonical_graph_path(root).relative_to(root).as_posix()
        raw = git(["show", f"{ref}:{graph_relative}"], root, check=False)
        if not raw:
            raise ContractError(f"{label} graph is unavailable at ref: {ref}")
        try:
            value = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ContractError(f"{label} graph at ref is invalid JSON: {ref}") from exc
        return _graph_ids_from_document(value, label=label)
    if not path and default_current:
        candidate = _canonical_graph_path(root)
    elif path:
        candidate = Path(path)
        candidate = candidate if candidate.is_absolute() else root / candidate
        candidate = contained(candidate, root, must_exist=True)
    else:
        raise ContractError(f"{label} graph requires --{label}-graph or --{label}-ref")
    return _graph_ids_from_document(load_json(candidate), label=label)


def _removal_disposition_rows(manifest: dict[str, Any] | None) -> dict[str, dict[str, Any]]:
    """処分 manifest を node ID で索引化し、exact-set と重複を検証する。"""
    if manifest is None:
        return {}
    if manifest.get("schema_version") != "1.0.0":
        raise ContractError("removal disposition manifest schema_version must be 1.0.0")
    raw = manifest.get("dispositions")
    if not isinstance(raw, list) or not all(isinstance(row, dict) for row in raw):
        raise ContractError("removal disposition manifest requires dispositions[] objects")
    indexed: dict[str, dict[str, Any]] = {}
    for row in raw:
        node_id = row.get("graph_node_id")
        disposition = row.get("disposition")
        reason = row.get("reason")
        issue_ids = row.get("bd_issue_ids")
        if not isinstance(node_id, str) or not node_id:
            raise ContractError("removal disposition requires graph_node_id")
        if node_id in indexed:
            raise ContractError(f"duplicate removal disposition: {node_id}")
        if disposition not in REMOVAL_DISPOSITIONS:
            raise ContractError(
                "removal disposition must be one of: "
                + ", ".join(REMOVAL_DISPOSITIONS)
            )
        if not isinstance(reason, str) or not reason.strip():
            raise ContractError(f"removal disposition requires a reason: {node_id}")
        if not isinstance(issue_ids, list) or not all(
            isinstance(issue_id, str) and issue_id for issue_id in issue_ids
        ):
            raise ContractError(f"removal disposition requires bd_issue_ids[]: {node_id}")
        if len(issue_ids) != len(set(issue_ids)):
            raise ContractError(f"duplicate bd_issue_ids in removal disposition: {node_id}")
        indexed[node_id] = row
    return indexed


def _removal_preflight(
    root: Path,
    *,
    before_graph: str | None,
    before_ref: str | None,
    after_graph: str | None,
    after_ref: str | None,
    disposition_manifest: dict[str, Any] | None,
) -> dict[str, Any]:
    """graph 物理削除で非クローズ orphan を増やさない read-only gate。

    自動 close/detach は行わない。選択した処分が Beads の現在状態に既に反映済みかを
    確認するだけなので、未解決課題を件数のために暗黙終了する経路を持たない。
    """
    before = _graph_ids_from_source(
        root, path=before_graph, ref=before_ref, label="before"
    )
    after = _graph_ids_from_source(
        root,
        path=after_graph,
        ref=after_ref,
        label="after",
        default_current=True,
    )
    removed = sorted(before - after)
    dispositions = _removal_disposition_rows(disposition_manifest)
    cancelled = sorted(
        node_id
        for node_id, row in dispositions.items()
        if row["disposition"] == "cancel_deletion"
        and node_id in before
        and node_id in after
    )
    invalid_extra = sorted(set(dispositions) - set(removed) - set(cancelled))
    if invalid_extra:
        raise ContractError(
            "removal disposition names nodes that are not removed or validly cancelled: "
            + ", ".join(invalid_extra)
        )

    rows = _rows(
        bd(["list", "--status", "all", "--limit", "10000", "--json"], cwd=root)
    )
    references: dict[str, list[dict[str, str]]] = {}
    live_refs: list[tuple[str, str]] = []
    for row in rows:
        raw = row.get("external_ref") or row.get("externalRef")
        if not (isinstance(raw, str) and raw.startswith("dev-graph:")):
            continue
        node_id = _external_ref(row)
        issue_id = str(row.get("id") or "")
        status = str(row.get("status") or "")
        if not node_id or not issue_id:
            continue
        references.setdefault(node_id, []).append(
            {"bd_issue_id": issue_id, "status": status}
        )
        if status != "closed":
            live_refs.append((issue_id, node_id))

    before_orphans = sorted(
        issue_id for issue_id, node_id in live_refs if node_id not in before
    )
    after_orphans = sorted(
        issue_id for issue_id, node_id in live_refs if node_id not in after
    )
    decisions: list[dict[str, Any]] = []
    blockers: list[dict[str, Any]] = []
    for node_id in sorted(set(removed) | set(cancelled)):
        was_removed = node_id in removed
        refs = sorted(
            references.get(node_id, []),
            key=lambda row: (row["bd_issue_id"], row["status"]),
        )
        actual_issue_ids = sorted(row["bd_issue_id"] for row in refs)
        non_closed = [row for row in refs if row["status"] != "closed"]
        requested = dispositions.get(node_id)
        disposition = requested.get("disposition") if requested else None
        declared_issue_ids = (
            sorted(requested.get("bd_issue_ids", [])) if requested else []
        )
        errors: list[str] = []
        if requested is None:
            errors.append("disposition_missing")
        elif declared_issue_ids != actual_issue_ids:
            errors.append("bd_issue_ids_mismatch")
        elif disposition == "cancel_deletion":
            if was_removed:
                errors.append("deletion_not_cancelled")
        elif disposition == "close_issue_first":
            if not refs:
                errors.append("referenced_issue_missing")
            if non_closed:
                errors.append("non_closed_reference")
        elif disposition == "detach_external_ref_first" and refs:
            errors.append("external_ref_not_detached")
        decision = {
            "graph_node_id": node_id,
            "removed": was_removed,
            "disposition": disposition,
            "reason": requested.get("reason") if requested else None,
            "references": refs,
            "non_closed_references": non_closed,
            "verified": not errors,
            "errors": errors,
        }
        decisions.append(decision)
        if errors:
            blockers.append(
                {"graph_node_id": node_id, "errors": errors}
            )

    new_orphans = sorted(set(after_orphans) - set(before_orphans))
    if new_orphans:
        blockers.append(
            {"graph_node_id": None, "errors": ["non_closed_orphan_increase"], "bd_issue_ids": new_orphans}
        )
    return {
        "allowed": not blockers,
        "write_count": 0,
        "before_node_count": len(before),
        "after_node_count": len(after),
        "removed_node_count": len(removed),
        "removed_nodes": removed,
        "disposition_exact_set": list(REMOVAL_DISPOSITIONS),
        "decisions": decisions,
        "blockers": blockers,
        "orphan_audit": {
            "before_non_closed": len(before_orphans),
            "after_non_closed": len(after_orphans),
            "new_non_closed_bd_issue_ids": new_orphans,
        },
    }


def _verify_feature_rollup(manifest: dict[str, Any], issue_id: str) -> dict[str, Any]:
    if str(manifest.get("epic_bd_issue_id")) != issue_id:
        raise ContractError("feature rollup epic identity mismatch")
    children = manifest.get("children")
    if not isinstance(children, list) or len(children) != 13 or not all(isinstance(row, dict) for row in children):
        raise ContractError("feature rollup requires exact 13 children")
    phases = [row.get("phase_ref") for row in children]
    if phases != PHASES or any(row.get("status") != "closed" for row in children):
        raise ContractError("feature rollup requires closed P01..P13 exact-set")
    return {"eligible": True, "phase_refs": phases, "closed_count": 13}


def _normalize_priority(value: str) -> str:
    """dev-graph / Beads 双方の priority 語彙を Beads の数値表現へ正規化する。"""
    normalized = value.strip().lower()
    if normalized in PRIORITY_ALIASES:
        return PRIORITY_ALIASES[normalized]
    match = re.fullmatch(r"p?([0-4])", normalized)
    if match:
        return match.group(1)
    raise ContractError("priority must be critical|high|medium|low|backlog or 0-4/P0-P4")


def _requested_update_fields(args: Any) -> list[str]:
    """明示指定された update field を argparse dest 名で順序どおり返す。

    判定は truthiness ではなく ``is not None`` で行う。``--notes ""`` は argparse に
    届いた時点で「消去の明示指定」であり、真偽値で落とすと指定が黙って消える
    (本 issue で塞がっていた silent drop と同じ失敗形) ため。
    """
    return [dest for dest, _ in UPDATE_FIELDS if getattr(args, dest, None) is not None]


def _validate_update_fields(requested: list[str]) -> None:
    """update 要求の受理可否を判定し、不正なら ContractError を送出する。

    field 皆無の update は bd 側では成功扱いの no-op になるため、呼び出し側から
    「反映された」と「何も渡っていなかった」を区別できない。本 bridge の他の契約検証と
    同じく fail-closed で落とす。notes の置換/追記同時指定も bd の適用順に依存させない。
    """
    if not requested:
        raise ContractError(f"update requires at least one of: {', '.join(flag for _, flag in UPDATE_FIELDS)}")
    if {"notes", "append_notes"} <= set(requested):
        raise ContractError("update accepts --notes or --append-notes, not both")


def _update_argv(args: Any) -> tuple[list[str], list[str]]:
    """受理した update field を bd update のフラグ列へ写し、適用 field 名と併せて返す。"""
    requested = _requested_update_fields(args)
    _validate_update_fields(requested)
    flags: list[str] = []
    for dest, flag in UPDATE_FIELDS:
        value = getattr(args, dest, None)
        if value is not None:
            flags += [flag, value]
    return flags, requested


def main() -> int:
    p = argparse.ArgumentParser(); p.add_argument("--op", required=True, choices=("create", "update", "dep-add", "dep-remove", "close", "ready", "show", "claim", "github-push", "gate-add", "gate-check", "orphan-audit", "removal-preflight"))
    p.add_argument("--repo-root", default="."); p.add_argument("--graph-node-id"); p.add_argument("--bd-issue-id"); p.add_argument("--depends-on"); p.add_argument("--expected-depends-on", action="append", default=[]); p.add_argument("--expected-status"); p.add_argument("--expected-workspace-id"); p.add_argument("--verify-parity", action="store_true"); p.add_argument("--title"); p.add_argument("--description"); p.add_argument("--notes"); p.add_argument("--append-notes"); p.add_argument("--design"); p.add_argument("--priority"); p.add_argument("--status"); p.add_argument("--reason"); p.add_argument("--pr", type=int); p.add_argument("--dry-run", action="store_true")
    p.add_argument("--parity-manifest"); p.add_argument("--projection-manifest"); p.add_argument("--feature-rollup-manifest"); p.add_argument("--artifact-kind", choices=("feature", "task"))
    # 既定 off。全 ref の graph を読むため作業ツリー限定より重く、CI の常時実行には向かない。
    # 一方 merge_pending の判定はこれ無しでは不可能なので、処分を決める棚卸しでは必ず付ける。
    p.add_argument("--scan-refs", action="store_true", help="orphan-audit: 他 ref の graph も走査し merge_pending を切り分ける")
    p.add_argument("--before-graph"); p.add_argument("--before-ref")
    p.add_argument("--after-graph"); p.add_argument("--after-ref")
    p.add_argument("--disposition-manifest")
    a = p.parse_args(); root = Path(a.repo_root).resolve(strict=True)
    pf = preflight(root, a.expected_workspace_id) if a.expected_workspace_id else preflight(root)
    create_priority: str | None = None
    if a.op == "create" and a.priority is not None:
        if a.projection_manifest:
            raise ContractError("create --priority cannot be combined with --projection-manifest")
        create_priority = _normalize_priority(a.priority)
    if a.dry_run and a.op in MUTATIONS:
        preview: dict[str, Any] = {k: v for k, v in vars(a).items() if v is not None and k != "dry_run"}
        if create_priority is not None:
            preview["priority"] = create_priority
        if a.op == "create" and a.projection_manifest:
            feature, children, source_digest = _validate_projection(_load_manifest(a.projection_manifest, root, label="projection") or {})
            preview["projection"] = {
                "feature": feature["graph_node_id"],
                "issue_type": "epic",
                "children": [{"graph_node_id": row["graph_node_id"], "phase_ref": row["phase_ref"], "issue_type": "task"} for row in children],
                "dependency_type": "blocks",
                "source_digest": source_digest,
                "write_count": 0,
                "registration": _registration_status(root, [feature["graph_node_id"], *(str(row["graph_node_id"]) for row in children)]),
            }
        elif a.op == "create" and a.graph_node_id:
            # preview でも同じ判定を通すが、raise ではなく payload へ載せる。dry-run は
            # 「今 apply したらどうなるか」を返す観測であって書込ではないので、未登録を
            # 理由に落とすと、C02 登録を同一 run の前段に持つ skill (C14 decompose) の
            # 全体 dry-run が原理的に通らなくなる。判定は registered / unregistered
            # として receipt に残るので、素通しにはならない。
            preview["registration"] = _registration_status(root, [a.graph_node_id])
        if a.op == "update":
            # preview でも同じ受理判定を通し、不正な update 要求を書込前に落とす。
            _, preview["applied_fields"] = _update_argv(a)
        if a.op == "close" and a.artifact_kind == "feature":
            manifest = _load_manifest(a.feature_rollup_manifest, root, label="feature rollup")
            if not a.bd_issue_id or manifest is None: raise ContractError("feature close dry-run requires issue and rollup manifest")
            preview["feature_rollup"] = _verify_feature_rollup(manifest, a.bd_issue_id)
        dump({"op": a.op, "dry_run_preview": preview, **pf}); return 0
    issue = a.bd_issue_id
    applied_fields: list[str] = []
    if a.op == "create":
        projection = _load_manifest(a.projection_manifest, root, label="projection")
        if projection:
            result = _package_projection(root, projection)
        else:
            if not a.graph_node_id or not a.title: raise ContractError("create requires --graph-node-id and --title")
            registration = _require_registered_nodes(root, [a.graph_node_id])
            result = _create_one(root, graph_node_id=a.graph_node_id, title=a.title, description=a.description or "", issue_type="epic" if a.artifact_kind == "feature" else "task", priority=create_priority)
            result = {**result, "registration": registration}
    elif a.op in {"update", "close", "claim", "show"}:
        if not issue: raise ContractError(f"{a.op} requires --bd-issue-id")
        shown = bd(["show", issue, "--json"], cwd=root)
        current = _issue(shown, issue)
        edge_parity = verify_parity(current, a.expected_status, a.expected_depends_on) if a.verify_parity else None
        if a.op == "update":
            flags, applied_fields = _update_argv(a)
            result = bd(["update", issue, *flags, "--json"], cwd=root)
        elif a.op == "close":
            rollup = None
            current_type = current.get("issue_type") or current.get("type")
            if a.artifact_kind == "feature" or current_type == "epic":
                manifest = _load_manifest(a.feature_rollup_manifest, root, label="feature rollup")
                if manifest is None: raise ContractError("feature close requires --feature-rollup-manifest")
                rollup = _verify_feature_rollup(manifest, issue)
            result = {"id": issue, "idempotent": True, "status": "closed"} if current.get("status") == "closed" else bd(["close", issue, "--reason", a.reason or "dev-graph completion", "--json"], cwd=root)
            if rollup is not None: result = {"epic": result, "feature_rollup": rollup}
        elif a.op == "claim":
            result = {"id": issue, "idempotent": True, "status": "in_progress"} if current.get("status") == "in_progress" else bd(["update", issue, "--claim", "--json"], cwd=root)
        else: result = current
        if edge_parity is not None: result = {"issue": result, "edge_parity": edge_parity}
    elif a.op in {"dep-add", "dep-remove"}:
        if not issue or not a.depends_on: raise ContractError(f"{a.op} requires issue and depends-on")
        existing = _issue(bd(["show", issue, "--json"], cwd=root), issue)
        deps = existing.get("dependencies", [])
        present = any((x.get("id") if isinstance(x, dict) else x) == a.depends_on for x in deps)
        if a.op == "dep-add":
            result = {"idempotent": True} if present else bd(["dep", "add", issue, a.depends_on, "--json"], cwd=root)
        else:
            result = bd(["dep", "remove", issue, a.depends_on, "--json"], cwd=root) if present else {"idempotent": True}
    elif a.op == "ready":
        manifest = _load_manifest(a.parity_manifest, root, label="parity")
        result = _ready_with_parity(root, bd(["ready", "--json"], cwd=root), manifest)
    elif a.op == "orphan-audit":
        result = _orphan_audit(root, scan_refs=a.scan_refs)
    elif a.op == "removal-preflight":
        result = _removal_preflight(
            root,
            before_graph=a.before_graph,
            before_ref=a.before_ref,
            after_graph=a.after_graph,
            after_ref=a.after_ref,
            disposition_manifest=_load_manifest(
                a.disposition_manifest, root, label="removal disposition"
            ),
        )
    elif a.op == "github-push": result = bd(["github", "sync", "--push-only", "--json"], cwd=root)
    elif a.op in {"gate-add", "gate-check"}:
        if not issue or not a.pr: raise ContractError("gate operation requires issue and --pr")
        gates = _rows(bd(["gate", "list", "--all", "--json"], cwd=root, check=False))
        blocked = _issue(bd(["show", issue, "--json"], cwd=root), issue)
        dependency_gate_ids = {
            str(dependency.get("id"))
            for dependency in blocked.get("dependencies", [])
            if isinstance(dependency, dict) and dependency.get("dependency_type") == "blocks"
        }
        matching = [
            gate
            for gate in gates
            if str(gate.get("await_id") or gate.get("awaitId")) == str(a.pr)
            and (
                gate.get("blocks") == issue
                or gate.get("blocked_issue_id") == issue
                or str(gate.get("id")) in dependency_gate_ids
            )
            and (gate.get("gate_type") or gate.get("type") or gate.get("await_type")) == "gh:pr"
        ]
        if len(matching) > 1: raise ContractError("duplicate gh:pr gates for issue and PR")
        if a.op == "gate-add":
            result = {"gate": matching[0], "idempotent": True} if matching else bd(["gate", "create", "--type", "gh:pr", "--blocks", issue, "--await-id", str(a.pr), "--reason", a.reason or f"PR #{a.pr} merge", "--json"], cwd=root)
        else:
            if not matching: raise ContractError("gh:pr gate does not exist")
            checked = bd(["gate", "check", "--type", "gh:pr", "--json"], cwd=root)
            result = {"gate": matching[0], "checked": checked}
    payload = {"op": a.op, "result": result, "workspace_identity": pf["workspace_identity"], "bd_version": pf["version"]}
    # 転送した field を receipt に載せ、「呼んだが反映されていない」を呼び出し側から検証可能にする。
    if a.op == "update":
        payload["applied_fields"] = applied_fields
    if a.op == "ready" and isinstance(result, dict):
        payload.update({key: result[key] for key in ("ready_set", "unmapped", "unmapped_summary", "conflicts", "candidate_count", "parity_provenance")})
    # ready と同じく、集計を receipt の top-level にも出す。orphans[] を数え直さないと
    # 件数が分からない形にすると、下流と人間が「全部見た」を確認できない。
    if a.op == "orphan-audit" and isinstance(result, dict):
        payload.update({key: result[key] for key in ("orphans", "orphan_summary", "graph_node_count", "dev_graph_reference_count", "scanned_refs")})
    if a.op == "removal-preflight" and isinstance(result, dict):
        payload.update(
            {
                key: result[key]
                for key in (
                    "allowed",
                    "write_count",
                    "before_node_count",
                    "after_node_count",
                    "removed_node_count",
                    "removed_nodes",
                    "disposition_exact_set",
                    "decisions",
                    "blockers",
                    "orphan_audit",
                )
            }
        )
    dump(payload)
    return 2 if a.op == "removal-preflight" and not result["allowed"] else 0


if __name__ == "__main__":
    try: raise SystemExit(main())
    except ContractError as exc: print(str(exc), file=sys.stderr); raise SystemExit(1)
