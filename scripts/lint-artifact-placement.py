#!/usr/bin/env python3
"""lint-artifact-placement.py

保存先配置規約 (README Part 3「保存先の正規表」) を機械強制する。
成果物の置き場がセッションごとに散らばる事故を fail-closed で遮断する。

検査項目:
- dev-graph 管理下 root (specs/architecture/features/tasks) の *.md は
  graph.json への登録必須 (orphan artifact 遮断。正規経路以外の直置きを検出)
- docs/*.md は frontmatter に status: と layer: が必須 (無標識の草案を遮断)
  ただし plugin package 実体 (.claude-plugin/plugin.json を持つツリー) 配下は除外する。
  SKILL.md 等の frontmatter schema は Claude Code 側の仕様で決まっており、
  status:/layer: を足すと仕様違反かつ検証対象の破壊になるため (HarnessHub-5ph)。
- system-spec/ 直下はコンパイラ出力 (*.md)、正本 JSON、C13 の取得証跡 JSON のみ (混入遮断)
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
import re
import sys
import tempfile
from pathlib import Path
from typing import Any

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
    "resume-receipt.json",  # C19 validate-system-spec-resume が読む digest-bound 受領書
}
# system-spec/ 直下に置いてよい既知サブディレクトリ。混入遮断の目的は「雑多なファイルの流入防止」
# であって、正本 JSON が参照する名前付きの資料までは禁じない。
# retrieval-evidence/ は run-system-spec-doc-fetch の契約が置き場所を
# `system-spec/retrieval-evidence/<target_id>.json` と固定しており、fetched-references.json の
# evidence_ref がここを指す。禁止すると出典の取得証跡そのものが置けなくなる。
#
# ただし allowlist は「そのディレクトリの存在を許す」だけで、中身を無検査で通す意味ではない。
# 名前で通して中身を見逃すと、証跡ディレクトリが任意ファイルの避難所になり、
# ここを唯一の正規配置と宣言している C13 の evidence_ref 契約が実質無効化される。
# そのため直下に平坦な *.json だけを許し、ネストしたディレクトリと非 JSON は拒否する。
SYSTEM_SPEC_DIR_ALLOWLIST = {
    "retrieval-evidence",
}
GRAPH_GOVERNED_ROOT_KEYS = ("specifications", "architecture", "features", "tasks")
DOCS_REQUIRED_FRONTMATTER_KEYS = ("status", "layer")
GRAPH_NODE_SCHEMA_PATH = (
    Path(__file__).resolve().parents[1]
    / "plugins"
    / "dev-graph"
    / "schemas"
    / "graph-node.schema.json"
)
FRONTMATTER_SCALAR = re.compile(
    r"^([A-Za-z_][A-Za-z0-9_-]*):(?:\s*(.*))?$"
)


PLUGIN_PACKAGE_MARKER = Path(".claude-plugin") / "plugin.json"


def _in_plugin_package(md: Path, docs_root: Path) -> bool:
    """md が plugin package 実体の内側にあるか判定する。

    docs/ 配下には「配布経路の検証用に置いた plugin package そのもの」が入ることがある
    (docs/features/feat-stage0-distribution-gate/verification-artifacts/minimal-skill-package)。
    その中の SKILL.md は文書ではなくパッケージ実体で、frontmatter schema は
    Claude Code 側の仕様 (name/description) が正本。docs-frontmatter 規則の
    status:/layer: を課すと仕様違反になり、検証対象そのものを壊す。

    docs_root は探索の打ち切り境界 (これを越えて上位を見に行かない)。
    docs_root 自身は判定対象に含めない — docs/.claude-plugin/plugin.json 一つで
    docs/ 全体が無検査になる穴を作らないため。
    marker は「ディレクトリの存在」ではなく plugin.json の実在で判定する (誤除外を狭く保つ)。
    """
    for parent in md.parents:
        if parent == docs_root or not parent.is_relative_to(docs_root):
            return False
        if (parent / PLUGIN_PACKAGE_MARKER).is_file():
            return True
    return False


def _read_frontmatter_block(path: Path) -> list[str] | None:
    """先頭の frontmatter (--- ... ---) の中身行を返す。無ければ None。"""
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    if not lines or lines[0].strip() != "---":
        return None
    # dev-graph の canonical frontmatter は lineage / tracker / completion
    # receipt を含むため 40 行を超えうる。文書本文全体を frontmatter と誤認しない
    # 安全弁は残しつつ、現行 node schema の全 field を収められる上限にする。
    for i, line in enumerate(lines[1:201], start=1):
        if line.strip() == "---":
            return lines[1:i]
    return None


def _frontmatter_scalars(block: list[str]) -> tuple[dict[str, Any], set[str]]:
    """Parse canonical flat scalars and report duplicate keys."""
    result: dict[str, Any] = {}
    duplicates: set[str] = set()
    for line in block:
        match = FRONTMATTER_SCALAR.match(line)
        if not match:
            continue
        key = match.group(1)
        if key in result:
            duplicates.add(key)
        raw = (match.group(2) or "").strip()
        try:
            value = json.loads(raw)
        except json.JSONDecodeError:
            if (
                len(raw) >= 2
                and raw[0] == raw[-1]
                and raw[0] in {"'", '"'}
            ):
                value = raw[1:-1]
            else:
                value = raw
        result[key] = value
    return result, duplicates


def _document_layer_schema() -> dict[str, Any]:
    """Return the one canonical definition used by graph validation and this lint."""
    try:
        schema = json.loads(GRAPH_NODE_SCHEMA_PATH.read_text(encoding="utf-8"))
        contract = schema["$defs"]["documentLayer"]
    except (OSError, json.JSONDecodeError, KeyError, TypeError) as exc:
        raise SystemExit(
            f"設定エラー: document layer 正本を読めない: {GRAPH_NODE_SCHEMA_PATH}: {exc}"
        ) from exc
    if (
        not isinstance(contract, dict)
        or contract.get("type") != "string"
        or not isinstance(contract.get("minLength"), int)
        or not isinstance(contract.get("pattern"), str)
    ):
        raise SystemExit(
            "設定エラー: graph-node.schema.json の $defs.documentLayer は "
            "type/minLength/pattern を宣言する"
        )
    try:
        re.compile(contract["pattern"])
    except re.error as exc:
        raise SystemExit(
            "設定エラー: graph-node.schema.json の documentLayer.pattern が不正: "
            f"{exc}"
        ) from exc
    return contract


def _valid_document_layer(value: Any, contract: dict[str, Any]) -> bool:
    return (
        isinstance(value, str)
        and len(value) >= contract["minLength"]
        and re.search(contract["pattern"], value) is not None
    )


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
        layer_contract = _document_layer_schema()
        for md in sorted(docs_root.rglob("*.md")):
            rp = md.relative_to(repo_root).as_posix()
            if _in_plugin_package(md, docs_root):
                continue
            block = _read_frontmatter_block(md)
            if block is None:
                violations.append(
                    f"VIOLATION: docs-frontmatter: {rp} に frontmatter が無い。"
                    "status/layer を宣言する (無標識の文書を置かない)"
                )
                continue
            frontmatter, duplicate_keys = _frontmatter_scalars(block)
            for duplicate in sorted(duplicate_keys):
                violations.append(
                    f"VIOLATION: docs-frontmatter: {rp} の frontmatter に "
                    f"{duplicate}: が重複している"
                )
            for req in DOCS_REQUIRED_FRONTMATTER_KEYS:
                if req not in frontmatter:
                    violations.append(
                        f"VIOLATION: docs-frontmatter: {rp} の frontmatter に {req}: が無い"
                    )
            if "layer" in frontmatter and not _valid_document_layer(
                frontmatter["layer"], layer_contract
            ):
                violations.append(
                    f"VIOLATION: docs-frontmatter: {rp} の layer は "
                    "graph-node.schema.json#/$defs/documentLayer に適合しない"
                )

    # 3. system-spec/ 直下の混入遮断。C13 の証跡だけは一意の専用 directory に
    # JSON として置く。任意のサブディレクトリや形式を許すと正本の配置規約が崩れる。
    ss_root = repo_root / roots.get("system_spec", "system-spec")
    if ss_root.is_dir():
        for p in sorted(ss_root.iterdir()):
            rp = p.relative_to(repo_root).as_posix()
            if p.is_dir():
                if p.name in SYSTEM_SPEC_DIR_ALLOWLIST:
                    # allowlist は名前を許すだけ。中身は平坦な *.json のみに限定する。
                    for entry in sorted(p.iterdir()):
                        entry_rp = entry.relative_to(repo_root).as_posix()
                        if not entry.is_file() or entry.suffix != ".json":
                            violations.append(
                                f"VIOLATION: system-spec-stray: {entry_rp} は置かない。"
                                f"許可: system-spec/{p.name}/*.json (平坦な JSON のみ)"
                            )
                    continue
                violations.append(
                    f"VIOLATION: system-spec-stray: {rp}/ (サブディレクトリ) は置かない。"
                    "system-spec/ 直下はコンパイラ出力と正本 JSON、および "
                    + " / ".join(f"{d}/*.json" for d in sorted(SYSTEM_SPEC_DIR_ALLOWLIST))
                    + " のみ"
                )
            elif p.suffix == ".md" or p.name in SYSTEM_SPEC_JSON_ALLOWLIST:
                continue
            else:
                violations.append(
                    f"VIOLATION: system-spec-stray: {rp} は置かない。"
                    "許可: *.md / "
                    + " / ".join(sorted(SYSTEM_SPEC_JSON_ALLOWLIST))
                    + " / "
                    + " / ".join(f"{d}/*.json" for d in sorted(SYSTEM_SPEC_DIR_ALLOWLIST))
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
        # canonical dev-graph frontmatter は 40 行を超える。終端が安全弁内なら
        # status/layer を正しく読めることを固定し、旧 40 行上限への回帰を防ぐ。
        long_frontmatter = ["---", "status: draft", "layer: feature-design"]
        long_frontmatter.extend(f"field_{i}: null" for i in range(45))
        long_frontmatter.extend(["---", "body"])
        (root / "docs" / "long-frontmatter.md").write_text(
            "\n".join(long_frontmatter),
            encoding="utf-8",
        )
        (root / "system-spec" / "spec-state.json").write_text("{}", encoding="utf-8")
        v, _ = lint(root)
        assert v == [], f"クリーン状態で違反を誤検出: {v}"

        # layer の許容形式は graph-node.schema.json の documentLayer が唯一の正本。
        # `xlayer:` のような部分一致や大文字・空白入りの値は layer 宣言として扱わない。
        invalid_layer = root / "docs" / "invalid-layer.md"
        invalid_layer.write_text(
            "---\nstatus: draft\nlayer: Feature Design\n---\nbody",
            encoding="utf-8",
        )
        v, _ = lint(root)
        assert any(
            "invalid-layer.md" in line and "documentLayer" in line for line in v
        ), "schema 不適合の layer を検出しない"
        invalid_layer.unlink()

        lookalike_layer = root / "docs" / "lookalike-layer.md"
        lookalike_layer.write_text(
            "---\nstatus: draft\nxlayer: feature-design\n---\nbody",
            encoding="utf-8",
        )
        v, _ = lint(root)
        assert any(
            "lookalike-layer.md" in line and "layer: が無い" in line for line in v
        ), "frontmatter key の部分一致を layer 宣言として扱っている"
        lookalike_layer.unlink()

        duplicate_layer = root / "docs" / "duplicate-layer.md"
        duplicate_layer.write_text(
            "---\nstatus: draft\nlayer: feature-design\nlayer: operations\n---\nbody",
            encoding="utf-8",
        )
        v, _ = lint(root)
        assert any(
            "duplicate-layer.md" in line and "layer: が重複" in line for line in v
        ), "重複 layer を単一の正本として受理している"
        duplicate_layer.unlink()

        # plugin package 実体 (.claude-plugin/plugin.json を持つツリー) は
        # docs-frontmatter の対象外。SKILL.md の frontmatter 正本は Claude Code 側の仕様。
        pkg = root / "docs" / "verification-artifacts" / "minimal-skill-package"
        (pkg / ".claude-plugin").mkdir(parents=True)
        (pkg / ".claude-plugin" / "plugin.json").write_text("{}", encoding="utf-8")
        (pkg / "skills" / "probe").mkdir(parents=True)
        (pkg / "skills" / "probe" / "SKILL.md").write_text(
            "---\nname: probe\ndescription: fixture\n---\nbody", encoding="utf-8")
        v, _ = lint(root)
        assert v == [], f"plugin package 実体を誤って docs-frontmatter 違反にした: {v}"

        # 除外は package ツリーの内側だけ。marker を持たない兄弟ディレクトリは従来どおり検査する
        # (「verification-artifacts 配下は全部素通り」まで穴を広げない)。
        sibling = root / "docs" / "verification-artifacts" / "notes.md"
        sibling.write_text("frontmatter なし", encoding="utf-8")
        v, _ = lint(root)
        assert any("notes.md" in line for line in v), "package 外の docs まで除外している"
        sibling.unlink()

        # docs_root 直下に marker を置いても docs/ 全体は無検査にならない
        # (marker 1 つで規則ごと無効化できる穴を塞ぐ)。
        (root / "docs" / ".claude-plugin").mkdir()
        (root / "docs" / ".claude-plugin" / "plugin.json").write_text("{}", encoding="utf-8")
        (root / "docs" / "unlabeled.md").write_text("frontmatter なし", encoding="utf-8")
        v, _ = lint(root)
        assert any("unlabeled.md" in line for line in v), "docs_root の marker で規則全体が無効化された"
        (root / "docs" / "unlabeled.md").unlink()

        # allowlist 済みサブディレクトリ (doc-fetch の取得証跡) は通し、
        # 未知のサブディレクトリは従来どおり弾く。「サブディレクトリ全部素通り」まで穴を広げない。
        (root / "system-spec" / "retrieval-evidence").mkdir()
        (root / "system-spec" / "retrieval-evidence" / "react.json").write_text(
            "{}", encoding="utf-8")
        v, _ = lint(root)
        assert v == [], f"allowlist 済みの system-spec サブディレクトリを違反にした: {v}"
        (root / "system-spec" / "unknown-dir").mkdir()
        v, _ = lint(root)
        assert any(
            "unknown-dir" in line and "system-spec-stray" in line for line in v
        ), "未知の system-spec サブディレクトリを見逃している"
        (root / "system-spec" / "unknown-dir").rmdir()

        # allowlist は名前を許すだけで、中身まで無検査にはしない。
        # ここを素通りさせると証跡置き場が任意ファイルの避難所になり、
        # `system-spec/retrieval-evidence/<target_id>.json` を唯一の正規配置と
        # 宣言している C13 の evidence_ref 契約が実質無効化される。
        evidence_dir = root / "system-spec" / "retrieval-evidence"
        (evidence_dir / "stray.txt").write_text("x", encoding="utf-8")
        v, _ = lint(root)
        assert any(
            "stray.txt" in line and "system-spec-stray" in line for line in v
        ), "allowlist 済みディレクトリ内の非 JSON を見逃している"
        (evidence_dir / "stray.txt").unlink()
        (evidence_dir / "nested").mkdir()
        v, _ = lint(root)
        assert any(
            "nested" in line and "system-spec-stray" in line for line in v
        ), "allowlist 済みディレクトリ内のネストを見逃している"
        (evidence_dir / "nested").rmdir()
        v, _ = lint(root)
        assert v == [], f"是正後にも違反が残った: {v}"

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
