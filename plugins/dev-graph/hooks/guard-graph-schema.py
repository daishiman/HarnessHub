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
# find/xargs 経由の間接 mutation 判定 (a5w.1/bxz の write-target モデル横展開)。
# `find tasks -name '*.md' | xargs sed -i ...` は書換対象が find の列挙結果として渡るため
# _mutating_operands では宛先を静的抽出できない (FN)。書込先確定不能かつ保護領域を走査対象に
# するなら安全側で遮断する。境界定義:
# ../../system-spec-harness/hooks/references/hook-guard-protection-scope.md §2/§4。
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
GUARDED_ROOT_NAMES = frozenset(
    {"issues", "tasks", "specs", "architecture", "features", "docs", ".dev-graph"}
)
_DYNAMIC_OPERAND = "__DEV_GRAPH_DYNAMIC_OPERAND__"
_COMMAND_WRAPPERS = frozenset({"command", "env", "nice", "nohup", "sudo", "time"})
_XARGS_OPTIONS_WITH_VALUE = frozenset(
    {
        "-a",
        "--arg-file",
        "-d",
        "--delimiter",
        "-E",
        "--eof",
        "-I",
        "--replace",
        "-L",
        "--max-lines",
        "-n",
        "--max-args",
        "-P",
        "--max-procs",
        "-s",
        "--max-chars",
    }
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


def _pipelines(command: str) -> list[list[str]]:
    """コマンドを pipeline 単位のトークン列へ分解する。

    ``|`` は 1 つの pipeline の内部結合として保ち、``&&``/``||``/``;``/改行 でのみ分離する。
    間接 mutation の判定を pipeline に閉じることで、``find /tmp -name '*.tmp' | xargs rm -f &&
    python3 x.py --graph .dev-graph/state/graph.json`` の後段 (graph を read arg に取るだけ) を
    巻き込まない (参照↔書込 conflation の再導入を防ぐ)。
    """
    groups: list[list[str]] = []
    for group in re.split(r"&&|\|\||[;\n]", command):
        tokens = _tokens(group)
        if tokens:
            groups.append(tokens)
    return groups


def _tokens(group: str) -> list[str]:
    """quote を尊重しつつ ``|`` を独立トークンへ分離する。

    ``shlex.split`` は ``|`` を演算子として扱わないため ``find tasks |xargs rm`` が
    ``['find','tasks','|xargs','rm']`` になり、consumer 名 (``xargs``) も stage 境界も
    取り違える。``punctuation_chars`` で ``|`` だけを切り出すと、``grep 'a|b'`` のような
    quote 内の ``|`` は 1 トークンのまま保たれる。
    """
    lexer = shlex.shlex(group, posix=True, punctuation_chars="|")
    lexer.whitespace_split = True
    try:
        return list(lexer)
    except ValueError:
        return group.split()


def _operation(tokens: list[str]) -> tuple[int, str] | None:
    """command 先頭 (許可 wrapper 後) が既知 mutation tool なら位置と basename を返す。"""
    for index, token in enumerate(tokens):
        if token in _COMMAND_WRAPPERS or re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*=.*", token):
            continue
        operation = Path(token).name.lower()
        if operation in INDIRECT_MUTATION_TOOLS:
            return index, operation
        # 実行ファイル以降の token に現れる rm/cp 等は単なる引数であり、tool ではない。
        return None
    return None


def _contains_dynamic_operand(token: str) -> bool:
    return _DYNAMIC_OPERAND in token


def _target_directory(args: list[str]) -> tuple[bool, bool]:
    """cp/install の -t/--target-directory の有無と、宛先が動的かを返す。"""
    for index, token in enumerate(args):
        if token in {"-t", "--target-directory"}:
            target = args[index + 1] if index + 1 < len(args) else ""
            return True, _contains_dynamic_operand(target)
        if token.startswith("--target-directory="):
            return True, _contains_dynamic_operand(token.split("=", 1)[1])
        if token.startswith("-t") and len(token) > 2:
            return True, _contains_dynamic_operand(token[2:])
    return False, False


def _dynamic_operand_is_mutated(tokens: list[str]) -> bool:
    """動的列挙結果が mutation tool の実書込先になるか。

    xargs/find -exec の列挙結果を ``_DYNAMIC_OPERAND`` として埋め込み、tool 別の
    write-target 規則で判定する。単に同じ pipeline 内へ mutation tool が現れただけでは
    遮断しない。例えば ``find tasks | xargs wc -l | tee /tmp/count`` の tee 宛先は
    静的な /tmp であり、保護領域の列挙結果は read input にすぎない。
    """
    found = _operation(tokens)
    if found is None:
        return False
    operation_index, operation = found
    args = tokens[operation_index + 1 :]
    dynamic_args = [token for token in args if _contains_dynamic_operand(token)]
    if not dynamic_args:
        return False

    if operation in {"rm", "mv", "truncate", "tee", "touch"}:
        # mv は source を削除するため、source/destination のどちらでも mutation になる。
        return True
    if operation in {"cp", "install"}:
        has_target_directory, dynamic_target_directory = _target_directory(args)
        if has_target_directory:
            # cp/install -t /tmp <dynamic-source> は保護領域を読むだけ。
            return dynamic_target_directory
        operands = [token for token in args if not token.startswith("-")]
        return bool(operands and _contains_dynamic_operand(operands[-1]))
    if operation in {"sed", "perl"}:
        in_place = any(
            token == "--in-place"
            or token.startswith("--in-place=")
            or re.fullmatch(r"-[A-Za-z]*i(?:\..*)?", token)
            for token in args
        )
        return in_place
    return False


def _xargs_replacement(tokens: list[str], xargs_index: int, operation_index: int) -> str | None:
    """xargs -I/--replace の placeholder を返す。既定 append mode なら None。"""
    option_tokens = tokens[xargs_index + 1 : operation_index]
    for index, token in enumerate(option_tokens):
        if token in {"-I", "--replace"}:
            return option_tokens[index + 1] if index + 1 < len(option_tokens) else None
        if token.startswith("--replace="):
            return token.split("=", 1)[1]
        if token.startswith("-I") and len(token) > 2:
            return token[2:]
    return None


def _xargs_command_index(tokens: list[str], xargs_index: int, stage_end: int) -> int | None:
    """xargs option 群を越えた consumer executable の位置を返す。"""
    index = xargs_index + 1
    while index < stage_end:
        token = tokens[index]
        if token == "--":
            return index + 1 if index + 1 < stage_end else None
        if token in _XARGS_OPTIONS_WITH_VALUE:
            index += 2
            continue
        if token.startswith("--") and "=" in token:
            index += 1
            continue
        if token.startswith("-I") and len(token) > 2:
            index += 1
            continue
        if token.startswith("-"):
            index += 1
            continue
        return index
    return None


def _xargs_mutates_enumerated_paths(tokens: list[str]) -> bool:
    """xargs の列挙結果が consumer の実書込先になるか。"""
    try:
        xargs_index = next(
            index for index, token in enumerate(tokens) if Path(token).name.lower() == "xargs"
        )
    except StopIteration:
        return False
    try:
        stage_end = tokens.index("|", xargs_index + 1)
    except ValueError:
        stage_end = len(tokens)
    operation_index = _xargs_command_index(tokens, xargs_index, stage_end)
    if operation_index is None:
        return False
    command = tokens[operation_index:stage_end]
    found = _operation(command)
    if found is None:
        return False
    replacement = _xargs_replacement(tokens, xargs_index, operation_index)
    if replacement:
        command = [token.replace(replacement, _DYNAMIC_OPERAND) for token in command]
    else:
        # xargs の既定動作は列挙結果を consumer の末尾へ追加する。
        command = [*command, _DYNAMIC_OPERAND]
    return _dynamic_operand_is_mutated(command)


def _find_exec_mutates_enumerated_paths(tokens: list[str]) -> bool:
    """find -exec/-execdir の {} が consumer の実書込先になるか。"""
    try:
        exec_index = next(index for index, token in enumerate(tokens) if token in {"-exec", "-execdir"})
    except StopIteration:
        return False
    try:
        stage_end = tokens.index("|", exec_index + 1)
    except ValueError:
        stage_end = len(tokens)
    command = [
        token.replace("{}", _DYNAMIC_OPERAND) for token in tokens[exec_index + 1 : stage_end]
        if token not in {";", "\\;", "\\", "+"}
    ]
    return _dynamic_operand_is_mutated(command)


def _pipeline_has_indirect_mutation(tokens: list[str]) -> bool:
    """pipeline が列挙した path 自体を mutation するか。"""
    has_find = any(Path(token).name.lower() == "find" for token in tokens)
    if has_find and "-delete" in tokens:
        return True
    return _xargs_mutates_enumerated_paths(tokens) or _find_exec_mutates_enumerated_paths(tokens)


def _scans_guarded_area(tokens: list[str], repo_root: Path | None = None) -> bool:
    """pipeline のいずれかのトークンが保護領域を走査するか。

    relative path だけでなく、hook が受け取る repo root を使って absolute path、``$PWD``、
    ``$(pwd)``、repo root 自体 (``find .``) も同一境界へ正規化する。repo 外の同名 directory
    (例: ``/tmp/tasks``) は保護対象にしない。
    """
    root = repo_root.resolve() if repo_root is not None else None
    guarded_roots = [root / name for name in GUARDED_ROOT_NAMES] if root is not None else []
    for token in tokens:
        candidate = token.strip("\"'")
        if not candidate or candidate == "|":
            continue
        if root is None:
            if GUARDED_SCAN_ROOT.match(candidate) or _guarded_target(candidate):
                return True
            continue
        candidate = candidate.replace("${PWD}", str(root)).replace("$PWD", str(root))
        if candidate.startswith("$(pwd)"):
            candidate = str(root) + candidate[len("$(pwd)") :]
        if any(ch in candidate for ch in "*?[]{}"):
            # glob の prefix が保護領域を指す場合は静的に判定できる部分だけ使う。
            candidate = re.split(r"[*?\[\]{}]", candidate, maxsplit=1)[0].rstrip("/")
        if not candidate or candidate.startswith("-"):
            continue
        path = Path(candidate)
        resolved = (path if path.is_absolute() else root / path).resolve(strict=False)
        # repo root/ancestor を走査すると保護領域を包含する。
        if resolved == root or resolved in root.parents:
            return True
        if any(resolved == guarded or guarded in resolved.parents for guarded in guarded_roots):
            return True
    return False


def indirect_mutation_over_guarded_area(command: str, repo_root: Path | None = None) -> bool:
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
        if _pipeline_has_indirect_mutation(tokens) and _scans_guarded_area(tokens, repo_root):
            return True
    return False


def destructive_graph_or_schema_operation(command: str, repo_root: Path | None = None) -> bool:
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
    return indirect_mutation_over_guarded_area(command, repo_root)


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

    root = Path(args.repo_root).resolve()
    ok, detail = context_ok(root)
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
    elif destructive_graph_or_schema_operation(command, root):
        valid, validation_detail = schema_ok(root, detail)
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
