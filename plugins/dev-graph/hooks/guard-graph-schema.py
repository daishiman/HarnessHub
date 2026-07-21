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
# find/xargs 経由の間接 mutation 判定 (a5w.1/bxz の write-target モデル横展開)。
# `find tasks -name '*.md' | xargs sed -i ...` は書換対象が find の列挙結果として渡るため
# _mutating_operands では宛先を静的抽出できない (FN)。書込先確定不能かつ保護領域を走査対象に
# するなら安全側で遮断する。境界定義:
# ../../system-spec-harness/hooks/references/hook-guard-protection-scope.md §2/§4。
INDIRECT_MUTATION = re.compile(r"\bxargs\b|\bfind\b[^|;&]*-exec\b", re.I)
# find 自身が mutation を行う経路 (-delete)。xargs/-exec と違い pipeline 内に書換ツールの
# トークンが現れないため、別枝で拾う。
FIND_DELETE = re.compile(r"\bfind\b[^|;&]*-delete\b", re.I)
# 間接 mutation の実行ツール。git は restore/checkout のみが mutation で ls-files 等の read 経路が
# 多いため除外する (`git ls-files tasks | xargs wc -l` を誤遮断しない)。
INDIRECT_MUTATION_TOOLS = frozenset(
    {"rm", "mv", "cp", "install", "truncate", "sed", "perl", "tee", "touch"}
)
# 保護領域の走査起点になりうるトークン。`find tasks -name ...` の `tasks` は末尾 '/' を持たず
# GRAPH_OR_SCHEMA_TARGET (…/ 前提) では拾えないため、走査起点専用の境界判定を持つ。
GUARDED_SCAN_ROOT = re.compile(
    r"^(?:\./)?(?:issues|tasks|specs|architecture|features|docs|\.dev-graph)(?:/|$)", re.I
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
    return bool(GRAPH_OR_SCHEMA_TARGET.search(candidate) or GRAPH_AUTHORITY_DIR.search(candidate))


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


def _pipelines(command: str) -> list[list[str]]:
    """コマンドを pipeline 単位のトークン列へ分解する。

    ``|`` は 1 つの pipeline の内部結合として保ち、``&&``/``||``/``;``/改行 でのみ分離する。
    間接 mutation の判定を pipeline に閉じることで、``find /tmp -name '*.tmp' | xargs rm -f &&
    python3 x.py --graph .dev-graph/state/graph.json`` の後段 (graph を read arg に取るだけ) を
    巻き込まない (参照↔書込 conflation の再導入を防ぐ)。
    """
    groups: list[list[str]] = []
    for group in re.split(r"&&|\|\||[;\n]", command):
        try:
            tokens = shlex.split(group, comments=False, posix=True)
        except ValueError:
            tokens = group.split()
        if tokens:
            groups.append(tokens)
    return groups


def _indirect_mutation_tool(tokens: list[str]) -> bool:
    """pipeline 内に間接 mutation の実行ツール (rm/sed -i/tee 等) が現れるか。"""
    return any(Path(token).name.lower() in INDIRECT_MUTATION_TOOLS for token in tokens)


def _scans_guarded_area(tokens: list[str]) -> bool:
    """pipeline のいずれかのトークンが保護領域 (graph 権威 dir / 成果物 dir) を指すか。"""
    return any(
        GUARDED_SCAN_ROOT.match(token.strip("\"'")) or _guarded_target(token)
        for token in tokens
    )


def indirect_mutation_over_guarded_area(command: str) -> bool:
    """find/xargs 経由の間接 mutation が保護領域を一括書換しうるか (pipeline 単位で判定)。

    書込先が静的トークンに現れない (find の列挙結果として渡る) ため、
    「間接構文 (xargs / find -exec) ＋ mutation ツール ＋ 保護領域の走査」の共起を
    書込先確定不能として安全側で遮断する。read-only な列挙 (``find tasks | xargs wc -l``) は
    mutation ツールを持たないため通る。

    3 条件の積を要求するのは、本 hook が C02 atomic writer の二重化 (補助防御) であり、
    system-spec 側 guard と同じく「誤爆回避を優先し、書込先が確定できない場合だけ安全側に倒す」
    方針を採るため。``find ... -delete`` だけは pipeline 内に書換ツールのトークンが現れないので
    find 自身を mutation とみなす別枝で拾う。
    """
    for tokens in _pipelines(command):
        text = " ".join(tokens)
        indirect_write = bool(FIND_DELETE.search(text)) or (
            bool(INDIRECT_MUTATION.search(text)) and _indirect_mutation_tool(tokens)
        )
        if indirect_write and _scans_guarded_area(tokens):
            return True
    return False


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
    if redirected_to_guarded_target or any(
        _guarded_target(target) for target in _mutating_operands(command)
    ):
        return True
    # 静的に宛先を抽出できない間接一括書換 (find/xargs) を最後に安全側で判定する。
    return indirect_mutation_over_guarded_area(command)


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
    if not command:
        return 0
    ok, detail = context_ok(Path(args.repo_root))
    if not ok:
        sys.stderr.write(f"[guard-graph-schema] BLOCKED: repository context invalid: {detail}\n")
        return 2
    reason = None
    if BD_MUTATION.search(command) and "bd-bridge.py" not in command:
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
