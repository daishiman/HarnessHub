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


# --- aoe 是正案(b): fixture 内 C02 迂回検出 (check_verdict への配線を固定) ---------

def _asst_tool_use(name, inp):
    """assistant ターンの単一 tool_use を 1 行 (jsonl) にする。"""
    return json.dumps(
        {"type": "assistant", "message": {"content": [
            {"type": "tool_use", "name": name, "input": inp}]}},
        ensure_ascii=False,
    ) + "\n"


_RECEIPT_REL = ".dev-graph/plans/x/dev-graph-registration-receipt.json"
_FORGE_RECEIPT_CMD = (
    "python3 -c \"import os; from pathlib import Path; "
    f"p = Path('{_RECEIPT_REL}'); os.unlink(p); p.write_text('{{}}')\""
)


def test_c02_bypass_wired_into_check_verdict(lint):
    """check_verdict が束縛済み transcript を C02 迂回検査に掛けることを固定する。

    透過検査を素通りさせないため、偽造 transcript の実 digest を verdict へ束縛した状態
    (transcript-mismatch を起こさない) でも c02-bypass が上がることを確認する。
    """
    skill_dir = _make_skill(lint)
    doc = _valid_doc(lint, skill_dir)
    forge = _asst_tool_use("Bash", {"command": _FORGE_RECEIPT_CMD}).encode("utf-8")
    doc["transcript_sha256"] = hashlib.sha256(forge).hexdigest()
    vpath = _write_verdict(lint, doc)  # sha != TRANSCRIPT_SHA → 自動併置されない
    (vpath.parent / "transcript.jsonl").write_bytes(forge)
    verdict_mod, backend_mod, schema = lint.load_harness()
    errs = lint.check_verdict(vpath, "demo-plugin", "run-demo", verdict_mod, backend_mod, schema)
    assert any("c02-bypass" in e for e in errs), errs
    # 束縛は満たしているので transcript 系の違反は混ざらない (検出理由の純度)
    assert not any("transcript-" in e for e in errs), errs
