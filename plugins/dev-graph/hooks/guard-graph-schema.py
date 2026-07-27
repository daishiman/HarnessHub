#!/usr/bin/env python3
# /// script
# name: guard-graph-schema
# purpose: dev-graph の破壊操作、無制限 gh write、bd-bridge を迂回する Beads mutation を PreToolUse で拒否する。
# inputs: [stdin Claude hook JSON, argv --repo-root]
# outputs: [exit 0 allow, exit 2 deny with stderr]
# contexts: [E]
# network: false
# write-scope: none
# dependencies: [scripts/resolve-repo-context.py]
# requires-python: ">=3.11"
# ///
"""C10: Bash mutation の単一 fail-closed guard。

遮断判定は subprocess を一切起動せずに確定させる (``static_denial``)。PreToolUse hook が
timeout すると Claude Code は tool を通すため、遮断経路の内側に置いた subprocess の
所要時間はそのまま fail-open の窓になる。HarnessHub-6in4 ではこの窓を通って
``.dev-graph/config.json`` と ``.dev-graph/state/graph.json`` への Bash 直書きが
live-trial 中に 2 回素通りした。context_ok() はこの判定を通過した入力に対してだけ呼ぶ。
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

HOOK_ROOT = Path(__file__).resolve().parent
if str(HOOK_ROOT) not in sys.path:
    sys.path.insert(0, str(HOOK_ROOT))

from guard_graph_commands import (
    GRAPH_AUTHORITY_PATH,
    GUARDED_SCAN_ROOT,
    _pipelines,
    destructive_graph_or_schema_operation,
    indirect_mutation_over_guarded_area,
)

BD_MUTATION = re.compile(r"(?:^|[;&|]\s*)bd\s+(?:create|update|close|delete|purge|sql)\b", re.I)
GH_MUTATION = re.compile(r"\bgh\s+(?:issue\s+(?:create|edit|close|delete)|project\s+item-(?:add|edit|delete))\b", re.I)
# Write/Edit ツールと interpreter 経由の書込みで守る範囲。Bash の GRAPH_OR_SCHEMA_TARGET より
# 狭く graph authority だけを対象にする (content root への通常編集まで止めると日常作業が壊れる)。
# authority = graph store (`state/`) と repo-local config、および正準 schema。
# `.dev-graph/` 全体ではない — templates/ cache/ tmp/ は init が正当に書くため除外する
# (広く取りすぎると `cp plugins/dev-graph/templates .dev-graph/templates` まで止まる)。
FILE_WRITING_TOOLS = frozenset({"Write", "Edit", "MultiEdit", "NotebookEdit"})
# python/ruby/node 等に file path と書込みモードが同居する呼び出し。rm/sed 等の語彙しか持たない
# _mutating_operands では、インタプリタ本文に埋め込まれた open(...,'w') を検出できない。
INTERPRETER_WRITE = re.compile(
    r"""open\s*\(\s*(?P<q>['"])(?P<path>[^'"]+)(?P=q)\s*,\s*['"][waxr]\+?[bt]?['"]"""
    r"""|['"](?P<path2>[^'"]*\.dev-graph[^'"]*)['"]\s*,\s*['"][wax]""",
    re.I,
)
PATHLIB_MUTATION = re.compile(
    r"""\.\s*(?:write_text|write_bytes|touch|unlink|rmdir)\s*\("""
    r"""|\.\s*open\s*\(\s*['"][wax]""",
    re.I,
)
GRAPH_AUTHORITY_LITERAL = re.compile(
    r"""\.dev-graph/(?:state(?:/|['"]|$)|config\.json\b)"""
    r"""|graph-node\.schema\.json\b""",
    re.I,
)
def payload() -> dict:
    try:
        value = json.load(sys.stdin)
        return value if isinstance(value, dict) else {}
    except Exception:
        return {}


def command_of(value: dict) -> str:
    tool_input = value.get("tool_input") or {}
    return str(tool_input.get("command") or "") if isinstance(tool_input, dict) else ""


def written_paths_of(value: dict) -> list[str]:
    """Write/Edit 系ツールが書込む対象 path を返す (Bash 以外の C02 迂回経路)。"""
    if str(value.get("tool_name") or "") not in FILE_WRITING_TOOLS:
        return []
    tool_input = value.get("tool_input") or {}
    if not isinstance(tool_input, dict):
        return []
    return [
        str(tool_input[key])
        for key in ("file_path", "notebook_path")
        if isinstance(tool_input.get(key), str) and tool_input[key]
    ]


def interpreter_writes_graph_authority(command: str) -> bool:
    """python -c / heredoc 内の open(..., 'w') が graph authority を指すか。"""
    for match in INTERPRETER_WRITE.finditer(command):
        path = match.group("path") or match.group("path2") or ""
        if GRAPH_AUTHORITY_PATH.search(path):
            return True
    # ``Path.write_text`` does not contain ``open(..., 'w')`` in the shell
    # payload.  The 2026-07-26 init live trial used exactly this spelling after
    # Write and heredoc redirects were denied.  Requiring both a pathlib
    # mutator and an authority path keeps ordinary ``Path.read_text`` calls
    # available while closing that observed bypass without subprocess work.
    if PATHLIB_MUTATION.search(command) and GRAPH_AUTHORITY_LITERAL.search(command):
        return True
    return False


def context_ok(root: Path) -> tuple[bool, str]:
    resolver = Path(__file__).resolve().parents[1] / "scripts" / "resolve-repo-context.py"
    if not resolver.is_file():
        return False, f"required resolver missing: {resolver}"
    proc = subprocess.run(
        [sys.executable, str(resolver), "--repo-root", str(root), "--mode", "read"],
        capture_output=True, text=True, check=False,
    )
    return proc.returncode == 0, (proc.stderr.strip() or proc.stdout.strip())


def static_denial(command: str, written: list[str], root: Path) -> str | None:
    """subprocess を起動せずに確定できる遮断理由を返す (無ければ None)。

    遮断に必要な判定を全てここへ集約するのが本 hook の fail-closed 契約である。
    PreToolUse hook が timeout すると Claude Code は tool を通すため、遮断経路の内側で
    subprocess を回すとその所要時間がそのまま fail-open の窓になる。以前は Bash の
    破壊操作枝だけが ``context_ok()`` の後段にあり、さらに遮断/許可を左右しない
    ``schema_ok()`` (= graph 全件の C11 検証) を理由文の出し分けのためだけに呼んでいた。
    実測 (HarnessHub-6in4) では Write 枝 0.10s に対し Bash 枝は 39.79s を要し、
    run-dev-graph-init の live-trial で ``.dev-graph/config.json`` と
    ``.dev-graph/state/graph.json`` への直書きが実際に 2 回素通りした。

    C11 検証をここへ戻してはならない。遮断は既に確定しており理由文の精度しか上がらない
    一方、その所要時間は fail-open の窓に直結する。C11 は run-dev-graph-init の
    Execution contract 7 が別途強制する。
    """
    if any(GRAPH_AUTHORITY_PATH.search(path) for path in written):
        # 保護範囲は GRAPH_AUTHORITY_PATH と一致させる。「.dev-graph/ 配下」と広く名乗ると、
        # 実際は保護外の tmp/ へ draft を置く正規手順まで塞がれていると読まれ、遮断された
        # agent が別の迂回を探しに行く (6in4 の fail-open はまさにその局面で起きた)。
        return (
            "graph authority (.dev-graph/state/、.dev-graph/config.json、"
            "graph-node.schema.json) への Write/Edit は C02 atomic writer を迂回できない "
            "(config は scripts/build-repo-config.py、初期 graph は "
            "scripts/build-graph-store.py 経由。draft は保護外の .dev-graph/tmp/ へ置く)"
        )
    if not command:
        return None
    if interpreter_writes_graph_authority(command):
        return (
            "interpreter 経由の graph authority 書込みは C02 atomic writer を迂回できない "
            "(初期 graph は scripts/build-graph-store.py、node 更新は "
            "scripts/upsert-node.py 経由)"
        )
    if BD_MUTATION.search(command) and "bd-bridge.py" not in command:
        return "Beads mutation は scripts/bd-bridge.py の単一チョークポイント経由に限定"
    if GH_MUTATION.search(command) and "gh-bridge.py" not in command:
        return "GitHub bulk/write は scripts/gh-bridge.py の dry-run/ledger 経由に限定"
    if destructive_graph_or_schema_operation(command, root):
        return (
            "graph/schema の直接破壊操作は C02 atomic writer を迂回できない "
            "(.dev-graph/config.json は scripts/build-repo-config.py、"
            "初期 graph は scripts/build-graph-store.py 経由で書く)"
        )
    return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", required=True)
    args = parser.parse_args()
    value = payload()
    command = command_of(value)
    written = written_paths_of(value)
    if not command and not written:
        return 0

    root = Path(args.repo_root).resolve()
    # 第 1 段: subprocess 非依存の遮断判定。timeout 由来の fail-open 窓を持たない。
    reason = static_denial(command, written, root)
    if reason:
        sys.stderr.write(f"[guard-graph-schema] BLOCKED: {reason}\n")
        return 2

    # 第 2 段: 遮断対象ではない入力に対してだけ repository context の健全性を確認する。
    # ここでの timeout は「遮断すべき操作を通す」のではなく「無害な操作の検査を省く」に留まる。
    if not command:
        return 0
    ok, detail = context_ok(root)
    if not ok:
        sys.stderr.write(f"[guard-graph-schema] BLOCKED: repository context invalid: {detail}\n")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
