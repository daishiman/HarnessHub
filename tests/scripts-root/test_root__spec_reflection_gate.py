"""PR 前の仕様反映 gate (receipt recorder + guard hook) の決定論検証。"""
from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
RECORDER = REPO / "scripts" / "build-spec-reflection-receipt.py"
GUARD = REPO / "scripts" / "guard-spec-reflection.py"


def _load_recorder():
    spec = importlib.util.spec_from_file_location("spec_reflection_receipt_test", RECORDER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _git(root: Path, *args: str) -> str:
    proc = subprocess.run(
        ["git", "-C", str(root), *args], capture_output=True, text=True, check=True
    )
    return proc.stdout.strip()


@pytest.fixture()
def repo(tmp_path: Path) -> Path:
    root = tmp_path / "repo"
    root.mkdir()
    _git(root, "init", "-q", "-b", "main")
    _git(root, "config", "user.email", "test@example.invalid")
    _git(root, "config", "user.name", "test")
    (root / "src.txt").write_text("base\n", encoding="utf-8")
    _git(root, "add", "-A")
    _git(root, "commit", "-q", "-m", "base")
    # origin/main を local ref として再現し、feature branch で1変更を積む
    _git(root, "update-ref", "refs/remotes/origin/main", "HEAD")
    _git(root, "checkout", "-q", "-b", "devgraph/TEST-P01")
    (root / "src.txt").write_text("changed\n", encoding="utf-8")
    _git(root, "add", "-A")
    _git(root, "commit", "-q", "-m", "change")
    return root


def record(root: Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(RECORDER), "--repo-root", str(root), *args],
        capture_output=True, text=True, check=False,
    )


def guard(root: Path, command: str) -> subprocess.CompletedProcess:
    payload = json.dumps({"tool_name": "Bash", "tool_input": {"command": command}})
    return subprocess.run(
        [sys.executable, str(GUARD), "--repo-root", str(root)],
        input=payload, capture_output=True, text=True, check=False,
    )


def test_recorder_denies_dirty_tree(repo: Path) -> None:
    (repo / "src.txt").write_text("dirty\n", encoding="utf-8")
    proc = record(repo, "--spec-impact", "none", "--reason", "docs only")
    assert proc.returncode == 2
    assert "未コミット" in proc.stderr


def test_recorder_denies_none_without_reason(repo: Path) -> None:
    proc = record(repo, "--spec-impact", "none")
    assert proc.returncode == 2
    assert "--reason" in proc.stderr


def test_recorder_denies_reflected_claim_without_spec_diff(repo: Path) -> None:
    proc = record(repo, "--spec-impact", "reflected")
    assert proc.returncode == 2, proc.stderr


def test_recorder_accepts_reflected_when_diff_touches_spec_path(repo: Path) -> None:
    module = _load_recorder()
    if not module.SPEC_PATH_PREFIXES:
        pytest.skip("SPEC_PATH_PREFIXES 未確定")
    prefix = module.SPEC_PATH_PREFIXES[0].rstrip("/")
    target = repo / prefix / "example.md"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text("spec update\n", encoding="utf-8")
    _git(repo, "add", "-A")
    _git(repo, "commit", "-q", "-m", "spec reflected")
    proc = record(repo, "--spec-impact", "reflected")
    assert proc.returncode == 0, proc.stderr
    assert guard(repo, "gh pr create --base main").returncode == 0


def test_guard_ignores_non_pr_commands(repo: Path) -> None:
    assert guard(repo, "git status").returncode == 0


def test_guard_ignores_pr_create_phrase_inside_message_text(repo: Path) -> None:
    command = 'git commit -m "docs: PR 作成時は gh pr create を受領書ゲートで検査する"'
    assert guard(repo, command).returncode == 0
    assert guard(repo, "echo done && gh pr create --base main").returncode == 2


def test_guard_blocks_pr_create_without_receipt(repo: Path) -> None:
    proc = guard(repo, "gh pr create --base main --title x")
    assert proc.returncode == 2
    assert "受領書" in proc.stderr


def test_guard_allows_pr_create_with_valid_receipt(repo: Path) -> None:
    assert record(repo, "--spec-impact", "none", "--reason", "挙動変更なし").returncode == 0
    assert guard(repo, "gh pr create --base main").returncode == 0


def test_guard_blocks_stale_receipt_after_new_commit(repo: Path) -> None:
    assert record(repo, "--spec-impact", "none", "--reason", "挙動変更なし").returncode == 0
    (repo / "src.txt").write_text("more\n", encoding="utf-8")
    _git(repo, "add", "-A")
    _git(repo, "commit", "-q", "-m", "late change")
    proc = guard(repo, "gh pr create --base main")
    assert proc.returncode == 2
    assert "stale" in proc.stderr
