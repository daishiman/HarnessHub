#!/usr/bin/env python3
"""lint-doc-internal-link-integrity.py

HarnessHub-j7a4: md 本文に書かれた repo 内 path 参照のうち、実在しないもの
(dangling) を機械検出する fail-closed lint。

背景: HarnessHub-ov4u で「lint-doc-link-integrity 系が緑」を受入条件に掲げたが、
該当する lint が repo に実在しなかった。scripts/lint-doc-line-limit.py は行数のみ、
scripts/lint-external-refs.py は SKILL.md の外部 script 参照のみ、
plugins/dev-graph/scripts/validate-evidence-refs.py は graph node の evidence_refs
フィールドのみを見る。よって「md 本文の path 参照」は誰も検査していなかった。

検査対象 (既定 docs/ と issues/ 配下の git 追跡済み *.md):
  - inline code span     例: `scripts/lint-doc-line-limit.py`
  - markdown inline link 例: [設計](docs/features/foo/design.md)

fenced code block (``` / ~~~ で囲まれた領域) は検査しない。実行例やログ貼付が
主で、実在しない例示 path を意図的に書く場面があるため (誤検出を持ち込まない)。

候補 token の判定は保守的に行う。「先頭セグメントが repo の実在 top-level
ディレクトリ」かつ「/ を含む」ものだけを path 参照とみなす。top-level 集合は
git ls-files から動的に得るので、repo 構成の変化に追随する。

baseline が赤い場合、path 単位 allowlist は設けない (どの dangling も単なる
バグであり、恒久的な例外として正当化してはならない)。代わりに --max-violations
で「総件数の上限」だけを固定する ratchet を提供する。件数は減る方向にしか
動かせず、どの 1 件を先に直すかは実装者が選べる。

usage:
  python3 scripts/lint-doc-internal-link-integrity.py [--repo-root PATH]
      [--root DIR ...] [--max-violations N] [--json]

exit code:
  0 違反なし (または --max-violations 以内)
  1 違反検出 (fail-closed)
  2 設定エラー

CONVENTIONS: stdlib only.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

# 既定の検査 root。受入条件が名指しする docs/ と issues/。
DEFAULT_ROOTS = ("docs", "issues")

# fenced code block の開始/終了。``` と ~~~ の両方 (情報文字列は任意)。
FENCE_RE = re.compile(r"^\s{0,3}(`{3,}|~{3,})")
# inline code span。改行を跨がない最短一致。
CODE_SPAN_RE = re.compile(r"`([^`\n]+)`")
# markdown inline link の target 部。空白を含まない一塊のみ拾う。
LINK_RE = re.compile(r"\[[^\]\n]*\]\(([^)\s]+)\)")

# path とみなさない文字。glob/変数展開/プレースホルダを含む token は除外する。
# '?' は含めない (URL の query 区切りとして後段で落とすため。1 文字 glob より
# query の方が md 本文では圧倒的に多い)。
PLACEHOLDER_CHARS = set("*<>{}$|")
# token 末尾から剥がす句読点。日本語文中に path を埋める書き方に対応する。
TRAILING_PUNCT = "。、,.:;)]}'\"`"
# token 先頭から剥がす引用符など。
LEADING_PUNCT = "([{'\"`"


def list_tracked_markdown(repo_root: Path, roots: tuple[str, ...]) -> list[str]:
    """検査 root 配下の git 追跡済み *.md を repo 相対 posix で sorted 返す。"""
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


def repo_top_level(repo_root: Path) -> set[str]:
    """git 追跡下の top-level ディレクトリ名集合。path 参照の第 1 セグメント判定に使う。"""
    proc = subprocess.run(
        ["git", "-C", str(repo_root), "ls-files", "-z"],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"git ls-files 失敗: {proc.stderr.strip()}")
    tops: set[str] = set()
    for f in proc.stdout.split("\0"):
        if not f:
            continue
        head, sep, _ = f.partition("/")
        if sep:
            tops.add(head)
    return tops


def strip_fenced_blocks(text: str) -> list[tuple[int, str]]:
    """fenced code block を除いた (1 始まり行番号, 行) の list を返す。"""
    out: list[tuple[int, str]] = []
    fence: str | None = None
    for i, line in enumerate(text.splitlines(), start=1):
        m = FENCE_RE.match(line)
        if fence is None:
            if m:
                fence = m.group(1)[0] * 3
                continue
            out.append((i, line))
        else:
            # 開始と同種の fence 文字なら閉じる。
            if m and m.group(1)[0] * 3 == fence:
                fence = None
    return out


def normalize_token(token: str) -> str | None:
    """path 候補 token を正規化する。path 参照とみなせない場合は None。"""
    tok = token.strip().strip(LEADING_PUNCT).rstrip(TRAILING_PUNCT)
    if not tok:
        return None
    if PLACEHOLDER_CHARS & set(tok):
        return None
    # URL / scheme 付き / mailto / ページ内アンカーは repo 内 path ではない。
    if "://" in tok or tok.startswith(("#", "mailto:", "//")):
        return None
    # anchor と query を落とす。
    tok = tok.split("#", 1)[0].split("?", 1)[0]
    # pytest node id (path::test_name) の test 部を落とす。
    tok = tok.split("::", 1)[0]
    # docs/.../foo.md のような省略記法は具体 path ではない (書き手が意図的に略している)。
    if "..." in tok:
        return None
    # file.ts:120 / file.ts:120-140 のような行番号サフィックスを落とす。
    tok = re.sub(r":\d+(?:-\d+)?$", "", tok)
    if tok.startswith("./"):
        tok = tok[2:]
    if not tok or "/" not in tok:
        return None
    if tok.startswith("/") or tok.startswith("../"):
        # 絶対 path と親方向の相対 path は「repo 内 path 参照」の対象外
        # (前者は環境依存、後者は書き手の基準位置に依存し決定論的に解けない)。
        return None
    return tok


def extract_candidates(line: str) -> list[str]:
    """1 行から repo 内 path 候補 token を抽出する (重複はそのまま返す)。"""
    raw: list[str] = []
    for span in CODE_SPAN_RE.findall(line):
        # code span はコマンド全体であることが多い。空白で割って各 token を見る。
        raw.extend(span.split())
    raw.extend(LINK_RE.findall(line))
    out: list[str] = []
    for token in raw:
        norm = normalize_token(token)
        if norm is not None:
            out.append(norm)
    return out


def scan(
    repo_root: Path, docs: list[str], tops: set[str]
) -> tuple[int, list[dict[str, object]]]:
    """(検査した参照件数, 違反 list) を返す。"""
    checked_refs = 0
    violations: list[dict[str, object]] = []
    for rel in docs:
        text = (repo_root / rel).read_text(encoding="utf-8", errors="replace")
        for lineno, line in strip_fenced_blocks(text):
            for target in extract_candidates(line):
                if target.split("/", 1)[0] not in tops:
                    continue  # repo 内 path 参照ではない (外部語彙・URL 断片など)
                checked_refs += 1
                if not (repo_root / target).exists():
                    violations.append({
                        "document": rel,
                        "line": lineno,
                        "target": target,
                    })
    return checked_refs, violations


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", default=".", help="リポジトリルート (既定: cwd)")
    parser.add_argument("--root", action="append", default=None, metavar="DIR",
                        help=f"検査 root (繰り返し可。既定: {' '.join(DEFAULT_ROOTS)})")
    parser.add_argument("--max-violations", type=int, default=0, metavar="N",
                        help="許容する違反総数 (既定 0)。baseline 赤の段階解消用 ratchet。"
                             "実測がこれを下回ったら N を実測へ引き下げること")
    parser.add_argument("--json", action="store_true", help="JSON で結果を出力する")
    args = parser.parse_args(argv)

    repo_root = Path(args.repo_root).resolve()
    if not repo_root.is_dir():
        print(f"設定エラー: repo-root が存在しない: {repo_root}", file=sys.stderr)
        return 2
    if args.max_violations < 0:
        print("設定エラー: --max-violations は 0 以上であること", file=sys.stderr)
        return 2
    roots = tuple(args.root) if args.root else DEFAULT_ROOTS

    try:
        docs = list_tracked_markdown(repo_root, roots)
        tops = repo_top_level(repo_root)
        checked_refs, violations = scan(repo_root, docs, tops)
    except (OSError, RuntimeError) as exc:
        print(f"設定エラー: {exc}", file=sys.stderr)
        return 2

    over = len(violations) > args.max_violations
    notes: list[str] = []
    if not docs:
        # zero attribution: 「違反 0」と「検査対象 0」を絶対に同じ 0 に潰さない。
        notes.append(
            f"NOTE: 検査対象の md が 0 件 (root={','.join(roots)})。"
            "違反 0 ではなく未検査であることに注意する"
        )
    if checked_refs == 0 and docs:
        notes.append(
            f"NOTE: md {len(docs)} 件を読んだが repo 内 path 参照が 0 件だった。"
            "違反 0 ではなく検査対象参照が無いことに注意する"
        )
    if not over and args.max_violations > 0 and len(violations) < args.max_violations:
        notes.append(
            f"NOTE: 違反 {len(violations)} 件は許容上限 {args.max_violations} を下回った。"
            f"--max-violations を {len(violations)} へ引き下げて ratchet を締めること"
        )

    if args.json:
        print(json.dumps({
            "roots": list(roots),
            "checked_documents": len(docs),
            "checked_references": checked_refs,
            "violation_count": len(violations),
            "max_violations": args.max_violations,
            "violations": violations,
            "notes": notes,
        }, indent=2, ensure_ascii=False))
    else:
        for note in notes:
            print(note)
        for v in violations:
            print(
                f"VIOLATION: doc-internal-link-dangling: {v['document']}:{v['line']} が"
                f" 実在しない repo 内 path '{v['target']}' を参照している",
                file=sys.stderr if over else sys.stdout,
            )
        summary = (
            f"(検査 {len(docs)} 文書 / {checked_refs} 参照, 違反 {len(violations)} 件, "
            f"許容 {args.max_violations} 件)"
        )
        if over:
            print(f"FAIL: doc-internal-link-integrity {summary}", file=sys.stderr)
        else:
            print(f"OK: doc-internal-link-integrity {summary}")
    return 1 if over else 0


if __name__ == "__main__":
    sys.exit(main())
