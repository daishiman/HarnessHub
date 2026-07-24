#!/usr/bin/env python3
"""lint-portability-knowledge-optin.py

qa-070 (appr-008) の移植チャネル契約を機械強制する fail-closed lint。
移植導線 (extract-blueprint / install-bundle) は「仕組みのみ既定 (オン)・ナレッジ
同梱は明示 opt-in (オフ既定)」でなければならない。現状 (baseline):
  - .claude-plugin/bundles.json … bundle は plugin 名 (仕組みの単位) のみ列挙し、
    ナレッジ content-root を参照しない
  - plugins/*/.claude-plugin/plugin.json … distributable フラグは plugin (仕組み) を
    gate するだけで、ナレッジ content-root を同梱 payload に含めない
  - scripts/install-bundle.sh … plugin identity を install するだけで、ナレッジ
    content-root を既定で staging/copy しない

この現状を固定検査し、ナレッジ content-root が明示 opt-in なしで同梱経路へ現れたら
FAIL する。opt-in 規約:
  - bundle: `"knowledge_optin": true` + `"knowledge": [...]` を持つ bundle だけが
    ナレッジ同梱を宣言できる
  - plugin.json: 最上位 `"knowledge_optin": true` があるときだけ payload key に
    ナレッジ content-root を置ける
  - install-bundle.sh: `INCLUDE_KNOWLEDGE` / `knowledge-optin` の opt-in gate が
    実行コードの条件式にあるときだけナレッジ content-root を参照してよい。
    コメントや echo に gate token を置くだけの偽装は gate と認めない

ナレッジ content-root: system-spec/ specs/ architecture/ features/ tasks/ issues/
docs/ eval-log/ .dev-graph/ (qa-070 のナレッジ定義)。plugins/・.claude/ は仕組みで
対象外。false-positive guard: (1) free-text の description に英単語 "knowledge" が
出ても FAIL しない (構造化フィールドの content-root path だけを見る)。(2) package の
exclude/ignore キーにナレッジ content-root が載るのは opt-out (むしろ compliant) なので
FAIL しない。設計根拠は docs/features/feat-doc-governance-portability/design.md §3。

usage:
  python3 scripts/lint-portability-knowledge-optin.py [--repo-root PATH] [--json]

exit code:
  0 違反なし
  1 違反検出 (fail-closed)
  2 設定エラー

CONVENTIONS: stdlib only.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

KNOWLEDGE_ROOTS = (
    "system-spec", "specs", "architecture", "features",
    "tasks", "issues", "docs", "eval-log", ".dev-graph",
)
# plugin.json で free-text とみなし content-root 検出を掛けないキー。
FREE_TEXT_KEYS = {"description", "$schema", "author", "homepage", "license", "keywords"}
# 「同梱除外 (opt-out)」を表すキー。ここにナレッジ content-root が載るのは、むしろ
# 既定でナレッジを配布物から外している compliant な状態なので FAIL しない。
EXCLUDE_KEYS = {"exclude", "excludes", "ignore", "gitignore"}
# install-bundle.sh の opt-in gate トークン。
OPTIN_GATE_TOKENS = ("INCLUDE_KNOWLEDGE", "knowledge-optin")
OPTIN_CONDITION_RE = re.compile(
    r"^\s*(?:if|elif|while|until|case)\b"
    r"[^\n]*(?:\bINCLUDE_KNOWLEDGE\b|knowledge-optin)",
    re.MULTILINE,
)


def is_knowledge_ref(value: str) -> bool:
    """文字列がナレッジ content-root (名 or その配下 path) を指すか。"""
    if not isinstance(value, str):
        return False
    first_seg = value.strip().split("/", 1)[0]
    return first_seg in KNOWLEDGE_ROOTS


def check_bundles(data: dict) -> list[str]:
    """bundles.json の各 bundle が仕組み (plugin 名) のみ列挙することを検査。"""
    violations: list[str] = []
    bundles = data.get("bundles", [])
    if not isinstance(bundles, list):
        return ["VIOLATION: portability-optin: bundles.json の bundles は配列であること"]
    for b in bundles:
        if not isinstance(b, dict):
            continue
        name = b.get("name", "?")
        optin = b.get("knowledge_optin") is True
        for entry in b.get("plugins", []) or []:
            if is_knowledge_ref(entry) and not optin:
                violations.append(
                    f"VIOLATION: portability-optin: bundle '{name}' の plugins に "
                    f"ナレッジ content-root '{entry}' が opt-in なしで含まれる。"
                    "bundle は仕組み (plugin 名) のみを既定同梱にする"
                )
        # opt-in なしで knowledge リストを持つのも違反。
        if not optin:
            for entry in b.get("knowledge", []) or []:
                violations.append(
                    f"VIOLATION: portability-optin: bundle '{name}' が knowledge_optin=true "
                    f"なしで knowledge '{entry}' を宣言している"
                )
    return violations


def _iter_string_values(obj, key=None):
    """(key, str_value) を再帰的に yield する。"""
    if isinstance(obj, str):
        yield key, obj
    elif isinstance(obj, dict):
        for k, v in obj.items():
            yield from _iter_string_values(v, k)
    elif isinstance(obj, list):
        for v in obj:
            yield from _iter_string_values(v, key)


def check_plugin_manifest(rel: str, data: dict) -> list[str]:
    """plugin.json が opt-in なしでナレッジ content-root を payload に持たないか検査。"""
    if not isinstance(data, dict):
        return []
    if data.get("knowledge_optin") is True:
        return []
    violations: list[str] = []
    for key, value in _iter_string_values(data):
        if key in FREE_TEXT_KEYS or key in EXCLUDE_KEYS:
            continue
        if is_knowledge_ref(value):
            violations.append(
                f"VIOLATION: portability-optin: {rel} が knowledge_optin なしで "
                f"ナレッジ content-root '{value}' (key={key}) を宣言している。"
                "distributable は仕組み (plugin) のみを gate する"
            )
    return violations


def _shell_code_lines(text: str) -> list[tuple[int, str]]:
    """コメントを除いた shell code を (lineno, code) で返す。

    opt-in token をコメントへ置くだけの gate 偽装を防ぐため、gate 判定と content-root
    判定の両方が同じ code view を使う。
    """
    code_lines: list[tuple[int, str]] = []
    for i, raw in enumerate(text.splitlines(), start=1):
        if raw.strip().startswith("#"):
            continue
        code = re.split(r"\s#", raw, maxsplit=1)[0]
        if code.strip():
            code_lines.append((i, code))
    return code_lines


def check_install_script(text: str) -> list[str]:
    """install-bundle.sh がナレッジ content-root を opt-in なしで参照しないか検査。"""
    code_lines = _shell_code_lines(text)
    code_text = "\n".join(code for _, code in code_lines)
    # token の存在だけでは gate と認めない。コメントや echo に token を置く偽装を防ぎ、
    # if/test/case 等の条件式で明示 opt-in を評価していることを要求する。
    has_optin_gate = OPTIN_CONDITION_RE.search(code_text) is not None
    if has_optin_gate:
        return []
    pattern = re.compile(
        r"(?<![\w./-])(?:" + "|".join(re.escape(r) for r in KNOWLEDGE_ROOTS) + r")/"
    )
    violations: list[str] = []
    for i, code in code_lines:
        m = pattern.search(code)
        if m:
            violations.append(
                f"VIOLATION: portability-optin: install-bundle.sh:{i} が opt-in gate "
                f"({' / '.join(OPTIN_GATE_TOKENS)}) なしでナレッジ content-root "
                f"'{m.group(0)}' を参照している"
            )
    return violations


def lint(repo_root: Path) -> list[str]:
    violations: list[str] = []

    bundles_path = repo_root / ".claude-plugin" / "bundles.json"
    if bundles_path.is_file():
        try:
            violations += check_bundles(json.loads(bundles_path.read_text(encoding="utf-8")))
        except json.JSONDecodeError as exc:
            raise ValueError(f"bundles.json を JSON として読めない: {exc}")

    for manifest in sorted((repo_root / "plugins").glob("*/.claude-plugin/plugin.json")):
        rel = manifest.relative_to(repo_root).as_posix()
        try:
            violations += check_plugin_manifest(rel, json.loads(manifest.read_text(encoding="utf-8")))
        except json.JSONDecodeError as exc:
            raise ValueError(f"{rel} を JSON として読めない: {exc}")

    install_path = repo_root / "scripts" / "install-bundle.sh"
    if install_path.is_file():
        violations += check_install_script(install_path.read_text(encoding="utf-8"))

    return violations


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", default=".", help="リポジトリルート (既定: cwd)")
    parser.add_argument("--json", action="store_true", help="JSON で結果を出力する")
    args = parser.parse_args(argv)

    repo_root = Path(args.repo_root).resolve()
    if not repo_root.is_dir():
        print(f"設定エラー: repo-root が存在しない: {repo_root}", file=sys.stderr)
        return 2
    try:
        violations = lint(repo_root)
    except ValueError as exc:
        print(f"設定エラー: {exc}", file=sys.stderr)
        return 2

    if args.json:
        print(json.dumps({"violations": violations}, indent=2, ensure_ascii=False))
    else:
        for line in violations:
            print(line, file=sys.stderr)
        if violations:
            print(f"FAIL: portability-knowledge-optin 違反 {len(violations)} 件",
                  file=sys.stderr)
        else:
            print("OK: 移植チャネルは仕組みのみ既定・ナレッジ同梱は opt-in (規約適合)")
    return 1 if violations else 0


if __name__ == "__main__":
    sys.exit(main())
