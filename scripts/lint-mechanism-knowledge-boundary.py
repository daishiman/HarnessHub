#!/usr/bin/env python3
"""lint-mechanism-knowledge-boundary.py

qa-070 (appr-008) の「仕組みとナレッジのオン・オフ分離」境界を機械強制する
fail-closed lint。仕組み側ファイル (portable mechanism = plugins/ 配下の Python。
.claude/skills/ は plugins/ への symlink 投影なので plugins/ 走査で被覆する) が
repo 固有ナレッジ (固有 graph node id・固有 knowledge path・固有 qa 番号) を
hard-coded 参照していないかを検査する。

過検出 (Goodhart 化) を避けるため、次を厳密に区別する:
  FAIL: 制御フロー/既定値として使われる「コード値の文字列リテラル」に含まれる
        ナレッジ参照 (例: `qa = "qa-070"` / `if fid == "feat-hub-foundation":` /
        `default="features/feat-x.md"`)。これは仕組みへナレッジを焼き込んだ混入。
  PASS: コメント (`# ...`) と docstring / bare 文字列文 (根拠引用) に現れる同じ参照。
        Python AST 上、docstring と bare 文字列式は `Expr(Constant str)` であり、
        コメントは AST に現れない。両者を exempt することで根拠引用を素通しする。
        さらに argparse 等の documentation channel (help=/description=/epilog=/
        usage=/metavar= の keyword 引数) の文字列も、制御フローでも既定値でもない
        「説明文 (citation)」なので exempt する (`default=None` で実既定は config 解決。
        false-positive guard の核。design.md §2)。

既存混入 (qa-070:『既存の混入は一括修正せず発見時に beads issue へ起票して段階的に
解消する』) は KNOWN_EXISTING baseline で記録し、fail させず可視化のみ行う。新規混入
だけを遮断する ratchet。エントリを増やして緑化する Goodhart は禁止 (縮小のみが正)。

分割記述による検出回避 (`"qa-" + "070"` / `f"qa-{70}"` / `"qa-%d" % 70` /
`"qa-{}".format(70)`) は定数畳み込みで合成後の文字列を検査して遮断する。非定数部を
含む合成 (`f"tasks/{name}.md"` / `"qa-" + suffix`) は入力由来の正当な組み立てなので
検出しない (placeholder `{}` が token 照合を構造的に不成立にする)。

ナレッジ参照トークン (repo 固有・低誤検出):
  K1 qa 番号            qa-<digits>
  K2 ナレッジ path      (system-spec|specs|architecture|features|tasks|issues)/….(md|json|jsonl)
  K3 feature/issue node id  feat-<slug> / issue-<slug> (仕組みは plugin/skill 名を使い
                            feat-/issue- id は使わないので曖昧さが低い)
  ※ docs/・eval-log/・.dev-graph/ の path、および arch-/spec-/sys- 接頭辞は仕組み側の
    識別子 (spec-drift-guardian 等) やエラーコードと衝突し過検出になるため対象外。
    設計根拠は docs/features/feat-doc-governance-portability/design.md §2。

usage:
  python3 scripts/lint-mechanism-knowledge-boundary.py [--repo-root PATH] [--json]

exit code:
  0 違反なし
  1 違反検出 (fail-closed)
  2 設定エラー

CONVENTIONS: stdlib only.
"""
from __future__ import annotations

import argparse
import ast
import json
import re
import sys
from pathlib import Path

MECHANISM_ROOTS = ("plugins",)
# tests / templates / 生成 payload / cache は portable mechanism 本体ではないため除外。
SKIP_PARTS = {"__pycache__", "node_modules", ".git", "templates"}


def _is_test_file(path: Path) -> bool:
    if "tests" in path.parts:
        return True
    name = path.name
    return name.startswith("test_") or name.endswith("_test.py") or name == "conftest.py"


KNOWLEDGE_TOKEN_RES = [
    ("qa-number", re.compile(r"(?<![0-9A-Za-z])qa-\d+(?![0-9A-Za-z])")),
    ("knowledge-path", re.compile(
        r"(?<![\w./-])(?:system-spec|specs|architecture|features|tasks|issues)"
        r"/[\w./-]*\.(?:md|json|jsonl)(?![\w])"
    )),
    ("node-id", re.compile(r"(?<![\w-])(?:feat|issue)-[a-z0-9]+(?:-[a-z0-9]+)+(?![\w-])")),
]

# 制御フローでも既定値でもない documentation channel の keyword 引数。説明文 (citation)
# として exempt する (argparse help=/description= 等)。
DOC_KWARGS = {"help", "description", "epilog", "usage", "metavar"}

# 既存混入 baseline。(repo 相対 posix path, kind, token) で照合する shrink-only 集合。
# qa-070 導入時の唯一の既知項目は portable な script 自己名から導出する形へ移行済み。
KNOWN_EXISTING: set[tuple[str, str, str]] = set()


def _fold_constant_str(node: ast.AST) -> str | None:
    """定数のみから合成される文字列式を畳み込んで返す (分割記述回避の遮断)。

    対象: Constant str / `+` 連結 / `%` フォーマット / f-string / str.format。
    f-string の非定数部は placeholder `{}` に置換する — `{}` は token 正規表現の
    文字クラスに入らないため、入力由来の動的組み立てを誤検出しない。
    畳み込めない式は None (検査対象外)。
    """
    if isinstance(node, ast.Constant):
        return node.value if isinstance(node.value, str) else None
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
        left = _fold_constant_str(node.left)
        right = _fold_constant_str(node.right)
        return left + right if left is not None and right is not None else None
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Mod):
        left = _fold_constant_str(node.left)
        if left is None:
            return None
        r = node.right
        try:
            if isinstance(r, ast.Constant):
                return left % r.value
            if isinstance(r, ast.Tuple) and all(isinstance(e, ast.Constant) for e in r.elts):
                return left % tuple(e.value for e in r.elts)
        except (TypeError, ValueError, KeyError):
            return None
        return None
    if isinstance(node, ast.JoinedStr):
        parts: list[str] = []
        for v in node.values:
            if isinstance(v, ast.Constant) and isinstance(v.value, str):
                parts.append(v.value)
            elif isinstance(v, ast.FormattedValue) and isinstance(v.value, ast.Constant):
                parts.append(str(v.value.value))
            else:
                parts.append("{}")
        return "".join(parts)
    if (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
            and node.func.attr == "format"
            and isinstance(node.func.value, ast.Constant)
            and isinstance(node.func.value.value, str)
            and all(isinstance(a, ast.Constant) for a in node.args)
            and all(kw.arg and isinstance(kw.value, ast.Constant) for kw in node.keywords)):
        try:
            return node.func.value.value.format(
                *[a.value for a in node.args],
                **{kw.arg: kw.value.value for kw in node.keywords},
            )
        except (IndexError, KeyError, ValueError):
            return None
    return None


def find_knowledge_literals(source: str) -> list[tuple[int, str, str]]:
    """コード値の文字列リテラルに含まれるナレッジ参照を (lineno, kind, token) で返す。

    docstring / bare 文字列式 (Expr(Constant str)) とコメントは根拠引用として exempt。
    argparse 等の documentation channel keyword 引数 (help=/description= 等) も exempt。
    定数のみの合成式 (`+`/`%`/f-string/str.format) は畳み込み後の文字列も検査する
    (分割記述による検出回避の遮断)。
    構文エラーの source は検査不能として空を返す (別 lint が構文を担保)。
    """
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return []

    # docstring / bare 文字列式 + documentation channel keyword を exempt。
    # 合成 citation (`"qa-" + "070"` の bare 文 / help= 内連結) は内側の部分式も
    # 畳み込み対象に現れるため、除外は root だけでなく部分木ごと行う。
    # bare Expr で除外するのは文字列合成形 (Constant/BinOp/JoinedStr) のみ —
    # bare Call 文 (`register("qa-070")`) は実行コードなので除外しない。
    exempt_roots: list[ast.AST] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Expr) and isinstance(
                node.value, (ast.Constant, ast.BinOp, ast.JoinedStr)):
            exempt_roots.append(node.value)
        elif isinstance(node, ast.Call):
            for kw in node.keywords:
                if kw.arg in DOC_KWARGS:
                    exempt_roots.append(kw.value)
    exempt_ids: set[int] = {
        id(sub) for root in exempt_roots for sub in ast.walk(root)
    }

    hits: list[tuple[int, str, str]] = []
    for node in ast.walk(tree):
        if id(node) in exempt_ids:
            continue
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            value = node.value
        elif isinstance(node, (ast.BinOp, ast.JoinedStr, ast.Call)):
            folded = _fold_constant_str(node)
            if folded is None:
                continue
            value = folded
        else:
            continue
        for kind, rex in KNOWLEDGE_TOKEN_RES:
            m = rex.search(value)
            if m:
                hits.append((getattr(node, "lineno", 0), kind, m.group(0)))
    # 決定論: 行番号・kind・token で sorted。set で合成式と内包リテラルの重複を排除。
    return sorted(set(hits))


def iter_mechanism_files(repo_root: Path, roots=MECHANISM_ROOTS) -> list[Path]:
    out: list[Path] = []
    for root in roots:
        rp = repo_root / root
        if not rp.is_dir():
            continue
        for p in rp.rglob("*.py"):
            if any(part in SKIP_PARTS for part in p.parts):
                continue
            if _is_test_file(p):
                continue
            out.append(p)
    return sorted(out)


def lint(repo_root: Path) -> tuple[list[str], list[str]]:
    """(violations, notes) を返す。KNOWN_EXISTING baseline 分は notes へ回す。"""
    violations: list[str] = []
    notes: list[str] = []
    for path in iter_mechanism_files(repo_root):
        try:
            source = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        rel = path.relative_to(repo_root).as_posix()
        for lineno, kind, token in find_knowledge_literals(source):
            if (rel, kind, token) in KNOWN_EXISTING:
                notes.append(
                    f"NOTE: known-existing: {rel}:{lineno} ({kind}: '{token}') は "
                    "qa-070 既存混入 baseline。beads で段階解消し、解消後 KNOWN_EXISTING から削除する"
                )
                continue
            violations.append(
                f"VIOLATION: mechanism-knowledge-boundary: {rel}:{lineno} は "
                f"repo 固有ナレッジ ({kind}: '{token}') をコード値へ hard-code している。"
                "仕組みは node id/path/qa 番号を入力 (args/config/content-root 解決) で受け取る"
            )
    return violations, notes


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", default=".", help="リポジトリルート (既定: cwd)")
    parser.add_argument("--json", action="store_true", help="JSON で結果を出力する")
    args = parser.parse_args(argv)

    repo_root = Path(args.repo_root).resolve()
    if not repo_root.is_dir():
        print(f"設定エラー: repo-root が存在しない: {repo_root}", file=sys.stderr)
        return 2

    violations, notes = lint(repo_root)
    if args.json:
        print(json.dumps({"violations": violations, "notes": notes},
                         indent=2, ensure_ascii=False))
    else:
        for line in notes:
            print(line)
        for line in violations:
            print(line, file=sys.stderr)
        if violations:
            print(f"FAIL: mechanism-knowledge-boundary 違反 {len(violations)} 件",
                  file=sys.stderr)
        else:
            print("OK: 仕組み側ファイルに repo 固有ナレッジの hard-code 参照なし "
                  f"(known-existing baseline {len(notes)} 件)")
    return 1 if violations else 0


if __name__ == "__main__":
    sys.exit(main())
