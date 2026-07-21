#!/usr/bin/env python3
"""C03 (run-dev-graph-sync) の live-trial scenario 形状。

対象 scenario: ``C03-OUT1-positive-second-sync-zero``
  fixture_contract: "A deterministic GitHub adapter fixture has one valid import and
  one valid export, stable timestamps, IDs, aliases, and snapshots."

生成物 (base fixture への追加分):
  <out>/github-adapter.json          sync-graph.py --remote-state が読む GitHub adapter 再生入力
  <out>/tasks/lt-gh-import-001.md    取込 (import) 側の github 束縛 task artifact
  <out>/tasks/lt-gh-export-001.md    反映 (export) 側の github 束縛 task artifact
  <out>/.dev-graph/state/graph.json  上記 2 node を追記 (base の 2 node は tracker_binding=none のまま)
  <out>/.dev-graph/config.json       execution_tracker.mode=github / github.enabled=true / projects[] を追記

`--adapter-fixture` は skill 起動時の task 引数表現であり、実行可能本体である
``scripts/sync-graph.py`` 側の受け口は ``--remote-state FILE`` である
(scripts/sync-graph.py:5 の inputs 宣言、同 724 行の add_argument、同 756-759 行の読取)。
本 module はその ``--remote-state`` が受け付ける JSON をそのまま生成する。

adapter fixture の JSON スキーマ (推測ではなく実装から確定):
  - 最上位は object。``remote state must be an object`` (scripts/sync-graph.py:764)。
  - binding 別のキー ``beads`` / ``github`` を持ち、値は node_id をキーとする object
    (または ``graph_node_id``/``external_ref`` を持つ object の配列)。
    ``_remote_map`` (scripts/sync-graph.py:201-210) が両形を受ける。
  - ``github`` の各値は、ライブ経路で ``_collect_remote`` が組み立てる形と同一にする。
    すなわち ``gh-bridge.py`` の ``normalize_issue`` (scripts/gh-bridge.py:36-49) が返す
    ``id / number / title / state / url / updated_at`` に、``repo`` と ``projects`` を足した
    object である (scripts/sync-graph.py:197)。
  - ``projects`` は project alias をキーに ``item_id / updated_at / fields / definitions``
    を持つ (scripts/sync-graph.py:191-196)。``fields`` の各値は
    ``value / updated_at / field_id / option_id`` (同 94-113 の ``_field_values``)、
    ``definitions`` は project-resolve が返す field 定義 (同 176-178)。

外部 API 非接触の根拠:
  ``--remote-state`` を渡した実行では ``_collect_remote`` が呼ばれず (scripts/sync-graph.py:756-762)、
  gh-bridge.py は一度も起動しない。export の適用も ``_fixture_apply`` (同 587-619) が
  この JSON を書き換えるだけで完結する。したがって本 fixture は完全にオフライン再生であり、
  実 GitHub API を叩く経路が存在しない。
"""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path
from typing import Any

SHAPE = "sync"

_FIXTURES_DIR = Path(__file__).resolve().parents[1]

# ---- 固定値 (決定論性のため、時刻・乱数・生成先 path に依存する値を使わない) ----
ADAPTER_FIXTURE = "github-adapter.json"
ISSUE_REPO = "example/live-trial-fixture"
PROJECT_ALIAS = "livetrial"
PROJECT_OWNER = "example"
PROJECT_NUMBER = 1
PROJECT_ID = "PVT_kwDOLIVETRIAL0001"
STATUS_FIELD_NAME = "Status"
STATUS_FIELD_ID = "PVTSSF_ltStatusField0001"
# local status -> Project single-select option 名。graph の status enum を全て覆う
# (未知値のままだと _plan が option 未解決で pending_retry を積む)。
STATUS_OPTION_MAP = {
    "draft": "Todo",
    "active": "In Progress",
    "blocked": "In Progress",
    "done": "Done",
    "closed": "Done",
    "tombstoned": "Done",
}
STATUS_OPTION_IDS = {
    "Todo": "ltopt-status-todo",
    "In Progress": "ltopt-status-in-progress",
    "Done": "ltopt-status-done",
}
# remote 側の固定 timestamp。base の FIXED_TS (2026-07-21T00:00:00Z) との前後関係だけで
# 取込/反映のどちらが選ばれるかが決まる (_choose は base 不在時に updated_at を比較する)。
REMOTE_TS = "2026-07-21T01:00:00Z"
# export 側 node の local updated_at。remote より新しいのでローカルが採用される。
LOCAL_AHEAD_TS = "2026-07-21T02:00:00Z"

IMPORT_NODE_ID = "LT-GH-IMPORT-001"
EXPORT_NODE_ID = "LT-GH-EXPORT-001"
# import 側は「GitHub の題名が新しい」ので local を上書きする 1 件の import になる。
IMPORT_LOCAL_TITLE = "GitHub から取込むタスク (ローカル側の旧題)"
IMPORT_REMOTE_TITLE = "GitHub から取込むタスク (GitHub 側の新題)"
# export 側は「ローカルの題名が新しい」ので remote を上書きする 1 件の export になる。
EXPORT_LOCAL_TITLE = "GitHub へ反映するタスク (ローカル側の新題)"
EXPORT_REMOTE_TITLE = "GitHub へ反映するタスク (GitHub 側の旧題)"

_ISSUES = {
    IMPORT_NODE_ID: {"number": 101, "id": "I_kwDOLIVETRIAL0101", "item_id": "PVTI_ltImportItem0101"},
    EXPORT_NODE_ID: {"number": 102, "id": "I_kwDOLIVETRIAL0102", "item_id": "PVTI_ltExportItem0102"},
}


def _base():
    """base generator を file 直読みで解決する (sys.path 構成に依存しないため)。"""
    path = _FIXTURES_DIR / "build_live_trial_fixture.py"
    spec = importlib.util.spec_from_file_location("build_live_trial_fixture_shape_sync", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _write_json(path: Path, document: Any) -> None:
    """base fixture と同じ整形規則で書く (再生成時の byte 一致を保つ)。"""
    path.write_text(
        json.dumps(document, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )


def _project_linkage(base, node_id: str) -> dict[str, Any]:
    """収束済みの Project linkage。

    item_id を最初から確定させ field_snapshot も remote と一致させておくことで、
    1 回目の sync でも project-item-add / project-field-update は発生しない。
    scenario が要求する changes は「1 import と 1 export」だけであり、alias と item_id は
    2 回目でも動かない安定値であることを観測させる側の要素にする。
    """
    return {
        "project_alias": PROJECT_ALIAS,
        "owner_type": "organization",
        "owner_login": PROJECT_OWNER,
        "project_number": PROJECT_NUMBER,
        "project_id": PROJECT_ID,
        "item_id": _ISSUES[node_id]["item_id"],
        "sync_state": "synced",
        "field_snapshot": {"status": STATUS_OPTION_MAP["active"]},
        "linked_at": base.FIXED_TS,
        "last_synced_at": base.FIXED_TS,
        "last_error_code": None,
    }


def _github_task_node(base, node_id: str, title: str, slug: str, updated_at: str, role: str) -> dict[str, Any]:
    """base の task node を github 束縛へ振り替える。

    graph-node.schema.json の allOf は tracker_binding=github に対して
    beads_linkage=null と github_publication.mode in {issue, issue_and_projects} を要求し、
    その mode は confirmed/pass/complete も要求する。base の task_node が既に
    confirmed/pass/complete なので、binding 周辺のキーだけを差し替えれば足りる。
    """
    node = base.task_node(node_id, title, slug, [])
    node["updated_at"] = updated_at
    node["tracker_binding"] = "github"
    node["beads_linkage"] = None
    node["issue_linkage"] = {
        "issue_number": _ISSUES[node_id]["number"],
        "repo": ISSUE_REPO,
        "linked_at": base.FIXED_TS,
    }
    node["github_publication"] = {
        "labels": [],
        "milestone": None,
        "mode": "issue_and_projects",
        "project_aliases": [PROJECT_ALIAS],
    }
    node["github_project_linkages"] = [_project_linkage(base, node_id)]
    node["tags"] = ["live-trial", "fixture", "github-sync"]
    node["purpose"] = f"C03 sync の {role} 経路を adapter fixture 上で決定論的に観測するための固定 node"
    node["goal"] = "1 回目で期待どおり収束し、2 回目の imports/exports が 0 件になる状態"
    node["acceptance"] = [
        f"1 回目の sync が本 node に対する {role} を 1 件だけ計上する",
        "2 回目の sync で本 node の imports/exports が 0 件になる",
        "graph_node_id・issue id・Project item_id が 2 回目でも変わらない",
    ]
    return node


def _config_project() -> dict[str, Any]:
    """repo-config.schema.json の projects[] 要素 (required 7 キー)。

    status の field_mapping は schema の allOf により direction=local_to_project 固定。
    fixture では local の status 投影値と remote の Status 値を一致させてあるため、
    この mapping は差分を生まず、alias と field snapshot の安定性だけを観測させる。
    """
    return {
        "alias": PROJECT_ALIAS,
        "owner_type": "organization",
        "owner_login": PROJECT_OWNER,
        "project_number": PROJECT_NUMBER,
        "default": True,
        "auto_add": {
            "artifact_kinds": ["task"],
            "confirmation_status": "confirmed",
            "evaluation_status": "pass",
            "implementation_readiness": "complete",
        },
        "field_mappings": [
            {
                "local_field": "status",
                "project_field_name": STATUS_FIELD_NAME,
                "value_type": "single_select",
                "direction": "local_to_project",
                "option_map": dict(STATUS_OPTION_MAP),
            }
        ],
    }


def _patch_config(out: Path) -> None:
    """base の config を github 同期が成立する形へ書き換える。

    base は github.enabled=false / execution_tracker.mode=beads で外部投影を禁じているが、
    本 scenario の被験対象は GitHub binding そのものなので、fixture 内 config を
    execution_tracker.mode=github (repo-config.schema.json の最上位 allOf が
    github.enabled=true を要求する) と projects[] 1 件へ差し替える。
    書換対象は out 配下の fixture のみで、plugin 側の closure には触れない。

    なお enabled=true にしても実 API へは到達しない。sync は常に --remote-state を
    受け取る前提で、その場合 gh-bridge.py を起動する経路 (_collect_remote) を通らない。
    """
    config_path = out / ".dev-graph" / "config.json"
    config = json.loads(config_path.read_text(encoding="utf-8"))
    config["execution_tracker"]["mode"] = "github"
    config["github"]["enabled"] = True
    config["github"]["issue_repository"] = ISSUE_REPO
    config["github"]["projects"] = [_config_project()]
    _write_json(config_path, config)


def _remote_issue(node_id: str, title: str) -> dict[str, Any]:
    """gh-bridge の normalize_issue 出力 + repo/projects (= _collect_remote が作る形)。"""
    return {
        "id": _ISSUES[node_id]["id"],
        "number": _ISSUES[node_id]["number"],
        "title": title,
        "state": "open",
        "url": f"https://github.com/{ISSUE_REPO}/issues/{_ISSUES[node_id]['number']}",
        "updated_at": REMOTE_TS,
        "repo": ISSUE_REPO,
        "projects": {
            PROJECT_ALIAS: {
                "item_id": _ISSUES[node_id]["item_id"],
                "updated_at": REMOTE_TS,
                "fields": {
                    STATUS_FIELD_NAME: {
                        "value": STATUS_OPTION_MAP["active"],
                        "updated_at": REMOTE_TS,
                        "field_id": STATUS_FIELD_ID,
                        "option_id": STATUS_OPTION_IDS[STATUS_OPTION_MAP["active"]],
                    }
                },
                "definitions": {
                    STATUS_FIELD_NAME: {
                        "id": STATUS_FIELD_ID,
                        "name": STATUS_FIELD_NAME,
                        "options": [
                            {"id": STATUS_OPTION_IDS[name], "name": name}
                            for name in ("Todo", "In Progress", "Done")
                        ],
                    }
                },
            }
        },
    }


def _write_adapter_fixture(out: Path) -> None:
    """--remote-state が読む GitHub adapter 再生入力を書く。

    beads は空 object。base fixture にも本 shape にも beads 束縛 node は無く、
    bd-bridge.py を起動する経路が存在しないことを明示するために空で置く。
    """
    _write_json(
        out / ADAPTER_FIXTURE,
        {
            "schema_version": "1.0",
            "beads": {},
            "github": {
                IMPORT_NODE_ID: _remote_issue(IMPORT_NODE_ID, IMPORT_REMOTE_TITLE),
                EXPORT_NODE_ID: _remote_issue(EXPORT_NODE_ID, EXPORT_REMOTE_TITLE),
            },
        },
    )


def build(out: Path) -> None:
    """base fixture 生成済みの out へ、C03 scenario 固有の artifact を追加する。"""
    base = _base()
    nodes = [
        # local が古い -> remote 採用 -> imports 1 件
        _github_task_node(
            base, IMPORT_NODE_ID, IMPORT_LOCAL_TITLE, "lt-gh-import-001", base.FIXED_TS, "取込"
        ),
        # local が新しい -> local 採用 -> exports 1 件 (title-update)
        _github_task_node(
            base, EXPORT_NODE_ID, EXPORT_LOCAL_TITLE, "lt-gh-export-001", LOCAL_AHEAD_TS, "反映"
        ),
    ]
    graph_path = out / ".dev-graph" / "state" / "graph.json"
    graph = json.loads(graph_path.read_text(encoding="utf-8"))
    graph["nodes"].extend(nodes)
    _write_json(graph_path, graph)
    for node in nodes:
        (out / node["file_path"]).write_text(base.markdown_for(node), encoding="utf-8")
    _patch_config(out)
    _write_adapter_fixture(out)
