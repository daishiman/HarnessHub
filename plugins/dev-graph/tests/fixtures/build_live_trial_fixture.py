#!/usr/bin/env python3
"""live-trial 用の隔離 dev-graph fixture repo を決定論的に再生成する。

背景 (j24 の根本原因):
  live-trial は被験 skill を本物の claude セッションで実走させるため、graph を変更する
  skill (C02 node / C03 sync 等) を実 repo へ向けられない。過去の trial は
  ``eval-log/dev-graph/live-trial-fixtures/<run>-<skill>`` に fixture repo を手で用意して
  そこへ向けていたが、この path は .gitignore 対象 (揮発物) であり、生成手順も
  どこにも残っていなかった。結果 worktree 破棄と同時に fixture が消滅し、
  digest が stale 化しても証跡を再取得できない (= j24 が繰り返し再発する) 状態になった。

  本 script は「fixture データではなく fixture の生成手順」を正本として commit し、
  同一入力から同一 fixture を何度でも再生成できるようにする。timestamp を固定値にして
  いるのは、再生成のたびに fixture の digest が変わると trial の再現性が失われるため。

出力 (--out DIR):
  DIR/.dev-graph/config.json          repo-config.schema.json 準拠
  DIR/.dev-graph/state/graph.json     graph-node.schema.json 準拠 (task 2 件)
  DIR/tasks/lt-task-001.md            LT-TASK-001 (depends_on なし)
  DIR/tasks/lt-task-002.md            LT-TASK-002 (LT-TASK-001 に依存)
  DIR/{issues,specs,architecture,features,docs,system-spec}/  空の content root

frontmatter は validate-graph-schema.py の frontmatter_of (1 行 1 スカラの行指向
パーサ) が読める形、すなわち ``key: <JSON スカラ>`` の 1 行表現で書く。

Usage:
  python3 plugins/dev-graph/tests/fixtures/build_live_trial_fixture.py --out <dir> [--force]
  python3 plugins/dev-graph/tests/fixtures/build_live_trial_fixture.py --out <dir> --verify
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

# 固定 timestamp: 再生成のたびに fixture digest が動くと trial の再現性が失われる。
FIXED_TS = "2026-07-21T00:00:00Z"
CONTENT_ROOTS = ("issues", "tasks", "specs", "architecture", "features", "docs", "system-spec")


def config_document(repository_id: str) -> dict:
    """repo-config.schema.json の required を満たす最小 config。"""
    return {
        "schema_version": "1.0.0",
        "repository_id": repository_id,
        "content_roots": {
            "issues": "issues",
            "tasks": "tasks",
            "specifications": "specs",
            "architecture": "architecture",
            "features": "features",
            "documents": "docs",
            "system_spec": "system-spec",
        },
        "local_state": {
            "graph": ".dev-graph/state/graph.json",
            "cache": ".dev-graph/cache",
            "locks": ".dev-graph/locks",
        },
        "github": {
            "enabled": False,
            "issue_repository": "example/live-trial-fixture",
            "projects": [],
            "completion_policy": {
                "trigger": "linked_pr_merged",
                "required_pull_requests": "all",
                "target_branch": "default",
                "closed_unmerged": "keep_active",
                "issue_reopened": "reopen_task",
            },
        },
        # tracker mode=none: fixture 内の trial が実 Beads / GitHub を触らないことを構造保証する。
        "execution_tracker": {"mode": "none"},
        "worktrees": {
            "enabled": False,
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


def task_node(node_id: str, title: str, slug: str, depends_on: list[str]) -> dict:
    """graph-node.schema.json の required 40 キーを満たす task node。"""
    file_path = f"tasks/{slug}.md"
    return {
        "graph_node_id": node_id,
        "artifact_kind": "task",
        "artifact_subtypes": [],
        "title": title,
        "project_id": "live-trial-fixture",
        "domain": "documentation",
        "status": "active",
        "closed_at": None,
        "owners": ["live-trial"],
        "tags": ["live-trial", "fixture"],
        "priority": None,
        "start_date": None,
        "target_date": None,
        "iteration": None,
        "created_at": FIXED_TS,
        "updated_at": FIXED_TS,
        "depends_on": depends_on,
        "related_nodes": [],
        "resource_scope": [],
        "purpose": "live-trial の被験 skill を実 repo から隔離して実走させるための固定 fixture node",
        "goal": "graph 実値と skill 出力の一致を観測できる状態",
        "scope_in": ["fixture 内の読み取り検証"],
        "scope_out": ["実 repository の変更"],
        "acceptance": ["skill 出力の status/depends_on が本 node の値と一致する"],
        "architecture_refs": [],
        "parent_feature": None,
        "feature_package_id": None,
        "phase_ref": None,
        "file_path": file_path,
        "template_id": "task",
        "template_version": "1.0.0",
        "confirmation_status": "confirmed",
        "evaluation_status": "pass",
        # status:active は schema の allOf 条件で confirmation/evaluation の確定と、
        # confirmation_evidence の実体 (evaluator/evidence_ref/64hex digest) を要求する
        # (確定と評価を同一 digest へ pin して stale PASS を拒否する設計)。
        # digest は node_id から決定論導出し、再生成のたびに値が動かないようにする。
        "confirmation_evidence": {
            "evaluated_digest": hashlib.sha256(node_id.encode("utf-8")).hexdigest(),
            "evaluator": "build_live_trial_fixture",
            "evidence_ref": file_path,
        },
        "source_lineage": {
            "imported_at": FIXED_TS,
            "origin_kind": "manual",
            "source_digest": None,
            "source_path": None,
            "source_plugin": None,
            "source_version": None,
        },
        "classification_confidence": 1.0,
        "classification_reason": "live-trial fixture として決定論生成された task node",
        "classification_candidates": [
            {"artifact_kind": "task", "candidate_path": file_path, "confidence": 1.0}
        ],
        "issue_linkage": None,
        "tracker_binding": "none",
        "beads_linkage": None,
        "github_publication": {"labels": [], "milestone": None, "mode": "local_only", "project_aliases": []},
        "github_project_linkages": [],
        "pull_request_linkages": [],
        "execution_contexts": [],
        "completion_evidence": {
            "completed_at": None,
            "evidence_refs": [],
            "policy": "linked_pr_merged_all",
            "reconciled_at": None,
            "source": None,
            "status": "open",
        },
        "implementation_readiness": {"checked_at": FIXED_TS, "missing_sections": [], "status": "complete"},
    }


def markdown_for(node: dict) -> str:
    """frontmatter_of (行指向スカラパーサ) が読める 1 行 1 キーの frontmatter を組む。"""
    lines = ["---"]
    for key, value in node.items():
        if key == "closed_at" and value is None:
            continue
        lines.append(f"{key}: {json.dumps(value, ensure_ascii=False)}")
    lines.append("---")
    lines.append("")
    lines.append(f"# {node['title']}")
    lines.append("")
    lines.append("live-trial fixture の固定 artifact。実 repository の成果物ではない。")
    lines.append("")
    return "\n".join(lines)


def build(out: Path, repository_id: str) -> dict:
    nodes = [
        task_node("LT-TASK-001", "live-trial fixture の基点タスク", "lt-task-001", []),
        task_node("LT-TASK-002", "LT-TASK-001 に依存する後続タスク", "lt-task-002", ["LT-TASK-001"]),
    ]
    for root in CONTENT_ROOTS:
        (out / root).mkdir(parents=True, exist_ok=True)
    # status/schedule 系 script は repo 内 eval-log/ を書込先の realpath 境界として解決するため、
    # --no-eval-log でも root が存在しないと fail する。fixture repo にも実体を用意する。
    (out / "eval-log").mkdir(parents=True, exist_ok=True)
    (out / ".dev-graph" / "state").mkdir(parents=True, exist_ok=True)
    (out / ".dev-graph" / "cache").mkdir(parents=True, exist_ok=True)
    (out / ".dev-graph" / "locks").mkdir(parents=True, exist_ok=True)

    (out / ".dev-graph" / "config.json").write_text(
        json.dumps(config_document(repository_id), ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    graph = {
        "schema_version": "1.0.0",
        "repository_id": repository_id,
        "graph_revision": 1,
        "nodes": nodes,
    }
    (out / ".dev-graph" / "state" / "graph.json").write_text(
        json.dumps(graph, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    for node in nodes:
        (out / node["file_path"]).write_text(markdown_for(node), encoding="utf-8")
    return graph


def git_init(out: Path) -> None:
    """fixture を git toplevel にする。

    C24 (resolve-repo-context.py) は選択 root が `git rev-parse --show-toplevel` と
    一致することを要求する。git 管理外のディレクトリを fixture にすると C24 が exit 1 になり、
    trial 側が root を手動固定して続行する = 起動ゲートを迂回した不完全な実走になる
    (r13 パイロットの独立 evaluator 指摘)。identity は fixture 内 config に閉じ、
    利用者の global git config へ依存しない。
    """
    def run(*args: str) -> None:
        subprocess.run(["git", *args], cwd=out, check=True, capture_output=True, text=True)

    run("init", "-q")
    run("config", "user.name", "live-trial-fixture")
    run("config", "user.email", "live-trial-fixture@example.invalid")


def git_commit(out: Path) -> None:
    subprocess.run(["git", "add", "-A"], cwd=out, check=True, capture_output=True, text=True)
    subprocess.run(
        ["git", "commit", "-q", "-m", "live-trial fixture baseline"],
        cwd=out, check=True, capture_output=True, text=True,
    )


def derive_repository_id(out: Path) -> str:
    """C24 と同じ規則で repository_id を導出する。

    resolve-repo-context.py は remote が無い repository の identity を
    ``local:sha256:<git common dir 実パスの sha256>`` として導出し、config の
    repository_id と一致しない場合は fail-closed になる。fixture は生成先 path に
    依存するため、config へ焼き込む値も生成時に導出する。
    """
    common = subprocess.run(
        ["git", "rev-parse", "--git-common-dir"],
        cwd=out, check=True, capture_output=True, text=True,
    ).stdout.strip()
    resolved = (out / common).resolve() if not Path(common).is_absolute() else Path(common).resolve()
    return "local:sha256:" + hashlib.sha256(str(resolved).encode("utf-8")).hexdigest()


def verify(out: Path) -> int:
    """同梱 validator (C11) で fixture 自体の妥当性を確認する。"""
    validator = Path(__file__).resolve().parents[2] / "scripts" / "validate-graph-schema.py"
    proc = subprocess.run(
        [sys.executable, str(validator), "--graph", str(out / ".dev-graph" / "state" / "graph.json"),
         "--repo-root", str(out)],
        capture_output=True, text=True, check=False,
    )
    sys.stdout.write(proc.stdout)
    sys.stderr.write(proc.stderr)
    return proc.returncode


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", required=True, help="fixture repo の生成先")
    parser.add_argument(
        "--repository-id",
        default=None,
        help="既定は C24 と同じ規則で生成先から導出 (local:sha256:<git common dir>)",
    )
    parser.add_argument("--force", action="store_true", help="既存ディレクトリを削除して作り直す")
    parser.add_argument("--verify", action="store_true", help="生成後に C11 validator で検証する")
    parser.add_argument(
        "--empty",
        action="store_true",
        help="dev-graph 未初期化の git repository だけを作る (C01 init の被験対象)",
    )
    args = parser.parse_args()

    out = Path(args.out).expanduser().resolve()
    if out.exists():
        if not args.force:
            print(f"already exists (use --force to rebuild): {out}", file=sys.stderr)
            return 2
        shutil.rmtree(out)
    out.mkdir(parents=True)
    # git init を先に済ませてから identity を導出する (C24 の導出規則が git common dir 依存)。
    git_init(out)
    if args.empty:
        # C01 (init) の被験対象は「まだ dev-graph 化されていない repository」。
        # content root も .dev-graph も置かず、git repository だけを用意する。
        (out / ".gitkeep").write_text("", encoding="utf-8")
    else:
        build(out, args.repository_id or derive_repository_id(out))
    git_commit(out)
    print(f"fixture built: {out}")
    if args.empty:
        return 0
    if args.verify:
        return verify(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
