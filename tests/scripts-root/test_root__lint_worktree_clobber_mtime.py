"""scripts/lint-worktree-clobber-mtime.py の機能テスト (network 不要)。

issue-worktree-main-ref-desync-20260728 受入条件 4 (再発検知手段) の検証。
2026-08-02 の実測 (未コミット 401 件中 276 件が mtime 分単位まで完全一致、
15+ 独立プラグインへ横断) と同型のパターンを、実 git repo 上で mtime を
明示的に揃えて再現し、検知できることを確認する。

カバー:
- 純関数 judge: クラスタが閾値を満たす/満たさない境界
- 統合 (MUST_DETECT): 複数ディレクトリにまたがる mtime 完全一致クラスタを検知
- 統合 (MUST_NOT_FLAG): 通常の編集 (mtime がバラバラ) は検知しない
- fail-open: 診断材料が取れない場合は疑わしくないとして扱う
- exit code: 検知時も 1 を返すのみで commit を止めない設計であること (blocking hook 化しない)

network: false, keychain: なし, 実ファイル書換: tmp_path のみ。
"""
import importlib.util
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "lint-worktree-clobber-mtime.py"

SPEC = importlib.util.spec_from_file_location("lint_worktree_clobber_mtime_uut", SCRIPT)
MOD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MOD)


def _evidence(clusters):
    return {"total_changed_files": sum(c["file_count"] for c in clusters), "clusters": clusters}


def _cluster(file_count, distinct_dir_count, sample=None):
    return {
        "mtime_minute_epoch": 0,
        "file_count": file_count,
        "distinct_dir_count": distinct_dir_count,
        "sample_files": sample or [],
    }


# ── 純関数: judge ───────────────────────────────────────────────────────────

def test_judge_ok_for_no_clusters():
    verdict, _, suspects = MOD.judge(_evidence([]), 10, 3)
    assert verdict == "ok"
    assert suspects == []


def test_judge_flags_cluster_meeting_both_thresholds():
    ev = _evidence([_cluster(file_count=276, distinct_dir_count=15)])
    verdict, reason, suspects = MOD.judge(ev, 10, 3)
    assert verdict == "clobber-suspected"
    assert reason
    assert len(suspects) == 1


def test_judge_ignores_large_cluster_confined_to_one_dir():
    """1 つのディレクトリ内の一括変更 (正当な codemod 等) は誤検知しない。"""
    ev = _evidence([_cluster(file_count=100, distinct_dir_count=1)])
    verdict, _, _ = MOD.judge(ev, 10, 3)
    assert verdict == "ok"


def test_judge_ignores_small_cluster_across_many_dirs():
    """ファイル数が閾値未満なら、ディレクトリが分散していても疑わない。"""
    ev = _evidence([_cluster(file_count=5, distinct_dir_count=5)])
    verdict, _, _ = MOD.judge(ev, 10, 3)
    assert verdict == "ok"


def test_judge_picks_largest_cluster_first():
    ev = _evidence([
        _cluster(file_count=12, distinct_dir_count=4),
        _cluster(file_count=50, distinct_dir_count=10),
    ])
    verdict, _, suspects = MOD.judge(ev, 10, 3)
    assert verdict == "clobber-suspected"
    assert suspects[0]["file_count"] == 50


# ── 統合: 実 git repo で mtime クラスタを再現 ────────────────────────────────

def _git(cwd, *args, env=None, check=True):
    merged = dict(os.environ)
    merged.setdefault("GIT_CONFIG_NOSYSTEM", "1")
    if env:
        merged.update(env)
    return subprocess.run(
        ["git", *args], cwd=str(cwd), capture_output=True, text=True,
        env=merged, check=check,
    )


def _run(cwd, extra_env=None, args=()):
    env = dict(os.environ)
    if extra_env:
        env.update(extra_env)
    return subprocess.run(
        [sys.executable, str(SCRIPT), *args], cwd=str(cwd),
        capture_output=True, text=True, env=env, check=False,
    )


@pytest.fixture
def repo(tmp_path):
    path = tmp_path / "repo"
    path.mkdir()
    _git(path, "init", "-b", "main")
    _git(path, "config", "user.email", "t@example.com")
    _git(path, "config", "user.name", "tester")
    (path / "README.md").write_text("seed\n", encoding="utf-8")
    _git(path, "add", "-A")
    _git(path, "commit", "-m", "seed")
    return path


def test_detects_clobber_pattern_across_independent_dirs(repo):
    """MUST_DETECT: 実測と同型 (多数ファイル・複数ディレクトリ・mtime 完全一致)。"""
    shared_time = 1785448560  # 2026-07-31 06:56 相当の固定 epoch 秒
    plugins = ["dev-graph", "ubm-goal-setting", "slide-report-generator", "skill-governance"]
    for plugin in plugins:
        d = repo / "plugins" / plugin / "scripts"
        d.mkdir(parents=True)
        for i in range(5):
            f = d / f"file{i}.py"
            f.write_text(f"# {plugin} {i}\n", encoding="utf-8")
            os.utime(f, (shared_time, shared_time))

    proc = _run(repo, args=("--json",))
    assert proc.returncode == 1, proc.stdout + proc.stderr
    assert '"verdict": "clobber-suspected"' in proc.stdout


def test_does_not_flag_ordinary_editing_with_scattered_mtimes(repo):
    """MUST_NOT_FLAG: 通常の編集は mtime がバラバラで検知しない。"""
    import time

    for i in range(5):
        f = repo / f"normal{i}.py"
        f.write_text(f"# {i}\n", encoding="utf-8")
        # 現在時刻書き込み (git add 等の通常経路と同じ = 分単位で揃わない想定は
        # テスト実行時刻に依存するため、意図的に 61 秒以上ずらして確定させる。
        os.utime(f, (time.time() - i * 61, time.time() - i * 61))
    _git(repo, "add", "-A")

    proc = _run(repo, args=("--json",))
    assert proc.returncode == 0, proc.stdout + proc.stderr
    assert '"verdict": "ok"' in proc.stdout


def test_does_not_flag_cluster_within_single_directory(repo):
    """MUST_NOT_FLAG: 単一ディレクトリ内の一括 touch (正当な codemod 等)。"""
    shared_time = 1785448560
    d = repo / "single-plugin" / "scripts"
    d.mkdir(parents=True)
    for i in range(20):
        f = d / f"file{i}.py"
        f.write_text(f"# {i}\n", encoding="utf-8")
        os.utime(f, (shared_time, shared_time))

    proc = _run(repo, args=("--json",))
    assert proc.returncode == 0, proc.stdout + proc.stderr


def test_collect_evidence_keeps_unquoted_path_with_spaces(repo):
    """NUL 区切り porcelain により空白を含む path を正確に扱う。"""
    f = repo / "plugins" / "sample plugin" / "file name.py"
    f.parent.mkdir(parents=True)
    f.write_text("# sample\n", encoding="utf-8")

    evidence = MOD.collect_evidence(cwd=str(repo))

    assert evidence is not None
    assert evidence["clusters"][0]["sample_files"] == ["plugins/sample plugin/file name.py"]


def test_human_readable_report_mentions_runbook(repo):
    shared_time = 1785448560
    plugins = ["a", "b", "c", "d"]
    for plugin in plugins:
        d = repo / plugin
        d.mkdir()
        for i in range(5):
            f = d / f"file{i}.py"
            f.write_text(f"# {i}\n", encoding="utf-8")
            os.utime(f, (shared_time, shared_time))

    proc = _run(repo)
    assert proc.returncode == 1
    assert "worktree-desync-recovery-runbook.md" in proc.stderr


def test_does_not_block_commit_it_only_reports(repo):
    """設計判断の固定: このツールは blocking hook ではなく commit を妨げない。"""
    shared_time = 1785448560
    plugins = ["a", "b", "c", "d"]
    for plugin in plugins:
        d = repo / plugin
        d.mkdir()
        for i in range(5):
            f = d / f"file{i}.py"
            f.write_text(f"# {i}\n", encoding="utf-8")
            os.utime(f, (shared_time, shared_time))
    _git(repo, "add", "-A")

    detect_proc = _run(repo)
    assert detect_proc.returncode == 1  # 検知はする

    commit_proc = _git(repo, "commit", "-m", "not blocked", check=False)
    assert commit_proc.returncode == 0  # だが commit 自体は独立して成功する


def test_fails_open_when_git_status_unavailable(tmp_path):
    """fail-open: git repo ですらない場所では診断不能として exit 0。"""
    not_a_repo = tmp_path / "not-a-repo"
    not_a_repo.mkdir()
    proc = _run(not_a_repo)
    assert proc.returncode == 0, proc.stdout + proc.stderr


def test_env_thresholds_are_honored(repo):
    """環境変数で閾値を上げれば同じパターンでも通る。"""
    shared_time = 1785448560
    plugins = ["a", "b", "c", "d"]
    for plugin in plugins:
        d = repo / plugin
        d.mkdir()
        for i in range(5):
            f = d / f"file{i}.py"
            f.write_text(f"# {i}\n", encoding="utf-8")
            os.utime(f, (shared_time, shared_time))

    proc = _run(repo, extra_env={MOD.MIN_CLUSTER_SIZE_ENV: "100"})
    assert proc.returncode == 0, proc.stdout + proc.stderr
