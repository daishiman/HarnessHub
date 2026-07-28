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
provenance は両 module に scenario 契約 (live-trial-positive-scenarios.json) を加えた
合成 identity で測るため、監査コードでも合格条件でも、試験中に書き換えれば
`provenance_valid` が落ちる。
"""

from __future__ import annotations

import argparse
import copy
import hashlib
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

SCENARIO_ID = "C14-OUT1-positive-macro-decomposition-r2"
BINDINGS = ("none", "beads", "github")
AUDIT_MODULES = (Path(__file__).resolve(), HERE / STATE_MODULE)
CONTRACT_FILES = (HERE / "live-trial-positive-scenarios.json",)
# provenance は「監査コード」だけでなく「合格条件を書いた契約」まで含めて束縛する。
# 契約 (scenario の fixture_contract / required_observations / 閾値) を試験中に緩めれば、
# 監査コードを一行も触らずに要求を下げられてしまうため、コードだけを測る identity には
# 穴が残る (HarnessHub-ojh6 残課題 #3)。
AUDIT_PROVENANCE_FILES = AUDIT_MODULES + CONTRACT_FILES

# evaluated_digest の正準レシピ: node 自身の JSON から自己参照になる
# confirmation_evidence だけを除き、キー昇順・余白なしで直列化して sha256 を取る。
# 被験 skill と監査が同じ手順を踏むため、昇格後に node を書き換えると digest が外れる
# (= schema description の言う stale PASS 拒否が実値で成立する)。
EVALUATED_DIGEST_EXCLUDED = ("confirmation_evidence",)
EVALUATED_DIGEST_RECIPE = (
    "sha256(json.dumps({k: v for k, v in node.items() if k != 'confirmation_evidence'}, "
    "ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')).hexdigest()"
)


def _helper_identity() -> dict[str, Any]:
    """監査実装と合格条件契約の全体の同一性を返す。"""
    return STATE.composite_identity(list(AUDIT_PROVENANCE_FILES))


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


def _gate_conditions(node: dict[str, Any]) -> dict[str, bool]:
    readiness = node.get("implementation_readiness") or {}
    if not isinstance(readiness, dict):
        raise AuditError("feature implementation_readiness must be an object")
    return {
        "confirmation_confirmed": node.get("confirmation_status") == "confirmed",
        "evaluation_pass": node.get("evaluation_status") == "pass",
        "readiness_complete": readiness.get("status") == "complete",
    }


def _is_publication_candidate(node: dict[str, Any]) -> bool:
    return all(_gate_conditions(node).values())


def _resolved_binding(node: dict[str, Any]) -> str:
    """投影先 binding を実ノードから読む。

    `repo-config-default` は C02 登録時に解決される遅延束縛 sentinel なので、
    preview 段階で残っていれば binding 解決が走っていない。黙って `none` へ
    倒すと「外部投影 0 件」が binding 解決の成果ではなく既定値の副産物になる。
    """
    binding = node.get("tracker_binding")
    if binding == "repo-config-default":
        raise AuditError(
            f"{node.get('graph_node_id')}: tracker_binding is still the unresolved sentinel"
        )
    if binding not in BINDINGS:
        raise AuditError(
            f"{node.get('graph_node_id')}: invalid tracker_binding {binding!r}"
        )
    return binding


def _projection_evidence(node: dict[str, Any]) -> list[str]:
    """node 自身が持つ「外部へ投影された」実痕跡を列挙する。

    投影先を gate 述語から導くと、除外された node は定義上どの投影集合にも入らないため
    「gate を破って投影された件数」は必ず 0 になり、観測が恒真化する
    (HarnessHub-ojh6 残課題 #1)。投影は述語の裏返しではなく、node の projection 面
    (publication intent と linkage) を直接読んで観測する。こうすると draft のまま
    publication intent を立てた成果物が、schema 検証に届く前の段階で不合格材料になる。
    """
    markers: list[str] = []
    publication = node.get("github_publication")
    if isinstance(publication, dict):
        mode = publication.get("mode")
        if mode not in (None, "local_only"):
            markers.append(f"github_publication.mode={mode}")
    if isinstance(node.get("issue_linkage"), dict):
        markers.append("issue_linkage")
    if isinstance(node.get("beads_linkage"), dict):
        markers.append("beads_linkage")
    if node.get("github_project_linkages"):
        markers.append("github_project_linkages")
    if node.get("pull_request_linkages"):
        markers.append("pull_request_linkages")
    return markers


def _evaluation_digest(node: dict[str, Any]) -> str:
    """node 内容から evaluated_digest の期待値を再計算する。"""
    payload = {
        key: value
        for key, value in node.items()
        if key not in EVALUATED_DIGEST_EXCLUDED
    }
    canonical = json.dumps(
        payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _evidence_binding(features: list[dict[str, Any]]) -> dict[str, Any]:
    """confirmation_evidence が node 内容へ束縛されているかを測る。

    schema は evaluated_digest を 64 桁 hex の正規表現でしか縛らないため、`a`*64 のような
    placeholder でも通る。それでは「confirmation/evaluation を同一 artifact digest へ pin し
    stale PASS を拒否する」という schema 記述の意図が実値として成立しない
    (HarnessHub-ojh6 残課題 #2)。ここで正準レシピによる再計算と突き合わせ、昇格 node の
    evidence がその node の内容そのものを指していることを確認する。
    """
    checks: list[dict[str, Any]] = []
    for node in features:
        evidence = node.get("confirmation_evidence")
        if not isinstance(evidence, dict):
            raise AuditError(
                f"{node.get('graph_node_id')}: confirmation_evidence must be an object"
            )
        declared = evidence.get("evaluated_digest")
        expected = _evaluation_digest(node)
        promoted = _is_publication_candidate(node)
        evaluator = evidence.get("evaluator")
        evidence_ref = evidence.get("evidence_ref")
        fields_present = (
            isinstance(evaluator, str)
            and bool(evaluator.strip())
            and isinstance(evidence_ref, str)
            and bool(evidence_ref.strip())
        )
        if promoted:
            # 昇格した node は evidence 3 field が揃い、digest が内容と一致すること。
            bound = fields_present and declared == expected
        else:
            # 未昇格は digest を持たなくてよいが、持つなら内容へ束縛されていること。
            bound = declared is None or declared == expected
        checks.append(
            {
                "graph_node_id": node.get("graph_node_id"),
                "promoted": promoted,
                "declared_digest": declared,
                "expected_digest": expected,
                "digest_matches": declared == expected,
                "evidence_fields_present": fields_present,
                "bound": bound,
            }
        )
    return {
        "recipe": EVALUATED_DIGEST_RECIPE,
        "excluded_fields": list(EVALUATED_DIGEST_EXCLUDED),
        "checks": checks,
        "all_bound": all(check["bound"] for check in checks),
    }


def _preview_consistency(
    preview: dict[str, Any], features: list[dict[str, Any]]
) -> dict[str, Any]:
    """`preview.nodes` を唯一の正本と定め、便宜配列との乖離を検出する。

    監査は `preview.nodes` からしか feature を読まない。preview が `features` のような
    便宜配列も持つ場合、そちらだけを昇格させても監査には一切届かず、同一 graph_node_id
    が配列ごとに別状態を持つ自己矛盾した成果物が「合格」になりうる (HarnessHub-ojh6 の
    2026-07-26 実走 2 本目で実際に発生した)。乖離は黙って無視せず不合格材料にする。
    """
    canonical = {
        node.get("graph_node_id"): node
        for node in features
        if isinstance(node.get("graph_node_id"), str)
    }
    divergent: list[dict[str, Any]] = []
    mirrors = {
        key: value
        for key, value in preview.items()
        if key != "nodes" and isinstance(value, list)
    }
    for key, entries in mirrors.items():
        for entry in entries:
            if not isinstance(entry, dict) or entry.get("artifact_kind") != "feature":
                continue
            node_id = entry.get("graph_node_id")
            base = canonical.get(node_id)
            if base is None:
                divergent.append(
                    {"array": key, "graph_node_id": node_id, "reason": "absent_from_nodes"}
                )
                continue
            if _gate_conditions(entry) != _gate_conditions(base):
                divergent.append(
                    {
                        "array": key,
                        "graph_node_id": node_id,
                        "reason": "gate_status_diverges_from_nodes",
                        "nodes": _gate_conditions(base),
                        key: _gate_conditions(entry),
                    }
                )
    return {
        "canonical_array": "nodes",
        "mirror_arrays": sorted(mirrors),
        "divergent": divergent,
        "consistent": not divergent,
    }


def _publication_measurements(features: list[dict[str, Any]]) -> dict[str, Any]:
    """実 preview node だけから publication gate の挙動を導出する。

    監査側で status を代入した合成検体は使わない。合成検体の判定は述語の単体検査で
    あって skill が gate を尊重した証拠にはならず、条件が自分の代入から導かれるため
    恒真化する (HarnessHub-ojh6)。述語の節ごとの検査は pytest 側の責務。
    """
    if not features:
        raise AuditError("preview must contain at least one produced feature")

    classified = []
    for node in features:
        conditions = _gate_conditions(node)
        markers = _projection_evidence(node)
        classified.append(
            {
                "graph_node_id": node["graph_node_id"],
                "binding": _resolved_binding(node),
                "conditions": conditions,
                "candidate": all(conditions.values()),
                "blocked_by": sorted(
                    name for name, held in conditions.items() if not held
                ),
                "projection_evidence": markers,
                "projected": bool(markers),
            }
        )

    promoted = [entry for entry in classified if entry["candidate"]]
    blocked = [entry for entry in classified if not entry["candidate"]]
    # 述語から導く「投影されうる集合」。これは資格 (eligibility) であって投影の実績ではない。
    # 名前を targets のままにすると、実績を測っていないのに測ったように読めるので分ける。
    eligible_by_binding = {
        binding: sorted(
            entry["graph_node_id"] for entry in promoted if entry["binding"] == binding
        )
        for binding in BINDINGS
    }
    projected = sorted(entry["graph_node_id"] for entry in classified if entry["projected"])
    blocked_projected = sorted(
        entry["graph_node_id"] for entry in blocked if entry["projected"]
    )

    # 非空虚性 (non-vacuity): 両クラスの実例が揃って初めて gate を観測したと言える。
    #
    #   - promoted が空 = 全 draft: 候補が空なのは gate の成果ではなく「誰も昇格して
    #     いない」の副産物。gate 実装を削除しても同じ観測になるため判別力がない。
    #   - blocked が空 = 全昇格: 除外される側の実例が無く、「評価前 draft は 0 件」が
    #     空集合に対して真になっているだけ。
    #
    # 「候補集合が全体の真部分集合かつ非空」と等価だが、両クラスを名前で持つほうが
    # 落ちたときにどちらが欠けたか receipt から直読できる。
    discriminating = bool(promoted) and bool(blocked)

    return {
        "features": classified,
        "promoted": sorted(entry["graph_node_id"] for entry in promoted),
        "blocked": [
            {"graph_node_id": entry["graph_node_id"], "blocked_by": entry["blocked_by"]}
            for entry in blocked
        ],
        "eligible_by_binding": {
            binding: {"ids": ids, "count": len(ids)}
            for binding, ids in eligible_by_binding.items()
        },
        "projected": projected,
        "blocked_projected": blocked_projected,
        "gate_respected": not blocked_projected,
        # 恒真性の自己申告。--binding none --dry-run では誰も投影されないので
        # gate_respected が真であること自体は gate の成果ではない。それを receipt の中で
        # 明示し、この run の gate 証拠は discriminating と in-run negative control である
        # と読み手が取り違えないようにする。
        "gate_respected_vacuous": not projected,
        "gate_evidence_note": (
            "gate_respected observes that no gate-blocked feature carries a projection marker. "
            "Under --binding none --dry-run no feature is projected at all, so this run reports "
            "gate_respected_vacuous=true and does not treat gate_respected as the evidence. The "
            "non-vacuous evidence is `discriminating` (both classes are present in the produced "
            "preview) together with the in-run gate_negative_controls, which mutate this very "
            "preview and require the canonical schema validator to reject the result."
        ),
        "discriminating": discriminating,
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


def _validate_graph(
    repo_root: Path, plugin_root: Path, document: dict[str, Any]
) -> dict[str, Any]:
    """正準 schema validator を stdin 経路で呼ぶ (管理対象へ一時ファイルを作らない)。"""
    return _run_json(
        [
            "python3",
            str(plugin_root / "scripts/validate-graph-schema.py"),
            "--graph",
            "-",
            "--repo-root",
            str(repo_root),
        ],
        stdin=json.dumps(document, ensure_ascii=False),
    )


def _violation_keys(receipt: dict[str, Any], node_id: str) -> set[tuple[str, str]]:
    violations = receipt["payload"].get("violations")
    if not isinstance(violations, list):
        raise AuditError("schema receipt requires violations[]")
    return {
        (str(item.get("code")), str(item.get("detail")))
        for item in violations
        if isinstance(item, dict) and item.get("node") == node_id
    }


def _gate_negative_controls(
    repo_root: Path,
    plugin_root: Path,
    preview: dict[str, Any],
    baseline: dict[str, Any],
    blocked_ids: list[str],
) -> dict[str, Any]:
    """この run の実 preview から gate 違反の反例を合成し、正準 validator が落とすか試す。

    `--binding none --dry-run` では誰も外部投影されないので、「gate 違反 0 件」は gate の
    成果ではなく投影経路が動いていないことの副産物であり、そのままでは反証不能な観測に
    なる (HarnessHub-ojh6 残課題 #1)。そこで観測を待つ代わりに違反を能動的に作りにいく。
    実データを 1 箇所だけ壊して canonical schema へ通し、拒否が返ることを確認できれば、
    「この run のこのデータに対して gate が効く」ことを反証可能な形で示せる。
    合格を作るための書き換えではないので、変異は監査の内部 copy に閉じ、
    成果物にも管理対象にも書き戻さない。
    """
    if not blocked_ids:
        return {
            "executed": False,
            "reason": "no gate-blocked feature in the produced preview",
            "controls": [],
            "all_rejected": False,
        }
    target = blocked_ids[0]
    controls: list[dict[str, Any]] = []
    for name, mutate, expected_clause in (
        (
            "readiness_clause",
            _mutate_pass_without_readiness,
            "$.implementation_readiness.status",
        ),
        (
            "publication_intent_on_blocked_node",
            _mutate_publication_intent,
            "$.confirmation_status",
        ),
    ):
        mutated = copy.deepcopy(preview)
        node = next(
            (
                item
                for item in mutated.get("nodes", [])
                if isinstance(item, dict) and item.get("graph_node_id") == target
            ),
            None,
        )
        if node is None:
            raise AuditError(f"blocked feature vanished from preview nodes: {target}")
        mutation = mutate(node)
        receipt = _validate_graph(repo_root, plugin_root, mutated)
        new_keys = _violation_keys(receipt, target) - _violation_keys(baseline, target)
        controls.append(
            {
                "control": name,
                "mutated_node": target,
                "mutation": mutation,
                "expected_clause": expected_clause,
                "new_violations": [
                    {"code": code, "detail": detail}
                    for code, detail in sorted(new_keys)
                ],
                "clause_fired": any(
                    detail.startswith(expected_clause) for _, detail in new_keys
                ),
                "rejected": bool(new_keys) and receipt["payload"].get("valid") is not True,
            }
        )
    return {
        "executed": True,
        "controls": controls,
        "all_rejected": all(
            control["rejected"] and control["clause_fired"] for control in controls
        ),
    }


def _mutate_pass_without_readiness(node: dict[str, Any]) -> str:
    """未昇格 node を「evidence まで揃った pass だが readiness incomplete」へ壊す。

    allOf[7] の readiness 節だけを孤立させるため evidence 3 field は正しく埋める。
    埋めないと evidence 欠落の違反が先に立ち、readiness 節が効いた証拠にならない。
    """
    node["confirmation_status"] = "confirmed"
    node["evaluation_status"] = "pass"
    node["confirmation_evidence"] = {
        "evaluator": "audit-negative-control",
        "evidence_ref": "in-memory gate negative control",
        "evaluated_digest": _evaluation_digest(node),
    }
    return "confirmation_status=confirmed, evaluation_status=pass, readiness left incomplete"


def _mutate_publication_intent(node: dict[str, Any]) -> str:
    """未昇格 node に外部 publication intent を立てる。"""
    node["github_publication"] = {
        "mode": "issue",
        "project_aliases": [],
        "labels": [],
        "milestone": None,
    }
    return "github_publication.mode=issue on a gate-blocked feature"


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
    preview_consistency = _preview_consistency(preview, features)
    graph = _graph_measurements(nodes, threshold)
    publication = _publication_measurements(features)
    evidence_binding = _evidence_binding(features)
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
    schema = _validate_graph(repo_root, plugin_root, preview)
    violations = schema["payload"].get("violations")
    if not isinstance(violations, list):
        raise AuditError("schema receipt requires violations[]")
    structural_violations = [
        item
        for item in violations
        if not isinstance(item, dict) or item.get("code") != "artifact_missing"
    ]
    negative_controls = _gate_negative_controls(
        repo_root,
        plugin_root,
        preview,
        schema,
        [entry["graph_node_id"] for entry in publication["blocked"]],
    )

    suppression = {"local": local["mutation_suppressed"], **adapter_suppression}
    write_counts = {
        name: int(not value)
        for name, value in suppression.items()
    }
    external_binding_eligibility_empty = all(
        not publication["eligible_by_binding"][binding]["ids"]
        for binding in ("beads", "github")
    )
    passed = all([
        bool(nodes),
        bool(features),
        bool(graph["architecture_count"]),
        graph["acyclic"],
        graph["threshold_pass"],
        not bool(graph["task_count"]),
        publication["gate_respected"],
        publication["discriminating"] is True,
        negative_controls["all_rejected"],
        evidence_binding["all_bound"],
        external_binding_eligibility_empty,
        preview_consistency["consistent"],
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
        "preview_consistency": preview_consistency,
        "publication": {
            **publication,
            "external_binding_eligibility_empty": external_binding_eligibility_empty,
        },
        "evidence_binding": evidence_binding,
        "gate_negative_controls": negative_controls,
        "local_state": local,
        "adapter_receipts": adapters,
        "mutation_suppression": suppression,
        "derived_write_counts": write_counts,
        "schema_validation": {
            "stdin_path_used": (
                "--graph" in schema["argv"]
                and schema["argv"][schema["argv"].index("--graph") + 1] == "-"
            ),
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
