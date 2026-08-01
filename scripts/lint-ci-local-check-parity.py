#!/usr/bin/env python3
# /// script
# name: lint-ci-local-check-parity
# purpose: GitHub Actions が repo-root scripts/*.py から実行する検査を、引数形ごとにローカル pre-push ゲートが被覆することを fail-closed で検証する。
# inputs:
#   - .github/workflows/*.yml
#   - scripts/run-ci-checks.sh
#   - scripts/ci-local-check-allowlist.json
# outputs:
#   - stdout: CI/local/allowlist の集合突合サマリ
#   - stderr: 未被覆・stale allowlist・解析不能入力
# contexts: [C, E]
# network: false
# write-scope: none
# dependencies: [PyYAML]
# requires-python: ">=3.10"
# ///
"""CI の repo-root Python 検査をローカル pre-push が被覆するか検査する。

HarnessHub-ml57 で、``scripts/run-ci-checks.sh`` が「CI と同等」と表示する一方、
GitHub Actions にしか結線されていない検査が 19 件あることが判明した。スクリプト名だけの
比較では ``validate-harness-coverage.py`` の bare 実行と ``--ratchet`` 実行を同一視し、
実際に発生した回帰を見逃す。この lint は次の集合包含を機械的に強制する。

    CI の blocking な repo-root ``python3 scripts/*.py`` 呼び出し
      ⊆ run-ci-checks.sh の hard-fail ``run`` 呼び出し ∪ 理由付き allowlist

呼び出しの鍵は script path と正規化した引数である。長い option は順序を無視する一方、
option の値は保持するため、YAML の折返しや flag の並べ替えでは揺れず、``--check`` の
有無や ``--threshold 80`` の値差は別の呼び出しとして扱う。

対象を repo-root の ``scripts/*.py`` に限定するのは、課題の受け入れ条件と既存の
``run-ci-checks.sh`` の責務境界に合わせるためである。workflow/job/step の
``working-directory`` が repo root でない呼び出しは plugin-local script なので除外する。
CI の非 blocking 呼び出しも黙って捨てず、ローカル非実行の理由を allowlist に要求する。

Exit 0 = parity、1 = 集合差/allowlist 違反、2 = 入力または解析エラー。
"""
from __future__ import annotations

import argparse
import json
import re
import shlex
import sys
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path, PurePosixPath

try:
    import yaml
except ImportError:  # pragma: no cover - CI/local requirements-dev.txt は PyYAML 前提
    print("[ERR] PyYAML が必要です: pip install pyyaml", file=sys.stderr)
    raise SystemExit(2)


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_WORKFLOWS = Path(".github/workflows")
DEFAULT_LOCAL_RUNNER = Path("scripts/run-ci-checks.sh")
DEFAULT_ALLOWLIST = Path("scripts/ci-local-check-allowlist.json")

PYTHON = {"python", "python3"}
CONTROL_TOKENS = {"&&", "||", ";", "|", "&"}
REDIRECT_RE = re.compile(r"^(?:\d*(?:>>?|<<?)|\d*>\&\d+)")
SCRIPT_RE = re.compile(r"^scripts/[A-Za-z0-9][A-Za-z0-9_.-]*\.py$")
LOCAL_RUN_RE = re.compile(r"^\s*(run|run_soft)\s+")


@dataclass(frozen=True, order=True)
class Invocation:
    """集合比較に使う、順序が安定した呼び出し形。"""

    script: str
    args: tuple[str, ...]

    def display(self) -> str:
        return shlex.join((self.script, *self.args))


@dataclass(frozen=True)
class FoundInvocation:
    invocation: Invocation
    blocking: bool
    source: str


@dataclass(frozen=True)
class AllowEntry:
    invocation: Invocation
    reason: str


@dataclass
class AuditResult:
    errors: list[str]
    ci_blocking: set[Invocation]
    ci_nonblocking: set[Invocation]
    local_blocking: set[Invocation]
    local_soft: set[Invocation]
    allowlisted: set[Invocation]


def normalize_args(args: list[str] | tuple[str, ...]) -> tuple[str, ...]:
    """option の順序を無視し、値と positional の意味は保持して正規化する。

    ``--foo=value`` と ``--foo value`` は同一形にする。長い option に続く非 option
    token はその値として扱う。root scripts の現行 CLI はこの一般的な形に統一されている。
    positional は順序が意味を持ちうるため並べ替えない。
    """

    options: list[tuple[str, str | None]] = []
    positional: list[str] = []
    tokens = list(args)
    index = 0
    while index < len(tokens):
        token = tokens[index]
        if token == "--":
            positional.extend(tokens[index + 1 :])
            break
        if token.startswith("--") and len(token) > 2:
            if "=" in token:
                name, value = token.split("=", 1)
                options.append((name, value))
            elif index + 1 < len(tokens) and not tokens[index + 1].startswith("-"):
                options.append((token, tokens[index + 1]))
                index += 1
            else:
                options.append((token, None))
        elif token.startswith("-") and token != "-":
            if index + 1 < len(tokens) and not tokens[index + 1].startswith("-"):
                options.append((token, tokens[index + 1]))
                index += 1
            else:
                options.append((token, None))
        else:
            positional.append(token)
        index += 1

    normalized_options = [
        name if value is None else f"{name}={value}"
        for name, value in sorted(options, key=lambda item: (item[0], item[1] or ""))
    ]
    return tuple((*positional, *normalized_options))


def _logical_lines(shell: str) -> list[str]:
    joined = re.sub(r"\\\s*\n", " ", shell)
    return joined.splitlines()


def _tokens(line: str, source: str) -> list[str]:
    try:
        lexer = shlex.shlex(line, posix=True, punctuation_chars=";&|")
        lexer.whitespace_split = True
        lexer.commenters = "#"
        return list(lexer)
    except ValueError as exc:
        raise ValueError(f"{source}: shell を解析できない: {exc}") from exc


def extract_python_invocations(
    shell: str,
    *,
    source: str,
    step_blocking: bool,
    require_local_wrapper: bool = False,
) -> list[FoundInvocation]:
    """shell 文字列から repo-root ``python3 scripts/*.py`` 呼び出しを抽出する。"""

    found: list[FoundInvocation] = []
    for line_number, line in enumerate(_logical_lines(shell), start=1):
        if not line.strip():
            continue
        # 複数行の jq / heredoc / python -c には、1 行だけを shlex へ渡すと引用が閉じない
        # 断片がありうる。対象 command が無い行は shell 解析自体を行わず、対象外の構文に
        # パーサの成否を左右させない。
        if not re.search(r"\b(?:python|python3)\s+scripts/[A-Za-z0-9]", line):
            continue
        if require_local_wrapper and not LOCAL_RUN_RE.match(line):
            continue
        tokens = _tokens(line, f"{source}:{line_number}")
        wrapper = tokens[0] if tokens else ""
        if require_local_wrapper and wrapper not in {"run", "run_soft"}:
            continue

        for index, token in enumerate(tokens[:-1]):
            if token not in PYTHON or not SCRIPT_RE.fullmatch(tokens[index + 1]):
                continue
            script = PurePosixPath(tokens[index + 1]).as_posix()
            args: list[str] = []
            cursor = index + 2
            nonblocking_suffix = False
            while cursor < len(tokens):
                current = tokens[cursor]
                if current in CONTROL_TOKENS:
                    if current == "||" and cursor + 1 < len(tokens) and tokens[cursor + 1] == "true":
                        nonblocking_suffix = True
                    break
                if REDIRECT_RE.match(current):
                    break
                args.append(current)
                cursor += 1

            blocking = step_blocking and not nonblocking_suffix
            if require_local_wrapper:
                blocking = wrapper == "run"
            found.append(
                FoundInvocation(
                    Invocation(script, normalize_args(args)),
                    blocking,
                    f"{source}:{line_number}",
                )
            )
    return found


def _working_directory(
    workflow: dict, job: dict, step: dict, *, source: str
) -> str:
    workflow_run = ((workflow.get("defaults") or {}).get("run") or {})
    job_run = ((job.get("defaults") or {}).get("run") or {})
    value = step.get(
        "working-directory",
        job_run.get("working-directory", workflow_run.get("working-directory", ".")),
    )
    if not isinstance(value, str):
        raise ValueError(f"{source}: working-directory は文字列でなければならない")
    if "${{" in value:
        raise ValueError(
            f"{source}: working-directory {value!r} は静的解決できない。"
            "repo-root scripts の被覆判定を fail-closed で停止する"
        )
    normalized = PurePosixPath(value or ".").as_posix()
    return "." if normalized in {"", "."} else normalized


def collect_ci_invocations(root: Path) -> tuple[list[FoundInvocation], list[str]]:
    workflows_dir = root / DEFAULT_WORKFLOWS
    paths = sorted((*workflows_dir.glob("*.yml"), *workflows_dir.glob("*.yaml")))
    if not paths:
        return [], [f"{DEFAULT_WORKFLOWS}: workflow が 1 件も無い"]

    found: list[FoundInvocation] = []
    errors: list[str] = []
    for path in paths:
        rel = path.relative_to(root).as_posix()
        try:
            workflow = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        except (OSError, yaml.YAMLError) as exc:
            errors.append(f"{rel}: YAML を解析できない: {exc}")
            continue
        if not isinstance(workflow, dict):
            errors.append(f"{rel}: workflow root は mapping でなければならない")
            continue
        jobs = workflow.get("jobs") or {}
        if not isinstance(jobs, dict):
            errors.append(f"{rel}: jobs は mapping でなければならない")
            continue
        for job_id, job in jobs.items():
            if not isinstance(job, dict):
                continue
            steps = job.get("steps") or []
            if not isinstance(steps, list):
                errors.append(f"{rel}:{job_id}: steps は list でなければならない")
                continue
            for step_index, step in enumerate(steps):
                if not isinstance(step, dict) or "run" not in step:
                    continue
                label = step.get("name") or f"step[{step_index}]"
                source = f"{rel}:{job_id}:{label}"
                try:
                    cwd = _working_directory(workflow, job, step, source=source)
                except ValueError as exc:
                    if "scripts/" in str(step.get("run") or ""):
                        errors.append(str(exc))
                    continue
                if cwd != ".":
                    continue
                continue_on_error = step.get("continue-on-error", False)
                step_blocking = continue_on_error is not True
                try:
                    found.extend(
                        extract_python_invocations(
                            str(step.get("run") or ""),
                            source=source,
                            step_blocking=step_blocking,
                        )
                    )
                except ValueError as exc:
                    errors.append(str(exc))
    if not found:
        errors.append("CI から repo-root python3 scripts/*.py 呼び出しを 1 件も抽出できない")
    return found, errors


def collect_local_invocations(root: Path) -> tuple[list[FoundInvocation], list[str]]:
    path = root / DEFAULT_LOCAL_RUNNER
    if not path.is_file():
        return [], [f"{DEFAULT_LOCAL_RUNNER}: local runner が無い"]
    try:
        found = extract_python_invocations(
            path.read_text(encoding="utf-8"),
            source=DEFAULT_LOCAL_RUNNER.as_posix(),
            step_blocking=True,
            require_local_wrapper=True,
        )
    except (OSError, ValueError) as exc:
        return [], [str(exc)]
    if not found:
        return [], [f"{DEFAULT_LOCAL_RUNNER}: run 呼び出しを 1 件も抽出できない"]
    return found, []


def load_allowlist(root: Path, relative: Path = DEFAULT_ALLOWLIST) -> tuple[list[AllowEntry], list[str]]:
    path = root / relative
    rel = relative.as_posix()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return [], [f"{rel}: allowlist を解析できない: {exc}"]
    if not isinstance(data, dict) or data.get("schema_version") != 1:
        return [], [f"{rel}: schema_version は 1 でなければならない"]
    raw_entries = data.get("entries")
    if not isinstance(raw_entries, list):
        return [], [f"{rel}: entries は list でなければならない"]

    entries: list[AllowEntry] = []
    errors: list[str] = []
    seen: set[Invocation] = set()
    for index, raw in enumerate(raw_entries):
        where = f"{rel}:entries[{index}]"
        if not isinstance(raw, dict):
            errors.append(f"{where}: entry は object でなければならない")
            continue
        script = raw.get("script")
        args = raw.get("args")
        reason = raw.get("reason")
        if not isinstance(script, str) or not SCRIPT_RE.fullmatch(script):
            errors.append(f"{where}: script は repo-root scripts/*.py 形式でなければならない")
            continue
        if not isinstance(args, list) or not all(isinstance(arg, str) for arg in args):
            errors.append(f"{where}: args は文字列の list でなければならない")
            continue
        if not isinstance(reason, str) or not reason.strip():
            errors.append(f"{where}: reason は空にできない")
            continue
        invocation = Invocation(script, normalize_args(args))
        if invocation in seen:
            errors.append(f"{where}: 重複 entry: {invocation.display()}")
            continue
        seen.add(invocation)
        entries.append(AllowEntry(invocation, reason.strip()))
    return entries, errors


def audit(root: Path, allowlist_path: Path = DEFAULT_ALLOWLIST) -> AuditResult:
    ci_found, ci_errors = collect_ci_invocations(root)
    local_found, local_errors = collect_local_invocations(root)
    entries, allow_errors = load_allowlist(root, allowlist_path)
    errors = [*ci_errors, *local_errors, *allow_errors]

    ci_sources: dict[Invocation, list[str]] = defaultdict(list)
    local_sources: dict[Invocation, list[str]] = defaultdict(list)
    for item in ci_found:
        ci_sources[item.invocation].append(item.source)
    for item in local_found:
        local_sources[item.invocation].append(item.source)

    ci_blocking = {item.invocation for item in ci_found if item.blocking}
    ci_nonblocking = {item.invocation for item in ci_found if not item.blocking} - ci_blocking
    local_blocking = {item.invocation for item in local_found if item.blocking}
    local_soft = {item.invocation for item in local_found if not item.blocking} - local_blocking
    allowlisted = {entry.invocation for entry in entries}
    reasons = {entry.invocation: entry.reason for entry in entries}

    ci_all = ci_blocking | ci_nonblocking
    missing = ci_all - local_blocking
    uncovered = missing - allowlisted
    for invocation in sorted(uncovered):
        mode = "blocking" if invocation in ci_blocking else "non-blocking"
        source_text = ", ".join(sorted(ci_sources[invocation]))
        errors.append(
            f"CI-only ({mode}): {invocation.display()} [{source_text}]。"
            f"{DEFAULT_LOCAL_RUNNER} の hard-fail run へ同じ引数形で追加するか、"
            f"{allowlist_path.as_posix()} へ理由付きで正確に宣言すること"
        )

    stale = allowlisted - missing
    for invocation in sorted(stale):
        if invocation not in ci_all:
            detail = "CI に同じ呼び出し形が存在しない"
        else:
            detail = "local hard-fail run が既に被覆している"
        errors.append(
            f"stale allowlist: {invocation.display()} ({detail})。entry を削除すること"
        )

    soft_only = (ci_blocking & local_soft) - local_blocking - allowlisted
    for invocation in sorted(soft_only):
        errors.append(
            f"local soft-only: {invocation.display()} は CI では blocking だが "
            "run-ci-checks.sh では run_soft のため pre-push 成功を保証しない"
        )

    for invocation in sorted(missing & allowlisted):
        if not reasons.get(invocation, "").strip():  # loader の防御を audit 側でも保持
            errors.append(f"allowlist reason missing: {invocation.display()}")

    return AuditResult(
        errors=errors,
        ci_blocking=ci_blocking,
        ci_nonblocking=ci_nonblocking,
        local_blocking=local_blocking,
        local_soft=local_soft,
        allowlisted=allowlisted & missing,
    )


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, default=ROOT)
    parser.add_argument("--allowlist", type=Path, default=DEFAULT_ALLOWLIST)
    args = parser.parse_args(argv)
    root = args.repo_root.resolve()
    result = audit(root, args.allowlist)
    print(
        "CI/local check parity: "
        f"CI blocking={len(result.ci_blocking)} / "
        f"CI non-blocking={len(result.ci_nonblocking)} / "
        f"local hard={len(result.local_blocking)} / "
        f"allowlist={len(result.allowlisted)}"
    )
    if result.errors:
        for error in result.errors:
            print(f"NG: {error}", file=sys.stderr)
        return 1
    print("ok: CI の repo-root Python 検査は local hard gate または理由付き allowlist で被覆済み")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
