#!/usr/bin/env python3
# /// script
# name: build-spec-reflection-receipt
# purpose: PR 作成前の「仕様反映確認」の受領書を HEAD 束縛で記録する (guard-spec-reflection.py の入力)。
# inputs: [argv --repo-root --spec-impact --reason --base]
# outputs: [<git-common-dir>/dev-graph/spec-reflection/<branch>.json, exit 0 ok, exit 2 deny]
# contexts: [E]
# network: false
# write-scope: git-common-dir/dev-graph/spec-reflection
# requires-python: ">=3.11"
# ///
"""実装差分の仕様反映 (system-spec/architecture 等への還流) を PR 前に確実化する受領書 recorder。

- `--spec-impact reflected`: 本 branch の diff が仕様 path を実際に含むことを機械検証して記録する。
- `--spec-impact none`: 仕様影響なしの宣言。`--reason` を必須とする。
- 受領書は HEAD sha に束縛される。記録後に commit を積むと stale になり、
  guard-spec-reflection.py が `gh pr create` を BLOCK する (再確認・再記録を強制)。
- 保存先は worktree lease と同じ git 共通ディレクトリ配下 (PR diff を汚さない)。
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

SCHEMA_VERSION = "1.0.0"

# 仕様反映先として認める repository 相対 path prefix (README Part 2 Step 10 の反映先定義と一致させる)。
# 「reflected」の主張はこの prefix のいずれかに diff が触れていることを機械検証の根拠にする。
SPEC_PATH_PREFIXES: tuple[str, ...] = (
    "system-spec/",
    "specs/",
    "architecture/",
)


def _git(root: Path, *args: str) -> str:
    proc = subprocess.run(
        ["git", "-C", str(root), *args], capture_output=True, text=True, check=False
    )
    if proc.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} failed: {proc.stderr.strip()}")
    return proc.stdout.strip()


def receipt_path(root: Path, branch: str) -> Path:
    common = Path(_git(root, "rev-parse", "--git-common-dir"))
    if not common.is_absolute():
        common = (root / common).resolve()
    slug = branch.replace("/", "__")
    return common / "dev-graph" / "spec-reflection" / f"{slug}.json"


def diff_spec_files(root: Path, base: str) -> tuple[list[str], list[str]]:
    """base との merge-base 起点で変更 file を列挙し、(全 file, 仕様 file) を返す。"""
    names = _git(root, "diff", "--name-only", f"{base}...HEAD")
    files = [line for line in names.splitlines() if line.strip()]
    spec_files = [f for f in files if f.startswith(SPEC_PATH_PREFIXES)] if SPEC_PATH_PREFIXES else []
    return files, spec_files


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", default=".", type=Path)
    parser.add_argument("--spec-impact", required=True, choices=["reflected", "none"])
    parser.add_argument("--reason", default="")
    parser.add_argument("--base", default="origin/main")
    args = parser.parse_args()
    root = args.repo_root.resolve()

    try:
        branch = _git(root, "branch", "--show-current")
        if not branch or branch in {"main", "master"}:
            print(f"[spec-reflection] DENY: branch {branch!r} では記録しない", file=sys.stderr)
            return 2
        if _git(root, "status", "--porcelain"):
            print(
                "[spec-reflection] DENY: 未コミット変更が残っている。全変更を commit してから記録する"
                " (受領書は HEAD に束縛されるため)",
                file=sys.stderr,
            )
            return 2
        head = _git(root, "rev-parse", "HEAD")
        files, spec_files = diff_spec_files(root, args.base)
    except RuntimeError as exc:
        print(f"[spec-reflection] DENY: {exc}", file=sys.stderr)
        return 2

    if args.spec_impact == "reflected" and not spec_files:
        prefixes = ", ".join(SPEC_PATH_PREFIXES) or "(未設定)"
        print(
            "[spec-reflection] DENY: --spec-impact reflected だが diff が仕様 path"
            f" ({prefixes}) を1件も含まない。反映してから再実行するか、影響が無いなら"
            " --spec-impact none --reason で理由を記録する",
            file=sys.stderr,
        )
        return 2
    if args.spec_impact == "none" and not args.reason.strip():
        print(
            "[spec-reflection] DENY: --spec-impact none には --reason (仕様影響が無い判断理由) が必須",
            file=sys.stderr,
        )
        return 2

    path = receipt_path(root, branch)
    path.parent.mkdir(parents=True, exist_ok=True)
    receipt = {
        "schema_version": SCHEMA_VERSION,
        "branch": branch,
        "base_ref": args.base,
        "head_sha": head,
        "spec_impact": args.spec_impact,
        "reason": args.reason.strip(),
        "spec_files": spec_files,
        "changed_file_count": len(files),
        "recorded_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"[spec-reflection] OK: {args.spec_impact} を記録 (branch={branch}, head={head[:12]},"
        f" spec_files={len(spec_files)}) -> {path}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
