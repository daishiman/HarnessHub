#!/usr/bin/env python3
# /// script
# name: guard-graph-schema
# purpose: dev-graph の破壊操作、無制限 gh write、bd-bridge を迂回する Beads mutation を PreToolUse で拒否する。
# inputs: [stdin Claude hook JSON, argv --repo-root]
# outputs: [exit 0 allow, exit 2 deny with stderr]
# contexts: [E]
# network: false
# write-scope: none
# dependencies: [scripts/resolve-repo-context.py, scripts/validate-graph-schema.py]
# requires-python: ">=3.11"
# ///
"""C10: Bash mutation の単一 fail-closed guard。"""
from __future__ import annotations

import argparse
import json
import re
import shlex
import subprocess
import sys
from pathlib import Path

BD_MUTATION = re.compile(r"(?:^|[;&|]\s*)bd\s+(?:create|update|close|delete|purge|sql)\b", re.I)
GH_MUTATION = re.compile(r"\bgh\s+(?:issue\s+(?:create|edit|close|delete)|project\s+item-(?:add|edit|delete))\b", re.I)
GRAPH_OR_SCHEMA_TARGET = re.compile(
    r"(?:\.dev-graph/state/graph\.json\b|"
    r"(?:issues|tasks|specs|architecture|features|docs)/|"
    r"(?:schemas/)?graph-node\.schema\.json\b)",
    re.I,
)
GRAPH_AUTHORITY_DIR = re.compile(r"(?:^|/)\.dev-graph/?$", re.I)
# Write/Edit ツールと interpreter 経由の書込みで守る範囲。Bash の GRAPH_OR_SCHEMA_TARGET より
# 狭く graph authority だけを対象にする (content root への通常編集まで止めると日常作業が壊れる)。
# authority = graph store (`state/`) と repo-local config、および正準 schema。
# `.dev-graph/` 全体ではない — templates/ cache/ tmp/ は init が正当に書くため除外する
# (広く取りすぎると `cp plugins/dev-graph/templates .dev-graph/templates` まで止まる)。
GRAPH_AUTHORITY_PATH = re.compile(
    r"(?:^|/)\.dev-graph/(?:state(?:/|$)|config\.json$)"
    r"|(?:^|/)graph-node\.schema\.json$",
    re.I,
)
FILE_WRITING_TOOLS = frozenset({"Write", "Edit", "MultiEdit", "NotebookEdit"})
# python/ruby/node 等に file path と書込みモードが同居する呼び出し。rm/sed 等の語彙しか持たない
# _mutating_operands では、インタプリタ本文に埋め込まれた open(...,'w') を検出できない。
INTERPRETER_WRITE = re.compile(
    r"""open\s*\(\s*(?P<q>['"])(?P<path>[^'"]+)(?P=q)\s*,\s*['"][waxr]\+?[bt]?['"]"""
    r"""|['"](?P<path2>[^'"]*\.dev-graph[^'"]*)['"]\s*,\s*['"][wax]""",
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


def _guarded_target(value: str) -> bool:
    candidate = value.strip().strip("\"'")
    return bool(
        GRAPH_OR_SCHEMA_TARGET.search(candidate)
        or GRAPH_AUTHORITY_DIR.search(candidate)
        # `.dev-graph/` 配下は state/graph.json 以外 (config.json 等) も authority。
        # これが無いと Write 遮断後に `cat > .dev-graph/config.json` へ逃げられる。
        or GRAPH_AUTHORITY_PATH.search(candidate)
    )


def _expanded(value: str, assignments: dict[str, str]) -> str:
    match = re.fullmatch(r"\$(?:\{(?P<braced>[A-Za-z_][A-Za-z0-9_]*)\}|(?P<plain>[A-Za-z_][A-Za-z0-9_]*))", value)
    if not match:
        return value
    return assignments.get(match.group("braced") or match.group("plain"), value)


def _mutating_operands(command: str) -> list[str]:
    """Return operands that a recognised shell command can mutate.

    In particular, ``cp graph.json /tmp/copy`` reads the graph, while
    ``cp /tmp/copy graph.json`` writes it.  Treating the whole command as one
    string cannot distinguish those cases and blocks ordinary verification.
    """
    targets: list[str] = []
    for segment in re.split(r"(?:&&|\|\||[;|])", command):
        try:
            tokens = shlex.split(segment, comments=False, posix=True)
        except ValueError:
            continue
        assignments: dict[str, str] = {}
        operation_index = None
        operation = ""
        for index, token in enumerate(tokens):
            assignment = re.fullmatch(r"([A-Za-z_][A-Za-z0-9_]*)=(.*)", token)
            if assignment and operation_index is None:
                assignments[assignment.group(1)] = assignment.group(2)
                continue
            base = Path(token).name.lower()
            if base in {"rm", "mv", "cp", "install", "truncate", "sed", "perl", "git", "tee", "touch"}:
                operation_index, operation = index, base
                break
        if operation_index is None:
            continue
        raw = tokens[operation_index + 1 :]
        operands: list[str] = []
        skip_redirect_target = False
        for token in raw:
            if skip_redirect_target:
                skip_redirect_target = False
                continue
            if token in {">", ">>", "1>", "1>>", "2>", "2>>"}:
                skip_redirect_target = True
                continue
            if re.match(r"^[0-9]*>{1,2}", token):
                continue
            if token == "--":
                continue
            if token.startswith("-"):
                continue
            operands.append(_expanded(token, assignments))

        if operation in {"cp", "install"}:
            if operands:
                targets.append(operands[-1])
        elif operation == "mv":
            targets.extend(operands)
        elif operation in {"rm", "truncate", "tee", "touch"}:
            targets.extend(operands)
        elif operation in {"sed", "perl"}:
            has_in_place = any(
                token == "--in-place" or re.fullmatch(r"-[A-Za-z]*i(?:\..*)?", token)
                for token in raw
            )
            if has_in_place:
                targets.extend(operands)
        elif operation == "git" and raw:
            if raw[0] == "restore" or (raw[0] == "checkout" and "--" in raw):
                targets.extend(operands[1:])
    return targets


def destructive_graph_or_schema_operation(command: str) -> bool:
    # A read may mention the graph and independently redirect stderr, e.g.
    # ``sha256sum graph.json 2>/dev/null``.  Only a redirect whose destination
    # is guarded is a graph/schema write; otherwise read-only verification
    # would be blocked merely because the command suppresses diagnostics.
    redirected_to_guarded_target = False
    for match in re.finditer(
        r"(?:^|[\s;&|])(?:[0-9]+)?>{1,2}\s*"
        r"(?P<target>\"[^\"]+\"|'[^']+'|[^\s;&|]+)",
        command,
    ):
        target = match.group("target").strip("\"'")
        if _guarded_target(target):
            redirected_to_guarded_target = True
            break
    return redirected_to_guarded_target or any(_guarded_target(target) for target in _mutating_operands(command))


def schema_ok(root: Path, context_output: str) -> tuple[bool, str]:
    validator = Path(__file__).resolve().parents[1] / "scripts" / "validate-graph-schema.py"
    if not validator.is_file():
        return False, f"required validator missing: {validator}"
    try:
        context = json.loads(context_output)
        graph = Path(context["local_state_paths"]["graph"])
    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
        return False, f"resolver did not return a graph authority: {exc}"
    if not graph.is_file():
        return False, f"canonical graph is missing: {graph}"
    proc = subprocess.run(
        [sys.executable, str(validator), "--graph", str(graph), "--repo-root", str(root)],
        capture_output=True, text=True, check=False,
    )
    return proc.returncode == 0, (proc.stderr.strip() or proc.stdout.strip())


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", required=True)
    args = parser.parse_args()
    value = payload()
    command = command_of(value)
    written = written_paths_of(value)
    if not command and not written:
        return 0

    # graph authority の遮断は最優先かつ subprocess 非依存で判定する。context_ok() は tool 毎に
    # python を起動するため hook timeout (10s) で guard 全体が素通りしうる。最重要の判定を
    # その手前に置き、fail-open の窓を塞ぐ。
    if any(GRAPH_AUTHORITY_PATH.search(path) for path in written):
        sys.stderr.write(
            "[guard-graph-schema] BLOCKED: graph authority (.dev-graph/ 配下と "
            "graph-node.schema.json) への Write/Edit は C02 atomic writer を迂回できない\n"
        )
        return 2
    if command and interpreter_writes_graph_authority(command):
        sys.stderr.write(
            "[guard-graph-schema] BLOCKED: interpreter 経由の graph authority 書込みは "
            "C02 atomic writer を迂回できない\n"
        )
        return 2

    ok, detail = context_ok(Path(args.repo_root))
    if not ok:
        sys.stderr.write(f"[guard-graph-schema] BLOCKED: repository context invalid: {detail}\n")
        return 2
    reason = None
    if not command:
        return 0
    elif BD_MUTATION.search(command) and "bd-bridge.py" not in command:
        reason = "Beads mutation は scripts/bd-bridge.py の単一チョークポイント経由に限定"
    elif GH_MUTATION.search(command) and "gh-bridge.py" not in command:
        reason = "GitHub bulk/write は scripts/gh-bridge.py の dry-run/ledger 経由に限定"
    elif destructive_graph_or_schema_operation(command):
        valid, validation_detail = schema_ok(Path(args.repo_root), detail)
        if not valid:
            reason = f"C11 schema validation failed before destructive operation: {validation_detail}"
        else:
            reason = "graph/schema の直接破壊操作は C02 atomic writer を迂回できない"
    if reason:
        sys.stderr.write(f"[guard-graph-schema] BLOCKED: {reason}\n")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
