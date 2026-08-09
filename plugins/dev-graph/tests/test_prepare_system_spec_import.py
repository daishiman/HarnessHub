"""C19 R3 import adapter の決定論的な入力組立を検証する。"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

import pytest


PLUGIN = Path(__file__).resolve().parents[1]
SCRIPT = PLUGIN / "scripts" / "build-system-spec-import.py"
CONTRACT = PLUGIN / "references" / "system-spec-import-contract.json"
HARNESS = PLUGIN.parent / "system-spec-harness"
COMPILE_FIXTURES = HARNESS / "skills" / "run-system-spec-compile" / "fixtures"


def build_confirmed_system_spec(tmp_path: Path, verdict: str = "PASS") -> Path:
    root = tmp_path / "repo"
    spec = root / "system-spec"
    spec.mkdir(parents=True)
    (spec / "index.md").write_text(
        "---\nkind: index\n---\n\n# compiled specification\n\nIndex source fact.\n",
        encoding="utf-8",
    )
    (spec / "00-requirements-definition.md").write_text(
        "---\nstatus: confirmed\n---\n\n# confirmed requirements\n\nRequirements source fact.\n",
        encoding="utf-8",
    )
    (spec / "completeness-report.json").write_text(
        json.dumps({"verdict": verdict}), encoding="utf-8"
    )
    return root


def write_contract(root: Path, mutate) -> Path:
    contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
    mutate(contract)
    path = root / "contract.json"
    path.write_text(json.dumps(contract), encoding="utf-8")
    return path


def run(
    root: Path, *, out_dir: str = ".dev-graph/tmp/import", contract: Path | None = None
) -> subprocess.CompletedProcess[str]:
    command = [sys.executable, str(SCRIPT), "--repo-root", str(root), "--out-dir", out_dir]
    if contract is not None:
        command.extend(["--contract", str(contract)])
    return subprocess.run(
        command,
        text=True,
        capture_output=True,
        check=False,
    )


def test_prepares_two_schema_shaped_c02_inputs_and_source_derived_bodies(tmp_path: Path) -> None:
    root = build_confirmed_system_spec(tmp_path)
    proc = run(root)
    assert proc.returncode == 0, proc.stdout + proc.stderr

    out = root / ".dev-graph" / "tmp" / "import"
    architecture = json.loads((out / "architecture.node.json").read_text(encoding="utf-8"))
    specification = json.loads((out / "specification.node.json").read_text(encoding="utf-8"))
    report_digest = hashlib.sha256(
        (root / "system-spec" / "completeness-report.json").read_bytes()
    ).hexdigest()

    assert architecture["graph_node_id"] == "arch-system-spec-overview"
    assert architecture["artifact_kind"] == "architecture"
    assert architecture["artifact_subtypes"] == ["backend", "data", "security"]
    assert architecture["source_lineage"]["source_path"] == "system-spec/00-requirements-definition.md"
    assert architecture["confirmation_evidence"]["evaluated_digest"] == report_digest
    assert specification["architecture_refs"] == ["arch-system-spec-overview"]
    assert specification["source_lineage"]["source_path"] == "system-spec/index.md"

    assert (out / "architecture.body.md").read_text(encoding="utf-8") == (
        "# confirmed requirements\n\nRequirements source fact.\n"
    )
    assert (out / "specification.body.md").read_text(encoding="utf-8") == (
        "# compiled specification\n\nIndex source fact.\n"
    )


def test_verbatim_source_body_is_import_data_not_duplicated_compile_logic() -> None:
    """C19 OUT1 の「ロジック複製 0」を source body 複写禁止と誤読させない。"""
    skill = (SCRIPT.parents[1] / "skills" / "run-dev-graph-system-spec" / "SKILL.md").read_text(
        encoding="utf-8"
    )

    assert "source body の verbatim import (素材の取込み)" in skill
    assert "elicitation/compile の処理ロジック" in skill
    assert "後者だけが OUT1 の禁止対象" in skill


def test_source_content_change_changes_only_its_matching_import_body(tmp_path: Path) -> None:
    root = build_confirmed_system_spec(tmp_path)
    (root / "system-spec" / "index.md").write_text(
        "# updated index\n\nActual caller-repository content.\n", encoding="utf-8"
    )
    proc = run(root)
    assert proc.returncode == 0, proc.stdout + proc.stderr

    out = root / ".dev-graph" / "tmp" / "import"
    assert "Actual caller-repository content." in (out / "specification.body.md").read_text(encoding="utf-8")
    assert "Actual caller-repository content." not in (out / "architecture.body.md").read_text(encoding="utf-8")


def test_refuses_unconfirmed_evaluator_output(tmp_path: Path) -> None:
    root = build_confirmed_system_spec(tmp_path, verdict="FAIL")
    proc = run(root)
    assert proc.returncode != 0
    assert "verdict must be PASS" in proc.stderr


def test_refuses_contract_artifact_path_that_escapes_repo_root(tmp_path: Path) -> None:
    root = build_confirmed_system_spec(tmp_path)
    contract = write_contract(root, lambda value: value["artifacts"].update({"index": "../escape.md"}))
    proc = run(root, contract=contract)

    assert proc.returncode != 0
    assert "artifact path escapes repo root" in proc.stderr


def test_refuses_out_dir_that_escapes_repo_root(tmp_path: Path) -> None:
    root = build_confirmed_system_spec(tmp_path)
    proc = run(root, out_dir="../escape")

    assert proc.returncode != 0
    assert "--out-dir must be contained" in proc.stderr


def test_refuses_contract_with_static_product_body(tmp_path: Path) -> None:
    root = build_confirmed_system_spec(tmp_path)
    contract = write_contract(root, lambda value: value.update({"bodies": {"specification": "static prose"}}))
    proc = run(root, contract=contract)

    assert proc.returncode != 0
    assert "must not contain bodies" in proc.stderr


def _load_validator():
    # validate-graph-schema.py は lib/ しか sys.path へ足さないため、同居する
    # _common / graph_artifact_readiness を解決できるよう scripts/ を先に通す。
    if str(PLUGIN / "scripts") not in sys.path:
        sys.path.insert(0, str(PLUGIN / "scripts"))
    name = "validate_graph_schema_for_system_spec_import"
    spec = importlib.util.spec_from_file_location(
        name, PLUGIN / "scripts" / "validate-graph-schema.py"
    )
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def build_compiled_system_spec(tmp_path: Path) -> Path:
    """system-spec-harness の compile 経路が実際に出す本文で repo を組む。

    build_confirmed_system_spec() の最小 stub と違い、C19 が現実に登録する本文
    (index / 要件定義書) をそのまま使う。HarnessHub-o4zi の症状は stub では再現せず、
    実本文の見出し構成でしか出なかった。
    """
    if str(HARNESS / "lib") not in sys.path:
        sys.path.insert(0, str(HARNESS / "lib"))
    import spec_docset_foundation

    spec = json.loads((COMPILE_FIXTURES / "spec-state.json").read_text(encoding="utf-8"))
    refs = json.loads((COMPILE_FIXTURES / "fetched-references.json").read_text(encoding="utf-8"))
    docset = spec_docset_foundation.compile_docset(spec, refs)

    root = tmp_path / "repo"
    spec_dir = root / "system-spec"
    spec_dir.mkdir(parents=True)
    for name, body in docset.items():
        (spec_dir / name).write_text(body, encoding="utf-8")
    (spec_dir / "completeness-report.json").write_text(
        json.dumps({"verdict": "PASS"}), encoding="utf-8"
    )
    return root


@pytest.mark.parametrize("name", ["specification", "architecture"])
def test_compiled_import_registers_without_heading_missing(tmp_path: Path, name: str) -> None:
    """HarnessHub-o4zi 回帰: compile 済み本文が C11 見出し検査を通ること。

    修正前は template-contract.json が specification へ無条件で 17 見出しを要求し、
    実際に compile される index.md は 4 見出ししか持たないため upsert-node.py が
    heading_missing で exit 2 となり、C19 の specification ノードが graph へ
    一切登録されなかった (live-trial C19-OUT1 が DEGRADED)。
    """
    root = build_compiled_system_spec(tmp_path)
    proc = run(root)
    assert proc.returncode == 0, proc.stdout + proc.stderr

    out = root / ".dev-graph" / "tmp" / "import"
    node = json.loads((out / f"{name}.node.json").read_text(encoding="utf-8"))
    body = (out / f"{name}.body.md").read_text(encoding="utf-8")

    # C02 upsert-node.py が destination frontmatter を付けて file_path へ書く形を再現する。
    artifact = root / node["file_path"]
    artifact.parent.mkdir(parents=True, exist_ok=True)
    frontmatter = "\n".join([
        "---",
        *(
            f"{key}: {node[key]}"
            for key in ("graph_node_id", "artifact_kind", "file_path", "template_id", "template_version")
        ),
        "---",
        "",
    ])
    artifact.write_text(frontmatter + body, encoding="utf-8")

    mod = _load_validator()
    canonical = json.loads(
        (PLUGIN / "templates" / "template-contract.json").read_text(encoding="utf-8")
    )
    kind = node["artifact_kind"]
    assert kind in mod.HEADING_MISSING_KINDS
    artifact_contract = {
        "placeholder_tokens": canonical["placeholder_tokens"],
        "common_frontmatter": {"required": []},
        "artifacts": {kind: canonical["artifacts"][kind]},
    }

    findings = mod.artifact_findings([node], root, artifact_contract)
    assert [item for item in findings if item["code"] == "heading_missing"] == []
    assert mod.readiness_missing_sections(findings) == []
