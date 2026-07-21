"""live-trial fixture 生成 script の決定論性・schema 適合・安全な再生成契約。"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import jsonschema

PLUGIN = Path(__file__).resolve().parents[1]
REPO = PLUGIN.parents[1]
BUILDER = PLUGIN / "tests" / "fixtures" / "build_live_trial_fixture.py"
CONFIG_SCHEMA = PLUGIN / "schemas" / "repo-config.schema.json"


def run_builder(out: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(BUILDER), "--out", str(out), *args],
        cwd=REPO,
        capture_output=True,
        text=True,
        check=False,
    )


def git_tree(out: Path) -> str:
    return subprocess.run(
        ["git", "rev-parse", "HEAD^{tree}"],
        cwd=out,
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()


def test_rebuild_is_deterministic_and_schema_valid(tmp_path: Path) -> None:
    """同じ出力先の再生成は同じ tree を作り、C11 と config schema の双方に通る。"""
    out = tmp_path / "fixture"
    first = run_builder(out, "--verify")
    assert first.returncode == 0, first.stderr or first.stdout
    first_tree = git_tree(out)

    schema = json.loads(CONFIG_SCHEMA.read_text(encoding="utf-8"))
    config = json.loads((out / ".dev-graph" / "config.json").read_text(encoding="utf-8"))
    jsonschema.Draft202012Validator(schema).validate(config)

    second = run_builder(out, "--force", "--verify")
    assert second.returncode == 0, second.stderr or second.stdout
    assert git_tree(out) == first_tree


def test_force_refuses_directory_without_ownership_marker(tmp_path: Path) -> None:
    """無関係な既存 directory は --force でも削除しない。"""
    out = tmp_path / "not-a-fixture"
    out.mkdir()
    sentinel = out / "keep.txt"
    sentinel.write_text("user data\n", encoding="utf-8")

    result = run_builder(out, "--force")

    assert result.returncode == 2
    assert "ownership marker is missing or invalid" in result.stderr
    assert sentinel.read_text(encoding="utf-8") == "user data\n"
