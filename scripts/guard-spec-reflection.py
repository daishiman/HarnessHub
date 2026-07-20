#!/usr/bin/env python3
# /// script
# name: guard-spec-reflection
# purpose: gh pr create を PreToolUse で検査し、有効な仕様反映受領書が無ければ fail-closed で拒否する。
# inputs: [stdin Claude hook JSON, argv --repo-root]
# outputs: [exit 0 allow, exit 2 deny with stderr]
# contexts: [E]
# network: false
# write-scope: none
# dependencies: [build-spec-reflection-receipt.py]
# requires-python: ">=3.11"
# ///
"""PR 作成前の仕様反映を毎回確実化する gate。

BLOCK 条件 (いずれか): 受領書なし / branch 不一致 / HEAD 不一致 (記録後に commit が
積まれた stale) / reflected 主張なのに現 diff が仕様 path を含まない。
解除方法: 仕様影響を確認・反映のうえ build-spec-reflection-receipt.py で再記録する。
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path

# guard-graph-schema.py と同じ「コマンド開始位置」限定 match。引用文・commit message 中の
# 単なる文字列 "gh pr create" では発火させない (re.M で複数行 command の各行頭も対象)。
GH_PR_CREATE = re.compile(r"(?:^|[;&|]\s*|\$\(\s*)gh\s+pr\s+create\b", re.I | re.M)


def _recorder():
    path = Path(__file__).resolve().parent / "build-spec-reflection-receipt.py"
    spec = importlib.util.spec_from_file_location("spec_reflection_receipt", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def payload() -> dict:
    try:
        value = json.load(sys.stdin)
        return value if isinstance(value, dict) else {}
    except Exception:
        return {}


def command_of(value: dict) -> str:
    tool_input = value.get("tool_input") or {}
    return str(tool_input.get("command") or "") if isinstance(tool_input, dict) else ""


def deny(message: str) -> int:
    print(
        "[guard-spec-reflection] BLOCKED: " + message + "\n"
        "  対応: 本変更分の仕様・設計への影響を確認し、影響があれば system-spec/ 等へ正規フローで"
        "反映したうえで、\n"
        "  python3 scripts/build-spec-reflection-receipt.py"
        " --repo-root <root> --spec-impact reflected\n"
        "  (影響が無い場合は --spec-impact none --reason \"<判断理由>\") を実行してから"
        " gh pr create を再実行する。",
        file=sys.stderr,
    )
    return 2


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", required=True, type=Path)
    args = parser.parse_args()

    command = command_of(payload())
    if not GH_PR_CREATE.search(command):
        return 0

    root = args.repo_root.resolve()
    try:
        recorder = _recorder()
        branch = recorder._git(root, "branch", "--show-current")
        head = recorder._git(root, "rev-parse", "HEAD")
        path = recorder.receipt_path(root, branch)
    except Exception as exc:  # fail-closed
        return deny(f"repository 状態を確認できない: {exc}")

    if not path.is_file():
        return deny(f"仕様反映の受領書が無い ({path})")
    try:
        receipt = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return deny(f"受領書を読めない: {exc}")

    if receipt.get("branch") != branch:
        return deny(f"受領書の branch {receipt.get('branch')!r} が現 branch {branch!r} と不一致")
    if receipt.get("head_sha") != head:
        return deny(
            f"受領書が stale (記録時 HEAD {str(receipt.get('head_sha'))[:12]} != 現 HEAD {head[:12]})。"
            "受領書の記録後に commit が積まれている — 追加分の仕様影響を再確認して再記録する"
        )
    if receipt.get("spec_impact") == "reflected":
        try:
            _, spec_files = recorder.diff_spec_files(root, str(receipt.get("base_ref") or "origin/main"))
        except Exception as exc:
            return deny(f"diff を検証できない: {exc}")
        if not spec_files:
            return deny("受領書は reflected だが、現 diff は仕様 path を1件も含まない")
    return 0


if __name__ == "__main__":
    sys.exit(main())
