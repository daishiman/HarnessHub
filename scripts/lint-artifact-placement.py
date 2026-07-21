#!/usr/bin/env python3
"""lint-artifact-placement.py

保存先配置規約 (README Part 3「保存先の正規表」) を機械強制する。
成果物の置き場がセッションごとに散らばる事故を fail-closed で遮断する。

検査項目:
- dev-graph 管理下 root (specs/architecture/features/tasks) の *.md は
  graph.json への登録必須 (orphan artifact 遮断。正規経路以外の直置きを検出)
- docs/*.md は frontmatter に status: と layer: が必須 (無標識の草案を遮断)
- system-spec/ 直下はコンパイラ出力 (*.md) と正本 JSON 3 種のみ (混入遮断)
- リポジトリ直下のファイルは allowlist 制 (置き場迷子の遮断)

dev-graph 未初期化 (.dev-graph/config.json 不在) の repo は検査対象なしとして exit 0。

usage:
  python3 scripts/lint-artifact-placement.py [--repo-root PATH]
  python3 scripts/lint-artifact-placement.py --self-test

exit code:
  0 違反なし
  1 違反検出
  2 設定エラー

CONVENTIONS: stdlib only.
"""
from __future__ import annotations

import argparse
import json
import sys
import tempfile
from pathlib import Path

ROOT_FILE_ALLOWLIST = {
    "AGENTS.md",
    "CLAUDE.md",
    "CONVENTIONS.md",
    "Makefile",
    "README.md",
    "config-version-lock.json",
    "requirements-dev.txt",
    "sitecustomize.py",
    # 以下は feat-hub-foundation の pnpm monorepo が repo 直下を要求するツールチェーン設定。
    # 探索起点が repo root に固定されており移動できないため、名前を個別に列挙して許可する
    # (pnpm-* 等の接頭辞パターンにすると意図しないファイルまで通るので採らない)。
    "package.json",  # workspace root manifest。pnpm はここから packages を解決する
    "pnpm-workspace.yaml",  # workspace 定義。root 以外に置く手段が無い
    "pnpm-lock.yaml",  # lockfile。pnpm が root へ生成・更新する
    # biome は --config-path で移動可能だが、editor/LSP の自動検出が root 前提のため直下に置く
    "biome.json",
}
SYSTEM_SPEC_JSON_ALLOWLIST = {
    "spec-state.json",
    "fetched-references.json",
    "completeness-report.json",
    "completeness-findings.json",  # system-dev-planner C08 が読む正準名 (report と同内容)
}
GRAPH_GOVERNED_ROOT_KEYS = ("specifications", "architecture", "features", "tasks")
DOCS_REQUIRED_FRONTMATTER_KEYS = ("status:", "layer:")


def _read_frontmatter_block(path: Path) -> list[str] | None:
    """先頭の frontmatter (--- ... ---) の中身行を返す。無ければ None。"""
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    if not lines or lines[0].strip() != "---":
        return None
    for i, line in enumerate(lines[1:41], start=1):
        if line.strip() == "---":
            return lines[1:i]
    return None


def lint(repo_root: Path) -> tuple[list[str], str]:
    """違反一覧と補足 note を返す。"""
    cfg_path = repo_root / ".dev-graph" / "config.json"
    if not cfg_path.is_file():
        return [], "dev-graph 未初期化 (.dev-graph/config.json 不在): 検査対象なし"
    try:
        cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"設定エラー: {cfg_path} を JSON として読めない: {exc}")

    roots = cfg.get("content_roots", {})
    graph_rel = cfg.get("local_state", {}).get("graph", ".dev-graph/state/graph.json")
    graph_path = repo_root / graph_rel
    registered: set[str] = set()
    if graph_path.is_file():
        graph = json.loads(graph_path.read_text(encoding="utf-8"))
        registered = {
            n["file_path"]
            for n in graph.get("nodes", [])
            if isinstance(n, dict) and n.get("file_path")
        }

    violations: list[str] = []

    # 1. graph 管理下 root の orphan artifact
    for key in GRAPH_GOVERNED_ROOT_KEYS:
        rel = roots.get(key)
        if not rel:
            continue
        root = repo_root / rel
        if not root.is_dir():
            continue
        for md in sorted(root.rglob("*.md")):
            rp = md.relative_to(repo_root).as_posix()
            if rp not in registered:
                violations.append(
                    f"VIOLATION: orphan-artifact: {rp} は graph.json 未登録。"
                    "正規経路 (dev-graph writer) で登録するか、草案なら docs/ へ置く"
                )

    # 2. docs/ の frontmatter 必須
    docs_root = repo_root / roots.get("documents", "docs")
    if docs_root.is_dir():
        for md in sorted(docs_root.rglob("*.md")):
            rp = md.relative_to(repo_root).as_posix()
            block = _read_frontmatter_block(md)
            if block is None:
                violations.append(
                    f"VIOLATION: docs-frontmatter: {rp} に frontmatter が無い。"
                    "status/layer を宣言する (無標識の文書を置かない)"
                )
                continue
            joined = "\n".join(block)
            for req in DOCS_REQUIRED_FRONTMATTER_KEYS:
                if req not in joined:
                    violations.append(
                        f"VIOLATION: docs-frontmatter: {rp} の frontmatter に {req} が無い"
                    )

    # 3. system-spec/ 直下の混入遮断
    ss_root = repo_root / roots.get("system_spec", "system-spec")
    if ss_root.is_dir():
        for p in sorted(ss_root.iterdir()):
            rp = p.relative_to(repo_root).as_posix()
            if p.is_dir():
                violations.append(
                    f"VIOLATION: system-spec-stray: {rp}/ (サブディレクトリ) は置かない。"
                    "system-spec/ 直下はコンパイラ出力と正本 JSON のみ"
                )
            elif p.suffix == ".md" or p.name in SYSTEM_SPEC_JSON_ALLOWLIST:
                continue
            else:
                violations.append(
                    f"VIOLATION: system-spec-stray: {rp} は置かない。"
                    "許可: *.md / " + " / ".join(sorted(SYSTEM_SPEC_JSON_ALLOWLIST))
                )

    # 4. リポジトリ直下の allowlist
    for p in sorted(repo_root.iterdir()):
        if p.is_file() and not p.name.startswith(".") and p.name not in ROOT_FILE_ALLOWLIST:
            violations.append(
                f"VIOLATION: root-stray: {p.name} はリポジトリ直下に置かない。"
                "README Part 3「保存先の正規表」に従い正規の置き場へ移す"
            )

    return violations, ""


def self_test() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        # dev-graph 未初期化 → 検査対象なし (exit 0 相当)
        v, note = lint(root)
        assert v == [] and "未初期化" in note, "未初期化 repo で skip しない"

        # 最小構成の初期化
        (root / ".dev-graph" / "state").mkdir(parents=True)
        (root / ".dev-graph" / "config.json").write_text(json.dumps({
            "content_roots": {
                "specifications": "specs", "architecture": "architecture",
                "features": "features", "tasks": "tasks",
                "documents": "docs", "system_spec": "system-spec",
            },
            "local_state": {"graph": ".dev-graph/state/graph.json"},
        }), encoding="utf-8")
        (root / ".dev-graph" / "state" / "graph.json").write_text(json.dumps({
            "nodes": [{"file_path": "specs/registered.md"}],
        }), encoding="utf-8")
        for d in ("specs", "docs", "system-spec"):
            (root / d).mkdir()

        # クリーン状態 → 違反 0
        (root / "specs" / "registered.md").write_text("x", encoding="utf-8")
        (root / "docs" / "ok.md").write_text(
            "---\nstatus: draft\nlayer: system-wide-design\n---\nbody",
            encoding="utf-8")
        (root / "system-spec" / "spec-state.json").write_text("{}", encoding="utf-8")
        v, _ = lint(root)
        assert v == [], f"クリーン状態で違反を誤検出: {v}"

        # 4 種の違反を 1 つずつ検出できるか
        (root / "specs" / "orphan.md").write_text("x", encoding="utf-8")
        (root / "docs" / "bad.md").write_text("frontmatter なし", encoding="utf-8")
        (root / "system-spec" / "stray.csv").write_text("x", encoding="utf-8")
        (root / "stray-note.md").write_text("x", encoding="utf-8")
        v, _ = lint(root)
        kinds = {line.split(":")[1].strip() for line in v}
        expected = {"orphan-artifact", "docs-frontmatter", "system-spec-stray", "root-stray"}
        assert kinds == expected, f"期待した違反種別と不一致: {kinds}"

    print("OK: self-test passed (skip / clean / 4 violation kinds)")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", default=".", help="リポジトリルート (既定: cwd)")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        return self_test()

    repo_root = Path(args.repo_root).resolve()
    if not repo_root.is_dir():
        print(f"設定エラー: repo-root が存在しない: {repo_root}", file=sys.stderr)
        return 2

    violations, note = lint(repo_root)
    if note:
        print(f"OK: {note}")
        return 0
    if violations:
        for line in violations:
            print(line, file=sys.stderr)
        print(f"FAIL: 配置規約違反 {len(violations)} 件", file=sys.stderr)
        return 1
    print("OK: 保存先の正規表に適合 (orphan/docs-frontmatter/system-spec/root すべて緑)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
