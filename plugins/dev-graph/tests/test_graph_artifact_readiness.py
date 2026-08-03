from __future__ import annotations

import sys
from pathlib import Path


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from graph_artifact_readiness import placeholder_sections


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
