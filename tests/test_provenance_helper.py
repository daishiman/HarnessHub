"""scripts/provenance_helper.py の digest-provenance 検査を合成 git repo で固定する。

lint-live-trial-verdict.py から責務分離した check_digest_provenance を対象にする。
main モジュールが helper を re-export するため _MOD.check_digest_provenance で参照面は
分割前と同一 (テスト本文は無改変で移設)。

digest 単独書き換え (再 trial なしの緑化) / path を動かす迂回 (run 改名・削除) /
ys3 (base_ref より遅れたツリーでの evidence-removed 偽陽性回避) を検証する。
"""
from __future__ import annotations

import importlib.util
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LINT_PATH = ROOT / "scripts" / "lint-live-trial-verdict.py"


def _load():
    spec = importlib.util.spec_from_file_location("lint_live_trial_verdict", LINT_PATH)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_MOD = _load()


# --- digest provenance (再 trial なしの緑化検出) -------------------------------

def _provenance_repo(tmp_path):
    """verdict + transcript を 1 件コミット済みの合成 repo を返す。"""
    repo = tmp_path / "repo"
    run = repo / "eval-log" / "demo-plugin" / "run-demo" / "live-trial" / "20260701T000000"
    run.mkdir(parents=True)
    (run / "transcript.jsonl").write_text('{"turn":1}\n', encoding="utf-8")
    (run / "verdict.json").write_text(
        json.dumps({"skill_dir_tree_sha": "a" * 64, "transcript_sha256": "b" * 64}),
        encoding="utf-8",
    )
    for args in (["init", "-q"], ["add", "-A"],
                 ["-c", "user.email=t@example.com", "-c", "user.name=t",
                  "commit", "-q", "-m", "base"]):
        subprocess.run(["git", *args], cwd=repo, check=True, capture_output=True)
    return repo, run


def test_digest_only_rewrite_is_flagged(tmp_path):
    repo, run = _provenance_repo(tmp_path)
    (run / "verdict.json").write_text(
        json.dumps({"skill_dir_tree_sha": "c" * 64, "transcript_sha256": "b" * 64}),
        encoding="utf-8",
    )
    violations, inspected = _MOD.check_digest_provenance("HEAD", repo_root=repo)
    assert inspected == 1
    assert len(violations) == 1 and "digest-only-rewrite" in violations[0]


def test_rerun_with_new_transcript_is_not_flagged(tmp_path):
    """実走して transcript が変われば digest 更新は正当。"""
    repo, run = _provenance_repo(tmp_path)
    (run / "transcript.jsonl").write_text('{"turn":1}\n{"turn":2}\n', encoding="utf-8")
    (run / "verdict.json").write_text(
        json.dumps({"skill_dir_tree_sha": "c" * 64, "transcript_sha256": "d" * 64}),
        encoding="utf-8",
    )
    violations, _ = _MOD.check_digest_provenance("HEAD", repo_root=repo)
    assert violations == []


def test_new_run_directory_is_not_flagged(tmp_path):
    """新しい run-id の追加は比較対象が無いので違反にしない。"""
    repo, run = _provenance_repo(tmp_path)
    fresh = run.parent / "20260702T000000"
    fresh.mkdir()
    (fresh / "transcript.jsonl").write_text('{"turn":9}\n', encoding="utf-8")
    (fresh / "verdict.json").write_text(
        json.dumps({"skill_dir_tree_sha": "c" * 64, "transcript_sha256": "e" * 64}),
        encoding="utf-8",
    )
    violations, _ = _MOD.check_digest_provenance("HEAD", repo_root=repo)
    assert violations == []


def test_untouched_tree_is_not_flagged(tmp_path):
    repo, _run = _provenance_repo(tmp_path)
    violations, inspected = _MOD.check_digest_provenance("HEAD", repo_root=repo)
    assert violations == [] and inspected == 0


def test_unresolvable_base_ref_is_reported(tmp_path):
    repo, _run = _provenance_repo(tmp_path)
    violations, _ = _MOD.check_digest_provenance("no-such-ref", repo_root=repo)
    assert violations and "base-ref-unresolvable" in violations[0]


# --- path を動かす迂回 (履歴束縛の剥がし) ------------------------------------

def test_deleting_transcript_does_not_count_as_rerun(tmp_path):
    """transcript を消して transcript_sha256 を null にする迂回を塞ぐ。

    削除も `git diff --name-only` には現れるため、「変化した」だけを再実行の証拠に
    すると 2 行の編集で遮断を無効化できる (2026-07-21 実測)。
    """
    repo, run = _provenance_repo(tmp_path)
    (run / "transcript.jsonl").unlink()
    (run / "verdict.json").write_text(
        json.dumps({"skill_dir_tree_sha": "c" * 64, "transcript_sha256": None}),
        encoding="utf-8",
    )
    violations, _ = _MOD.check_digest_provenance("HEAD", repo_root=repo)
    assert len(violations) == 1 and "digest-only-rewrite" in violations[0]


def test_renaming_run_directory_is_flagged_as_evidence_removed(tmp_path):
    """run ディレクトリ改名で path 束縛を外す迂回を塞ぐ。

    旧 path の現物が消えると突合対象から外れ、新 path は比較対象なしの新規 run に
    見えるため、改名 + digest 書き換えが素通りしていた。
    """
    repo, run = _provenance_repo(tmp_path)
    renamed = run.parent / (run.name + "-r2")
    run.rename(renamed)
    (renamed / "verdict.json").write_text(
        json.dumps({"skill_dir_tree_sha": "c" * 64, "transcript_sha256": "b" * 64}),
        encoding="utf-8",
    )
    violations, _ = _MOD.check_digest_provenance("HEAD", repo_root=repo)
    assert len(violations) == 1 and "evidence-removed" in violations[0]


def test_deleting_evidence_outright_is_flagged(tmp_path):
    """証跡ディレクトリごとの削除も報告する (証跡は append-only)。"""
    repo, run = _provenance_repo(tmp_path)
    for child in run.iterdir():
        child.unlink()
    run.rmdir()
    violations, _ = _MOD.check_digest_provenance("HEAD", repo_root=repo)
    assert len(violations) == 1 and "evidence-removed" in violations[0]


def test_transcript_sha_downgrade_to_null_is_not_rerun_evidence(tmp_path):
    """記録 digest の 非null → null は「変化」だが再実行の証拠ではない。"""
    repo, run = _provenance_repo(tmp_path)
    (run / "verdict.json").write_text(
        json.dumps({"skill_dir_tree_sha": "c" * 64, "transcript_sha256": None}),
        encoding="utf-8",
    )
    violations, _ = _MOD.check_digest_provenance("HEAD", repo_root=repo)
    assert len(violations) == 1 and "digest-only-rewrite" in violations[0]


# --- ys3: base_ref より遅れたツリーでの evidence-removed 偽陽性回避 ------------

def _git_c(repo, *args):
    return subprocess.run(
        ["git", *args], cwd=repo, check=True, capture_output=True, text=True
    )


def _commit_all(repo, msg):
    _git_c(repo, "add", "-A")
    _git_c(repo, "-c", "user.email=t@example.com", "-c", "user.name=t",
           "commit", "-q", "-m", msg)


def _add_run(repo, run_id, sha_prefix):
    run = repo / "eval-log" / "demo-plugin" / "run-demo" / "live-trial" / run_id
    run.mkdir(parents=True)
    (run / "transcript.jsonl").write_text('{"turn":1}\n', encoding="utf-8")
    (run / "verdict.json").write_text(
        json.dumps({"skill_dir_tree_sha": sha_prefix * 64, "transcript_sha256": "b" * 64}),
        encoding="utf-8",
    )
    return run


def test_evidence_added_on_base_after_branch_point_is_not_flagged(tmp_path):
    """作業ブランチが base_ref より遅れているとき、base_ref 側で分岐後に追加された
    証跡を evidence-removed と誤判定しない (ys3 の中核)。

    base_ref を直接 diff 基準にする旧実装ではこの追加が「現ツリーから消えた」に
    見えて偽陽性になっていた。merge-base(HEAD, base_ref) 基準では差分に現れない。
    """
    repo, _run = _provenance_repo(tmp_path)
    base_sha = _git_c(repo, "rev-parse", "HEAD").stdout.strip()
    # base_ref (= 進んだ main) 側に、分岐点より後で証跡を 1 件追加
    _add_run(repo, "20260703T000000", "f")
    _commit_all(repo, "advance base_ref with new evidence")
    advanced_sha = _git_c(repo, "rev-parse", "HEAD").stdout.strip()
    # 作業ツリーを分岐点へ戻す = base_ref より 1 コミット遅れた状態
    _git_c(repo, "checkout", "-q", base_sha)
    violations, _ = _MOD.check_digest_provenance(advanced_sha, repo_root=repo)
    assert violations == [], violations


def test_real_deletion_still_flagged_when_behind_base(tmp_path):
    """遅れたツリーでも、分岐後に本ブランチが実際に消した証跡は捕捉する。

    偽陽性回避 (merge-base 基準化) が真の証跡削除の見逃しへ退化しないことを固定する。
    """
    repo, run = _provenance_repo(tmp_path)  # base コミットに E1
    base_sha = _git_c(repo, "rev-parse", "HEAD").stdout.strip()
    _add_run(repo, "20260703T000000", "f")  # base_ref 側に E2 追加
    _commit_all(repo, "advance base_ref")
    advanced_sha = _git_c(repo, "rev-parse", "HEAD").stdout.strip()
    # 分岐点から作業ブランチを作り、E1 を削除してコミット
    _git_c(repo, "checkout", "-q", "-b", "work", base_sha)
    for child in run.iterdir():
        child.unlink()
    run.rmdir()
    _commit_all(repo, "work removes E1")
    violations, _ = _MOD.check_digest_provenance(advanced_sha, repo_root=repo)
    assert len(violations) == 1 and "evidence-removed" in violations[0], violations
