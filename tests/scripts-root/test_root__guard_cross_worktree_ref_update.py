"""scripts/guard-cross-worktree-ref-update.py の機能テスト (network 不要)。

issue-worktree-main-ref-desync-20260728 受入条件 1 の検証。
「他ワークツリーが checkout 中の ref を直接更新する操作が遮断される」ことを、
実際に git worktree を 2 つ作って reference-transaction hook 経由で確認する。

カバー:
- 純関数: parse_updates / find_violations の判定境界
- 統合 (MUST_BLOCK): 別 worktree から refs/heads/main を直接更新 -> git が失敗する
- 統合 (MUST_PASS): 自分が checkout 中の branch の更新 / 誰も checkout していない branch
- 統合 (MUST_PASS): 通常の commit (自分の branch を進める正規経路)
- bypass: HH_ALLOW_CROSS_WORKTREE_REF_UPDATE=1 で通る
- fail-open: 判定材料が取れない場合に許可される (docstring の設計判断の固定)

network: false, keychain: なし, 実ファイル書換: なし (tmp_path のみ)。
"""
import importlib.util
import io
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "guard-cross-worktree-ref-update.py"

SPEC = importlib.util.spec_from_file_location("guard_cross_worktree_uut", SCRIPT)
MOD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MOD)

ZERO = "0" * 40
OID_A = "a" * 40
OID_B = "b" * 40


# ── 純関数: parse_updates ────────────────────────────────────────────────────

def test_parse_updates_reads_triples():
    stream = io.StringIO(f"{OID_A} {OID_B} refs/heads/main\n{ZERO} {OID_A} refs/tags/v1\n")
    assert MOD.parse_updates(stream) == [
        (OID_A, OID_B, "refs/heads/main"),
        (ZERO, OID_A, "refs/tags/v1"),
    ]


def test_parse_updates_skips_blank_and_malformed_lines():
    stream = io.StringIO(f"\n{OID_A} {OID_B} refs/heads/main\ngarbage\n\n")
    assert MOD.parse_updates(stream) == [(OID_A, OID_B, "refs/heads/main")]


# ── 純関数: find_violations ──────────────────────────────────────────────────

def test_find_violations_blocks_other_worktree_branch():
    updates = [(OID_A, OID_B, "refs/heads/main")]
    owners = {"refs/heads/main": "/repo/main"}
    violations = MOD.find_violations(updates, owners, "/repo/wt2")
    assert len(violations) == 1
    assert violations[0]["ref"] == "refs/heads/main"
    assert violations[0]["owner"] == "/repo/main"


def test_find_violations_allows_own_branch():
    updates = [(OID_A, OID_B, "refs/heads/main")]
    owners = {"refs/heads/main": "/repo/main"}
    assert MOD.find_violations(updates, owners, "/repo/main") == []


def test_find_violations_allows_unchecked_out_branch():
    """誰も checkout していない branch は desync の被害者が存在しない。"""
    updates = [(OID_A, OID_B, "refs/heads/topic")]
    owners = {"refs/heads/main": "/repo/main"}
    assert MOD.find_violations(updates, owners, "/repo/wt2") == []


@pytest.mark.parametrize("ref", [
    "refs/remotes/origin/main",  # remote-tracking は作業ツリーと連動しない
    "refs/tags/v1",
    "HEAD",
])
def test_find_violations_ignores_non_branch_refs(ref):
    owners = {"refs/heads/main": "/repo/main", ref: "/repo/main"}
    assert MOD.find_violations([(OID_A, OID_B, ref)], owners, "/repo/wt2") == []


# ── 統合: 実 git worktree ────────────────────────────────────────────────────

def _git(cwd, *args, env=None, check=True):
    merged = dict(os.environ)
    merged.setdefault("GIT_CONFIG_NOSYSTEM", "1")
    if env:
        merged.update(env)
    return subprocess.run(
        ["git", *args], cwd=str(cwd), capture_output=True, text=True,
        env=merged, check=check,
    )


@pytest.fixture
def two_worktrees(tmp_path):
    """main を checkout した主 repo と、feature を checkout した worktree を作る。

    reference-transaction hook を絶対パスで結線し、どちらの worktree から git を
    叩いても同じ guard が走る状態にする (実運用では .githooks が tracked なので
    各 worktree に実体があるが、テストでは commit を増やさず絶対パスで代替する)。
    """
    if not _git(tmp_path, "--version", check=False).returncode == 0:
        pytest.skip("git 不在")

    repo = tmp_path / "repo"
    repo.mkdir()
    _git(repo, "init", "-b", "main")
    _git(repo, "config", "user.email", "t@example.com")
    _git(repo, "config", "user.name", "tester")
    (repo / "a.txt").write_text("a\n", encoding="utf-8")
    _git(repo, "add", "-A")
    _git(repo, "commit", "-m", "init")
    first = _git(repo, "rev-parse", "HEAD").stdout.strip()

    (repo / "b.txt").write_text("b\n", encoding="utf-8")
    _git(repo, "add", "-A")
    _git(repo, "commit", "-m", "second")
    second = _git(repo, "rev-parse", "HEAD").stdout.strip()

    hooks = tmp_path / "hooks"
    hooks.mkdir()
    hook = hooks / "reference-transaction"
    hook.write_text(
        f'#!/usr/bin/env sh\nexec {sys.executable} "{SCRIPT}" "$@"\n', encoding="utf-8"
    )
    hook.chmod(0o755)
    _git(repo, "config", "core.hooksPath", str(hooks))

    wt2 = tmp_path / "wt2"
    _git(repo, "worktree", "add", "-b", "feature", str(wt2))

    return {"repo": repo, "wt2": wt2, "first": first, "second": second}


def test_blocks_ref_update_from_other_worktree(two_worktrees):
    """MUST_BLOCK: 主 repo が checkout 中の main を wt2 から巻き戻そうとする。"""
    proc = _git(
        two_worktrees["wt2"], "update-ref", "refs/heads/main",
        two_worktrees["first"], check=False,
    )
    assert proc.returncode != 0, "cross-worktree の ref 更新が遮断されていない"
    assert "guard-cross-worktree-ref-update" in proc.stderr

    # ref が動いていないこと (遮断が transaction ごと中止していること)
    head = _git(two_worktrees["repo"], "rev-parse", "refs/heads/main").stdout.strip()
    assert head == two_worktrees["second"]


def test_allows_ref_update_from_owning_worktree(two_worktrees):
    """MUST_PASS: main を checkout している主 repo 自身からの更新は通す。"""
    proc = _git(
        two_worktrees["repo"], "update-ref", "refs/heads/main",
        two_worktrees["first"], check=False,
    )
    assert proc.returncode == 0, proc.stderr
    head = _git(two_worktrees["repo"], "rev-parse", "refs/heads/main").stdout.strip()
    assert head == two_worktrees["first"]


def test_allows_ref_update_for_branch_nobody_checked_out(two_worktrees):
    """MUST_PASS: 誰も checkout していない branch は自由に動かせる。"""
    proc = _git(
        two_worktrees["wt2"], "update-ref", "refs/heads/scratch",
        two_worktrees["first"], check=False,
    )
    assert proc.returncode == 0, proc.stderr


def test_allows_normal_commit_on_own_branch(two_worktrees):
    """MUST_PASS: 通常の commit は自分の branch ref を進める正規経路。"""
    wt2 = two_worktrees["wt2"]
    (wt2 / "c.txt").write_text("c\n", encoding="utf-8")
    _git(wt2, "add", "-A")
    proc = _git(wt2, "commit", "-m", "work", check=False)
    assert proc.returncode == 0, proc.stderr + proc.stdout


def test_bypass_env_allows_cross_worktree_update(two_worktrees):
    proc = _git(
        two_worktrees["wt2"], "update-ref", "refs/heads/main",
        two_worktrees["first"], check=False,
        env={MOD.BYPASS_ENV: "1"},
    )
    assert proc.returncode == 0, proc.stderr


# ── 単体: main() の分岐 ─────────────────────────────────────────────────────

def test_main_skips_non_prepared_phase():
    stdin = io.StringIO(f"{OID_A} {OID_B} refs/heads/main\n")
    assert MOD.main(["hook", "committed"], stdin) == 0


def test_main_skips_when_reentrant(monkeypatch):
    monkeypatch.setenv(MOD.REENTRY_ENV, "1")
    stdin = io.StringIO(f"{OID_A} {OID_B} refs/heads/main\n")
    assert MOD.main(["hook", "prepared"], stdin) == 0


def test_main_fails_open_when_worktree_info_unavailable(monkeypatch):
    """判定材料が取れない場合は通す (ref 更新経路を塞がない設計判断の固定)。"""
    monkeypatch.delenv(MOD.REENTRY_ENV, raising=False)
    monkeypatch.delenv(MOD.BYPASS_ENV, raising=False)
    monkeypatch.setattr(MOD, "branch_owners", lambda: None)
    monkeypatch.setattr(MOD, "self_worktree", lambda: "/repo/wt2")
    stdin = io.StringIO(f"{OID_A} {OID_B} refs/heads/main\n")
    assert MOD.main(["hook", "prepared"], stdin) == 0


def test_main_blocks_on_violation(monkeypatch):
    monkeypatch.delenv(MOD.REENTRY_ENV, raising=False)
    monkeypatch.delenv(MOD.BYPASS_ENV, raising=False)
    monkeypatch.setattr(MOD, "branch_owners", lambda: {"refs/heads/main": "/repo/main"})
    monkeypatch.setattr(MOD, "self_worktree", lambda: "/repo/wt2")
    stdin = io.StringIO(f"{OID_A} {OID_B} refs/heads/main\n")
    assert MOD.main(["hook", "prepared"], stdin) == 1
