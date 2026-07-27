"""upsert-node.py の本文保持契約 (HarnessHub-v1yh) を固定する。

契約:
  1. 既存 artifact があれば `--body-file` 省略時に本文を保持する
  2. 本文の再生成は `--regenerate-body` の明示 opt-in
  3. receipt は常に body_source を出し、既存本文が差し替わる場合 replaced_body_lines を添える
  4. frontmatter が壊れた既存 artifact は fail-closed (--regenerate-body でのみ復旧)
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import pytest

from test_operational_loop_v2 import load, node_fixture, workspace

PLUGIN = Path(__file__).resolve().parents[1]
SCRIPTS = PLUGIN / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

BODY = "# 概要\n\n失ってはならない本文。\n\n## 詳細\n\n二段落目。"
ARTIFACT_REL = Path("issues") / "issue-operational.md"


def upsert_args(
    root: Path,
    input_path: Path,
    *,
    body_file: str | None = None,
    regenerate_body: bool = False,
    dry_run: bool = False,
) -> argparse.Namespace:
    return argparse.Namespace(
        repo_root=str(root),
        graph=None,
        input=str(input_path),
        body_file=body_file,
        regenerate_body=regenerate_body,
        dry_run=dry_run,
    )


def seeded(tmp_path: Path) -> tuple[object, Path, Path, Path]:
    module = load("upsert-node.py", "upsert_node_body_preservation")
    root, graph, input_path = workspace(tmp_path)
    input_path.write_text(
        json.dumps({"node": node_fixture(), "body": BODY}), encoding="utf-8"
    )
    module._perform(upsert_args(root, input_path))
    return module, root, graph, root / ARTIFACT_REL


def body_of(artifact: Path) -> str:
    return artifact.read_text(encoding="utf-8").split("---\n", 2)[2].lstrip("\n")


def reinject_input(root: Path, name: str = "reinject.json") -> Path:
    path = root / ".dev-graph" / name
    path.write_text(json.dumps({"node": node_fixture()}), encoding="utf-8")
    return path


def test_reinject_after_graph_node_loss_preserves_body(tmp_path):
    module, root, graph, artifact = seeded(tmp_path)
    state = json.loads(graph.read_text(encoding="utf-8"))
    state["nodes"] = []
    graph.write_text(json.dumps(state), encoding="utf-8")

    receipt = module._perform(upsert_args(root, reinject_input(root)))

    assert receipt["operation"] == "added"
    assert receipt["body_source"] == "preserved"
    assert receipt["replaced_body_lines"] is None
    assert body_of(artifact).rstrip() == BODY.rstrip()
    assert "<問題または要望を一文で記載>" not in artifact.read_text(encoding="utf-8")


def test_metadata_only_update_preserves_body(tmp_path):
    module, root, _graph, artifact = seeded(tmp_path)
    patch = root / ".dev-graph" / "patch.json"
    patch.write_text(
        json.dumps(
            {"graph_node_id": node_fixture()["graph_node_id"], "patch": {"priority": "high"}}
        ),
        encoding="utf-8",
    )

    receipt = module._perform(upsert_args(root, patch))

    assert receipt["operation"] == "updated"
    assert receipt["body_source"] == "preserved"
    assert body_of(artifact).rstrip() == BODY.rstrip()


def test_regenerate_body_is_explicit_opt_in_and_reports_loss(tmp_path):
    module, root, _graph, artifact = seeded(tmp_path)

    receipt = module._perform(
        upsert_args(root, reinject_input(root), regenerate_body=True)
    )

    assert receipt["body_source"] == "regenerated"
    assert receipt["replaced_body_lines"] == len((BODY.rstrip() + "\n").splitlines())
    assert "<問題または要望を一文で記載>" in artifact.read_text(encoding="utf-8")


def test_body_file_reports_from_file_and_replaced_lines(tmp_path):
    module, root, _graph, artifact = seeded(tmp_path)
    replacement = root / ".dev-graph" / "body.md"
    replacement.write_text("# 概要\n\n差し替え本文。\n", encoding="utf-8")

    receipt = module._perform(
        upsert_args(root, reinject_input(root), body_file=str(replacement))
    )

    assert receipt["body_source"] == "from_file"
    assert receipt["replaced_body_lines"] == len((BODY.rstrip() + "\n").splitlines())
    assert "差し替え本文" in body_of(artifact)


def test_input_body_reports_from_input(tmp_path):
    module, root, _graph, artifact = seeded(tmp_path)
    path = root / ".dev-graph" / "with-body.json"
    path.write_text(
        json.dumps({"node": node_fixture(), "body": "# 概要\n\nJSON 由来。"}),
        encoding="utf-8",
    )

    receipt = module._perform(upsert_args(root, path))

    assert receipt["body_source"] == "from_input"
    assert "JSON 由来" in body_of(artifact)


def test_new_artifact_uses_template_without_replacement(tmp_path):
    module = load("upsert-node.py", "upsert_node_body_template")
    root, _graph, input_path = workspace(tmp_path)
    input_path.write_text(json.dumps({"node": node_fixture()}), encoding="utf-8")

    receipt = module._perform(upsert_args(root, input_path))

    assert receipt["operation"] == "added"
    assert receipt["body_source"] == "template"
    assert receipt["replaced_body_lines"] is None


def test_broken_frontmatter_fails_closed_and_regenerate_recovers(tmp_path):
    module, root, _graph, artifact = seeded(tmp_path)
    artifact.write_text("frontmatter のない壊れたファイル\n", encoding="utf-8")
    reinject = reinject_input(root)

    with pytest.raises(Exception) as excinfo:
        module._perform(upsert_args(root, reinject))
    assert "frontmatter" in str(excinfo.value)

    receipt = module._perform(upsert_args(root, reinject, regenerate_body=True))
    assert receipt["body_source"] == "regenerated"
    assert receipt["replaced_body_lines"] is None


def test_dry_run_reports_body_source_without_writing(tmp_path):
    module, root, _graph, artifact = seeded(tmp_path)
    before = artifact.read_text(encoding="utf-8")

    receipt = module._perform(
        upsert_args(root, reinject_input(root), regenerate_body=True, dry_run=True)
    )

    assert receipt["status"] == "preview"
    assert receipt["body_source"] == "regenerated"
    assert receipt["replaced_body_lines"] == len((BODY.rstrip() + "\n").splitlines())
    assert artifact.read_text(encoding="utf-8") == before
