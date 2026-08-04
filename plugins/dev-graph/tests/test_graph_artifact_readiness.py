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
