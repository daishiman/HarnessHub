"""scripts/guard-worktree-desync.py の機能テスト (network 不要)。

issue-worktree-main-ref-desync-20260728 受入条件 2 の検証。
「desync 状態でのコミットが検査で止まり、巻き戻しコミットが main へ到達しない」ことを、
実測事象と同じ手順 (ref だけを直接進め、作業ツリー・index を古いまま残す) で再現して確認する。

desync の再現手順 (2026-07-28 の実測と同型):
    git reset --hard <古いコミット>        # HEAD/index/作業ツリーを古い状態へ
    git update-ref refs/heads/main <新>    # ref だけを進める (作業ツリーは置き去り)
    -> HEAD は新コミットを指すが index/作業ツリーは古いまま = desync
    -> この状態の commit は直近の変更を丸ごと打ち消す巻き戻しコミットになる

カバー:
- 純関数 judge: rollback / bulk-delete / ok の判定境界と優先順位
- 統合 (MUST_BLOCK): desync 再現後の commit が exit 1 で止まる
- 統合 (MUST_PASS): 正常な作業ツリーでの commit は通る
- fail-closed: 検査材料が取れない場合は遮断される
- bypass: HH_SKIP_DESYNC_CHECK=1 で通る
- 環境変数の検証: 不正な閾値は設定エラーとして扱う

network: false, keychain: なし, 実ファイル書換: なし (tmp_path のみ)。
"""
import importlib.util
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "guard-worktree-desync.py"
RUNBOOK = ROOT / "docs" / "worktree-parallel-operations-runbook.md"

SPEC = importlib.util.spec_from_file_location("guard_worktree_desync_uut", SCRIPT)
MOD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MOD)


def _evidence(matched=None, deletions=0, threshold=20):
    return {
        "index_tree": "t" * 40,
        "matched_ancestor": matched,
        "staged_deletion_count": deletions,
        "staged_deletions": [f"f{i}" for i in range(deletions)],
        "deletion_threshold": threshold,
        "ancestor_depth": 200,
    }


# ── 純関数: judge ───────────────────────────────────────────────────────────

def test_judge_ok_for_normal_commit():
    verdict, _ = MOD.judge(_evidence())
    assert verdict == "ok"


def test_judge_detects_rollback_when_index_matches_ancestor():
    """index の tree が祖先の tree と一致 = 巻き戻し確定 (誤検知なし)。"""
    verdict, reason = MOD.judge(_evidence(matched="c" * 40))
    assert verdict == "rollback"
    assert reason, "遮断時は理由を返すこと"


def test_judge_detects_bulk_delete_at_threshold():
    verdict, reason = MOD.judge(_evidence(deletions=20, threshold=20))
    assert verdict == "bulk-delete"
    assert reason


def test_judge_allows_deletions_below_threshold():
    verdict, _ = MOD.judge(_evidence(deletions=19, threshold=20))
    assert verdict == "ok"


def test_judge_prefers_rollback_over_bulk_delete():
    """両方成立する場合、確定検知である rollback を優先する。"""
    verdict, _ = MOD.judge(_evidence(matched="c" * 40, deletions=100, threshold=20))
    assert verdict == "rollback"


# ── 統合: 実 git repo で desync を再現 ──────────────────────────────────────

def _git(cwd, *args, env=None, check=True):
    merged = dict(os.environ)
    merged.setdefault("GIT_CONFIG_NOSYSTEM", "1")
    if env:
        merged.update(env)
    return subprocess.run(
        ["git", *args], cwd=str(cwd), capture_output=True, text=True,
        env=merged, check=check,
    )


def _run_guard(cwd, extra_env=None, args=()):
    env = dict(os.environ)
    env.pop("HH_SKIP_DESYNC_CHECK", None)
    if extra_env:
        env.update(extra_env)
    return subprocess.run(
        [sys.executable, str(SCRIPT), *args], cwd=str(cwd),
        capture_output=True, text=True, env=env, check=False,
    )


@pytest.fixture
def repo(tmp_path):
    """commit A (1 file) -> commit B (+30 files) を持つ repo。"""
    path = tmp_path / "repo"
    path.mkdir()
    _git(path, "init", "-b", "main")
    _git(path, "config", "user.email", "t@example.com")
    _git(path, "config", "user.name", "tester")

    (path / "a.txt").write_text("a\n", encoding="utf-8")
    _git(path, "add", "-A")
    _git(path, "commit", "-m", "A")
    commit_a = _git(path, "rev-parse", "HEAD").stdout.strip()

    for i in range(30):
        (path / f"new{i}.txt").write_text(f"{i}\n", encoding="utf-8")
    _git(path, "add", "-A")
    _git(path, "commit", "-m", "B")
    commit_b = _git(path, "rev-parse", "HEAD").stdout.strip()

    return {"path": path, "a": commit_a, "b": commit_b}


def _make_desync(repo):
    """ref だけを進め、index と作業ツリーを古いまま残す (実測事象の再現)。"""
    _git(repo["path"], "reset", "--hard", repo["a"])
    _git(repo["path"], "update-ref", "refs/heads/main", repo["b"])


def _install_pre_commit_guard(repo):
    """tmp repo の実 pre-commit 経路へ guard を結線する。"""
    hooks = repo["path"] / ".test-hooks"
    hooks.mkdir()
    hook = hooks / "pre-commit"
    hook.write_text(
        f'#!/bin/sh\nexec "{sys.executable}" "{SCRIPT}"\n',
        encoding="utf-8",
    )
    hook.chmod(0o755)
    _git(repo["path"], "config", "core.hooksPath", str(hooks))


def test_blocks_commit_in_desync_state(repo):
    """MUST_BLOCK: desync 状態の commit は巻き戻しになるため止める。"""
    _make_desync(repo)

    # 前提の確認: HEAD は B を指すが作業ツリーには B のファイルが無い
    assert _git(repo["path"], "rev-parse", "HEAD").stdout.strip() == repo["b"]
    assert not (repo["path"] / "new0.txt").exists()

    proc = _run_guard(repo["path"])
    assert proc.returncode == 1, proc.stdout + proc.stderr
    assert "guard-worktree-desync" in proc.stderr


def test_real_pre_commit_blocks_commit_a_rollback(repo):
    """実 git commit -a でも pre-commit が巻き戻し commit を作らせない。"""
    _make_desync(repo)
    _install_pre_commit_guard(repo)
    before = _git(repo["path"], "rev-parse", "HEAD").stdout.strip()

    proc = _git(
        repo["path"], "commit", "-a", "-m", "must be blocked",
        check=False,
    )

    assert proc.returncode != 0
    assert "guard-worktree-desync" in proc.stderr
    assert _git(repo["path"], "rev-parse", "HEAD").stdout.strip() == before


def test_real_pre_commit_blocks_partial_add_with_bulk_deletions(repo):
    """部分 add が祖先 tree 完全一致を崩しても、大量 staged 削除で止める。"""
    _make_desync(repo)
    _install_pre_commit_guard(repo)
    (repo["path"] / "local-note.txt").write_text("keep\n", encoding="utf-8")
    _git(repo["path"], "add", "local-note.txt")
    before = _git(repo["path"], "rev-parse", "HEAD").stdout.strip()

    proc = _git(repo["path"], "commit", "-m", "must also be blocked", check=False)

    assert proc.returncode != 0
    assert "異常な量の削除" in proc.stderr
    assert _git(repo["path"], "rev-parse", "HEAD").stdout.strip() == before


def test_desync_state_would_produce_rollback_commit(repo):
    """再現の妥当性検証: 遮断しなければ実際に大量削除の巻き戻しになる。"""
    _make_desync(repo)
    diff = _git(repo["path"], "diff", "--cached", "--stat", "HEAD").stdout
    assert "30 files changed" in diff or "deletion" in diff


def test_allows_normal_commit(repo):
    """MUST_PASS: 正常な作業ツリーでの追加は通す。"""
    (repo["path"] / "c.txt").write_text("c\n", encoding="utf-8")
    _git(repo["path"], "add", "-A")
    proc = _run_guard(repo["path"])
    assert proc.returncode == 0, proc.stdout + proc.stderr


def _make_ff_like_merge(repo):
    """親と同一 tree を持つマージコミットを作る。

    main 側に追加 commit が無い状態で分岐先だけが進むと、--no-ff マージの
    マージコミットは分岐先の tree をそのまま採る。GitHub の PR マージで
    日常的に生じる形。
    """
    path = repo["path"]
    _git(path, "checkout", "-b", "feature")
    (path / "f.txt").write_text("f\n", encoding="utf-8")
    _git(path, "add", "-A")
    _git(path, "commit", "-m", "feature work")
    feature = _git(path, "rev-parse", "HEAD").stdout.strip()
    _git(path, "checkout", "main")
    _git(path, "merge", "--no-ff", "-m", "Merge feature", "feature")
    return {"feature": feature, "merge": _git(path, "rev-parse", "HEAD").stdout.strip()}


def test_allows_commit_after_ff_like_merge(repo):
    """REGRESSION: 親と同 tree のマージコミット直後の commit を止めない。

    2026-07-28 実環境で dedfdc3 (Merge PR #87) と親 1f78791 の tree が共に
    76c6a92 だったため、差分なしの index が「祖先と一致 = 巻き戻し」と誤判定され、
    全 worktree の commit が塞がった。HEAD 自身だけでなく HEAD と同 tree の祖先も
    照合対象から除く必要がある。
    """
    merged = _make_ff_like_merge(repo)
    merge_tree = _git(
        repo["path"], "rev-parse", f"{merged['merge']}^{{tree}}"
    ).stdout.strip()
    parent_tree = _git(
        repo["path"], "rev-parse", f"{merged['feature']}^{{tree}}"
    ).stdout.strip()
    assert merge_tree == parent_tree, "前提: マージコミットと親の tree が同一"

    # 差分なしの状態
    assert _run_guard(repo["path"]).returncode == 0

    # 通常の追加を stage した状態
    (repo["path"] / "d.txt").write_text("d\n", encoding="utf-8")
    _git(repo["path"], "add", "-A")
    proc = _run_guard(repo["path"])
    assert proc.returncode == 0, proc.stdout + proc.stderr


def test_still_blocks_desync_after_ff_like_merge(repo):
    """同 tree 祖先の除外によって desync 検知を失っていないこと。"""
    merged = _make_ff_like_merge(repo)
    _git(repo["path"], "reset", "--hard", repo["a"])
    _git(repo["path"], "update-ref", "refs/heads/main", merged["merge"])

    proc = _run_guard(repo["path"])
    assert proc.returncode == 1, proc.stdout + proc.stderr


def test_allows_small_deletion(repo):
    """MUST_PASS: 閾値未満の削除は通常の作業として通す。"""
    (repo["path"] / "new0.txt").unlink()
    _git(repo["path"], "add", "-A")
    proc = _run_guard(repo["path"])
    assert proc.returncode == 0, proc.stdout + proc.stderr


def test_blocks_bulk_deletion(repo):
    """MUST_BLOCK: 閾値以上の削除は desync の疑いとして止める。

    削除後の tree が祖先と一致しないよう新規ファイルを 1 つ足し、
    rollback 検知ではなく bulk-delete 検知が働くことを保証する。
    """
    for i in range(30):
        (repo["path"] / f"new{i}.txt").unlink()
    (repo["path"] / "marker.txt").write_text("m\n", encoding="utf-8")
    _git(repo["path"], "add", "-A")

    proc = _run_guard(repo["path"], args=("--json",))
    assert proc.returncode == 1, proc.stdout + proc.stderr
    assert '"verdict": "bulk-delete"' in proc.stdout


def test_bypass_env_allows_desync_commit(repo):
    _make_desync(repo)
    proc = _run_guard(repo["path"], extra_env={MOD.SKIP_ENV: "1"})
    assert proc.returncode == 0, proc.stdout + proc.stderr


def test_documented_recovery_sequence_restores_selected_untracked_change(repo):
    """受入条件 4: runbook の detach → stash → SHA 選択復元 → main 復帰を実走する。"""
    _make_desync(repo)
    path = repo["path"]
    (path / "my-local-note.txt").write_text("keep me\n", encoding="utf-8")
    message = "desync-recovery-test: unique-local-note"

    _git(path, "checkout", "--detach")
    _git(path, "stash", "push", "-u", "-m", message)

    # stash 後は新しい HEAD (B) と 3 層が一致し、B で追加されたファイルも戻る。
    assert _git(path, "status", "--porcelain").stdout == ""
    assert (path / "new0.txt").exists()

    # 番号を経由せず、1 回の list でメッセージと不変 SHA を同時に取得する。
    stash_lines = _git(path, "stash", "list", "--format=%H %gs").stdout.splitlines()
    matches = [line for line in stash_lines if message in line]
    assert len(matches) == 1
    stash_sha = matches[0].split(" ", 1)[0]

    _git(
        path,
        "restore",
        f"--source={stash_sha}^3",
        "--",
        "my-local-note.txt",
    )
    _git(path, "checkout", "main")

    assert _git(path, "rev-parse", "HEAD").stdout.strip() == repo["b"]
    assert (path / "new0.txt").exists()
    assert (path / "my-local-note.txt").read_text(encoding="utf-8") == "keep me\n"


def test_runbook_uses_message_to_direct_sha_without_stash_ordinal():
    """受入条件 5: 参照位置が揺れる stash ordinal を実行手順へ戻さない。"""
    body = RUNBOOK.read_text(encoding="utf-8")
    assert "--format='%H %gs'" in body
    assert "git restore --source=\"$STASH_SHA\"" in body
    assert "git checkout stash@{" not in body
    assert "--format='%gd %s'" not in body


def test_threshold_env_is_honored(repo):
    """閾値を上げれば大量削除でも通る (bulk-delete が閾値ヒューリスティックであること)。"""
    for i in range(30):
        (repo["path"] / f"new{i}.txt").unlink()
    (repo["path"] / "marker.txt").write_text("m\n", encoding="utf-8")
    _git(repo["path"], "add", "-A")
    proc = _run_guard(repo["path"], extra_env={MOD.THRESHOLD_ENV: "100"})
    assert proc.returncode == 0, proc.stdout + proc.stderr


# ── collect_evidence / fail-closed ──────────────────────────────────────────

def test_collect_evidence_reports_matched_ancestor(repo, monkeypatch):
    _make_desync(repo)
    monkeypatch.chdir(repo["path"])
    evidence = MOD.collect_evidence()
    assert evidence["matched_ancestor"] == repo["a"]


def test_collect_evidence_has_no_match_for_clean_tree(repo, monkeypatch):
    monkeypatch.chdir(repo["path"])
    evidence = MOD.collect_evidence()
    assert evidence["matched_ancestor"] is None


def test_invalid_threshold_env_raises(monkeypatch):
    monkeypatch.setenv(MOD.THRESHOLD_ENV, "not-a-number")
    with pytest.raises(MOD.EvidenceError):
        MOD._env_int(MOD.THRESHOLD_ENV, 20)


def test_fails_closed_when_evidence_unavailable(monkeypatch, repo):
    """検査材料が取れない場合は遮断する (設計判断の固定)。"""
    monkeypatch.chdir(repo["path"])
    monkeypatch.delenv(MOD.SKIP_ENV, raising=False)

    def _boom(*_a, **_k):
        raise MOD.EvidenceError("simulated failure")

    monkeypatch.setattr(MOD, "collect_evidence", _boom)
    assert MOD.main([]) == 1


def test_skips_before_first_commit(tmp_path, monkeypatch):
    """初回コミット前は祖先が無く desync が定義されないため素通しする。"""
    path = tmp_path / "empty"
    path.mkdir()
    _git(path, "init", "-b", "main")
    monkeypatch.chdir(path)
    monkeypatch.delenv(MOD.SKIP_ENV, raising=False)
    assert MOD.main([]) == 0
