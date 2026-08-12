#!/usr/bin/env python3
"""Markdown 本文の repo 内参照が、git 追跡済み target を指すか検査する。

検査対象は既定で ``docs/`` と ``issues/`` 配下の worktree に実在する ``*.md``。
新規作成直後の未追跡 Markdown も参照元として検査するが、参照先として有効なのは
git 追跡済み file/directory だけとする。fenced code block 内は、実在しない例示 path を
許すため対象外にする。

参照の基準位置は、表記の役割に合わせて分ける。

* inline code span: repo root 基準。既知の repo top-level から始まる path と
  ``./`` / ``../`` の明示相対 path だけを候補にする。
* Markdown link: ``./`` / ``../`` / bare relative は文書の親 directory 基準。
  ただし既知の repo top-level から始まる既存 house style は repo root 基準。

存在と認めるのは git 追跡済み file、または追跡済み file から導出できる directory
だけである。worktree にたまたま存在する未追跡 file は合格にしない。

既存違反は ``--max-violations`` で総数を固定する。さらに ``--ratchet-base REF`` を
指定すると、base tree の違反 fingerprint（文書 + 解決後 target）と比較し、総数を
維持したまま古い違反を新しい違反へ入れ替える抜け道も遮断する。base は checkout
せず git object database から読み取る。

exit code: 0=合格、1=違反、2=設定/読取エラー。
CONVENTIONS: stdlib only.
"""
from __future__ import annotations

import argparse
import json
import posixpath
import re
import subprocess
import sys
from pathlib import Path
from typing import NamedTuple

DEFAULT_ROOTS = ("docs", "issues")

# CommonMark と同じく、closing fence は opener と同種かつ同じ長さ以上が必要。
FENCE_RE = re.compile(r"^\s{0,3}(`{3,}|~{3,})")
CODE_SPAN_RE = re.compile(r"`([^`\n]+)`")
LINK_RE = re.compile(r"\[[^\]\n]*\]\(([^)\s]+)\)")

PLACEHOLDER_CHARS = set("*<>{}$|")
TRAILING_PUNCT = "。、,.:;)]}'\"`"
LEADING_PUNCT = "([{'\"`"


class Reference(NamedTuple):
    kind: str  # "code" | "link"
    token: str


class Snapshot(NamedTuple):
    files: frozenset[str]
    contents: dict[str, str]

    @property
    def directories(self) -> frozenset[str]:
        directories: set[str] = set()
        for filename in self.files:
            parent = posixpath.dirname(filename)
            while parent:
                directories.add(parent)
                parent = posixpath.dirname(parent)
        return frozenset(directories)

    @property
    def top_levels(self) -> frozenset[str]:
        return frozenset(
            filename.split("/", 1)[0]
            for filename in self.files
            if "/" in filename
        )


def _git(repo_root: Path, args: list[str], *, text: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", "-C", str(repo_root), *args],
        capture_output=True,
        text=text,
    )


def _git_paths(repo_root: Path, args: list[str]) -> list[str]:
    zero_args = list(args)
    # pathspec separator より後ろへ -z を足すと file name と解釈されるため、その直前へ置く。
    zero_args.insert(zero_args.index("--") if "--" in zero_args else len(zero_args), "-z")
    proc = _git(repo_root, zero_args)
    if proc.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} 失敗: {proc.stderr.strip()}")
    return [path for path in proc.stdout.split("\0") if path]


def _under_roots(path: str, roots: tuple[str, ...]) -> bool:
    return any(path == root or path.startswith(f"{root}/") for root in roots)


def _markdown_paths(files: frozenset[str], roots: tuple[str, ...]) -> list[str]:
    return sorted(path for path in files if path.endswith(".md") and _under_roots(path, roots))


def current_snapshot(repo_root: Path, roots: tuple[str, ...]) -> Snapshot:
    """追跡済み target 集合と、未追跡を含む worktree の検査文書本文を得る。"""
    tracked = set(_git_paths(repo_root, ["ls-files"]))
    # 1 file ずつ stat すると大規模 repo で遅い。index に残る worktree 削除だけを
    # git 自身に列挙させれば、未追跡 file を混ぜず同じ集合を 2 subprocess で得られる。
    deleted = set(_git_paths(repo_root, ["ls-files", "--deleted"]))
    files = frozenset(tracked - deleted)
    documents = set(_markdown_paths(files, roots))
    existing_roots = [root for root in roots if (repo_root / root).exists()]
    if existing_roots:
        untracked = _git_paths(
            repo_root,
            ["ls-files", "--others", "--exclude-standard", "--", *existing_roots],
        )
        documents.update(
            path for path in untracked
            if path.endswith(".md") and _under_roots(path, roots)
        )
    contents = {
        path: (repo_root / path).read_text(encoding="utf-8", errors="replace")
        for path in sorted(documents)
    }
    return Snapshot(files, contents)


def _resolve_commit(repo_root: Path, ref: str) -> str:
    if not ref or ref.startswith("-"):
        raise RuntimeError(f"ratchet-base rev が不正: {ref!r}")
    proc = _git(repo_root, ["rev-parse", "--verify", f"{ref}^{{commit}}"])
    if proc.returncode != 0:
        raise RuntimeError(f"ratchet-base rev を解決できない: {ref}")
    return proc.stdout.strip()


def _read_blobs(repo_root: Path, commit: str, paths: list[str]) -> dict[str, str]:
    """git cat-file --batch で base 本文を checkout せず一括取得する。"""
    if not paths:
        return {}
    requests = "".join(f"{commit}:{path}\n" for path in paths).encode()
    proc = subprocess.run(
        ["git", "-C", str(repo_root), "cat-file", "--batch"],
        input=requests,
        capture_output=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(
            f"git cat-file --batch 失敗: {proc.stderr.decode(errors='replace').strip()}"
        )

    contents: dict[str, str] = {}
    offset = 0
    output = proc.stdout
    for path in paths:
        newline = output.find(b"\n", offset)
        if newline < 0:
            raise RuntimeError(f"base tree blob header が欠落: {path}")
        header = output[offset:newline].decode(errors="replace")
        parts = header.split()
        if len(parts) != 3 or parts[1] != "blob" or not parts[2].isdigit():
            raise RuntimeError(f"base tree blob を読めない: {path}: {header}")
        size = int(parts[2])
        start = newline + 1
        end = start + size
        if end >= len(output) or output[end:end + 1] != b"\n":
            raise RuntimeError(f"base tree blob が途中で終わった: {path}")
        contents[path] = output[start:end].decode(encoding="utf-8", errors="replace")
        offset = end + 1
    return contents


def ref_snapshot(repo_root: Path, roots: tuple[str, ...], ref: str) -> Snapshot:
    """REF の tree を object database から安全に読む（worktree は変更しない）。"""
    commit = _resolve_commit(repo_root, ref)
    files = frozenset(_git_paths(repo_root, ["ls-tree", "-r", "--name-only", commit]))
    docs = _markdown_paths(files, roots)
    return Snapshot(files, _read_blobs(repo_root, commit, docs))


# 旧 API 名は純関数テストや手元利用との互換のため残す。
def list_tracked_markdown(repo_root: Path, roots: tuple[str, ...]) -> list[str]:
    return _markdown_paths(current_snapshot(repo_root, roots).files, roots)


def repo_top_level(repo_root: Path) -> set[str]:
    return set(current_snapshot(repo_root, ()).top_levels)


def strip_fenced_blocks(text: str) -> list[tuple[int, str]]:
    """fenced code block を除いた (1 始まり行番号, 行) を返す。"""
    out: list[tuple[int, str]] = []
    fence_char: str | None = None
    fence_length = 0
    for lineno, line in enumerate(text.splitlines(), start=1):
        match = FENCE_RE.match(line)
        if fence_char is None:
            if match:
                marker = match.group(1)
                fence_char, fence_length = marker[0], len(marker)
                continue
            out.append((lineno, line))
            continue
        if match:
            marker = match.group(1)
            if marker[0] == fence_char and len(marker) >= fence_length:
                fence_char = None
                fence_length = 0
    return out


def normalize_token(token: str) -> str | None:
    """参照 token を正規化する。URL 等の repo 外語彙なら None。"""
    tok = token.strip().strip(LEADING_PUNCT).rstrip(TRAILING_PUNCT)
    if not tok or PLACEHOLDER_CHARS & set(tok):
        return None
    if "://" in tok or tok.startswith(("#", "mailto:", "//", "/")):
        return None
    tok = tok.split("#", 1)[0].split("?", 1)[0]
    tok = tok.split("::", 1)[0]
    if "..." in tok:
        return None
    tok = re.sub(r":\d+(?:-\d+)?$", "", tok)
    return tok or None


def extract_references(line: str) -> list[Reference]:
    """1 行から code span と Markdown link を役割付きで抽出する。"""
    references: list[Reference] = []
    for span in CODE_SPAN_RE.findall(line):
        for raw in span.split():
            token = normalize_token(raw)
            if token is not None and "/" in token:
                references.append(Reference("code", token))
    for raw in LINK_RE.findall(line):
        token = normalize_token(raw)
        if token is not None:
            references.append(Reference("link", token))
    return references


def extract_candidates(line: str) -> list[str]:
    """互換 API: 抽出した token だけを返す。"""
    return [reference.token for reference in extract_references(line)]


def resolve_reference(
    document: str,
    reference: Reference,
    top_levels: frozenset[str] | set[str],
) -> str | None:
    """repo 相対 target を返す。候補外 code span は None、repo 脱出は ``..`` を返す。"""
    token = reference.token
    first = token.split("/", 1)[0]
    if reference.kind == "code":
        # code span は repo-root 基準。ただし通常語を path と誤認しないよう入口を絞る。
        if first not in top_levels and not token.startswith(("./", "../")):
            return None
        return posixpath.normpath(token)

    # Markdown link の bare known-top-level は repo 固有 house style として root 基準。
    if not token.startswith(("./", "../")) and first in top_levels:
        return posixpath.normpath(token)
    return posixpath.normpath(posixpath.join(posixpath.dirname(document), token))


def scan_snapshot(snapshot: Snapshot, roots: tuple[str, ...]) -> tuple[int, list[dict[str, object]]]:
    checked_refs = 0
    violations: list[dict[str, object]] = []
    valid_targets = snapshot.files | snapshot.directories
    top_levels = snapshot.top_levels
    for document in sorted(snapshot.contents):
        text = snapshot.contents[document]
        for lineno, line in strip_fenced_blocks(text):
            for reference in extract_references(line):
                target = resolve_reference(document, reference, top_levels)
                if target is None:
                    continue
                checked_refs += 1
                outside = target == ".." or target.startswith("../")
                if outside or target not in valid_targets:
                    violations.append({
                        "document": document,
                        "line": lineno,
                        "reference": reference.token,
                        "target": target,
                        "reason": "repo-outside" if outside else "dangling",
                    })
    return checked_refs, violations


def scan(
    repo_root: Path, docs: list[str], tops: set[str]
) -> tuple[int, list[dict[str, object]]]:
    """互換 API。docs/tops は旧呼び出し形を保つため受け取る。"""
    del docs, tops
    snapshot = current_snapshot(repo_root, DEFAULT_ROOTS)
    return scan_snapshot(snapshot, DEFAULT_ROOTS)


def _fingerprint(violation: dict[str, object]) -> tuple[str, str]:
    return str(violation["document"]), str(violation["target"])


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", default=".", help="リポジトリルート (既定: cwd)")
    parser.add_argument("--root", action="append", default=None, metavar="DIR",
                        help=f"検査 root (繰り返し可。既定: {' '.join(DEFAULT_ROOTS)})")
    parser.add_argument("--max-violations", type=int, default=0, metavar="N",
                        help="許容する違反総数 (既定 0)。既存 baseline の段階解消用")
    parser.add_argument("--ratchet-base", default=None, metavar="REF",
                        help="REF の違反 fingerprint と比較し、新規違反を 1 件でも遮断")
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
        current = current_snapshot(repo_root, roots)
        checked_refs, violations = scan_snapshot(current, roots)
        base_violations: list[dict[str, object]] = []
        if args.ratchet_base:
            base = ref_snapshot(repo_root, roots, args.ratchet_base)
            _, base_violations = scan_snapshot(base, roots)
    except (OSError, RuntimeError) as exc:
        print(f"設定エラー: {exc}", file=sys.stderr)
        return 2

    base_fingerprints = {_fingerprint(v) for v in base_violations}
    new_fingerprints = {
        _fingerprint(v) for v in violations
        if _fingerprint(v) not in base_fingerprints
    }
    # 同一文書・同一 target の複数行は 1 fingerprint。行移動や重複だけでは新規にしない。
    new_violations = [
        violation for violation in violations
        if _fingerprint(violation) in new_fingerprints
    ]
    deduped_new = {
        _fingerprint(violation): violation for violation in new_violations
    }
    new_violations = [deduped_new[key] for key in sorted(deduped_new)]

    total_over = len(violations) > args.max_violations
    fingerprint_over = bool(args.ratchet_base and new_violations)
    failed = total_over or fingerprint_over
    docs = sorted(current.contents)
    notes: list[str] = []
    if not docs:
        notes.append(
            f"NOTE: 検査対象の md が 0 件 (root={','.join(roots)})。"
            "違反 0 ではなく未検査であることに注意する"
        )
    if checked_refs == 0 and docs:
        notes.append(
            f"NOTE: md {len(docs)} 件を読んだが repo 内 path 参照が 0 件だった。"
            "違反 0 ではなく検査対象参照が無いことに注意する"
        )
    if not failed and args.max_violations > 0 and len(violations) < args.max_violations:
        notes.append(
            f"NOTE: 違反 {len(violations)} 件は許容上限 {args.max_violations} を下回った。"
            f"--max-violations を {len(violations)} へ引き下げて ratchet を締めること"
        )

    payload = {
        "roots": list(roots),
        "checked_documents": len(docs),
        "checked_references": checked_refs,
        "violation_count": len(violations),
        "max_violations": args.max_violations,
        "ratchet_base": args.ratchet_base,
        "new_violation_count": len(new_violations),
        "violations": violations,
        "new_violations": new_violations,
        "notes": notes,
    }
    if args.json:
        print(json.dumps(payload, indent=2, ensure_ascii=False))
    else:
        for note in notes:
            print(note)
        for violation in violations:
            stream = sys.stderr if failed else sys.stdout
            reason = "repo 外へ脱出" if violation["reason"] == "repo-outside" else "未追跡/不存在"
            print(
                f"VIOLATION: doc-internal-link-{violation['reason']}: "
                f"{violation['document']}:{violation['line']} の '{violation['reference']}' は "
                f"'{violation['target']}' ({reason})",
                file=stream,
            )
        summary = (
            f"(検査 {len(docs)} 文書 / {checked_refs} 参照, 違反 {len(violations)} 件, "
            f"許容 {args.max_violations} 件, 新規 fingerprint {len(new_violations)} 件)"
        )
        if failed:
            print(f"FAIL: doc-internal-link-integrity {summary}", file=sys.stderr)
        else:
            print(f"OK: doc-internal-link-integrity {summary}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
