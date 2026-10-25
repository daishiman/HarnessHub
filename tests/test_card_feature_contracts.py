"""Card-related feature specifications must stay executable and non-overlapping."""

from __future__ import annotations

import importlib.util
import json
import re
import sys
from pathlib import Path
from typing import Any

import pytest


ROOT = Path(__file__).resolve().parents[1]
FEATURE_IDS = (
    "feat-card-list-shell",
    "feat-card-block-authoring",
    "feat-card-mutation-safety",
)

def _load(name: str, rel: str):
    """repo 内の script を sys.path を汚さずに読む。"""
    spec = importlib.util.spec_from_file_location(name, ROOT / rel)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


# 契約は plan ゲートが実行時に持つ。ここでキーを列挙し直すと、片方だけ更新されたときに
# 「テストは緑なのに plan で落ちる」という一番たちの悪い乖離になる (実際そうなっていた:
# 本テストは depends_on / resource_scope を含む 11 キーを要求し、plan ゲートは 9 キーの
# exact set を要求していたため、この 3 feature は plan 不能のまま緑だった)。
# 対策として列挙をやめ、plan ゲートを実際に呼んで「plan できること」を直接確かめる。
# 定数を切り出して import する案は取らない。resolve-project-context.py は dev-graph 3 skill の
# 宣言済み挙動面に含まれ、1 文字でも触ると live-trial 証跡が失効する (再 trial が要る)。
_PLAN_GATE = _load(
    "_card_plan_gate", "plugins/system-dev-planner/scripts/resolve-project-context.py"
)
_CONTEXT_WRITER = _load("_card_context_writer", "scripts/build-feature-context.py")
# graph node にはあるが context.json は持たないフィールド。正本は graph なので
# .md frontmatter と graph の 2 者で突合する。
GRAPH_ONLY_FIELDS = ("depends_on", "resource_scope")
# architecture_refs は context がファイルパス表記、frontmatter/graph が node id 表記で、
# 文字列一致では比較できない。語彙の正規化は build-feature-context.py が持つ実装を借りる。
VOCABULARY_FIELD = "architecture_refs"
# 実装が製品コードへ接地した feature。到達状態を `(achieved)` と書き、「未実装」の記述を残さない。
# 完了の記録先はここと frontmatter の implementation_readiness / completion_evidence であって、
# `## 実装結果` のような章を増やす形は取らない (章立ては EXPECTED_SECTIONS の exact tuple)。
IMPLEMENTED_FEATURE_IDS = frozenset(
    {
        "feat-card-mutation-safety",
        "feat-card-list-shell",
        "feat-card-block-authoring",
    }
)
EXPECTED_SECTIONS = (
    "# 目的",
    "## 到達状態",
    "## スコープ",
    "## 受入",
    "## アーキテクチャ参照",
    "## 機能間依存",
    "## Handoff",
)


def _feature_path(feature_id: str) -> Path:
    return ROOT / "features" / f"{feature_id}.md"


def _frontmatter_and_body(feature_id: str) -> tuple[dict[str, Any], str]:
    source = _feature_path(feature_id).read_text(encoding="utf-8")
    assert source.startswith("---\n"), f"{feature_id}: frontmatter opening fence is missing"
    marker = source.find("\n---\n", 4)
    assert marker >= 0, f"{feature_id}: frontmatter closing fence is missing"
    frontmatter: dict[str, Any] = {}
    for line in source[4:marker].splitlines():
        key, separator, raw = line.partition(":")
        assert separator, f"{feature_id}: malformed frontmatter line: {line}"
        frontmatter[key] = json.loads(raw.strip())
    return frontmatter, source[marker + 5 :].lstrip("\n")


def _context(feature_id: str) -> dict[str, Any]:
    path = ROOT / "features" / f"{feature_id}.context.json"
    value = json.loads(path.read_text(encoding="utf-8"))
    assert isinstance(value, dict)
    return value


def _all_graph_nodes() -> list[dict[str, Any]]:
    """architecture 参照の解決には feature 以外の node (arch-*) も要る。"""
    graph = json.loads((ROOT / ".dev-graph/state/graph.json").read_text(encoding="utf-8"))
    return [node for node in graph["nodes"] if "graph_node_id" in node]


@pytest.fixture(scope="module")
def graph_nodes() -> dict[str, dict[str, Any]]:
    graph = json.loads((ROOT / ".dev-graph/state/graph.json").read_text(encoding="utf-8"))
    return {
        node["graph_node_id"]: node
        for node in graph["nodes"]
        if node.get("graph_node_id") in FEATURE_IDS
    }


@pytest.mark.parametrize("feature_id", FEATURE_IDS)
def test_current_target_and_feature_template_sections(feature_id: str) -> None:
    _, body = _frontmatter_and_body(feature_id)
    headings = tuple(line for line in body.splitlines() if re.match(r"^#{1,2} ", line))
    assert headings == EXPECTED_SECTIONS
    if feature_id in IMPLEMENTED_FEATURE_IDS:
        assert "実装済み" in body
        # 「未実装」が残っていると、達成済みの到達状態と現状記述が食い違ったまま読まれる。
        assert "未実装" not in body
    else:
        assert "現状 (current)" in body
        assert "到達状態 (target)" in body
        assert "未実装" in body


@pytest.mark.parametrize("feature_id", FEATURE_IDS)
def test_context_frontmatter_and_graph_have_exact_parity(
    feature_id: str,
    graph_nodes: dict[str, dict[str, Any]],
) -> None:
    frontmatter, _ = _frontmatter_and_body(feature_id)
    context = _context(feature_id)
    graph = graph_nodes[feature_id]
    # 形状契約は plan ゲートに実際に通して確かめる。ここが「plan できる」の唯一の定義。
    _PLAN_GATE.validate_feature_context(ROOT, feature_id, f"features/{feature_id}.context.json")
    # context.json には writer が無く upsert-node.py は graph.json と .md frontmatter しか
    # 書かないため、この 3 者は upsert のたびに片肺で崩れる。落ちたときに「どう直すか」が
    # 分からないと毎回 CI ログから手で照合する羽目になるので、修復コマンドを message に載せる。
    repair = (
        f"python3 scripts/build-feature-context.py --write --feature {feature_id}"
        " (正本は .dev-graph/state/graph.json)"
    )
    for field in set(context) - {VOCABULARY_FIELD}:
        assert context[field] == frontmatter[field] == graph[field], (
            f"{feature_id}: {field} drifted / repair: {repair}"
        )
    for field in GRAPH_ONLY_FIELDS:
        assert field not in context, (
            f"{feature_id}: {field} の正本は graph.json 側。context.json が持つと plan が拒否する"
        )
        assert frontmatter[field] == graph[field], f"{feature_id}: {field} drifted / repair: {repair}"
    # 語彙 (パス表記 / node id 表記) を吸収してから突合する。
    nodes = {node["graph_node_id"]: node for node in _all_graph_nodes()}
    path_index = _CONTEXT_WRITER._path_index(nodes)
    resolved = [
        _CONTEXT_WRITER.split_architecture_refs(source[VOCABULARY_FIELD], nodes, path_index)
        for source in (context, frontmatter, graph)
    ]
    for architecture, _supplementary, unresolved in resolved:
        assert not unresolved, f"{feature_id}: 解決できない architecture 参照: {unresolved}"
        assert architecture == resolved[0][0], (
            f"{feature_id}: {VOCABULARY_FIELD} drifted / repair: {repair}"
        )


@pytest.mark.parametrize("feature_id", FEATURE_IDS)
def test_resource_scope_contains_only_existing_repository_paths(feature_id: str) -> None:
    frontmatter, _ = _frontmatter_and_body(feature_id)
    resources = frontmatter["resource_scope"]
    assert resources
    for resource in resources:
        assert (ROOT / resource).exists(), f"{feature_id}: nonexistent resource_scope path: {resource}"
    banned = {
        "packages/ui/src/list",
        "packages/ui/src/markdown",
        "apps/hub/src/app/docs",
        "apps/hub/src/app/sheets",
        "apps/hub/src/app/catalog",
    }
    assert banned.isdisjoint(resources)


def test_feature_dependencies_are_directional_and_acyclic() -> None:
    frontmatters = {feature_id: _frontmatter_and_body(feature_id)[0] for feature_id in FEATURE_IDS}
    assert frontmatters["feat-card-mutation-safety"]["depends_on"] == []
    for ui_feature in ("feat-card-list-shell", "feat-card-block-authoring"):
        assert "feat-card-mutation-safety" in frontmatters[ui_feature]["depends_on"]
    assert "feat-semantic-emphasis-icons" not in frontmatters["feat-card-mutation-safety"]["depends_on"]

    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(feature_id: str) -> None:
        if feature_id in visiting:
            pytest.fail(f"dependency cycle includes {feature_id}")
        if feature_id in visited:
            return
        visiting.add(feature_id)
        for dependency in frontmatters[feature_id]["depends_on"]:
            if dependency in frontmatters:
                visit(dependency)
        visiting.remove(feature_id)
        visited.add(feature_id)

    for feature_id in FEATURE_IDS:
        visit(feature_id)


def test_each_cross_feature_responsibility_has_exactly_one_owner() -> None:
    scopes = {
        feature_id: "\n".join(_frontmatter_and_body(feature_id)[0]["scope_in"])
        for feature_id in FEATURE_IDS
    }
    ownership_markers = {
        "feat-card-list-shell": ("DataTable column model", "status_counts", "title / body / tags"),
        "feat-card-block-authoring": (":::cards", "safe degradation", "第 3 の preview"),
        "feat-card-mutation-safety": ("canonical payload hash", "汎用 entity revision", "Idempotency-Key"),
    }
    for owner, markers in ownership_markers.items():
        for marker in markers:
            actual_owners = [feature_id for feature_id, scope in scopes.items() if marker in scope]
            assert actual_owners == [owner], f"{marker!r} must be owned only by {owner}: {actual_owners}"


def test_list_shell_owns_complete_list_contract_without_inventing_surfaces() -> None:
    frontmatter, _ = _frontmatter_and_body("feat-card-list-shell")
    contract = json.dumps(frontmatter, ensure_ascii=False)
    required = (
        "3 一覧",
        "カードグリッドを既定",
        "URL query が tab / q / filter の唯一の正本",
        "sessionStorage は view mode だけ",
        "DataTable column model",
        "Docs: published=published, draft=draft, null=unknown",
        "Sheets: received|generating|review=active, completed=completed, null=unknown",
        "Catalog: available=available, suspended|deprecated=suspended, null=unknown",
        "status_counts",
        "認可後",
        "cursor 適用前",
        "title / body / tags",
        "既存の q パラメータ名",
        "additive response / repository behavior",
        "Docs の一覧 / 詳細 / 編集 / 作成",
        "Sheets / Catalog は実在する面だけ",
    )
    for phrase in required:
        assert phrase in contract, f"list-shell is missing: {phrase}"
    assert "公開 API への新しい検索パラメータ追加・DB schema 変更・認可判定の変更" not in contract


def test_block_authoring_owns_one_renderer_and_two_preview_roles() -> None:
    frontmatter, _ = _frontmatter_and_body("feat-card-block-authoring")
    contract = json.dumps(frontmatter, ensure_ascii=False)
    required = (
        "packages/ui/src/components/Markdown.tsx",
        "MarkdownView / ImageGroup / MarkdownEditor / Tabs",
        "大画面は 2 ペイン",
        "狭幅は Tabs",
        "保存済み preview",
        "第 3 の preview",
        "sanitize",
        "safe degradation",
        "非 blocking 警告",
        "Docs image API / R2",
        "VRT baseline",
    )
    for phrase in required:
        assert phrase in contract, f"block-authoring is missing: {phrase}"


def test_mutation_safety_owns_docs_and_sheets_data_safety_contract() -> None:
    frontmatter, _ = _frontmatter_and_body("feat-card-mutation-safety")
    contract = json.dumps(frontmatter, ensure_ascii=False)
    required = (
        "Docs / Sheets",
        "docs-import-<n>",
        "通常 CRUD に流用しない",
        "汎用 entity revision",
        "additive schema / API / repository",
        "412 CAS",
        "tenant + workspace + resource + operation",
        "TTL=24h",
        "canonical payload hash",
        "response replay",
        "422",
        "400",
        "Catalog / PublishRequest は対象外",
        "UI feature に依存しない",
    )
    for phrase in required:
        assert phrase in contract, f"mutation-safety is missing: {phrase}"
