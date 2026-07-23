"""scripts/lint-live-trial-verdict.py の機械検査を合成 fixture で固定する。

正: schema 適合 + sha 一致 + PASS + tier=live 非降格 → exit 0
負: DEGRADED / stale-sha / downgrade / schema 違反 / denylist 被験体 →
    存在する verdict の違反は record-only 中 (--enforce なし) でも exit 1
不在: verify_by: live-trial 宣言 skill の verdict 欠落は D13 パイロットゲート中
      record-only WARN (exit 0)、--enforce で exit 1。
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
LINT_PATH = ROOT / "scripts" / "lint-live-trial-verdict.py"

# jsonl 層の valid 証拠は transcript 実体に束縛される。baseline fixture はこの本文と
# その digest を対で用い、束縛検査 (fail-closed) を満たす正の状態を表す。
TRANSCRIPT_BODY = b'{"turn":1}\n'
TRANSCRIPT_SHA = hashlib.sha256(TRANSCRIPT_BODY).hexdigest()


def _load():
    spec = importlib.util.spec_from_file_location("lint_live_trial_verdict", LINT_PATH)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_MOD = _load()

SKILL_MD_DECLARING = """---
name: {name}
description: demo
kind: run
version: 0.1.0
owner: team-platform
feedback_contract:
  criteria:
    - id: OUT1
      loop_scope: outer
      text: 実走 acceptance が PASS する
      verify_by: live-trial
---
body
"""

SKILL_MD_PLAIN = """---
name: {name}
description: demo
kind: run
version: 0.1.0
owner: team-platform
---
body
"""


@pytest.fixture()
def lint(monkeypatch, tmp_path):
    monkeypatch.setattr(_MOD, "PLUGINS_DIR", tmp_path / "plugins")
    monkeypatch.setattr(_MOD, "EVAL_LOG", tmp_path / "eval-log")
    return _MOD


def _make_skill(lint, skill="run-demo", template=SKILL_MD_DECLARING):
    skill_dir = lint.PLUGINS_DIR / "demo-plugin" / "skills" / skill
    (skill_dir / "scripts").mkdir(parents=True, exist_ok=True)
    (skill_dir / "SKILL.md").write_text(template.format(name=skill), encoding="utf-8")
    (skill_dir / "scripts" / "x.py").write_text("print('x')\n", encoding="utf-8")
    return skill_dir


def _valid_doc(lint, skill_dir, skill="run-demo"):
    verdict_mod, _, _ = lint.load_harness()
    return {
        "target_skill": f"demo-plugin:{skill}",
        "args": "",
        "requested_model": "",
        "actual_model": ["claude-sonnet-5"],
        "nudge_count": 0,
        "gate_response_count": 0,
        "goal_verdict": {"result": "PASS", "blockers": []},
        "overall": {"launch": "PASS", "completion": "PASS", "goal_fit": "PASS", "verdict": "PASS"},
        "skill_dir_tree_sha": verdict_mod.skill_dir_tree_sha(skill_dir),
        "transcript_sha256": TRANSCRIPT_SHA,
        "scenario_origin": "synthetic",
        "environment": {
            "claude_version": "2.0.0",
            "tmux": True,
            "transcript_layer": "jsonl",
            "permissions_mode": "bypassPermissions",
        },
        "tier": "live",
        "downgrade_reason": None,
        "timeline": {"boot_s": 3.0, "poll_exit": "DONE", "wall_clock_s": 60.0},
    }


def _write_verdict(lint, doc, skill="run-demo", run_id="20260702T000000"):
    vdir = lint.EVAL_LOG / "demo-plugin" / skill / "live-trial" / run_id
    vdir.mkdir(parents=True, exist_ok=True)
    (vdir / "verdict.json").write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
    # baseline digest を持つ doc には一致する transcript.jsonl を併置し、jsonl 層の
    # 束縛検査を満たす。異なる digest を明示指定したケースは各テストが transcript を自前管理する。
    if doc.get("transcript_sha256") == TRANSCRIPT_SHA:
        (vdir / "transcript.jsonl").write_bytes(TRANSCRIPT_BODY)
    return vdir / "verdict.json"


# --- 正 fixture -------------------------------------------------------------

def test_valid_pass_verdict_exit0(lint, capsys):
    skill_dir = _make_skill(lint)
    _write_verdict(lint, _valid_doc(lint, skill_dir))
    assert lint.run_lint() == 0
    assert "[OK]" in capsys.readouterr().out


def test_valid_pass_verdict_exit0_with_enforce(lint):
    skill_dir = _make_skill(lint)
    _write_verdict(lint, _valid_doc(lint, skill_dir))
    assert lint.run_lint(enforce=True) == 0


# --- 不在 fixture (D13 record-only) ------------------------------------------

def test_missing_verdict_is_record_only_warn(lint, capsys):
    _make_skill(lint)
    assert lint.run_lint() == 0
    out = capsys.readouterr().out
    assert "WARN" in out and "record-only" in out


def test_missing_verdict_fails_with_enforce(lint):
    _make_skill(lint)
    assert lint.run_lint(enforce=True) == 1


def test_missing_not_required_without_declaration(lint, capsys):
    _make_skill(lint, template=SKILL_MD_PLAIN)
    assert lint.run_lint(enforce=True) == 0
    assert "0 missing" in capsys.readouterr().out


def test_denylisted_engine_skill_exempt_from_presence(lint):
    # run-skill-iter-improve は verify_by: live-trial を宣言するが被験 denylist
    # (再帰遮断) につき presence 要求から除外される
    _make_skill(lint, skill="run-skill-iter-improve")
    assert lint.run_lint(enforce=True) == 0


# --- 負 fixture (存在する verdict の違反は record-only 中も exit 1) -----------

def test_degraded_verdict_hard_fails(lint, capsys):
    skill_dir = _make_skill(lint)
    doc = _valid_doc(lint, skill_dir)
    doc["overall"]["verdict"] = "DEGRADED"
    _write_verdict(lint, doc)
    assert lint.run_lint() == 1
    assert "verdict=DEGRADED" in capsys.readouterr().out


def test_stale_sha_hard_fails(lint, capsys):
    skill_dir = _make_skill(lint)
    _write_verdict(lint, _valid_doc(lint, skill_dir))
    # verdict 後に挙動面 (SKILL.md) を変更 → tree sha 不一致
    (skill_dir / "SKILL.md").write_text(
        SKILL_MD_DECLARING.format(name="run-demo") + "\nchanged\n", encoding="utf-8"
    )
    assert lint.run_lint() == 1
    assert "stale-sha" in capsys.readouterr().out


def test_downgraded_tier_hard_fails(lint, capsys):
    skill_dir = _make_skill(lint)
    doc = _valid_doc(lint, skill_dir)
    doc["tier"] = "fork"
    doc["downgrade_reason"] = "tmux 不在"
    _write_verdict(lint, doc)
    assert lint.run_lint() == 1
    assert "downgraded" in capsys.readouterr().out


def test_schema_extra_key_hard_fails(lint, capsys):
    skill_dir = _make_skill(lint)
    doc = _valid_doc(lint, skill_dir)
    doc["score"] = 95  # additionalProperties false 違反 (点数出力の混入を遮断)
    _write_verdict(lint, doc)
    assert lint.run_lint() == 1
    assert "schema" in capsys.readouterr().out


def test_invalid_json_hard_fails(lint):
    skill_dir = _make_skill(lint)
    path = _write_verdict(lint, _valid_doc(lint, skill_dir))
    path.write_text("{broken", encoding="utf-8")
    assert lint.run_lint() == 1


def test_denylist_subject_detected_in_check(lint):
    skill_dir = _make_skill(lint)
    doc = _valid_doc(lint, skill_dir)
    doc["target_skill"] = "demo-plugin:run-skill-live-trial"
    path = _write_verdict(lint, doc)
    verdict_mod, backend_mod, schema = lint.load_harness()
    errs = lint.check_verdict(path, "demo-plugin", "run-demo", verdict_mod, backend_mod, schema)
    assert any("denylist-subject" in e for e in errs)


# --- 最新 run-id 選択 ---------------------------------------------------------

def test_latest_run_id_wins_newer_fail(lint):
    skill_dir = _make_skill(lint)
    good = _valid_doc(lint, skill_dir)
    bad = _valid_doc(lint, skill_dir)
    bad["overall"]["verdict"] = "FAIL"
    _write_verdict(lint, good, run_id="20260701T000000")
    _write_verdict(lint, bad, run_id="20260702T000000")
    assert lint.run_lint() == 1


def test_latest_run_id_wins_newer_pass(lint):
    skill_dir = _make_skill(lint)
    good = _valid_doc(lint, skill_dir)
    bad = _valid_doc(lint, skill_dir)
    bad["overall"]["verdict"] = "FAIL"
    _write_verdict(lint, bad, run_id="20260701T000000")
    _write_verdict(lint, good, run_id="20260702T000000")
    assert lint.run_lint() == 0


# --- self-test 経路 -----------------------------------------------------------

def test_self_test_passes():
    assert _load().self_test() == 0


# --- transcript 束縛 ----------------------------------------------------------

def test_transcript_digest_must_match_actual_file(lint):
    """記録された transcript_sha256 と実体の不一致を検出する。

    これが無いと digest 単独書き換えの検出 (provenance) を、transcript_sha256 も
    併せて書き換えるだけで迂回できる。
    """
    skill_dir = _make_skill(lint)
    doc = _valid_doc(lint, skill_dir)
    doc["transcript_sha256"] = "0" * 64
    vpath = _write_verdict(lint, doc)
    (vpath.parent / "transcript.jsonl").write_text('{"t":1}\n', encoding="utf-8")
    verdict_mod, backend_mod, schema = lint.load_harness()
    errs = lint.check_verdict(vpath, "demo-plugin", "run-demo", verdict_mod, backend_mod, schema)
    assert any("transcript-mismatch" in e for e in errs), errs


def test_tui_layer_null_transcript_is_tolerated(lint):
    """tui 層 (jsonl transcript を保持しない run) は transcript_sha256=null を正当に通す。

    null が許されるのは schema 上 tui 層のみ。jsonl 層の null は別テストで違反として固定する。
    """
    skill_dir = _make_skill(lint)
    doc = _valid_doc(lint, skill_dir)
    doc["transcript_sha256"] = None
    doc["environment"]["transcript_layer"] = "tui"
    vpath = _write_verdict(lint, doc)
    verdict_mod, backend_mod, schema = lint.load_harness()
    assert lint.check_verdict(vpath, "demo-plugin", "run-demo", verdict_mod, backend_mod, schema) == []


def test_transcript_file_null_sha_hard_fails_even_if_tui_layer(lint, capsys):
    """transcript 実体があるのに sha=null なら会話ログ未束縛 → 違反 (exit 1)。

    否定ガード ('recorded is not None') の素通しを塞ぐ本課題の中核回帰。null + transcript 削除
    だけで束縛検査を迂回できてはならず、layer 表示だけにも依存してはならない。
    """
    skill_dir = _make_skill(lint)
    doc = _valid_doc(lint, skill_dir)
    doc["transcript_sha256"] = None
    doc["environment"]["transcript_layer"] = "tui"  # layer 表示で実体検査を迂回できないこと
    vpath = _write_verdict(lint, doc)
    (vpath.parent / "transcript.jsonl").write_bytes(TRANSCRIPT_BODY)
    assert lint.run_lint() == 1
    assert "transcript-unbound" in capsys.readouterr().out


def test_transcript_file_with_missing_sha_key_hard_fails(lint, capsys):
    """transcript 実体があり transcript_sha256 キーが欠落した verdict は schema 違反。"""
    skill_dir = _make_skill(lint)
    doc = _valid_doc(lint, skill_dir)
    del doc["transcript_sha256"]
    vpath = _write_verdict(lint, doc)
    (vpath.parent / "transcript.jsonl").write_bytes(TRANSCRIPT_BODY)
    assert lint.run_lint() == 1
    out = capsys.readouterr().out
    assert "schema" in out and "transcript_sha256" in out


def test_jsonl_layer_missing_transcript_file_hard_fails(lint):
    """jsonl 層で digest は記録されているのに transcript.jsonl 実体が無い → 違反。"""
    skill_dir = _make_skill(lint)
    doc = _valid_doc(lint, skill_dir)
    doc["transcript_sha256"] = "a" * 64  # 実体を併置しない digest → transcript.jsonl 不在
    vpath = _write_verdict(lint, doc)
    assert not (vpath.parent / "transcript.jsonl").exists()
    verdict_mod, backend_mod, schema = lint.load_harness()
    errs = lint.check_verdict(vpath, "demo-plugin", "run-demo", verdict_mod, backend_mod, schema)
    assert any("transcript-missing" in e for e in errs), errs


def test_jsonl_layer_bound_transcript_passes(lint):
    """jsonl 層で transcript_sha256 が実体と一致すれば束縛は満たされる (正の経路)。"""
    skill_dir = _make_skill(lint)
    vpath = _write_verdict(lint, _valid_doc(lint, skill_dir))
    assert (vpath.parent / "transcript.jsonl").read_bytes() == TRANSCRIPT_BODY
    verdict_mod, backend_mod, schema = lint.load_harness()
    assert lint.check_verdict(vpath, "demo-plugin", "run-demo", verdict_mod, backend_mod, schema) == []


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
