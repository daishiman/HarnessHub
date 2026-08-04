from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path


PLUGIN = Path(__file__).resolve().parents[1]
SCRIPTS = PLUGIN / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))


def load():
    name = "validate_graph_schema_c11_heading_presence"
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / "validate-graph-schema.py")
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def test_heading_missing_blocks_specification_readiness_when_heading_absent(tmp_path):
    """HarnessHub-85z0: a required heading that was never written must fail C11."""
    mod = load()
    canonical = json.loads((PLUGIN / "templates/template-contract.json").read_text(encoding="utf-8"))
    artifact_contract = {
        "placeholder_tokens": canonical["placeholder_tokens"],
        "common_frontmatter": {"required": []},
        "artifacts": {"specification": canonical["artifacts"]["specification"]},
    }
    artifact = tmp_path / "specs" / "spec.md"
    artifact.parent.mkdir()
    frontmatter = "\n".join([
        "---",
        "graph_node_id: placeholder-specification",
        "artifact_kind: specification",
        "file_path: specs/spec.md",
        "template_id: specification",
        "template_version: 1.0.0",
        "---",
        "",
    ])
    node = {
        "graph_node_id": "placeholder-specification",
        "artifact_kind": "specification",
        "file_path": "specs/spec.md",
        "template_id": "specification",
        "template_version": "1.0.0",
    }
    required = canonical["artifacts"]["specification"]["required_sections"]

    # placeholder_only_section only checks headings that already exist.
    artifact.write_text(frontmatter + f"# {required[0]}\n\n本文。\n", encoding="utf-8")
    findings = mod.artifact_findings([node], tmp_path, artifact_contract)
    assert {item["code"] for item in findings} == {"heading_missing"}
    assert {item["detail"] for item in findings} == set(required[1:])
    assert mod.readiness_missing_sections(findings) == sorted(set(required[1:]))

    filled = "\n".join(f"## {section}\n\n実装・検証済みの具体的内容。" for section in required)
    artifact.write_text(frontmatter + filled + "\n", encoding="utf-8")
    assert mod.artifact_findings([node], tmp_path, artifact_contract) == []


def test_heading_missing_is_not_applied_to_task_kind_yet(tmp_path):
    """Conditional templates are unresolved, so only specifications opt in (HarnessHub-85z0)."""
    mod = load()
    assert mod.HEADING_MISSING_KINDS == {"specification"}

    canonical = json.loads((PLUGIN / "templates/template-contract.json").read_text(encoding="utf-8"))
    artifact_contract = {
        "placeholder_tokens": canonical["placeholder_tokens"],
        "common_frontmatter": {"required": []},
        "artifacts": {"task": canonical["artifacts"]["task"]},
    }
    artifact = tmp_path / "tasks" / "t.md"
    artifact.parent.mkdir()
    frontmatter = "\n".join([
        "---",
        "graph_node_id: placeholder-task",
        "artifact_kind: task",
        "file_path: tasks/t.md",
        "template_id: task",
        "template_version: 1.0.0",
        "---",
        "",
    ])
    artifact.write_text(frontmatter + "## 依存\n\nfeature内依存なし。\n", encoding="utf-8")
    node = {
        "graph_node_id": "placeholder-task",
        "artifact_kind": "task",
        "file_path": "tasks/t.md",
        "template_id": "task",
        "template_version": "1.0.0",
    }
    findings = mod.artifact_findings([node], tmp_path, artifact_contract)
    assert "heading_missing" not in {item["code"] for item in findings}
