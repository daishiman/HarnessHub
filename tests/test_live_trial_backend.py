"""Live-trial backend ownership, tmux wrapper, and isolation tests."""

import os
import shutil
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import pytest

from live_trial_test_support import backend_mod


def test_backend_tmux_wrappers_with_fake_subprocess(monkeypatch, tmp_path):
    calls = []

    class CP:
        returncode = 0
        stdout = ""
        stderr = ""

    def fake_run(args, capture_output=True, text=True, check=False):
        calls.append(list(args))
        cp = CP()
        if args[1] == "list-sessions" and "\t" in args[-1]:
            cp.stdout = (
                "lt-run-a-one\trun-a\t111\n"
                "lt-run-a-sibling\trun-a\t222\n"
                "lt-run-a-spoof\trun-b\t222\n"
                "lt-run-a-unowned\t\t\n"
                "lt-run-b-one\trun-b\t222\n"
                "other\t\t\n"
            )
        elif args[1] == "list-sessions":
            cp.stdout = (
                "lt-run-a-one\n"
                "lt-run-a-sibling\n"
                "lt-run-a-spoof\n"
                "lt-run-a-unowned\n"
                "lt-run-b-one\n"
                "other\n"
            )
        elif args[1] == "list-panes":
            cp.stdout = "claude\n"
        elif args[1] == "capture-pane":
            cp.stdout = "pane output\n"
        return cp

    monkeypatch.setattr(backend_mod.shutil, "which", lambda _c: "/usr/bin/tmux")
    monkeypatch.setattr(backend_mod.subprocess, "run", fake_run)

    backend_mod.new_session("lt-x", str(tmp_path), run_id="x", owner_pid=111)
    backend_mod.new_session(
        "lt-direct", str(tmp_path), run_id="direct", owner_pid=111,
        command_argv=("printf", "%s", "safe; touch /tmp/not-created"),
        environment_overrides={
            "SYSTEM_SPEC_AUDIT_FORK_LEDGER": "/tmp/current ledger.jsonl",
        },
    )
    backend_mod.send_line("lt-x", "hello")
    backend_mod.paste_text("lt-x", "task body\nwith newline")
    assert backend_mod.capture_pane("lt-x", scrollback=True) == "pane output\n"
    assert backend_mod.has_session("lt-x")
    assert backend_mod.pane_current_command("lt-x") == "claude"
    assert backend_mod.reap("run-a", 111) == ["lt-run-a-one"]
    with pytest.raises(ValueError, match="run_id"):
        backend_mod.reap()
    with pytest.raises(ValueError, match="owner_pid"):
        backend_mod.reap("run-a")
    assert backend_mod.reap(all_sessions=True) == [
        "lt-run-a-one",
        "lt-run-a-sibling",
        "lt-run-a-spoof",
        "lt-run-a-unowned",
        "lt-run-b-one",
    ]
    kill_calls = [c for c in calls if c[:2] == ["tmux", "kill-session"]]
    assert len(kill_calls) >= 8  # new_session 前掃除 2 + scoped 1 + explicit all 5
    option_calls = [c for c in calls if c[:2] == ["tmux", "set-option"]]
    assert ["tmux", "set-option", "-t", "lt-x", "@lt_run_id", "x"] in option_calls
    assert [
        "tmux", "set-option", "-t", "lt-x", "@lt_owner_pid", "111"
    ] in option_calls
    # paste は session/file 固有 named buffer を load → paste → delete する。
    flat = [c[1] for c in calls]
    assert {"load-buffer", "paste-buffer", "delete-buffer"} <= set(flat)
    load_call = next(c for c in calls if c[1] == "load-buffer")
    paste_call = next(c for c in calls if c[1] == "paste-buffer")
    delete_call = next(c for c in calls if c[1] == "delete-buffer")
    assert load_call[2] == "-b"
    assert paste_call[2:4] == ["-b", load_call[3]]
    assert delete_call[2:4] == ["-b", load_call[3]]
    assert backend_mod.valid_buffer_name(load_call[3])
    assert len(load_call[3]) <= backend_mod._BUFFER_NAME_MAX
    direct = next(c for c in calls if c[1:5] == ["new-session", "-d", "-s", "lt-direct"])
    env_index = direct.index("-e")
    assert direct[env_index + 1] == (
        "SYSTEM_SPEC_AUDIT_FORK_LEDGER=/tmp/current ledger.jsonl"
    )
    assert direct[-1] == "printf %s 'safe; touch /tmp/not-created'"
    # CLI dispatch も同じ境界を通る
    assert backend_mod.main([
        "new-session", "lt-y", str(tmp_path), "--run-id", "y"
    ]) == 0
    assert backend_mod.main(["send-line", "lt-y", "hi"]) == 0
    assert backend_mod.main(["capture-pane", "lt-y", "--scrollback"]) == 0
    assert backend_mod.main(["has-session", "lt-y"]) == 0
    assert backend_mod.main(["kill-session", "lt-y"]) == 0
    assert backend_mod.main([
        "reap", "--run-id", "run-a", "--owner-pid", "111"
    ]) == 0
    assert backend_mod.main(["require"]) == 0
    assert backend_mod.main(["kill-session", "../evil"]) == 2  # session 名検証は CLI 層でも効く


def test_backend_reap_cli_requires_an_explicit_scope():
    """引数なし reap が従来の lt-* 全 kill へ戻らないことを固定する。"""
    with pytest.raises(SystemExit) as exc:
        backend_mod.main(["reap"])
    assert exc.value.code == 2
    assert backend_mod.main(["reap", "--run-id", "../unsafe"]) == 2
    assert backend_mod.main(["reap", "--run-id", "safe"]) == 2
    assert backend_mod.main(["reap", "--all", "--owner-pid", "123"]) == 2


def test_backend_cli_does_not_expose_arbitrary_direct_command(tmp_path):
    """new-session CLI は command 余剰引数を受けず argparse で拒否する。"""
    with pytest.raises(SystemExit) as exc:
        backend_mod.main([
            "new-session", "lt-x", str(tmp_path), "; touch /tmp/injected"
        ])
    assert exc.value.code == 2


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        ({"BAD-NAME": "value"}, "invalid environment override name"),
        ({"SAFE_NAME": "line1\nline2"}, "invalid environment override value"),
    ],
)
def test_backend_rejects_unsafe_environment_overrides(
    monkeypatch, tmp_path, overrides, message
):
    monkeypatch.setattr(backend_mod, "require_tmux", lambda: None)
    monkeypatch.setattr(backend_mod, "kill_session", lambda _session: True)
    with pytest.raises(ValueError, match=message):
        backend_mod.new_session(
            "lt-env-guard", str(tmp_path), run_id="env-guard",
            environment_overrides=overrides,
        )


def test_backend_paste_buffer_name_is_deterministic_isolated_and_injection_safe(tmp_path):
    path = tmp_path / "task; display-message.md"
    same_a = backend_mod.paste_buffer_name("lt-route-a", path)
    same_b = backend_mod.paste_buffer_name("lt-route-a", path)
    other_session = backend_mod.paste_buffer_name("lt-route-b", path)
    other_path = backend_mod.paste_buffer_name("lt-route-a", tmp_path / "other.md")

    assert same_a == same_b
    assert len({same_a, other_session, other_path}) == 3
    assert backend_mod.valid_buffer_name(same_a)
    assert ";" not in same_a and "/" not in same_a
    assert not backend_mod.valid_buffer_name("x; display-message")
    assert not backend_mod.valid_buffer_name(
        "x" * (backend_mod._BUFFER_NAME_MAX + 1)
    )
    with pytest.raises(ValueError, match="invalid session"):
        backend_mod.paste_buffer_name("lt-safe; display-message", path)
    with pytest.raises(ValueError, match="invalid session"):
        backend_mod.paste_buffer_name("lt-safe\n", path)


def test_backend_paste_buffer_cleanup_runs_when_paste_fails(monkeypatch, tmp_path):
    calls = []

    def fake_tmux(*args, check=False):
        calls.append((args, check))
        if args[0] == "paste-buffer":
            raise RuntimeError("simulated paste failure")
        return None

    task = tmp_path / "task.md"
    task.write_text("payload\n", encoding="utf-8")
    monkeypatch.setattr(backend_mod, "require_tmux", lambda: None)
    monkeypatch.setattr(backend_mod, "_tmux", fake_tmux)

    with pytest.raises(RuntimeError, match="simulated paste failure"):
        backend_mod.paste_file("lt-cleanup", str(task))

    load = next(args for args, _check in calls if args[0] == "load-buffer")
    delete = next(args for args, _check in calls if args[0] == "delete-buffer")
    assert delete == ("delete-buffer", "-b", load[2])


@pytest.mark.skipif(shutil.which("tmux") is None, reason="tmux unavailable")
def test_backend_real_tmux_eight_parallel_pastes_are_session_isolated(
    monkeypatch, tmp_path
):
    """全 load を先に完了させ、default-buffer 実装なら確実に誤配信する race。"""
    count = 8
    sessions = [f"lt-buffer-race-{i}" for i in range(count)]
    files = []
    receiver = (
        "import sys,time; "
        "line=sys.stdin.readline().rstrip('\\n'); "
        "print('RECEIVED:'+line,flush=True); time.sleep(5)"
    )
    original_tmux = backend_mod._tmux
    barrier = threading.Barrier(count, timeout=10)

    try:
        for i, session in enumerate(sessions):
            task = tmp_path / f"task-{i}.md"
            task.write_text(f"PAYLOAD_{i}\n", encoding="utf-8")
            files.append(task)
            backend_mod.new_session(
                session,
                str(tmp_path),
                command_argv=(sys.executable, "-u", "-c", receiver),
                run_id="buffer-race",
            )

        def synchronized_tmux(*args, check=False):
            result = original_tmux(*args, check=check)
            if args[0] == "load-buffer":
                barrier.wait()
            return result

        monkeypatch.setattr(backend_mod, "_tmux", synchronized_tmux)
        with ThreadPoolExecutor(max_workers=count) as pool:
            futures = [
                pool.submit(backend_mod.paste_file, session, str(path))
                for session, path in zip(sessions, files)
            ]
            for future in futures:
                future.result(timeout=15)

        for i, session in enumerate(sessions):
            expected = f"RECEIVED:PAYLOAD_{i}"
            captured = ""
            for _ in range(40):
                captured = backend_mod.capture_pane(session)
                if expected in captured:
                    break
                time.sleep(0.05)
            assert expected in captured, captured
            assert all(
                f"RECEIVED:PAYLOAD_{other}" not in captured
                for other in range(count)
                if other != i
            )

        listed = original_tmux("list-buffers", "-F", "#{buffer_name}")
        remaining = set(listed.stdout.splitlines()) if listed.returncode == 0 else set()
        expected_names = {
            backend_mod.paste_buffer_name(session, str(path))
            for session, path in zip(sessions, files)
        }
        assert remaining.isdisjoint(expected_names)
    finally:
        monkeypatch.setattr(backend_mod, "_tmux", original_tmux)
        for session in sessions:
            backend_mod.kill_session(session)


@pytest.mark.skipif(shutil.which("tmux") is None, reason="tmux unavailable")
def test_backend_real_tmux_direct_process_avoids_interactive_shell(tmp_path):
    """tmux pane が対話 shell readiness 無しで指定processを実行する。"""
    session = "lt-direct-process-fixture"
    marker = "DIRECT_PROCESS_READY"
    argv = (
        sys.executable,
        "-u",
        "-c",
        f"import time; print('{marker}', flush=True); time.sleep(5)",
    )
    try:
        backend_mod.new_session(
            session, str(tmp_path), command_argv=argv, run_id="direct-process"
        )
        captured = ""
        for _ in range(40):
            captured = backend_mod.capture_pane(session)
            if marker in captured:
                break
            time.sleep(0.05)
        assert marker in captured
        assert backend_mod.has_session(session)
        assert backend_mod.pane_current_command(session) not in {"", "zsh", "bash", "sh"}
        ownership = {
            name: (run_id, owner_pid)
            for name, run_id, owner_pid in backend_mod.list_session_ownership()
        }
        assert ownership[session][0] == "direct-process"
        assert ownership[session][1].isdecimal()
        assert int(ownership[session][1]) > 0
    finally:
        backend_mod.kill_session(session)


@pytest.mark.skipif(shutil.which("tmux") is None, reason="tmux unavailable")
def test_backend_real_tmux_reap_is_limited_to_its_owned_run(tmp_path):
    """実 tmux でも別 run と metadata 無し session を巻き添えにしない。"""
    token = f"reap-scope-{os.getpid()}"
    owned_run = f"{token}-owned"
    owned_session = f"lt-{owned_run}-worker"
    other_session = f"lt-{owned_run}-sibling"
    unowned_session = f"lt-{owned_run}-legacy"
    argv = (
        sys.executable,
        "-u",
        "-c",
        "import time; time.sleep(30)",
    )
    try:
        backend_mod.new_session(
            owned_session,
            str(tmp_path),
            command_argv=argv,
            run_id=owned_run,
            owner_pid=111,
        )
        backend_mod.new_session(
            other_session,
            str(tmp_path),
            command_argv=argv,
            run_id=owned_run,
            owner_pid=222,
        )
        backend_mod._tmux(
            "new-session",
            "-d",
            "-s",
            unowned_session,
            "-c",
            str(tmp_path),
            backend_mod._direct_process_command(argv),
            check=True,
        )

        assert backend_mod.reap(owned_run, 111) == [owned_session]
        assert not backend_mod.has_session(owned_session)
        assert backend_mod.has_session(other_session)
        assert backend_mod.has_session(unowned_session)
    finally:
        for session in (owned_session, other_session, unowned_session):
            backend_mod.kill_session(session)
