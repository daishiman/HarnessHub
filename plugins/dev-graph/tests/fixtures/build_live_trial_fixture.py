#!/usr/bin/env python3
# /// script
# name: build-live-trial-fixture
# purpose: Rebuild the isolated dev-graph live-trial fixture repositories deterministically from source.
# inputs: ["argv: --kind sync|decompose [--out DIR] [--force]"]
# outputs: ["directory: an initialized fixture git repository under eval-log/dev-graph/live-trial-fixtures/"]
# requires-python = ">=3.10"
# dependencies: []
# contexts: [A, B, C, E]
# network: false
# write-scope: the --out fixture directory only
# ///
"""live-trial 用 fixture repo の生成器 (正本)。

fixture の実体は `eval-log/dev-graph/live-trial-fixtures/` にあり `.gitignore` 対象なので、
worktree が prune されると消える。過去に「前回 trial と同じ条件で再実行できない」事故が
起きたため、**fixture データではなく生成手順を commit する** 方針を採る。このファイルが
その正本であり、trial のたびにここから作り直す。

決定論の要件:

- 時刻・乱数を一切埋め込まない。全ての timestamp は下の定数から採る。
- git commit も `GIT_AUTHOR_DATE` / `GIT_COMMITTER_DATE` を固定するので、同じ `--out` に
  対して常に同じ commit SHA になる。repo 設定を汚さないよう identity は `-c` で渡す。
- ただし `.dev-graph/config.json` の `repository_id` だけは出力先に依存する。C24
  resolve-repo-context.py が git common dir の realpath から `local:sha256:<hex>` を導出し、
  config 側の宣言と一致しなければ fail-closed で停止するため、ここで実測して書き込む。
  (ハードコードすると「起動ゲートを迂回した偽 PASS」を生むので絶対にやらない)
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any


PLUGIN_ROOT = Path(__file__).resolve().parents[2]
REPOSITORY_ROOT = Path(__file__).resolve().parents[4]
SCHEMA_PATH = PLUGIN_ROOT / "schemas" / "graph-node.schema.json"

# 固定 timestamp 群。冪等性のため utc_now() 相当を一切使わない。
CREATED_AT = "2026-07-13T07:50:00Z"
REMOTE_UPDATED_AT = "2026-07-21T02:22:22Z"
SNAPSHOT_AT = "2026-07-13T07:55:00Z"
COMMIT_DATE = "2026-07-13T07:50:00+00:00"

COMMIT_IDENTITY = ("dev-graph-fixture@example.invalid", "dev-graph fixture builder")

# 安定 ID。trial は「前後で issue/project/item ID が不変」を検査するので、
# 生成のたびに変わる値 (uuid など) を使ってはならない。
ISSUE_NODE_ID = "I_kwDOFixture001"
PROJECT_ID = "PVT_kwDOFixture001"
PROJECT_ITEM_ID = "PVTI_lADOFixture001"
STATUS_FIELD_ID = "PVTF_Status001"
PRIORITY_FIELD_ID = "PVTF_Priority001"

CONTENT_ROOTS = {
    "issues": "issues",
    "tasks": "tasks",
    "specifications": "specs",
    "architecture": "architecture",
    "features": "features",
    "documents": "docs",
    "system_spec": "system-spec",
}

TASK_BODY = """# 目的

隔離された live-trial fixture が安全に検索・描画・schedule される。

## 背景

実リポジトリや外部 tracker に副作用を出さずに受け入れ挙動を確認する。

## 入力と前提条件

- 入力: `.dev-graph/state/graph.json`
- 前提: `tracker_binding=github`

## 出力と成果物

- 生成物: trial ごとの検証出力
- 更新対象: GitHub Issue/Project fields via adapter fixture

## 依存関係

- `depends_on`: N/A: 依存なし
- ブロッカー: N/A: なし

## 実装対象

- Frontend: N/A: fixture
- Backend/API: N/A: fixture
- Database/Data: N/A: fixture
- Infrastructure: N/A: fixture
- Security/Privacy: 外部副作用を禁止する
- Documentation: live-trial 証跡

## Write scope と競合制約

- `touches`: `docs/live-trial-output.md`
- 排他資源: fixture repository
- 並列実行条件: write trial と同時実行しない
- branch: fixture branch only
- worktree lease: N/A
- completion projection: N/A: 完了更新を行わない

## GitHub publication

- Mode: issue_and_projects
- Project aliases: planning
- Issue labels/milestone: live-trial, safe
- Publication gate: `status=active && confirmation_status=confirmed && evaluation_status=pass && implementation_readiness.status=complete`
- Completion policy: manual
- PR linkage requirement: linked_pr_merged
- Closed without merge: keep_active
- Local reconciliation: manual sync

## 実行手順

1. adapter fixture 経由で GitHub Issue/Project を同期する。

## 受入条件

- [ ] 同一状態の二回目 sync で changes=0 である。

## 検証方法

- 自動検証: adapter fixture による決定論的検証
- 手動検証: live-trial transcript を確認する
- 証跡: trial workdir

## リスクとロールバック

- リスク: fixture の誤用
- ロールバック: fixture directory を再生成する

## Handoff

- 実装 route: human
- 次に利用するノード: LT-TASK-001
"""


class BuildError(RuntimeError):
    """生成を中断する契約違反。"""


def _git(args: list[str], cwd: Path) -> str:
    """fixture repo に対してのみ git を実行する。失敗は即座に中断する。"""
    environment = {
        **os.environ,
        "GIT_AUTHOR_DATE": COMMIT_DATE,
        "GIT_COMMITTER_DATE": COMMIT_DATE,
    }
    cp = subprocess.run(
        ["git", "-C", str(cwd), *args], text=True, capture_output=True, check=False, env=environment
    )
    if cp.returncode:
        raise BuildError(f"git {' '.join(args)} failed ({cp.returncode}): {(cp.stderr or cp.stdout).strip()}")
    return cp.stdout.strip()


def _write_json(path: Path, value: Any) -> None:
    """dev-graph の atomic_json と同じ整形。以後の書き込みで無駄な差分を出さないため。"""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8"
    )


def _artifact_bytes(node: dict[str, Any], body: str) -> bytes:
    """C02 upsert-node.py が生成するのと同じ frontmatter 形式で artifact を書く。

    sync の apply は既存 artifact の本文を再利用して frontmatter を書き直す。初期状態を
    別形式で置くと初回 apply で本文以外の巨大 diff が出て、write_count の観測が濁る。
    """
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    order = list(schema.get("properties") or {})
    keys = [key for key in order if key in node] + sorted(set(node) - set(order))
    lines = ["---"]
    lines.extend(
        f"{key}: {json.dumps(node[key], ensure_ascii=False, sort_keys=True, separators=(',', ':'))}"
        for key in keys
    )
    lines.extend(["---", "", body.rstrip(), ""])
    return "\n".join(lines).encode("utf-8")


def _repo_config(repository_id: str, *, tracker_mode: str, projects: list[dict[str, Any]]) -> dict[str, Any]:
    """repo-config.schema.json の必須 9 key だけを持つ最小 config。

    本体 repo の config は plan_roots など追加 key を持つが、fixture は additionalProperties
    違反を避けて必須集合ちょうどに絞る。beads を選ばないのは、schedulable な beads node が
    あると C15 schedule が parity manifest の provenance を要求して停止するため。
    """
    return {
        "schema_version": "1.0.0",
        "repository_id": repository_id,
        "content_roots": dict(CONTENT_ROOTS),
        "local_state": {
            "graph": ".dev-graph/state/graph.json",
            "cache": ".dev-graph/cache",
            "locks": ".dev-graph/locks",
        },
        "github": {
            "enabled": False,
            "issue_repository": "example/dev-graph-live-trial",
            "projects": projects,
            "completion_policy": {
                "trigger": "linked_pr_merged",
                "required_pull_requests": "all",
                "target_branch": "default",
                "closed_unmerged": "keep_active",
                "issue_reopened": "reopen_task",
                "revert": "create_follow_up_unless_issue_reopened",
                "local_reconciliation": ["manual_sync"],
                "scheduled_reconciliation": {
                    "enabled": False,
                    "interval_minutes": 5,
                    "owner": "claude_session_start",
                    "entry_point": "dev-graph sync --reconcile-lifecycle",
                },
            },
        },
        "execution_tracker": {"mode": tracker_mode},
        "worktrees": {
            "enabled": True,
            "lease_ttl_seconds": 1800,
            "heartbeat_seconds": 60,
            "coordination_store": "git_common_dir",
            "completion_write_branch": "default",
            "dirty_worktree_policy": "fail_closed",
        },
        "claude_hooks": {
            "source": "plugin",
            "project_plugin_link": ".claude/dev-graph-plugin",
            "session_start": False,
            "post_tool_reconcile": False,
            "task_completed_gate": False,
        },
        "path_policy": {
            "authority": "caller-repository",
            "stored_paths": "repository-relative",
            "allow_outside_repository": False,
            "follow_content_symlinks_outside_repository": False,
        },
    }


def _planning_project() -> dict[str, Any]:
    """alias=planning の Projects v2 定義。

    status は schema 上 local_to_project 固定なので、これが「local 側が正で export が
    1 件出る」経路になる。priority は bidirectional にして「双方一致なら何も起きない」
    経路を同時に踏ませる。
    """
    return {
        "alias": "planning",
        "owner_type": "user",
        "owner_login": "example",
        "project_number": 1,
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
                "project_field_name": "Status",
                "value_type": "single_select",
                "direction": "local_to_project",
                "option_map": {"active": "In Progress", "blocked": "Blocked", "done": "Done"},
            },
            {
                "local_field": "priority",
                "project_field_name": "Priority",
                "value_type": "single_select",
                "direction": "bidirectional",
                "option_map": {"high": "High", "medium": "Medium", "low": "Low"},
            },
        ],
    }


def _sync_task_node() -> dict[str, Any]:
    """C15 schedule が ready と判定できる唯一の task node。

    status=active / confirmed / pass / readiness complete / depends_on 空 /
    resource_scope 非空、かつ tracker_binding=github。github binding なので schedule は
    beads parity manifest を要求しない。
    """
    return {
        "acceptance": [],
        "architecture_refs": [],
        "artifact_kind": "task",
        "artifact_subtypes": [],
        "beads_linkage": None,
        "classification_candidates": [
            {"artifact_kind": "task", "candidate_path": "tasks/LT-TASK-001.md", "confidence": 1.0}
        ],
        "classification_confidence": 1.0,
        "classification_reason": "Deterministic acceptance fixture",
        "completion_evidence": {
            "completed_at": None,
            "evidence_refs": [],
            "policy": "manual",
            "reconciled_at": None,
            "source": None,
            "status": "in_progress",
        },
        "confirmation_evidence": {
            "evaluated_digest": "a" * 64,
            "evaluator": "fixture-evaluator",
            "evidence_ref": "evidence/LT-TASK-001.json",
        },
        "confirmation_status": "confirmed",
        "created_at": CREATED_AT,
        "depends_on": [],
        "domain": "verification",
        "evaluation_status": "pass",
        "execution_contexts": [],
        "feature_package_id": None,
        "file_path": "tasks/LT-TASK-001.md",
        "github_project_linkages": [
            {
                # item_id は remote fixture と一致させる。ズレていると sync が
                # project-item-add を出し、二回目の収束検査が壊れる。
                "field_snapshot": {"priority": "Medium", "status": "Backlog"},
                "item_id": PROJECT_ITEM_ID,
                "last_error_code": None,
                "last_synced_at": SNAPSHOT_AT,
                "linked_at": CREATED_AT,
                "owner_login": "example",
                "owner_type": "user",
                "project_alias": "planning",
                "project_id": PROJECT_ID,
                "project_number": 1,
                "sync_state": "synced",
            }
        ],
        "github_publication": {
            "labels": ["live-trial", "safe"],
            "milestone": None,
            "mode": "issue_and_projects",
            "project_aliases": ["planning"],
        },
        "goal": None,
        "graph_node_id": "LT-TASK-001",
        "implementation_readiness": {
            "checked_at": CREATED_AT,
            "missing_sections": [],
            "status": "complete",
        },
        "issue_linkage": {
            "issue_number": 1,
            "linked_at": CREATED_AT,
            "repo": "example/dev-graph-live-trial",
        },
        "iteration": "R3",
        "owners": ["harness-maintainers"],
        "parent_feature": None,
        "phase_ref": None,
        "priority": "medium",
        "project_id": "dev-graph-live-trial",
        "pull_request_linkages": [],
        "purpose": None,
        "related_nodes": [],
        "resource_scope": ["docs/live-trial-output.md"],
        "scope_in": [],
        "scope_out": [],
        "source_lineage": {
            "imported_at": CREATED_AT,
            "origin_kind": "manual",
            "source_digest": "b" * 64,
            "source_path": "tasks/LT-TASK-001.md",
            "source_plugin": None,
            "source_version": "1.0.0",
        },
        "start_date": None,
        "status": "active",
        "tags": ["live-trial", "safe"],
        "target_date": None,
        "template_id": "task",
        "template_version": "1.0.0",
        "title": "Validate isolated live trial",
        "tracker_binding": "github",
        "updated_at": CREATED_AT,
    }


def _sync_remote_state() -> dict[str, Any]:
    """決定論 adapter fixture。外部 GitHub へ一切接続せずに 3-way 収束を再現する。

    title だけ remote 側が進んでおり (import 1 件)、Projects の Status だけ local 側が
    正である (export 1 件)。priority は両者一致で「変化なし」を確認する対照になる。
    """
    return {
        "beads": {},
        "github": {
            "LT-TASK-001": {
                "id": ISSUE_NODE_ID,
                "number": 1,
                "projects": {
                    "planning": {
                        "definitions": {
                            "Status": {
                                "id": STATUS_FIELD_ID,
                                "options": [
                                    {"id": "OPT_InProgress001", "name": "In Progress"},
                                    {"id": "OPT_Done001", "name": "Done"},
                                    {"id": "OPT_Blocked001", "name": "Blocked"},
                                    {"id": "OPT_Backlog001", "name": "Backlog"},
                                ],
                            },
                            "Priority": {
                                "id": PRIORITY_FIELD_ID,
                                "options": [
                                    {"id": "OPT_High001", "name": "High"},
                                    {"id": "OPT_Medium001", "name": "Medium"},
                                    {"id": "OPT_Low001", "name": "Low"},
                                ],
                            },
                        },
                        "fields": {
                            "Status": {
                                "field_id": STATUS_FIELD_ID,
                                "option_id": "OPT_Backlog001",
                                "updated_at": SNAPSHOT_AT,
                                "value": "Backlog",
                            },
                            "Priority": {
                                "field_id": PRIORITY_FIELD_ID,
                                "option_id": "OPT_Medium001",
                                "updated_at": SNAPSHOT_AT,
                                "value": "Medium",
                            },
                        },
                        "item_id": PROJECT_ITEM_ID,
                    }
                },
                "repo": "example/dev-graph-live-trial",
                "state": "open",
                "title": "Validate isolated live trial (updated remotely r7)",
                "updated_at": REMOTE_UPDATED_AT,
            }
        },
        "schema_version": "1.0",
    }


def _sync_snapshot() -> dict[str, Any]:
    """3-way merge の base。graph 直下の legacy last_synced_snapshot ではなくこちらが正本。

    title の base を local/remote とも旧値にしておくことで「local は変えていない・remote
    だけ進んだ」= import と判定される。ここを remote 新値にすると差分が消えて trial が
    何も検証しなくなる。
    """
    return {
        "nodes": {
            "LT-TASK-001": {
                "binding": "github",
                "issue": {
                    "status": {"local": "open", "remote": "open"},
                    "title": {
                        "local": "Validate isolated live trial",
                        "remote": "Validate isolated live trial",
                    },
                },
                "projects": {
                    "planning": {
                        "priority": {"local": "Medium", "remote": "Medium"},
                        "status": {"local": "Backlog", "remote": "Backlog"},
                    }
                },
            }
        },
        "schema_version": "1.0",
        "updated_at": SNAPSHOT_AT,
    }


def _init_repository(out: Path) -> Path:
    """本物の git repo を作る。C24 が git common dir の所有権を実測で検証するため必須。

    origin remote は付けない。付けると repository_id が github:owner/repo になり、
    「隔離 fixture なのに実 repository を名乗る」ことになる。
    """
    out.mkdir(parents=True, exist_ok=True)
    _git(["init", "-b", "main"], out)
    common = Path(_git(["rev-parse", "--git-common-dir"], out))
    return (common if common.is_absolute() else out / common).resolve(strict=True)


def _repository_id(common: Path) -> str:
    """resolve-repo-context.py の repository_id_for と同一式。"""
    return "local:sha256:" + hashlib.sha256(str(common.resolve(strict=True)).encode("utf-8")).hexdigest()


def _finalize(out: Path) -> None:
    """content root を実体化し、初期 commit を打つ。

    HEAD が無いと C24 の `git rev-parse HEAD` が失敗して起動ゲートを通れない。
    """
    for relative in sorted(set(CONTENT_ROOTS.values())):
        directory = out / relative
        directory.mkdir(parents=True, exist_ok=True)
        keep = directory / ".gitkeep"
        if not keep.exists():
            keep.write_text("", encoding="utf-8")
    (out / "eval-log").mkdir(parents=True, exist_ok=True)
    _git(["add", "-A"], out)
    _git(
        [
            "-c", f"user.email={COMMIT_IDENTITY[0]}",
            "-c", f"user.name={COMMIT_IDENTITY[1]}",
            "commit", "--no-gpg-sign", "-m", "chore(fixture): initialize dev-graph live-trial fixture",
        ],
        out,
    )


def build_sync(out: Path) -> None:
    """C03 run-dev-graph-sync と C15 run-dev-graph-schedule が共有する fixture。"""
    common = _init_repository(out)
    node = _sync_task_node()
    _write_json(
        out / ".dev-graph" / "config.json",
        _repo_config(_repository_id(common), tracker_mode="github", projects=[_planning_project()]),
    )
    _write_json(
        out / ".dev-graph" / "state" / "graph.json",
        {"graph_revision": 1, "nodes": [node]},
    )
    _write_json(out / ".dev-graph" / "remote.json", _sync_remote_state())
    _write_json(out / ".dev-graph" / "state" / "sync-snapshot.json", _sync_snapshot())
    artifact = out / node["file_path"]
    artifact.parent.mkdir(parents=True, exist_ok=True)
    artifact.write_bytes(_artifact_bytes(node, TASK_BODY))
    # lease 台帳の正本は worktree ではなく git common dir 側。C15 は他の場所を渡されると
    # 「lease snapshot is not the git-common authority」で停止する。
    _write_json(common / "dev-graph" / "leases.json", {"leases": []})
    _finalize(out)


def build_decompose(out: Path) -> None:
    """C14 run-dev-graph-decompose の --dry-run マクロ分解用 fixture。

    分解結果は draft preview として提示されるだけなので graph は空でよい。全 node が
    tracker_binding=none 前提のため Projects 定義も持たせない。
    """
    common = _init_repository(out)
    _write_json(
        out / ".dev-graph" / "config.json",
        _repo_config(_repository_id(common), tracker_mode="github", projects=[]),
    )
    _write_json(out / ".dev-graph" / "state" / "graph.json", {"graph_revision": 0, "nodes": []})
    _write_json(common / "dev-graph" / "leases.json", {"leases": []})
    _finalize(out)


BUILDERS = {"sync": build_sync, "decompose": build_decompose}


def _prepare_output(out: Path, force: bool) -> None:
    """既存ディレクトリの扱い。取り違えた path を消さないよう素性を確認してから消す。"""
    if not out.exists():
        return
    if not out.is_dir():
        raise BuildError(f"--out exists and is not a directory: {out}")
    if not force:
        raise BuildError(f"--out already exists (pass --force to rebuild): {out}")
    if any(out.iterdir()) and not (out / ".dev-graph" / "config.json").is_file():
        raise BuildError(f"--force refuses to delete a directory that is not a dev-graph fixture: {out}")
    shutil.rmtree(out)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build an isolated dev-graph live-trial fixture repository")
    parser.add_argument("--kind", required=True, choices=sorted(BUILDERS))
    parser.add_argument("--out", help="fixture output directory (default: eval-log/dev-graph/live-trial-fixtures/<kind>)")
    parser.add_argument("--force", action="store_true", help="rebuild an existing fixture directory")
    args = parser.parse_args(argv)

    out = Path(args.out).expanduser() if args.out else (
        REPOSITORY_ROOT / "eval-log" / "dev-graph" / "live-trial-fixtures" / args.kind
    )
    out = out.resolve() if out.exists() else Path(os.path.abspath(out))
    _prepare_output(out, args.force)
    BUILDERS[args.kind](out)
    out = out.resolve(strict=True)
    common = Path(_git(["rev-parse", "--git-common-dir"], out))
    common = (common if common.is_absolute() else out / common).resolve(strict=True)
    print(
        json.dumps(
            {
                "kind": args.kind,
                "repo_root": str(out),
                "git_common_dir": str(common),
                "repository_id": _repository_id(common),
                "leases": str(common / "dev-graph" / "leases.json"),
                "head_sha": _git(["rev-parse", "HEAD"], out),
            },
            ensure_ascii=False,
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (BuildError, OSError) as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)
