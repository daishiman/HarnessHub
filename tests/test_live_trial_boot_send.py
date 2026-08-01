"""Offline coverage for live-trial boot and send orchestration."""

import json
import shutil
from pathlib import Path

import pytest

from live_trial_test_support import (
    _write_package_contract,
    backend_mod,
    boot_mod,
    send_mod,
)


# ---- backend / boot / send: オフライン検査 ------------------------------------

def test_backend_denylist_and_session_names():
    assert backend_mod.deny_target_skill("run-skill-live-trial")
    assert backend_mod.deny_target_skill("harness-creator:run-skill-iter-improve")
    assert not backend_mod.deny_target_skill("harness-creator:run-goal-seek")
    assert backend_mod.valid_session_name("lt-20260702T000000-x")
    assert not backend_mod.valid_session_name("../evil")
    assert not backend_mod.valid_session_name("a/b")


def test_backend_blocked_without_tmux(monkeypatch):
    monkeypatch.setattr(shutil, "which", lambda _cmd: None)
    with pytest.raises(SystemExit) as exc:
        backend_mod.require_tmux()
    assert exc.value.code == 3


def test_backend_self_test_cli():
    assert backend_mod.main(["--self-test"]) == 0
    assert backend_mod.main(["deny-check", "harness-creator:run-goal-seek"]) == 0
    assert backend_mod.main(["deny-check", "run-skill-live-trial"]) == 2


def test_boot_denylist_and_validation(tmp_path, capsys):
    assert boot_mod.main(["--self-test"]) == 0
    rc = boot_mod.main(["lt-x", str(tmp_path),
                        "--run-id", "x",
                        "--target-skill", "run-skill-iter-improve"])
    assert rc == 2
    assert "DENYLIST" in capsys.readouterr().err
    assert boot_mod.main(["../evil", str(tmp_path), "--run-id", "x"]) == 2
    assert boot_mod.main([
        "lt-x", str(tmp_path / "missing"), "--run-id", "x"
    ]) == 2
    assert boot_mod.main([
        "lt-x", str(tmp_path), "--run-id", "x", "--model", "bad model;rm"
    ]) == 2
    assert boot_mod.main([
        "lt-x", str(tmp_path), "--run-id", "x",
        "--session-id", "bad; touch /tmp/injected"
    ]) == 2
    assert boot_mod.main(["lt-x", str(tmp_path)]) == 2
    assert "missing run-id" in capsys.readouterr().err
    assert boot_mod.main([
        "lt-other", str(tmp_path), "--run-id", "x"
    ]) == 2


def _write_trial_plugin(
    root: Path, directory_name: str, manifest_name: str,
    skill_name: str = "run-dev-graph-init",
) -> Path:
    plugin_dir = root / "plugins" / directory_name
    (plugin_dir / ".claude-plugin").mkdir(parents=True)
    (plugin_dir / ".claude-plugin" / "plugin.json").write_text(
        json.dumps({"name": manifest_name}), encoding="utf-8"
    )
    skill_dir = plugin_dir / "skills" / skill_name
    skill_dir.mkdir(parents=True)
    (skill_dir / "SKILL.md").write_text("---\ndescription: fixture\n---\n", encoding="utf-8")
    return plugin_dir


def test_boot_qualified_target_pins_cwd_plugin_dir(tmp_path):
    plugin_dir = _write_trial_plugin(tmp_path, "dev-graph", "dev-graph")
    resolved = boot_mod.resolve_target_plugin_dir(
        str(tmp_path), "dev-graph:run-dev-graph-init"
    )
    assert resolved == plugin_dir.resolve()
    argv = boot_mod.build_claude_argv("u-1", "", resolved)
    assert argv[-2:] == ("--plugin-dir", str(plugin_dir.resolve()))
    assert argv[argv.index("--setting-sources") + 1] == "local"
    assert boot_mod.resolve_target_plugin_dir(str(tmp_path), "plain-skill") is None
    assert "--plugin-dir" not in boot_mod.build_claude_argv("u-1", "")


def test_boot_qualified_target_loads_only_declared_dependencies(tmp_path):
    plugin_dir = _write_trial_plugin(tmp_path, "dev-graph", "dev-graph")
    dep_b = _write_trial_plugin(tmp_path, "system-spec-harness", "system-spec-harness")
    dep_a = _write_trial_plugin(tmp_path, "system-dev-planner", "system-dev-planner")
    undeclared = _write_trial_plugin(tmp_path, "other-plugin", "other-plugin")
    _write_package_contract(plugin_dir, ["system-spec-harness", "system-dev-planner"])

    resolved = boot_mod.resolve_target_plugin_dirs(
        str(tmp_path), "dev-graph:run-dev-graph-init"
    )
    assert resolved == (plugin_dir.resolve(), dep_a.resolve(), dep_b.resolve())
    assert undeclared.resolve() not in resolved
    argv = boot_mod.build_claude_argv("u-1", "", resolved)
    loaded = [argv[index + 1] for index, value in enumerate(argv) if value == "--plugin-dir"]
    assert loaded == [str(path) for path in resolved]


def test_boot_qualified_target_honors_per_skill_dependency_scope(tmp_path):
    plugin_dir = _write_trial_plugin(tmp_path, "dev-graph", "dev-graph")
    second = plugin_dir / "skills" / "run-dev-graph-system-spec"
    second.mkdir(parents=True)
    (second / "SKILL.md").write_text("---\ndescription: fixture\n---\n", encoding="utf-8")
    dependency = _write_trial_plugin(
        tmp_path, "system-spec-harness", "system-spec-harness"
    )
    _write_package_contract(
        plugin_dir,
        ["system-spec-harness"],
        skills=["run-dev-graph-init", "run-dev-graph-system-spec"],
        skill_dependencies={
            "run-dev-graph-system-spec": ["system-spec-harness"],
        },
    )

    init_dirs = boot_mod.resolve_target_plugin_dirs(
        str(tmp_path), "dev-graph:run-dev-graph-init"
    )
    system_spec_dirs = boot_mod.resolve_target_plugin_dirs(
        str(tmp_path), "dev-graph:run-dev-graph-system-spec"
    )
    assert init_dirs == (plugin_dir.resolve(),)
    assert system_spec_dirs == (plugin_dir.resolve(), dependency.resolve())


def test_boot_rejects_skill_dependency_outside_package_allow_list(tmp_path):
    plugin_dir = _write_trial_plugin(tmp_path, "dev-graph", "dev-graph")
    _write_package_contract(
        plugin_dir,
        [],
        skills=["run-dev-graph-init"],
        skill_dependencies={"run-dev-graph-init": ["undeclared-plugin"]},
    )
    with pytest.raises(ValueError, match="subset of depends_on"):
        boot_mod.resolve_target_plugin_dirs(
            str(tmp_path), "dev-graph:run-dev-graph-init"
        )


def test_boot_declared_dependency_fails_closed_on_missing_or_manifest_mismatch(tmp_path):
    plugin_dir = _write_trial_plugin(tmp_path, "dev-graph", "dev-graph")
    _write_package_contract(plugin_dir, ["system-spec-harness"])
    with pytest.raises(ValueError, match="directory not found"):
        boot_mod.resolve_target_plugin_dirs(
            str(tmp_path), "dev-graph:run-dev-graph-init"
        )
    _write_trial_plugin(tmp_path, "system-spec-harness", "wrong-name")
    with pytest.raises(ValueError, match="manifest name mismatch"):
        boot_mod.resolve_target_plugin_dirs(
            str(tmp_path), "dev-graph:run-dev-graph-init"
        )


def test_boot_declared_dependency_rejects_symlink_escape(tmp_path):
    plugin_dir = _write_trial_plugin(tmp_path, "dev-graph", "dev-graph")
    _write_package_contract(plugin_dir, ["system-spec-harness"])
    outside = _write_trial_plugin(
        tmp_path / "outside-root", "system-spec-harness", "system-spec-harness"
    )
    (tmp_path / "plugins" / "system-spec-harness").symlink_to(
        outside, target_is_directory=True
    )
    with pytest.raises(ValueError, match="escapes cwd/plugins"):
        boot_mod.resolve_target_plugin_dirs(
            str(tmp_path), "dev-graph:run-dev-graph-init"
        )


@pytest.mark.parametrize("target", [
    "../evil:run-safe",
    "Dev_Graph:run-safe",
    "dev-graph:../run-safe",
    "dev-graph:run-safe:extra",
])
def test_boot_qualified_target_rejects_invalid_slug_or_path(tmp_path, target):
    with pytest.raises(ValueError):
        boot_mod.resolve_target_plugin_dir(str(tmp_path), target)


def test_boot_qualified_target_rejects_symlink_escape(tmp_path):
    outside = _write_trial_plugin(tmp_path / "outside-root", "outside", "escape")
    plugins = tmp_path / "plugins"
    plugins.mkdir()
    (plugins / "escape").symlink_to(outside, target_is_directory=True)
    with pytest.raises(ValueError, match="escapes cwd/plugins"):
        boot_mod.resolve_target_plugin_dir(str(tmp_path), "escape:run-safe")


def test_boot_qualified_target_rejects_manifest_name_mismatch(tmp_path):
    _write_trial_plugin(tmp_path, "dev-graph", "different-plugin")
    with pytest.raises(ValueError, match="manifest name mismatch"):
        boot_mod.resolve_target_plugin_dir(
            str(tmp_path), "dev-graph:run-dev-graph-init"
        )


def test_boot_qualified_target_rejects_missing_plugin(tmp_path):
    with pytest.raises(ValueError, match="directory not found"):
        boot_mod.resolve_target_plugin_dir(
            str(tmp_path), "missing-plugin:run-safe"
        )


def test_boot_qualified_target_rejects_missing_skill_in_pinned_plugin(tmp_path):
    _write_trial_plugin(tmp_path, "dev-graph", "dev-graph")
    with pytest.raises(ValueError, match="target skill not found"):
        boot_mod.resolve_target_plugin_dir(
            str(tmp_path), "dev-graph:run-missing"
        )


def test_send_usage_errors(tmp_path, capsys):
    assert send_mod.main(["../evil", str(tmp_path / "task.md")]) == 2
    assert send_mod.main(["lt-x", str(tmp_path / "missing.md")]) == 2


def test_send_jsonl_accept_detection(tmp_path):
    projects = tmp_path / "projects" / "proj"
    projects.mkdir(parents=True)
    task = tmp_path / "task.md"
    task.write_text("do it", encoding="utf-8")
    line = json.dumps({"type": "user", "message": {"content": f"読んで実行: {task}"}})
    (projects / "u-2.jsonl").write_text(line + "\n", encoding="utf-8")
    assert send_mod.jsonl_accepted(str(tmp_path / "projects"), "u-2", str(task))
    assert not send_mod.jsonl_accepted(str(tmp_path / "projects"), "u-404", str(task))


# ---- fake backend による tmux 経路の網羅 (実 tmux 非依存) ----------------------

class FakeSendBackend:
    """live-trial-send.main が触る backend 面だけを実装する fake。"""

    def __init__(self, cap=""):
        self.cap = cap
        self.enters = 0
        self.pasted = ""

    def valid_session_name(self, s):
        return backend_mod.valid_session_name(s)

    def require_tmux(self):
        pass

    def paste_file(self, _session, path):
        self.pasted = Path(path).read_text(encoding="utf-8")

    def send_keys(self, _session, *_keys):
        self.enters += 1

    def capture_pane(self, _session, scrollback=False):
        return self.cap


def test_send_started_via_tui_marker(monkeypatch, tmp_path):
    monkeypatch.setattr(send_mod.time, "sleep", lambda _s: None)
    monkeypatch.delenv("SESSION_ID", raising=False)
    task = tmp_path / "task.md"
    task.write_text("do", encoding="utf-8")
    fb = FakeSendBackend(cap="✻ … (5s · 120 tokens)")
    assert send_mod.main(["lt-x", str(task)], backend=fb) == 0
    # 指示行はファイル経由 (paste) で送られ、taskfile の絶対パスを含む
    assert str(task.resolve()) in fb.pasted


def test_send_unconfirmed_retries_then_warn(monkeypatch, tmp_path, capsys):
    monkeypatch.setattr(send_mod.time, "sleep", lambda _s: None)
    monkeypatch.delenv("SESSION_ID", raising=False)
    task = tmp_path / "task.md"
    task.write_text("do", encoding="utf-8")
    fb = FakeSendBackend(cap="")  # 着手マーカーなし
    assert send_mod.main(["lt-x", str(task)], backend=fb) == 1
    assert fb.enters == 3  # Enter 再送は 3 回で打ち切り
    assert "WARN" in capsys.readouterr().out


def test_send_jsonl_primary_confirmation(monkeypatch, tmp_path):
    monkeypatch.setattr(send_mod.time, "sleep", lambda _s: None)
    task = tmp_path / "task.md"
    task.write_text("do", encoding="utf-8")
    projects = tmp_path / "projects" / "proj"
    projects.mkdir(parents=True)
    line = json.dumps({"type": "user",
                       "message": {"content": f"読んで実行: {task.resolve()}"}})
    (projects / "u-3.jsonl").write_text(line + "\n", encoding="utf-8")
    monkeypatch.setenv("SESSION_ID", "u-3")
    monkeypatch.setenv("CLAUDE_PROJECTS_DIR", str(tmp_path / "projects"))
    fb = FakeSendBackend(cap="")  # TUI は無反応でも jsonl 一次判定で確定する
    assert send_mod.main(["lt-x", str(task)], backend=fb) == 0


class FakeBootBackend:
    """live-trial-boot.boot が触る backend 面だけを実装する fake。"""

    def __init__(self, captures, cmds):
        self.captures = captures
        self.cmds = cmds
        self.tick = 0
        self.killed = []
        self.sent = ""
        self.argv = None
        self.run_id = None
        self.environment_overrides = None
        self.send_calls = 0
        self.key_sends = []

    def new_session(
        self, _s, _c, command_argv=None, *, run_id, owner_pid,
        environment_overrides=None,
    ):
        self.argv = command_argv
        self.run_id = run_id
        self.owner_pid = owner_pid
        self.environment_overrides = environment_overrides
        if command_argv:
            self.sent = " ".join(command_argv)

    def send_line(self, _s, text):
        self.send_calls += 1
        self.sent = text

    def send_keys(self, _s, *keys):
        self.key_sends.append(tuple(keys))

    def capture_pane(self, _s, scrollback=False):
        return self.captures[min(self.tick, len(self.captures) - 1)]

    def pane_current_command(self, _s):
        v = self.cmds[min(self.tick, len(self.cmds) - 1)]
        self.tick += 1
        return v

    def kill_session(self, s):
        self.killed.append(s)


def test_boot_ready_line_contract(monkeypatch, capsys):
    monkeypatch.setattr(boot_mod.time, "sleep", lambda _s: None)
    monkeypatch.setenv(
        "SYSTEM_SPEC_AUDIT_FORK_LEDGER", "/tmp/current-session-ledger.jsonl"
    )
    fb = FakeBootBackend(["Type /help for shortcuts\n❯ "], ["2.1.173"])
    rc = boot_mod.boot(fb, "lt-x", "x", "/tmp", "claude-opus-4-8", "u-1",
                       timeout=5, grace=1)
    assert rc == 0
    out = capsys.readouterr().out
    # SESSION_ID: は行末固定 (parse 互換) / MODEL: は requested の echo
    assert "READY: lt-x" in out
    assert out.strip().endswith("SESSION_ID:u-1")
    assert "MODEL:claude-opus-4-8" in out
    assert "--model claude-opus-4-8" in fb.sent
    assert "--setting-sources local" in fb.sent
    assert fb.argv == boot_mod.build_claude_argv("u-1", "claude-opus-4-8")
    assert fb.environment_overrides["SYSTEM_SPEC_AUDIT_FORK_LEDGER"] == (
        "/tmp/current-session-ledger.jsonl"
    )
    assert fb.run_id == "x"
    assert f"OWNER_PID:{fb.owner_pid}" in out
    assert fb.send_calls == 0  # 対話 shell への send-line を経由しない
    assert fb.key_sends == []


def test_boot_accepts_exact_bypass_gate_once_then_waits_for_prompt(monkeypatch, capsys):
    monkeypatch.setattr(boot_mod.time, "sleep", lambda _s: None)
    gate = "\n".join(boot_mod._BYPASS_CONFIRM_MARKERS)
    fb = FakeBootBackend(
        [gate, "Welcome to Claude Code\nType /help for shortcuts\n❯ "],
        ["claude", "claude"],
    )
    rc = boot_mod.boot(fb, "lt-x", "x", "/tmp", "", "u-1", timeout=4, grace=1)
    assert rc == 0
    assert fb.key_sends == [("Down",), ("Enter",)]
    assert "READY: lt-x (2s)" in capsys.readouterr().out


def test_boot_ready_regex_matches_real_nbsp_try_prompt_not_numbered_gate():
    real_prompt = '❯\u00a0Try "how do I log an error?"'
    assert boot_mod._READY_RE.search(real_prompt)
    assert boot_mod._READY_RE.search("❯   ")
    assert not boot_mod._READY_RE.search("❯ 1. Yes, I trust this folder")
    assert not boot_mod._READY_RE.search("❯\u00a01. No, exit")


def test_boot_never_repeats_bypass_gate_acceptance(monkeypatch, capsys):
    monkeypatch.setattr(boot_mod.time, "sleep", lambda _s: None)
    gate = "\n".join(boot_mod._BYPASS_CONFIRM_MARKERS)
    fb = FakeBootBackend([gate], ["claude"])
    rc = boot_mod.boot(fb, "lt-x", "x", "/tmp", "", "u-1", timeout=3, grace=1)
    assert rc == 1
    assert fb.key_sends == [("Down",), ("Enter",)]
    assert "TIMEOUT" in capsys.readouterr().out


def test_boot_does_not_answer_non_exact_gate(monkeypatch):
    monkeypatch.setattr(boot_mod.time, "sleep", lambda _s: None)
    partial = (
        "WARNING: Claude Code running in Bypass Permissions mode\n"
        "1. No, exit\n2. Continue\nEnter to confirm"
    )
    fb = FakeBootBackend([partial], ["claude"])
    assert boot_mod.boot(
        fb, "lt-x", "x", "/tmp", "", "u-1", timeout=1, grace=1
    ) == 1
    assert fb.key_sends == []


def test_boot_fail_when_claude_dies(monkeypatch, capsys):
    monkeypatch.setattr(boot_mod.time, "sleep", lambda _s: None)
    fb = FakeBootBackend(["zsh: command not found: claude"], ["zsh"])
    rc = boot_mod.boot(fb, "lt-x", "x", "/tmp", "", "u-1", timeout=5, grace=0)
    assert rc == 1
    assert "BOOT_FAIL" in capsys.readouterr().out
    assert fb.killed == ["lt-x"]  # 失敗経路でも session を掃除する


def test_boot_timeout_no_ready(monkeypatch, capsys):
    monkeypatch.setattr(boot_mod.time, "sleep", lambda _s: None)
    fb = FakeBootBackend(["still starting"], ["2.1.173"])
    rc = boot_mod.boot(fb, "lt-x", "x", "/tmp", "", "u-1", timeout=2, grace=1)
    assert rc == 1
    assert "TIMEOUT" in capsys.readouterr().out
    assert fb.killed == ["lt-x"]
