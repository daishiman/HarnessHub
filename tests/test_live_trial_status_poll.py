"""run-skill-live-trial の status/poll を機械検証する。

- live-trial-status: transcript JSONL の 4 状態分類 + interrupt 例外 + subagents bytes 合算
- live-trial-poll: 終端 4 分岐 (DONE/STALL/GATE/HARD_CAP) + state-file JSON 永続化

合成 fixture は references/transcript-jsonl.md の実測スキーマに従う。
"""
import importlib.util
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "plugins" / "harness-creator" / "skills" / "run-skill-live-trial" / "scripts"
def _load(stem: str):
    spec = importlib.util.spec_from_file_location(
        stem.replace("-", "_"), SCRIPTS / f"{stem}.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


status_mod = _load("live-trial-status")
poll_mod = _load("live-trial-poll")
finalize_mod = _load("build-live-trial-verdict")


# ---- 合成 transcript fixture -------------------------------------------------

def _write_jsonl(path: Path, entries: list[dict]) -> Path:
    for i, e in enumerate(entries):
        e.setdefault("timestamp", f"2026-07-02T00:00:{i:02d}Z")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "\n".join(json.dumps(e, ensure_ascii=False) for e in entries) + "\n",
        encoding="utf-8",
    )
    return path


def _prompt(text="run the task"):
    return {"type": "user", "message": {"content": text}}


def _turn_end():
    return {"type": "system", "subtype": "turn_duration"}


def _tool_use(tid, name, tool_input=None):
    block = {"type": "tool_use", "id": tid, "name": name}
    if tool_input is not None:
        block["input"] = tool_input
    return {"type": "assistant", "message": {
        "model": "claude-opus-4-8",
        "content": [block]}}


def _tool_result(tid):
    return {"type": "user", "message": {
        "content": [{"type": "tool_result", "tool_use_id": tid}]}}


FIXTURES = {
    "waiting": [_prompt(), _tool_use("t1", "AskUserQuestion")],
    "busy_tool": [_prompt(), _tool_use("t2", "Bash")],
    "busy_gen": [_prompt()],
    "idle": [_prompt(), _tool_use("t3", "Bash"), _tool_result("t3"), _turn_end()],
}


# ---- live-trial-status: 4 状態分類 -------------------------------------------

@pytest.mark.parametrize("name,expected", [
    ("waiting", "WAITING_USER_INPUT"),
    ("busy_tool", "BUSY_TOOL_RUNNING"),
    ("busy_gen", "BUSY_GENERATING"),
    ("idle", "IDLE_TURN_COMPLETE"),
])
def test_status_four_states(tmp_path, name, expected):
    p = _write_jsonl(tmp_path / f"{name}.jsonl", [dict(e) for e in FIXTURES[name]])
    result = status_mod.classify(p)
    assert result["state"] == expected


def test_status_interrupt_is_turn_end(tmp_path):
    entries = [_prompt(), {"type": "user",
                           "message": {"content": "[Request interrupted by user]"}}]
    p = _write_jsonl(tmp_path / "int.jsonl", entries)
    assert status_mod.classify(p)["state"] == "IDLE_TURN_COMPLETE"


def test_status_missing_or_empty_returns_none(tmp_path):
    assert status_mod.classify(tmp_path / "nope.jsonl") is None
    empty = tmp_path / "empty.jsonl"
    empty.write_text("", encoding="utf-8")
    assert status_mod.classify(empty) is None
    # 全行 parse 不能も None (TUI fallback へ)
    garbage = tmp_path / "garbage.jsonl"
    garbage.write_text("not json at all\n", encoding="utf-8")
    assert status_mod.classify(garbage) is None


def test_status_subagent_bytes_aggregated(tmp_path):
    """fork 内長時間実行の STALL 誤報対策: subagents/*.jsonl bytes を合算する。"""
    p = _write_jsonl(tmp_path / "s.jsonl", [_prompt()])
    base = status_mod.transcript_bytes(p)
    sub = tmp_path / "s" / "subagents"
    sub.mkdir(parents=True)
    (sub / "a.jsonl").write_text("x" * 100, encoding="utf-8")
    assert status_mod.transcript_bytes(p) == base + 100


def test_status_cli_exit3_on_missing(tmp_path, capsys):
    assert status_mod.main([str(tmp_path / "none.jsonl")]) == 3
    p = _write_jsonl(tmp_path / "idle.jsonl", [dict(e) for e in FIXTURES["idle"]])
    assert status_mod.main([str(p)]) == 0
    out = capsys.readouterr().out
    assert "STATE:IDLE_TURN_COMPLETE" in out and "BYTES:" in out


# ---- live-trial-poll: 終端 4 分岐 + state-file --------------------------------

def _poll_env(monkeypatch, tmp_path, session_id="u-1", **env):
    projects = tmp_path / "projects" / "proj"
    projects.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("CLAUDE_PROJECTS_DIR", str(tmp_path / "projects"))
    monkeypatch.setenv("SESSION_ID", session_id)
    defaults = {"INTERVAL": "0", "STABLE_TICKS": "2",
                "STALL_LIMIT": "600", "HARD_CAP": "7200"}
    defaults.update({k: str(v) for k, v in env.items()})
    for k, v in defaults.items():
        monkeypatch.setenv(k, v)
    return projects


def test_poll_done(monkeypatch, tmp_path, capsys):
    projects = _poll_env(monkeypatch, tmp_path)
    _write_jsonl(projects / "u-1.jsonl", [dict(e) for e in FIXTURES["idle"]])
    marker = tmp_path / "out" / "status.json"
    marker.parent.mkdir()
    marker.write_text('{"status":"PASS"}', encoding="utf-8")
    rc = poll_mod.main([str(marker), "lt-test"])
    assert rc == poll_mod.EXIT_DONE
    assert "via jsonl" in capsys.readouterr().out


def test_poll_gate_after_two_ticks_and_resets(monkeypatch, tmp_path, capsys):
    projects = _poll_env(monkeypatch, tmp_path)
    _write_jsonl(projects / "u-1.jsonl", [dict(e) for e in FIXTURES["waiting"]])
    state_file = tmp_path / "state.json"
    rc = poll_mod.main(["--state-file", str(state_file),
                        str(tmp_path / "out" / "status.json"), "lt-test"])
    assert rc == poll_mod.EXIT_GATE
    assert "AskUserQuestion" in capsys.readouterr().out
    # 応答後の再 poll が即 GATE 再発しないよう gate_ticks=0 で永続化される
    assert json.loads(state_file.read_text())["gate_ticks"] == 0


def test_poll_stall_no_artifact(monkeypatch, tmp_path, capsys):
    projects = _poll_env(monkeypatch, tmp_path, INTERVAL="1", STALL_LIMIT="1")
    _write_jsonl(projects / "u-1.jsonl", [dict(e) for e in FIXTURES["idle"]])
    rc = poll_mod.main([str(tmp_path / "out" / "status.json"), "lt-test"])
    assert rc == poll_mod.EXIT_STALL
    assert "成果物なし" in capsys.readouterr().out


def test_poll_hard_cap(monkeypatch, tmp_path, capsys):
    projects = _poll_env(monkeypatch, tmp_path, INTERVAL="1", HARD_CAP="1")
    _write_jsonl(projects / "u-1.jsonl", [dict(e) for e in FIXTURES["busy_gen"]])
    rc = poll_mod.main([str(tmp_path / "out" / "status.json"), "lt-test"])
    assert rc == poll_mod.EXIT_HARD_CAP
    out = capsys.readouterr().out
    assert "HARD_CAP" in out


def _scenario_file(tmp_path, *, wall=60, tokens=1000):
    path = tmp_path / "scenarios.json"
    path.write_text(json.dumps({
        "scenarios": [{
            "scenario_id": "bounded",
            "required_observations": ["bounded run completes"],
            "resource_budget": {
                "max_wall_clock_s": wall,
                "max_total_tokens": tokens,
            },
        }],
    }), encoding="utf-8")
    return path


def test_poll_scenario_wall_cap_cannot_be_raised_by_environment(
    monkeypatch, tmp_path, capsys
):
    projects = _poll_env(monkeypatch, tmp_path, INTERVAL="1", HARD_CAP="7200")
    _write_jsonl(projects / "u-1.jsonl", [dict(e) for e in FIXTURES["busy_gen"]])
    rc = poll_mod.main([
        "--state-file", str(tmp_path / "poll-state.json"),
        "--scenario-file", str(_scenario_file(tmp_path, wall=1)),
        "--scenario-id", "bounded",
        str(tmp_path / "out" / "status.json"), "lt-test",
    ])
    assert rc == poll_mod.EXIT_HARD_CAP
    assert "1s 到達" in capsys.readouterr().out


def test_poll_scenario_token_cap_stops_immediately(monkeypatch, tmp_path, capsys):
    projects = _poll_env(monkeypatch, tmp_path)
    transcript = projects / "u-1.jsonl"
    _write_jsonl(transcript, [{
        "type": "assistant",
        "message": {
            "id": "msg-1",
            "model": "claude-test",
            "content": [],
            "usage": {"input_tokens": 1, "output_tokens": 1},
        },
    }])
    rc = poll_mod.main([
        "--state-file", str(tmp_path / "poll-state.json"),
        "--scenario-file", str(_scenario_file(tmp_path, tokens=2)),
        "--scenario-id", "bounded",
        str(tmp_path / "out" / "status.json"), "lt-test",
    ])
    assert rc == poll_mod.EXIT_TOKEN_CAP
    assert "TOKEN_CAP (2 >= 2)" in capsys.readouterr().out


def test_poll_state_file_persists_counters(monkeypatch, tmp_path):
    projects = _poll_env(monkeypatch, tmp_path, INTERVAL="1")
    _write_jsonl(projects / "u-1.jsonl", [dict(e) for e in FIXTURES["busy_gen"]])
    state_file = tmp_path / "state.json"
    rc = poll_mod.main(["--state-file", str(state_file), "--max-ticks", "2",
                        str(tmp_path / "out" / "status.json"), "lt-test"])
    assert rc == poll_mod.EXIT_TICK_BUDGET
    st = json.loads(state_file.read_text())
    assert st["elapsed"] == 1  # 呼び越しで 0 に戻らない (STALL/HARD_CAP 実効の前提)
    assert st["prev"].startswith("jsonl:")
    # 同一 state-file の再呼びで elapsed が引き継がれ DONE に到達する
    # (trial 完了を模して jsonl を idle へ更新 — busy のままだと DONE 条件を満たさない)
    _write_jsonl(projects / "u-1.jsonl", [dict(e) for e in FIXTURES["idle"]])
    marker = tmp_path / "out" / "status.json"
    marker.parent.mkdir()
    marker.write_text('{"status":"PASS"}', encoding="utf-8")
    monkeypatch.setenv("INTERVAL", "0")
    monkeypatch.setenv("STABLE_TICKS", "1")
    rc2 = poll_mod.main(["--state-file", str(state_file),
                         str(marker), "lt-test"])
    assert rc2 == poll_mod.EXIT_DONE
    assert json.loads(state_file.read_text())["elapsed"] >= 1


def test_poll_corrupt_state_file_fails_closed_without_reset(monkeypatch, tmp_path, capsys):
    projects = _poll_env(monkeypatch, tmp_path)
    _write_jsonl(projects / "u-1.jsonl", [dict(e) for e in FIXTURES["idle"]])
    state_file = tmp_path / "state.json"
    state_file.write_text("{broken", encoding="utf-8")
    marker = tmp_path / "out" / "status.json"
    marker.parent.mkdir()
    marker.write_text("{}", encoding="utf-8")
    assert poll_mod.main(["--state-file", str(state_file),
                          str(marker), "lt-test"]) == poll_mod.EXIT_BLOCKED
    assert "STATE_CORRUPT" in capsys.readouterr().out


def test_poll_missing_usage_fails_closed(monkeypatch, tmp_path, capsys):
    projects = _poll_env(monkeypatch, tmp_path)
    _write_jsonl(projects / "u-1.jsonl", [{
        "type": "assistant",
        "message": {"id": "msg-no-usage", "model": "claude-test", "content": []},
    }])
    rc = poll_mod.main([
        "--state-file", str(tmp_path / "poll-state.json"),
        "--scenario-file", str(_scenario_file(tmp_path)),
        "--scenario-id", "bounded",
        str(tmp_path / "out" / "status.json"), "lt-test",
    ])
    assert rc == poll_mod.EXIT_BLOCKED
    assert "TOKEN_UNMEASURED" in capsys.readouterr().out


def test_scenario_poll_requires_persisted_state_file(monkeypatch, tmp_path):
    _poll_env(monkeypatch, tmp_path)
    with pytest.raises(SystemExit):
        poll_mod.main([
            "--scenario-file", str(_scenario_file(tmp_path)),
            "--scenario-id", "bounded",
            str(tmp_path / "out" / "status.json"), "lt-test",
        ])


def test_finalizer_reaps_even_when_verdict_fails():
    calls = []

    class Backend:
        @staticmethod
        def valid_session_name(value): return True
        @staticmethod
        def valid_run_id(value): return True
        @staticmethod
        def session_belongs_to_run(session, run_id): return True
        @staticmethod
        def reap(run_id, owner_pid): calls.append(("reap", run_id, owner_pid)); return []
        @staticmethod
        def has_session(session): return False

    class Verdict:
        @staticmethod
        def main(_args): raise SystemExit(2)

    rc = finalize_mod.finalize(
        session="lt-run-1", run_id="run-1", owner_pid=123,
        verdict_args=["--bad"], backend=Backend, verdict=Verdict,
    )
    assert rc == 2
    assert calls == [("reap", "run-1", 123)]


def test_finalizer_never_kills_session_when_tmux_ownership_mismatches():
    calls = []

    class Backend:
        valid_session_name = staticmethod(lambda _value: True)
        valid_run_id = staticmethod(lambda _value: True)
        session_belongs_to_run = staticmethod(lambda _session, _run_id: True)
        reap = staticmethod(lambda run_id, owner_pid: calls.append(("reap", run_id, owner_pid)) or [])
        has_session = staticmethod(lambda _session: True)

    class Verdict:
        main = staticmethod(lambda _args: 0)

    rc = finalize_mod.finalize(
        session="lt-run-1", run_id="run-1", owner_pid=123,
        verdict_args=["--ok"], backend=Backend, verdict=Verdict,
    )
    assert rc == 1
    assert calls == [("reap", "run-1", 123)]
