from __future__ import annotations

import sys
from pathlib import Path


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from graph_artifact_readiness import missing_required_headings, placeholder_sections


def test_structural_parent_requires_a_substantive_child(tmp_path):
    template_root = tmp_path / "templates"
    template_root.mkdir()
    (template_root / "document.md").write_text(
        "# 本文\n\n## 詳細\n\n<canonical-detail>\n",
        encoding="utf-8",
    )
    contract = {
        "placeholder_tokens": ["<", "TBD", "TODO", "未定"],
        "artifacts": {
            "document": {
                "template": "document.md",
                "required_sections": ["本文"],
            }
        },
    }
    artifact = tmp_path / "document.md"

    artifact.write_text(
        "# 本文\n\n## 詳細\n\n<canonical-detail>\n",
        encoding="utf-8",
    )
    assert placeholder_sections(
        artifact, "document", contract, template_root
    ) == ["本文"]

    artifact.write_text(
        "# 本文\n\n## 詳細\n\n具体的な運用手順と検証結果を記録する。\n",
        encoding="utf-8",
    )
    assert placeholder_sections(artifact, "document", contract, template_root) == []


def test_missing_required_headings_catches_absent_heading_invisible_to_placeholder_check(
    tmp_path,
):
    """HarnessHub-85z0: placeholder_sections only inspects headings that exist.

    A required section whose heading was never written (not even empty) never
    enters `sections`/`direct_invalid`, so placeholder_sections silently misses
    it. missing_required_headings must catch what placeholder_sections cannot.
    """
    contract = {
        "placeholder_tokens": ["<", "TBD", "TODO", "未定"],
        "artifacts": {
            "specification": {
                "template": "specification.md",
                "required_sections": ["目的と成功状態", "スコープ", "未決事項"],
            }
        },
    }
    template_root = tmp_path / "templates"
    template_root.mkdir()
    (template_root / "specification.md").write_text(
        "# 目的と成功状態\n\n<value>\n\n## スコープ\n\n- In: <x>\n\n## 未決事項\n\n<owner>\n",
        encoding="utf-8",
    )
    artifact = tmp_path / "spec.md"

    artifact.write_text("# 目的と成功状態\n\n利用者価値を書く。\n", encoding="utf-8")
    assert missing_required_headings(artifact, "specification", contract) == [
        "スコープ",
        "未決事項",
    ]
    # placeholder_sections cannot see the same gap: absent headings never
    # reach `sections`, so its required-section filter skips them entirely.
    assert placeholder_sections(artifact, "specification", contract, template_root) == []

    artifact.write_text(
        "# 目的と成功状態\n\n利用者価値を書く。\n\n## スコープ\n\nIn: x\n\n## 未決事項\n\nなし\n",
        encoding="utf-8",
    )
    assert missing_required_headings(artifact, "specification", contract) == []


def test_missing_required_headings_resolves_conditional_variants_by_node_trigger(tmp_path):
    """HarnessHub-yzv0: task の required_sections は conditional_required_sections に
    登録された複数 variant のいずれか一致で満たされる。trigger は
    source_lineage.origin_kind==system-dev-planner の node のみ発火し、manual origin
    (node なし/origin_kind 不一致) は base required_sections のまま検査される。"""
    contract = {
        "artifacts": {
            "task": {
                "required_sections": ["目的", "背景"],
                "conditional_required_sections": {
                    "system_development": ["フル見出しA", "フル見出しB"],
                    "system_development_baseline": ["正本仕様書", "依存", "実行契約"],
                },
            }
        }
    }
    artifact = tmp_path / "t.md"

    artifact.write_text("## 正本仕様書\n\nx\n\n## 依存\n\ny\n\n## 実行契約\n\nz\n", encoding="utf-8")
    system_dev_node = {"source_lineage": {"origin_kind": "system-dev-planner"}}
    assert missing_required_headings(artifact, "task", contract, system_dev_node) == []

    # base required_sections ("目的"/"背景") はここでは存在しないが、node が
    # system-dev-planner trigger を持つ限り base variant は候補に入らない。
    manual_node = {"source_lineage": {"origin_kind": "manual"}}
    assert missing_required_headings(artifact, "task", contract, manual_node) == ["目的", "背景"]

    # node を渡さない呼び出し (specification など既存呼び出し互換) は base のまま。
    assert missing_required_headings(artifact, "task", contract) == ["目的", "背景"]


def test_system_spec_import_uses_lineage_specific_heading_variants(tmp_path):
    """HarnessHub-o4zi: immutable system-spec bodies use their source contract."""
    contract = {
        "artifacts": {
            "specification": {
                "required_sections": ["generic-a", "generic-b"],
                "conditional_required_sections": {
                    "system_spec_harness": ["index", "chapters"],
                    "system_spec_harness_with_writeback": [
                        "index",
                        "chapters",
                        "writeback",
                    ],
                },
            },
            "architecture": {
                "required_sections": ["generic-architecture"],
                "conditional_required_sections": {
                    "system_spec_harness": ["U1", "U2"],
                },
            },
        }
    }
    imported = {"source_lineage": {"origin_kind": "system-spec-harness"}}

    specification = tmp_path / "specification.md"
    specification.write_text(
        "# index\n\nbody\n\n## chapters\n\nbody\n", encoding="utf-8"
    )
    assert missing_required_headings(
        specification, "specification", contract, imported
    ) == []
    assert missing_required_headings(specification, "specification", contract) == [
        "generic-a",
        "generic-b",
    ]

    architecture = tmp_path / "architecture.md"
    architecture.write_text("# U1\n\nbody\n\n## U2\n\nbody\n", encoding="utf-8")
    assert missing_required_headings(
        architecture, "architecture", contract, imported
    ) == []
    assert missing_required_headings(architecture, "architecture", contract) == [
        "generic-architecture"
    ]
