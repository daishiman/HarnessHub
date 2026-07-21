#!/usr/bin/env python3
"""C15 (run-dev-graph-schedule) scenario `schedule-positive-ready-set` の fixture 形状。

なぜ base fixture だけでは足りないか:
  base (build_live_trial_fixture.py) の graph は task 2 件 (LT-TASK-001 と、それに依存する
  LT-TASK-002) しか持たない。この形では ready-set が常に 1 件になり、
  ``--max-parallel 4`` は 1 度も上限として効かず、resource_scope 重複ペアも active lease も
  存在しないため conflict 0 件が「衝突を正しく分離した結果」ではなく「衝突しうる入力が
  そもそも無かった結果」になる。schedule の contract (OUT1 ready 判定 / OUT2 conflict-free
  batch / OUT3 一意 branch) はこの入力では反証可能性を持たない。

  本 shape は「除外されるべき候補」と「衝突しうる候補」を明示的に混ぜ、schedule-graph.py の
  各ゲートが実際に働いた痕跡が receipt に残るようにする。

追加する観測点 (schedule-graph.py の判定分岐との対応):
  - depends_on 充足 (positive): LT-SCH-T1 は done の LT-SCH-BASE に依存し ready になる。
    base の LT-TASK-002 (active な LT-TASK-001 に依存) は negative 側の証拠として残る。
  - status/confirmation gate: LT-SCH-BLOCKED (status=blocked) と LT-SCH-DRAFT
    (draft/pending/incomplete) は is_schedulable() で 0 件に落ちる。
  - resource_scope 衝突: LT-SCH-T1 と LT-SCH-T5 が同じ ``src/api`` を触り、
    conflict_pairs(kind=ready_pair) に載ったうえで別 batch へ分離される。
  - active lease 除外の 2 経路: LT-SCH-L1 は自ノードへの active lease (leased_ids 経由)、
    LT-SCH-L2 は lease が押さえた resource との重なり (leased_touches 経由) で除外される。
  - lease の state / 期限判定: released lease (LT-SCH-T2) と期限切れ lease (LT-SCH-T6) は
    active 扱いされず、両ノードは ready のまま残る。
  - 二層 ready-set: feature ready (LT-SCH-F1/F2) と task ready を別 ready-set・別 batch に
    出させる。LT-SCH-F3 は未完了 feature への依存で ready にならない。
  - --max-parallel 4: 衝突しない ready task が 5 件以上あるため、上限が batch 境界を決める
    (4 件で 1 batch 目が閉じ、残りが 2 batch 目へ回る)。

決定論性:
  時刻・乱数・生成先 path をこの module から埋め込まない。lease の worktree_id / head_sha は
  graph_node_id からの sha256 導出、repository_id は base が config.json へ書いた値の読み戻し。
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import sys
from pathlib import Path
from typing import Any

SHAPE = "schedule"

FIXTURES_DIR = Path(__file__).resolve().parents[1]

# base と同じ固定時刻。fixture の digest を再生成のたびに動かさない。
FIXED_TS = "2026-07-21T00:00:00Z"
# 実行時刻に依らず active/期限切れが確定する固定値 (現在時刻との比較で判定されるため)。
LEASE_ACTIVE_UNTIL = "2099-01-01T00:00:00Z"
LEASE_EXPIRED_AT = "2026-01-01T00:00:00Z"

ROOT_BY_KIND = {"task": "tasks", "feature": "features", "architecture": "architecture"}


def _base():
    """base generator (build_live_trial_fixture.py) の node 組み立て部品を解決する。

    40 キーの graph node 定義を shape 側へ複製すると schema 改訂のたびに二重保守になるため、
    base の task_node()/markdown_for() を正本として使い、scenario 固有の差分だけを上書きする。
    既に読み込み済みなら sys.modules の実体を再利用し、単体 import 時だけ自前で読み込む。
    """
    module = sys.modules.get("build_live_trial_fixture")
    if module is not None:
        return module
    path = FIXTURES_DIR / "build_live_trial_fixture.py"
    spec = importlib.util.spec_from_file_location("build_live_trial_fixture", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules["build_live_trial_fixture"] = module
    spec.loader.exec_module(module)
    return module


def _node(
    base: Any,
    node_id: str,
    title: str,
    slug: str,
    *,
    kind: str = "task",
    status: str = "active",
    depends_on: tuple[str, ...] = (),
    resource_scope: tuple[str, ...] = (),
    subtypes: tuple[str, ...] = (),
    architecture_refs: tuple[str, ...] = (),
    overrides: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """base.task_node() を土台に artifact_kind と scheduling 属性を差し替える。"""
    node = base.task_node(node_id, title, slug, list(depends_on))
    file_path = f"{ROOT_BY_KIND[kind]}/{slug}.md"
    node.update(
        {
            "artifact_kind": kind,
            "template_id": kind,
            "file_path": file_path,
            "status": status,
            "resource_scope": list(resource_scope),
            "artifact_subtypes": list(subtypes),
            "architecture_refs": list(architecture_refs),
        }
    )
    # file_path を参照する派生フィールドは C11 の parity 検査対象なので同時に追従させる。
    node["confirmation_evidence"]["evidence_ref"] = file_path
    node["classification_candidates"] = [
        {"artifact_kind": kind, "candidate_path": file_path, "confidence": 1.0}
    ]
    if overrides:
        node.update(overrides)
    return node


def _completed_evidence(file_path: str) -> dict[str, Any]:
    """status=done ノード用の completion_evidence。

    policy=manual を使うのは、linked_pr_merged_* を選ぶと schema の allOf が merged PR linkage の
    実体を要求し、fixture に架空の PR を持ち込むことになるため。
    """
    return {
        "completed_at": FIXED_TS,
        "evidence_refs": [file_path],
        "policy": "manual",
        "reconciled_at": FIXED_TS,
        "source": "manual",
        "status": "done",
    }


def _lease(
    node_id: str,
    *,
    state: str,
    resource_scope: tuple[str, ...],
    expires_at: str,
    repository_id: str,
    released_at: str | None = None,
) -> dict[str, Any]:
    """manage-worktree-lease.py が書く lease record と同じ形の固定エントリ。

    worktree_id (^wt_[0-9a-f]{16}$) と head_sha (40 hex) は実 worktree/commit に紐づく値だが、
    fixture では commit 前に書き出すため graph_node_id から決定論導出する。schedule-graph.py が
    読むのは graph_node_id / state / expires_at / resource_scope だけで、これらは判定に使われない。
    """
    digest = hashlib.sha256(node_id.encode("utf-8")).hexdigest()
    lease = {
        "graph_node_id": node_id,
        "repository_id": repository_id,
        "worktree_id": f"wt_{digest[:16]}",
        "branch": f"devgraph/{node_id}",
        "head_sha": digest[:40],
        "session_id": "live-trial-fixture-session",
        "state": state,
        "tracker_binding": "none",
        "bd_issue_id": None,
        "resource_scope": sorted(resource_scope),
        "created_at": FIXED_TS,
        "updated_at": FIXED_TS,
        "expires_at": expires_at,
    }
    if released_at is not None:
        lease["released_at"] = released_at
    return lease


def build(out: Path) -> None:
    """base fixture 生成済みの out へ、C15 scenario 固有の artifact を追加する。"""
    base = _base()

    nodes = [
        # 依存元となる完了済み task。LT-SCH-T1 の depends_on 充足を「空依存」ではなく
        # 「done を実際に辿った結果」として観測させるために置く。
        _node(
            base,
            "LT-SCH-BASE",
            "完了済みの基盤タスク (後続の依存元)",
            "lt-sch-base",
            status="done",
            resource_scope=("src/core",),
            overrides={"completion_evidence": _completed_evidence("tasks/lt-sch-base.md")},
        ),
        # ---- ready になる task 群 ----
        _node(
            base,
            "LT-SCH-T1",
            "API 層の実装タスク (done 依存が解けて ready)",
            "lt-sch-t1",
            depends_on=("LT-SCH-BASE",),
            resource_scope=("src/api",),
        ),
        _node(
            base,
            "LT-SCH-T2",
            "UI 層の実装タスク (released lease は active 扱いしない)",
            "lt-sch-t2",
            resource_scope=("src/ui",),
        ),
        _node(
            base,
            "LT-SCH-T3",
            "スケジュール仕様のドキュメント更新タスク",
            "lt-sch-t3",
            resource_scope=("docs/schedule",),
        ),
        _node(
            base,
            "LT-SCH-T4",
            "デプロイ基盤の更新タスク",
            "lt-sch-t4",
            resource_scope=("infra/deploy",),
        ),
        # T1 と同じ src/api を触る。conflict_pairs に載り、同一 batch へ入らないことの証拠。
        _node(
            base,
            "LT-SCH-T5",
            "API 層を同時に触る競合タスク (T1 と resource_scope 重複)",
            "lt-sch-t5",
            resource_scope=("src/api",),
        ),
        # 期限切れ lease が付いている。期限切れを active 扱いすると ready から落ちる。
        _node(
            base,
            "LT-SCH-T6",
            "期限切れ lease が残るタスク (ready のまま残るべき)",
            "lt-sch-t6",
            resource_scope=("src/legacy",),
        ),
        # ---- active lease で除外される task 群 ----
        _node(
            base,
            "LT-SCH-L1",
            "自ノードに active lease があるタスク (leased_ids で除外)",
            "lt-sch-l1",
            resource_scope=("src/worker",),
        ),
        _node(
            base,
            "LT-SCH-L2",
            "active lease の resource と重なるタスク (leased_touches で除外)",
            "lt-sch-l2",
            resource_scope=("src/worker",),
        ),
        # ---- gate で除外される task 群 ----
        # status 以外は ready と同条件にして、除外理由を status 単独へ切り分ける。
        _node(
            base,
            "LT-SCH-BLOCKED",
            "status=blocked のタスク (ready へ混入してはならない)",
            "lt-sch-blocked",
            status="blocked",
            resource_scope=("src/blocked",),
        ),
        _node(
            base,
            "LT-SCH-DRAFT",
            "未確定・未評価・readiness 未完のタスク (ready へ混入してはならない)",
            "lt-sch-draft",
            status="draft",
            resource_scope=("src/draft",),
            overrides={
                "confirmation_status": "draft",
                "evaluation_status": "pending",
                "implementation_readiness": {
                    "checked_at": FIXED_TS,
                    "missing_sections": ["acceptance"],
                    "status": "incomplete",
                },
            },
        ),
        # ---- feature 層 ----
        # feature の architecture_refs は minItems 1 かつ実在 node 参照が必須 (C11 の
        # dangling_reference 検査)。done の architecture node を 1 件だけ置いて満たす。
        # done にするのは、schedule が feature 以外の候補をすべて task 扱いするため、
        # active のままだと architecture が task ready-set へ混入するのを避ける意図。
        _node(
            base,
            "LT-SCH-ARCH",
            "スケジューリング対象システムの確定アーキテクチャ",
            "lt-sch-arch",
            kind="architecture",
            status="done",
            subtypes=("backend",),
            resource_scope=("architecture/lt-sch-arch.md",),
            overrides={
                "completion_evidence": _completed_evidence("architecture/lt-sch-arch.md")
            },
        ),
        _node(
            base,
            "LT-SCH-F1",
            "分解待ちの feature A (feature ready)",
            "lt-sch-f1",
            kind="feature",
            resource_scope=("features/lt-sch-f1",),
            architecture_refs=("LT-SCH-ARCH",),
        ),
        _node(
            base,
            "LT-SCH-F2",
            "分解待ちの feature B (feature ready・F1 と非競合)",
            "lt-sch-f2",
            kind="feature",
            resource_scope=("features/lt-sch-f2",),
            architecture_refs=("LT-SCH-ARCH",),
        ),
        # 未完了 feature への依存。feature 層でも depends_on が効くことの証拠。
        _node(
            base,
            "LT-SCH-F3",
            "feature A の完了を待つ feature C (ready にならない)",
            "lt-sch-f3",
            kind="feature",
            depends_on=("LT-SCH-F1",),
            resource_scope=("features/lt-sch-f3",),
            architecture_refs=("LT-SCH-ARCH",),
        ),
    ]

    graph_path = out / ".dev-graph" / "state" / "graph.json"
    graph = json.loads(graph_path.read_text(encoding="utf-8"))
    graph["nodes"].extend(nodes)
    # base と同じ整形で書き戻す (差分が node 追加だけに閉じるようにする)。
    graph_path.write_text(
        json.dumps(graph, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    for node in nodes:
        (out / node["file_path"]).write_text(base.markdown_for(node), encoding="utf-8")

    # lease ledger は git common dir の正本 path にだけ置く。schedule-graph.py は
    # <git-common-dir>/dev-graph/leases.json 以外を --leases に渡されると fail-closed する
    # ため、ここへ置かないと lease 判定を含む正経路を実走できない。
    repository_id = json.loads(
        (out / ".dev-graph" / "config.json").read_text(encoding="utf-8")
    )["repository_id"]
    ledger = {
        "schema_version": "1.1",
        "workspace_identity": None,
        "leases": [
            # active: L1 自身を押さえ、同時に src/worker を占有する (L2 の除外要因にもなる)。
            _lease(
                "LT-SCH-L1",
                state="claimed",
                resource_scope=("src/worker",),
                expires_at=LEASE_ACTIVE_UNTIL,
                repository_id=repository_id,
            ),
            # 期限切れ: state は active 集合に属するが expires_at が過去なので active ではない。
            _lease(
                "LT-SCH-T6",
                state="claimed",
                resource_scope=("src/legacy",),
                expires_at=LEASE_EXPIRED_AT,
                repository_id=repository_id,
            ),
            # 解放済み: 期限は未来だが state が active 集合外なので active ではない。
            _lease(
                "LT-SCH-T2",
                state="released",
                resource_scope=("src/ui",),
                expires_at=LEASE_ACTIVE_UNTIL,
                repository_id=repository_id,
                released_at=FIXED_TS,
            ),
        ],
    }
    coordination = out / ".git" / "dev-graph"
    coordination.mkdir(parents=True, exist_ok=True)
    (coordination / "leases.json").write_text(
        json.dumps(ledger, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
