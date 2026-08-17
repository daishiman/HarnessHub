"""C19 evaluator の native completion / import 順序 gate を固定する。"""
from __future__ import annotations

import json
import shlex
import subprocess
import sys
from pathlib import Path

import pytest


PLUGIN = Path(__file__).resolve().parents[1]
SCRIPT = PLUGIN / "scripts" / "validate-system-spec-evaluator-completion.py"


def _skill_launch() -> dict:
    return {
        "type": "assistant",
        "isSidechain": False,
        "message": {"content": [{
            "type": "tool_use",
            "id": "toolu_eval",
            "name": "Skill",
            "input": {
                "skill": "system-spec-harness:assign-system-spec-completeness-evaluator",
                "args": "--spec-dir system-spec --output system-spec/completeness-report.json",
            },
        }]},
    }


def _skill_result() -> dict:
    return {
        "type": "user",
        "message": {"content": [{
            "type": "tool_result",
            "tool_use_id": "toolu_eval",
            "content": "launched",
        }]},
        "toolUseResult": {
            "success": True,
            "background": True,
            "agentId": "agent-full-id-123",
        },
    }


def _completion() -> dict:
    return {
        "type": "attachment",
        "attachment": {
            "type": "queued_command",
            "commandMode": "task-notification",
            "prompt": (
                "<task-notification>\n"
                "<task-id>agent-full-id-123</task-id>\n"
                "<tool-use-id>toolu_eval</tool-use-id>\n"
                "<status>completed</status>\n"
                "<summary>Agent evaluator finished</summary>\n"
                "<result>PASS report written by evaluator</result>\n"
                "</task-notification>"
            ),
        },
    }


def _import() -> dict:
    return {
        "type": "assistant",
        "isSidechain": False,
        "message": {"content": [{
            "type": "tool_use",
            "id": "toolu_import",
            "name": "Bash",
            "input": {"command": "python3 plugins/dev-graph/scripts/upsert-node.py --input node.json"},
        }]},
    }


def _resume_report() -> dict:
    labels = [
        "resolve-context",
        "validate-resume",
        "build-import",
        "gate-boundary",
        "gate-source-and-evidence-bindings",
        "gate-graph-preview",
        "c02-dry-run-architecture",
        "c02-dry-run-specification",
        "c02-upsert-architecture",
        "c02-upsert-specification",
        "gate-evidence-refs",
        "gate-source-digest",
    ]
    return {
        "runner": "build-system-spec-resume-import",
        "mode": "reuse-confirmed",
        "status": "PASS",
        "completion_contract": {"version": "system-spec-resume-closure/v1"},
        "network_calls": 0,
        "upstream_skill_invocations": 0,
        "registered_this_run": ["arch-system-spec-overview", "spec-system-spec-index"],
        "resume": {"valid": True},
        "checklist": [{"id": "closure", "status": "pass", "evidence": "all gates exit 0"}],
        "steps": [{"label": label, "exit_code": 0} for label in labels],
    }


def _target_skill() -> dict:
    return {
        "type": "assistant",
        "message": {"content": [{
            "type": "tool_use",
            "id": "toolu_target",
            "name": "Skill",
            "input": {"skill": "dev-graph:run-dev-graph-system-spec", "args": "--resume"},
        }]},
    }


def _resume_runner(report: dict, repo_root: Path) -> list[dict]:
    command = shlex.join([
        "python3",
        "plugins/dev-graph/scripts/build-system-spec-resume-import.py",
        "--repo-root",
        str(repo_root),
    ])
    return [
        {
            "type": "assistant",
            "message": {"content": [{
                "type": "tool_use",
                "id": "toolu_runner",
                "name": "Bash",
                "input": {"command": command},
            }]},
        },
        {
            "type": "user",
            "message": {"content": [{
                "type": "tool_result",
                "tool_use_id": "toolu_runner",
                "content": json.dumps(report),
            }]},
            "toolUseResult": {"stdout": json.dumps(report)},
        },
    ]


def _run(
    tmp_path: Path,
    records: list[dict],
    *,
    resume_report: dict | None = None,
    resume_repo_root: Path | None = None,
) -> tuple[int, dict]:
    transcript = tmp_path / "transcript.jsonl"
    transcript.write_text(
        "".join(json.dumps(record, ensure_ascii=False) + "\n" for record in records),
        encoding="utf-8",
    )
    command = [sys.executable, str(SCRIPT), "--transcript", str(transcript)]
    if resume_report is not None:
        assert resume_repo_root is not None
        report_path = (
            resume_repo_root
            / "eval-log"
            / "run-dev-graph-system-spec-resume-report.json"
        )
        report_path.parent.mkdir(parents=True)
        report_path.write_text(json.dumps(resume_report), encoding="utf-8")
        command.extend(["--resume-report", str(report_path)])
    proc = subprocess.run(
        command,
        capture_output=True,
        text=True,
        check=False,
    )
    return proc.returncode, json.loads(proc.stdout)


def test_matching_native_completion_before_import_passes(tmp_path: Path) -> None:
    code, report = _run(tmp_path, [_skill_launch(), _skill_result(), _completion(), _import()])
    assert code == 0
    assert report["status"] == "PASS"
    assert report["evaluator_launches"][0]["agent_id"] == "agent-full-id-123"
    assert report["evaluator_launches"][0]["completion_line"] == 3
    assert report["first_import_line"] == 4


def test_import_before_completion_fails_closed(tmp_path: Path) -> None:
    code, report = _run(tmp_path, [_skill_launch(), _skill_result(), _import(), _completion()])
    assert code == 2
    assert "EV-009" in {item["rule"] for item in report["violations"]}


def test_short_or_unrelated_notification_does_not_prove_completion(tmp_path: Path) -> None:
    completion = _completion()
    completion["attachment"]["prompt"] = completion["attachment"]["prompt"].replace(
        "agent-full-id-123", "agent-short"
    )
    code, report = _run(tmp_path, [_skill_launch(), _skill_result(), completion, _import()])
    assert code == 2
    assert "EV-008" in {item["rule"] for item in report["violations"]}


def test_task_stop_and_outer_report_write_are_rejected(tmp_path: Path) -> None:
    stop = {
        "type": "assistant",
        "isSidechain": False,
        "message": {"content": [{
            "type": "tool_use",
            "id": "toolu_stop",
            "name": "TaskStop",
            "input": {"task_id": "agent-full-id-123"},
        }]},
    }
    write = {
        "type": "assistant",
        "isSidechain": False,
        "message": {"content": [{
            "type": "tool_use",
            "id": "toolu_write",
            "name": "Write",
            "input": {"file_path": "system-spec/completeness-report.json", "content": "{}"},
        }]},
    }
    code, report = _run(
        tmp_path,
        [_skill_launch(), _skill_result(), stop, write, _completion(), _import()],
    )
    assert code == 2
    rules = {item["rule"] for item in report["violations"]}
    assert {"EV-010", "EV-011"} <= rules


def test_foreground_looping_wait_is_rejected(tmp_path: Path) -> None:
    wait = {
        "type": "assistant",
        "isSidechain": False,
        "message": {"content": [{
            "type": "tool_use",
            "id": "toolu_wait",
            "name": "Bash",
            "input": {
                "command": "until [ -f /tmp/never ]; do sleep 30; done",
                "timeout": 600000,
            },
        }]},
    }
    code, report = _run(
        tmp_path,
        [_skill_launch(), _skill_result(), wait, _completion(), _import()],
    )
    assert code == 2
    assert "EV-012" in {item["rule"] for item in report["violations"]}


def test_short_finite_or_background_wait_does_not_block_notification(tmp_path: Path) -> None:
    short_wait = {
        "type": "assistant",
        "isSidechain": False,
        "message": {"content": [{
            "type": "tool_use",
            "id": "toolu_short_wait",
            "name": "Bash",
            "input": {"command": "sleep 30"},
        }]},
    }
    background_wait = {
        "type": "assistant",
        "isSidechain": False,
        "message": {"content": [{
            "type": "tool_use",
            "id": "toolu_bg_wait",
            "name": "Bash",
            "input": {
                "command": "until [ -f /tmp/report ]; do sleep 30; done",
                "run_in_background": True,
            },
        }]},
    }
    code, report = _run(
        tmp_path,
        [_skill_launch(), _skill_result(), short_wait, background_wait, _completion(), _import()],
    )
    assert code == 0
    assert report["foreground_blocking_waits"] == 0


def test_upsert_help_before_completion_is_not_a_mutation(tmp_path: Path) -> None:
    help_call = {
        "type": "assistant",
        "isSidechain": False,
        "message": {"content": [{
            "type": "tool_use",
            "id": "toolu_help",
            "name": "Bash",
            "input": {"command": "python3 plugins/dev-graph/scripts/upsert-node.py --help"},
        }]},
    }
    code, report = _run(
        tmp_path,
        [_skill_launch(), _skill_result(), help_call, _completion(), _import()],
    )
    assert code == 0
    assert report["first_import_line"] == 5


def test_resume_report_closes_without_evaluator_or_direct_upsert(tmp_path: Path) -> None:
    resume = _resume_report()
    repo_root = tmp_path / "fixture repo|日本"
    records = [_target_skill(), *_resume_runner(resume, repo_root)]
    code, report = _run(
        tmp_path, records, resume_report=resume, resume_repo_root=repo_root
    )
    assert code == 0, report
    assert report["status"] == "PASS"
    assert report["mode"] == "resume-reuse"
    assert report["evaluator_launches"] == []
    assert report["first_import_line"] is None
    assert report["resume_runner_invocations"] == 1


def test_resume_report_accepts_quoted_repo_relative_runner_path(
    tmp_path: Path,
) -> None:
    """shlex.join が生成する canonical single quote だけを許可する。"""
    resume = _resume_report()
    repo_root = tmp_path / "改善 要望" / "fixture|repo"
    records = [_target_skill(), *_resume_runner(resume, repo_root)]
    expected = shlex.join(
        [
            "python3",
            "plugins/dev-graph/scripts/build-system-spec-resume-import.py",
            "--repo-root",
            str(repo_root),
        ]
    )
    assert records[1]["message"]["content"][0]["input"]["command"] == expected

    code, report = _run(
        tmp_path, records, resume_report=resume, resume_repo_root=repo_root
    )

    assert code == 0, report
    assert report["resume_runner_invocations"] == 1


@pytest.mark.parametrize(
    "variant",
    ["double-quote", "extra-space", "quoted-python", "trailing-newline"],
)
def test_resume_report_rejects_equivalent_but_noncanonical_raw_command(
    tmp_path: Path, variant: str
) -> None:
    """argv が同値でも shlex.join と異なる raw 表現は EV-024。"""
    resume = _resume_report()
    repo_root = tmp_path / "改善 fixture|repo"
    records = [_target_skill(), *_resume_runner(resume, repo_root)]
    canonical = records[1]["message"]["content"][0]["input"]["command"]
    variants = {
        "double-quote": (
            "python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
            f'--repo-root "{repo_root}"'
        ),
        "extra-space": canonical.replace("python3 ", "python3  ", 1),
        "quoted-python": canonical.replace("python3", "'python3'", 1),
        "trailing-newline": canonical + "\n",
    }
    command = variants[variant]
    assert shlex.split(command) == shlex.split(canonical)
    records[1]["message"]["content"][0]["input"]["command"] = command

    code, report = _run(
        tmp_path, records, resume_report=resume, resume_repo_root=repo_root
    )

    assert code == 2
    assert "EV-024" in {item["rule"] for item in report["violations"]}


@pytest.mark.parametrize(
    "command",
    [
        # final4 transcript の実測 command。runner の後ろに exit echo を連結した。
        'cd "/Users/example/改善要望" && '
        "python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        '--repo-root "/Users/example/改善要望/fixture-repo"; echo "EXIT=$?"',
        # prefix / suffix / shell operator / wrapper をそれぞれ独立に固定する。
        "env X=1 python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        "--repo-root /tmp/fixture",
        "python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        "--repo-root /tmp/fixture; echo EXIT=$?",
        "python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        "--repo-root /tmp/fixture && true",
        "python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        "--repo-root /tmp/fixture || true",
        "python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        "--repo-root /tmp/fixture | tee /tmp/out",
        "python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        "--repo-root /tmp/fixture|cat",
        "python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        "--repo-root /tmp/fixture;",
        "python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        "--repo-root /tmp/fixture&&true",
        "python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        "--repo-root /tmp/fixture||true",
        "python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        "--repo-root /tmp/fixture</tmp/in",
        "python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        "--repo-root /tmp/fixture>/tmp/out",
        "python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        "--repo-root /tmp/fixture>>/tmp/out",
        "python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        "--repo-root /tmp/fixture 2>/tmp/err",
        "python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        "--repo-root /tmp/fixture\necho second-command",
        "python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        '--repo-root "/tmp/$(touch /tmp/substitution)"',
        "python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        '--repo-root "/tmp/`touch /tmp/backtick`"',
        "bash -c 'python3 plugins/dev-graph/scripts/"
        "build-system-spec-resume-import.py --repo-root /tmp/fixture'",
        "python3 /Users/example/plugins/dev-graph/scripts/"
        "build-system-spec-resume-import.py --repo-root /tmp/fixture",
        # shell 展開・glob・省略形・代替引用/空白も raw 不一致で拒否する。
        "python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        "--repo-root $FIXTURE_ROOT",
        "python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        "--repo-root ${FIXTURE_ROOT}",
        "python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        "--repo-root /tmp/{fixture,other}",
        "python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        "--repo-root /tmp/fixture*",
        "python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        "--repo-root /tmp/fixture?",
        "python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        "--repo-root /tmp/fixture[0]",
        "python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        "--repo-root /tmp/$((1 + 1))",
        "python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        "--repo-root ~/fixture",
        "python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        "--repo-root /tmp/fixture\\ repo",
        'python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py '
        '--repo-root "/tmp/fixture repo"',
        "python3  plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        "--repo-root /tmp/fixture",
        "python3\tplugins/dev-graph/scripts/build-system-spec-resume-import.py "
        "--repo-root /tmp/fixture",
        "'python3' plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        "--repo-root /tmp/fixture",
        "python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py "
        "--repo-root /tmp/fixture\n",
    ],
)
def test_resume_report_rejects_non_literal_runner_command(
    tmp_path: Path, command: str
) -> None:
    resume = _resume_report()
    repo_root = tmp_path / "fixture-repo"
    records = [_target_skill(), *_resume_runner(resume, repo_root)]
    records[1]["message"]["content"][0]["input"]["command"] = command

    code, report = _run(
        tmp_path, records, resume_report=resume, resume_repo_root=repo_root
    )

    assert code == 2
    assert "EV-024" in {item["rule"] for item in report["violations"]}


def test_resume_report_rejects_missing_step_and_stdout_mismatch(tmp_path: Path) -> None:
    report_file = _resume_report()
    report_file["steps"] = report_file["steps"][:-1]
    runner_stdout = _resume_report()
    repo_root = tmp_path / "fixture-repo"
    records = [_target_skill(), *_resume_runner(runner_stdout, repo_root)]
    code, result = _run(
        tmp_path, records, resume_report=report_file, resume_repo_root=repo_root
    )
    assert code == 2
    rules = {item["rule"] for item in result["violations"]}
    assert {"EV-017", "EV-023"} <= rules


def test_status_content_may_cite_completeness_report_without_being_a_write(tmp_path: Path) -> None:
    resume = _resume_report()
    status_write = {
        "type": "assistant",
        "isSidechain": False,
        "message": {"content": [{
            "type": "tool_use",
            "id": "toolu_status",
            "name": "Write",
            "input": {
                "file_path": "out/status.json",
                "content": '{"evidence_ref":"system-spec/completeness-report.json"}',
            },
        }]},
    }
    repo_root = tmp_path / "fixture-repo"
    records = [_target_skill(), *_resume_runner(resume, repo_root), status_write]
    code, result = _run(
        tmp_path, records, resume_report=resume, resume_repo_root=repo_root
    )
    assert code == 0, result
    assert result["outer_report_writes"] == 0


def test_resume_path_rejects_upstream_skill_agent_and_direct_upsert(tmp_path: Path) -> None:
    resume = _resume_report()
    agent = {
        "type": "assistant",
        "message": {"content": [{
            "type": "tool_use", "id": "toolu_agent", "name": "Agent", "input": {}
        }]},
    }
    repo_root = tmp_path / "fixture-repo"
    records = [
        _target_skill(),
        _skill_launch(),
        agent,
        *_resume_runner(resume, repo_root),
        _import(),
    ]
    code, result = _run(
        tmp_path, records, resume_report=resume, resume_repo_root=repo_root
    )
    assert code == 2
    rules = {item["rule"] for item in result["violations"]}
    assert {"EV-020", "EV-021"} <= rules
