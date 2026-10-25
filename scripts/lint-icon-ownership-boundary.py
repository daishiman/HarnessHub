#!/usr/bin/env python3
"""lint-icon-ownership-boundary.py

アイコンの供給元を `packages/ui/src/icons` 一箇所に限る所有境界を機械強制する
fail-closed lint (HarnessHub-pbrl / feat-semantic-emphasis-icons P09-P10 由来)。

なぜ実測ではなくゲートなのか:
  「今は inline SVG が 0 件」は実測すれば分かるが、実測は明日の 1 件を止めない。
  アイコンは画面を書くたびに増える語彙なので、供給元が 2 箇所に割れるのは
  「気づいたら割れていた」形でしか起きない。割れた後の統合は全画面の描き直しに
  なるため、割れる前に落とす側に置く。

検出する 3 種の再実装 (いずれも apps/hub 側の画面コードが対象):
  V1 inline-svg   コード中の `<svg …>` 要素。図形をその場で描く = 供給元の分岐。
  V2 svg-source   文字列中の SVG マークアップ / `data:image/svg+xml` URI。
                  dangerouslySetInnerHTML・CSS background・img src 経由の迂回路。
  V3 emoji-icon   絵文字のアイコン利用。OS ごとに別の絵になり、色が絵文字側に
                  焼き付いていて配色トークンもダークテーマも継がないため、
                  packages/ui の stroke アイコンと同じ意味を担えない。

過検出 (Goodhart 化) を避けるための除外:
  - コメント (`//` / `/* */`) の中の記述は根拠引用なので素通しする。
    「なぜ inline SVG を使わないか」をコメントに書いた瞬間に落ちる lint は、
    説明を消す方向の圧力を生んで逆効果になる。
  - テストコード (`__tests__/` 配下・`*.test.*` / `*.spec.*`) は出荷される画面では
    なく、検査用の被写体として SVG を組み立てる正当な理由がある。
  - ALLOWLIST に理由つきで宣言された path。baseline は空 (現状 0 件) で、
    エントリを増やして緑化するのは禁止 (縮小のみが正)。

usage:
  python3 scripts/lint-icon-ownership-boundary.py [--repo-root PATH] [--json]

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

# 検査対象。画面コードだけを見る。packages/ui は供給元そのものなので対象外。
SCAN_ROOTS = ("apps/hub/src",)
SCAN_SUFFIXES = (".ts", ".tsx")
SKIP_PARTS = {"node_modules", ".next", ".open-next", "__pycache__"}

# 既存の例外。path -> 理由。増やして緑にすることは禁止 (縮小のみが正)。
ALLOWLIST: dict[str, str] = {}

_INLINE_SVG_RE = re.compile(r"<svg[\s/>]")
_SVG_SOURCE_RE = re.compile(r"<svg[\s/>]|data:image/svg\+xml")
# 絵文字 (pictograph) のみ。矢印 `→` や `↔` は記号であり絵文字ではないので対象外。
# ここを広げると日本語コメント/文言中の記号で落ち始め、lint が信用されなくなる。
_EMOJI_RE = re.compile(
    "[\U0001f300-\U0001faff\U0001f000-\U0001f2ff☀-➿️\U0001f900-\U0001f9ff]"
)

_RULES = (
    ("inline-svg", "画面コードで SVG を直接描いている。packages/ui/src/icons の Icon を使う"),
    ("svg-source", "文字列/URI 経由で SVG を持ち込んでいる。packages/ui/src/icons の Icon を使う"),
    ("emoji-icon", "絵文字をアイコンとして使っている。配色トークンを継がないので Icon に置き換える"),
)
_RULE_MESSAGE = dict(_RULES)


def _is_test_file(path: Path) -> bool:
    if "__tests__" in path.parts or "tests" in path.parts:
        return True
    name = path.name
    return ".test." in name or ".spec." in name


def _code_and_string_spans(source: str) -> list[tuple[int, int, str]]:
    """行ごとに「コメントでない範囲」を返す。

    戻り値は (行番号, 列, 種別) ではなく (行番号1始まり, 開始列, 断片) の並び。
    TS/TSX の完全なパーサは stdlib に無いので、コメントと文字列だけを追う軽い
    スキャナで足りる。ここで必要なのは「その位置がコメントの中か否か」だけで、
    式の構造までは要らない。
    """
    spans: list[tuple[int, int, str]] = []
    line = 1
    col = 0
    i = 0
    n = len(source)
    buf: list[str] = []
    buf_line = 1
    buf_col = 0
    quote = ""  # 文字列リテラルの中にいるときの引用符

    def flush() -> None:
        nonlocal buf
        if buf:
            spans.append((buf_line, buf_col, "".join(buf)))
            buf = []

    while i < n:
        ch = source[i]
        nxt = source[i + 1] if i + 1 < n else ""
        if quote:
            # 文字列の中では `//` はコメント開始ではない (URL の `https://` が
            # コメント扱いされると、その行の残りが丸ごと検査から漏れる)。
            if ch == "\\":
                buf.append(source[i : i + 2])
                i += 2
                col += 2
                continue
            if ch == quote:
                quote = ""
            if ch == "\n":
                flush()
                line += 1
                col = 0
                i += 1
                buf_line, buf_col = line, col
                continue
            if not buf:
                buf_line, buf_col = line, col
            buf.append(ch)
            i += 1
            col += 1
            continue
        if ch in "'\"`":
            quote = ch
            if not buf:
                buf_line, buf_col = line, col
            buf.append(ch)
            i += 1
            col += 1
            continue
        if ch == "/" and nxt == "/":
            flush()
            while i < n and source[i] != "\n":
                i += 1
            continue
        if ch == "/" and nxt == "*":
            flush()
            i += 2
            while i < n and not (source[i] == "*" and i + 1 < n and source[i + 1] == "/"):
                if source[i] == "\n":
                    line += 1
                    col = 0
                i += 1
                col += 1
            i += 2
            col += 2
            buf_line, buf_col = line, col
            continue
        if ch == "\n":
            flush()
            line += 1
            col = 0
            i += 1
            buf_line, buf_col = line, col
            continue
        if not buf:
            buf_line, buf_col = line, col
        buf.append(ch)
        i += 1
        col += 1
    flush()
    return spans


def _scan_source(rel_path: str, source: str) -> list[dict]:
    """1 ファイルを検査する。コメントを外した断片だけを規則に掛ける。"""
    findings: list[dict] = []
    for line_no, col, fragment in _code_and_string_spans(source):
        for rule, pattern in (
            ("inline-svg", _INLINE_SVG_RE),
            ("svg-source", _SVG_SOURCE_RE),
            ("emoji-icon", _EMOJI_RE),
        ):
            match = pattern.search(fragment)
            if match is None:
                continue
            # inline-svg と svg-source は同じ `<svg` に二重で当たる。より具体的な
            # inline-svg を優先し、1 箇所 1 違反にする (件数が水増しされると
            # 「大量に落ちたので一旦 allowlist」という緑化圧力が生まれる)。
            if rule == "svg-source" and _INLINE_SVG_RE.search(fragment):
                continue
            findings.append(
                {
                    "rule": rule,
                    "path": rel_path,
                    "line": line_no,
                    "column": col + match.start() + 1,
                    "excerpt": fragment.strip()[:120],
                    "message": _RULE_MESSAGE[rule],
                }
            )
    return findings


def _target_files(repo_root: Path) -> list[Path]:
    files: list[Path] = []
    for root in SCAN_ROOTS:
        base = repo_root / root
        if not base.exists():
            continue
        for path in sorted(base.rglob("*")):
            if not path.is_file() or path.suffix not in SCAN_SUFFIXES:
                continue
            if SKIP_PARTS & set(path.parts):
                continue
            if _is_test_file(path):
                continue
            files.append(path)
    return files


def lint(repo_root: Path) -> dict:
    findings: list[dict] = []
    allowed: list[dict] = []
    files = _target_files(repo_root)
    for path in files:
        rel = path.relative_to(repo_root).as_posix()
        try:
            source = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for finding in _scan_source(rel, source):
            if rel in ALLOWLIST:
                allowed.append({**finding, "allow_reason": ALLOWLIST[rel]})
            else:
                findings.append(finding)
    return {
        "scanned_files": len(files),
        "violations": findings,
        "allowed": allowed,
        "ok": not findings,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--repo-root", default=".", help="リポジトリのルート")
    parser.add_argument("--json", action="store_true", help="結果を JSON で出す")
    args = parser.parse_args(argv)

    repo_root = Path(args.repo_root).resolve()
    if not repo_root.is_dir():
        print(f"repo-root が見つかりません: {repo_root}", file=sys.stderr)
        return 2

    result = lint(repo_root)
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        # 検査件数を必ず出す。0 件検査の exit 0 と「違反なし」の exit 0 は同じ
        # 緑に見えるが、意味は正反対なので区別できる情報を残す。
        print(f"検査対象: {result['scanned_files']} ファイル ({', '.join(SCAN_ROOTS)})")
        for item in result["allowed"]:
            print(f"  allow {item['path']}:{item['line']} [{item['rule']}] {item['allow_reason']}")
        for item in result["violations"]:
            print(f"NG {item['path']}:{item['line']}:{item['column']} [{item['rule']}] {item['message']}")
            print(f"   > {item['excerpt']}")
        if result["ok"]:
            print("アイコン所有境界: 違反なし")
        else:
            print(f"アイコン所有境界: {len(result['violations'])} 件の違反")
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
