#!/usr/bin/env python3
"""lint-doc-line-limit.py

qa-070 (appr-008) のドキュメント粒度規約を機械強制する fail-closed lint。
markdown 正本文書 (system-spec/ architecture/ features/ tasks/ docs/ 配下の *.md)
は 1 文書 300 行を上限とし、超過を CI で遮断する。

既存超過文書は scripts/doc-line-limit-allowlist.json の baseline_line_count による
「縮小のみ許す ratchet」で管理する:
  - 実測 > baseline           → VIOLATION (baseline を超える肥大は許さない)
  - 実測 == baseline          → OK (現状維持)
  - 実測 <  baseline          → OK + NOTE (baseline を実測へ追随更新するよう促す)
  - allowlist 外で実測 > limit → VIOLATION (新規違反)
  - allowlist に載るが実測 <= limit → OK + NOTE (卒業。allowlist から外せる)

検査対象は git 追跡済みファイル (`git ls-files`) のみとする。未追跡の新規/編集中
ファイルは検査しない (並行編集中の草稿を「新規違反」として誤検出しないため。
設計根拠は docs/features/feat-doc-governance-portability/design.md §1)。

`--ratchet-base <rev>` を与えると、allowlist 自体の改ざん (不正追加) も fail-closed に
検査する: 基準 rev の allowlist と比較し、新規エントリ追加・baseline_line_count の拡大・
line_limit の拡大を VIOLATION にする (縮小・削除のみ許す)。allowlist が基準 rev に
存在しない場合は初導入として比較を skip する (NOTE)。CI は origin/main を基準に渡す。

usage:
  python3 scripts/lint-doc-line-limit.py [--repo-root PATH] [--allowlist PATH]
      [--ratchet-base REV] [--json]

exit code:
  0 違反なし
  1 違反検出 (fail-closed)
  2 設定エラー

CONVENTIONS: stdlib only.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

# qa-070 で列挙された markdown 正本文書 root。dev-graph の content_roots 名に一致。
CANONICAL_ROOTS = ("system-spec", "architecture", "features", "tasks", "docs")
DEFAULT_ALLOWLIST = "scripts/doc-line-limit-allowlist.json"
DEFAULT_LIMIT = 300


def count_lines(path: Path) -> int:
    """物理行数を返す。splitlines() 基準 (末尾改行の有無に依存しない決定論的な数え方)。"""
    return len(path.read_text(encoding="utf-8", errors="replace").splitlines())


def parse_allowlist(data, source: str) -> tuple[int, dict[str, int]]:
    """allowlist JSON 値を検証し (line_limit, {path: baseline_line_count}) を返す。"""
    if not isinstance(data, dict):
        raise ValueError(f"allowlist の最上位は object であること: {source}")
    limit = data.get("line_limit", DEFAULT_LIMIT)
    if not isinstance(limit, int) or limit <= 0:
        raise ValueError(f"line_limit は正の整数であること: {limit!r}")
    entries = data.get("allowlist", [])
    if not isinstance(entries, list):
        raise ValueError("allowlist キーは配列であること")
    allow_map: dict[str, int] = {}
    for i, ent in enumerate(entries):
        if not isinstance(ent, dict):
            raise ValueError(f"allowlist[{i}] は object であること")
        p = ent.get("path")
        b = ent.get("baseline_line_count")
        if not isinstance(p, str) or not p:
            raise ValueError(f"allowlist[{i}].path は非空文字列であること")
        if not isinstance(b, int) or b <= 0:
            raise ValueError(f"allowlist[{i}].baseline_line_count は正の整数であること: {b!r}")
        if p in allow_map:
            raise ValueError(f"allowlist に重複 path: {p}")
        allow_map[p] = b
    return limit, allow_map


def load_allowlist(allowlist_path: Path) -> tuple[int, dict[str, int]]:
    """allowlist file を読み、(line_limit, {path: baseline_line_count}) を返す。"""
    if not allowlist_path.is_file():
        raise FileNotFoundError(f"allowlist が見つからない: {allowlist_path}")
    try:
        data = json.loads(allowlist_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"allowlist を JSON として読めない: {allowlist_path}: {exc}")
    return parse_allowlist(data, str(allowlist_path))


def load_base_allowlist(
    repo_root: Path, base_rev: str, rel_path: str
) -> tuple[int, dict[str, int]] | None:
    """基準 rev の allowlist を git show で読む。

    rev が解決できない場合は RuntimeError (設定エラー = exit 2, fail-closed)。
    rev は解決できるが file が存在しない場合は None (allowlist 初導入)。
    """
    rev = subprocess.run(
        ["git", "-C", str(repo_root), "rev-parse", "--verify", "--quiet",
         f"{base_rev}^{{commit}}"],
        capture_output=True, text=True,
    )
    if rev.returncode != 0:
        raise RuntimeError(f"ratchet-base rev を解決できない: {base_rev}")
    proc = subprocess.run(
        ["git", "-C", str(repo_root), "show", f"{base_rev}:{rel_path}"],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        return None
    try:
        data = json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise ValueError(f"基準 rev の allowlist を JSON として読めない: {base_rev}:{rel_path}: {exc}")
    return parse_allowlist(data, f"{base_rev}:{rel_path}")


def ratchet_check(
    limit: int, allow_map: dict[str, int],
    base_limit: int, base_map: dict[str, int],
) -> list[str]:
    """allowlist 自体の改ざんを検査する (縮小・削除のみ許す ratchet)。"""
    violations: list[str] = []
    if limit > base_limit:
        violations.append(
            f"VIOLATION: allowlist-ratchet: line_limit の拡大 ({base_limit} → {limit}) は"
            "不可。上限の変更は規約 (qa-070) の改訂であり allowlist 側で行わない"
        )
    for p in sorted(allow_map):
        if p not in base_map:
            violations.append(
                f"VIOLATION: allowlist-ratchet: 新規エントリ '{p}' の追加は不可。"
                "allowlist は既存超過文書のみ・縮小のみ許す (新規超過は文書分割で解消する)"
            )
        elif allow_map[p] > base_map[p]:
            violations.append(
                f"VIOLATION: allowlist-ratchet: '{p}' の baseline_line_count 拡大 "
                f"({base_map[p]} → {allow_map[p]}) は不可 (縮小のみ許す)"
            )
    return violations


def list_tracked_docs(repo_root: Path, roots=CANONICAL_ROOTS) -> list[str]:
    """canonical root 配下の git 追跡済み *.md を repo 相対 posix で sorted 返す。

    git 管理外 (未追跡) のファイルは含めない。git repo でない場合は RuntimeError。
    """
    existing = [r for r in roots if (repo_root / r).exists()]
    if not existing:
        return []
    proc = subprocess.run(
        ["git", "-C", str(repo_root), "ls-files", "-z", "--", *existing],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"git ls-files 失敗: {proc.stderr.strip()}")
    files = [f for f in proc.stdout.split("\0") if f]
    return sorted(f for f in files if f.endswith(".md"))


def evaluate(
    repo_root: Path,
    tracked_docs: list[str],
    limit: int,
    allow_map: dict[str, int],
) -> tuple[list[str], list[str]]:
    """(violations, notes) を返す。tracked_docs は repo 相対 posix path の list。"""
    violations: list[str] = []
    notes: list[str] = []
    seen: set[str] = set()

    for rel in sorted(tracked_docs):
        seen.add(rel)
        n = count_lines(repo_root / rel)
        if rel in allow_map:
            base = allow_map[rel]
            if n > base:
                violations.append(
                    f"VIOLATION: doc-line-ratchet: {rel} は {n} 行で allowlist baseline "
                    f"{base} 行を超過。allowlist は縮小のみ許す (肥大させない)"
                )
            elif n < base:
                notes.append(
                    f"NOTE: {rel} は {n} 行へ縮小 (baseline {base})。allowlist の "
                    f"baseline_line_count を {n} へ追随更新してよい"
                )
            if n <= limit:
                notes.append(
                    f"NOTE: {rel} は {n} 行で上限 {limit} 以内へ縮小済み。"
                    "allowlist から卒業 (エントリ削除) できる"
                )
        else:
            if n > limit:
                violations.append(
                    f"VIOLATION: doc-line-limit: {rel} は {n} 行で上限 {limit} を超過。"
                    "責務単位で分割するか、remediation なら allowlist へ baseline 付きで登録する"
                )

    # allowlist にあるが追跡対象に存在しない (削除/改名) エントリは stale。
    for rel in sorted(allow_map):
        if rel not in seen:
            notes.append(
                f"NOTE: allowlist の {rel} は git 追跡対象に存在しない (削除/改名済み)。"
                "エントリを削除してよい"
            )
    return violations, notes


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", default=".", help="リポジトリルート (既定: cwd)")
    parser.add_argument("--allowlist", default=None,
                        help=f"allowlist path (既定: <repo-root>/{DEFAULT_ALLOWLIST})")
    parser.add_argument("--ratchet-base", default=None, metavar="REV",
                        help="allowlist 改ざん検査の基準 rev (例: origin/main)。"
                             "基準比で新規エントリ追加・baseline/limit 拡大を VIOLATION にする")
    parser.add_argument("--json", action="store_true", help="JSON で結果を出力する")
    args = parser.parse_args(argv)

    repo_root = Path(args.repo_root).resolve()
    if not repo_root.is_dir():
        print(f"設定エラー: repo-root が存在しない: {repo_root}", file=sys.stderr)
        return 2
    allowlist_path = (
        Path(args.allowlist) if args.allowlist else repo_root / DEFAULT_ALLOWLIST
    )
    try:
        limit, allow_map = load_allowlist(allowlist_path)
        tracked = list_tracked_docs(repo_root)
        violations, notes = evaluate(repo_root, tracked, limit, allow_map)
        if args.ratchet_base:
            base = load_base_allowlist(repo_root, args.ratchet_base, DEFAULT_ALLOWLIST)
            if base is None:
                notes.append(
                    f"NOTE: allowlist は基準 rev ({args.ratchet_base}) に存在しない "
                    "(初導入)。ratchet 比較を skip した"
                )
            else:
                violations.extend(ratchet_check(limit, allow_map, base[0], base[1]))
    except (FileNotFoundError, ValueError, RuntimeError) as exc:
        print(f"設定エラー: {exc}", file=sys.stderr)
        return 2

    if args.json:
        print(json.dumps({
            "line_limit": limit,
            "checked": len(tracked),
            "violations": violations,
            "notes": notes,
        }, indent=2, ensure_ascii=False))
    else:
        for line in notes:
            print(line)
        for line in violations:
            print(line, file=sys.stderr)
        if violations:
            print(f"FAIL: doc-line-limit 違反 {len(violations)} 件 "
                  f"(検査 {len(tracked)} 文書, 上限 {limit} 行)", file=sys.stderr)
        else:
            print(f"OK: doc-line-limit 適合 (検査 {len(tracked)} 文書, 上限 {limit} 行, "
                  f"allowlist {len(allow_map)} 件)")
    return 1 if violations else 0


if __name__ == "__main__":
    sys.exit(main())
