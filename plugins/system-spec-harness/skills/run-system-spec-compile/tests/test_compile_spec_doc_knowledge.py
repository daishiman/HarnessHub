"""Knowledge-card rendering and topo-order regression tests for spec compilation."""
from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from pathlib import Path


SKILL_DIR = Path(__file__).resolve().parents[1]
PLUGIN_ROOT = SKILL_DIR.parents[1]
FIXTURES = SKILL_DIR / "fixtures"
SPEC = FIXTURES / "spec-state.json"


def _load_mod():
    path = SKILL_DIR / "scripts" / "compile-spec-doc.py"
    spec = importlib.util.spec_from_file_location("compile_spec_doc_knowledge", path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


mod = _load_mod()


def _spec() -> dict:
    return json.loads(SPEC.read_text(encoding="utf-8"))

def test_render_design_knowledge_contains_deep_meaning_not_only_pointer():
    rendered = mod.render_design_refs("database", _spec())
    for heading in (
        "#### 目的",
        "#### 解決する問題",
        "#### 適用条件",
        "#### 非適用条件",
        "#### トレードオフ・失敗モード",
        "#### goalへの寄与",
    ):
        assert heading in rendered
    assert "businessの重要なruleと用語" in rendered
    assert rendered.count("ref-system-design-knowledge/references/ddd.md") == 1


def test_render_deepened_project_candidate_into_goal_related_chapter():
    spec = _spec()
    spec["knowledge_candidates"] = [
        {
            "id": "offline-first-conflict-resolution",
            "topic": "offline-first conflict resolution",
            "status": "deepened",
            "problem": "オフライン更新競合",
            "serves_goals": ["G1"],
            "source_refs": [],
            "card": {
                "purpose": "更新損失を防ぐ",
                "problems": ["最終書込優先で更新が消える"],
                "applies_when": ["複数端末が切断中に更新する"],
                "does_not_apply_when": ["単一writerで常時接続する"],
                "tradeoffs": ["同期メタデータが増える"],
                "failure_modes": ["競合を黙って上書きする"],
                "goal_contribution": ["G1の継続利用に寄与する"],
            },
        }
    ]
    rendered = mod.render_design_refs("database", spec)
    assert "project candidate: `offline-first-conflict-resolution` (`deepened`)" in rendered
    assert "単一writerで常時接続する" in rendered
    assert "G1の継続利用に寄与する" in rendered


def test_render_design_refs_ties_principle_to_chapter_confirmed_decision():
    # design_knowledge_reflection 観点 (HarnessHub-byt6): card は汎用原則の逐語転記のため、
    # 「本章での適用」節で確定 qa_ref・対応セル・serves_goals へ機械的に紐付ける (章固有の適用記述)。
    rendered = mod.render_design_refs("database", _spec())
    assert "#### 本章での適用" in rendered
    assert "確定内容 qa-database" in rendered
    assert "対応セル: web, mobile, tablet, desktop-windows, desktop-linux, desktop-macos" in rendered
    assert "資するゴール: G1" in rendered


def test_render_design_refs_application_note_explicit_when_no_confirmed_cell():
    # 対象外/収集中カテゴリでは適用先を捏造せず「未確定」を明示する (fail-visible)。
    rendered = mod.render_design_refs("maintenance-ops", _spec())
    assert "#### 本章での適用" in rendered
    assert "確定セルなし。本章は対象外または収集中のため上記原則の適用先は未確定" in rendered


def test_category_design_refs_derived_from_resource_map():
    # SSOT = resource-map.yaml の read_when (対象ファイル集合)。ハードコード写像のドリフトが
    # 無いことを検証 (A-1)。database の read_when は ddd のみ (clean-architecture は
    # backend/frontend 対応 → 混入しない)。
    assert mod.category_design_refs("database") == ["ddd.md"]
    assert "clean-architecture.md" not in mod.category_design_refs("database")
    # backend は read_when に "backend" を含む 3 ファイルを、knowledge-catalog.json の
    # depends_on が定める位相順 (topo_order・C14) で導出する。resource-map.yaml の記述順
    # (clean-architecture, api-design-patterns, ddd) は依存先の ddd が最後に来てしまい
    # topo_order 違反 (HarnessHub-gw3g) だったため、依存先を先に出す順序へ並べ替える。
    assert mod.category_design_refs("backend") == [
        "ddd.md",
        "clean-architecture.md",
        "api-design-patterns.md",
    ]
    assert mod.category_design_refs("security") == ["secure-by-design.md"]
    assert mod.category_design_refs("maintenance-ops") == ["clean-code.md"]
    # 非正準カテゴリは無マッチ (空) → render 側が汎用ポインタへ倒す。
    assert mod.category_design_refs("no-such-category") == []


def test_knowledge_topo_order_matches_validator_script():
    # compile-spec-doc.py がローカル再実装した topo_order アルゴリズムが、正本
    # validate-knowledge-graph.py --profile knowledge --order (subprocess) の出力と
    # 完全一致することを検証する (二重実装のドリフト防止・C14)。
    validator = PLUGIN_ROOT / "scripts" / "validate-knowledge-graph.py"
    catalog = PLUGIN_ROOT / "skills" / "ref-system-design-knowledge" / "references" / "knowledge-catalog.json"
    result = subprocess.run(
        [sys.executable, str(validator), "--profile", "knowledge", "--input", str(catalog), "--order"],
        capture_output=True, text=True,
    )
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout) == mod._knowledge_topo_order()


def test_category_design_refs_follows_knowledge_topo_order():
    # HarnessHub-gw3g: 描画順は resource-map の記述順ではなく knowledge-catalog.json の
    # depends_on が定める位相順 (validate-knowledge-graph.py --profile knowledge --order と
    # 同一) に従うことを回帰検知する。A depends_on B は B が前提 (B を先に出す)。
    topo = mod._knowledge_topo_order()
    assert topo.index("ddd") < topo.index("clean-architecture")  # clean-architecture depends_on ddd
    assert topo.index("clean-architecture") < topo.index("api-design-patterns")

    backend_refs = mod.category_design_refs("backend")
    file_to_id = {
        e["file"]: e["knowledge_id"]
        for e in mod._knowledge_catalog()["entries"]
    }
    backend_ids = [file_to_id[f] for f in backend_refs]
    assert backend_ids == sorted(backend_ids, key=topo.index)


def test_category_design_refs_map_matches_matcher():
    # materialized view (CATEGORY_DESIGN_REFS) が matcher と一致し drift しない。
    for cat_id, refs in mod.CATEGORY_DESIGN_REFS.items():
        assert refs == mod.category_design_refs(cat_id)


# --------------------------------------------------------------------------- #
# CLI (compile) の網羅                                                          #
