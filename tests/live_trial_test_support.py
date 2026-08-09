"""Shared fixtures and script loaders for the live-trial test modules."""

import importlib.util
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = (
    ROOT
    / "plugins"
    / "harness-creator"
    / "skills"
    / "run-skill-live-trial"
    / "scripts"
)
SCHEMA = (
    ROOT
    / "plugins"
    / "harness-creator"
    / "skills"
    / "run-skill-live-trial"
    / "schemas"
    / "live-trial-verdict.schema.json"
)


def _load(stem: str):
    spec = importlib.util.spec_from_file_location(
        stem.replace("-", "_"), SCRIPTS / f"{stem}.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


verdict_mod = _load("live-trial-verdict")
planner_mod = _load("plan-live-trials")
backend_mod = _load("live-trial-backend")
boot_mod = _load("live-trial-boot")
send_mod = _load("live-trial-send")


def _write_jsonl(path: Path, entries: list[dict]) -> Path:
    for index, entry in enumerate(entries):
        entry.setdefault("timestamp", f"2026-07-02T00:00:{index:02d}Z")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "\n".join(json.dumps(entry, ensure_ascii=False) for entry in entries) + "\n",
        encoding="utf-8",
    )
    return path


def _prompt(text: str = "run the task") -> dict:
    return {"type": "user", "message": {"content": text}}


def _turn_end() -> dict:
    return {"type": "system", "subtype": "turn_duration"}


def _tool_use(tool_id: str, name: str, tool_input=None) -> dict:
    block = {"type": "tool_use", "id": tool_id, "name": name}
    if tool_input is not None:
        block["input"] = tool_input
    return {
        "type": "assistant",
        "message": {"model": "claude-opus-4-8", "content": [block]},
    }


def _tool_result(tool_id: str) -> dict:
    return {
        "type": "user",
        "message": {
            "content": [{"type": "tool_result", "tool_use_id": tool_id}]
        },
    }


def _write_package_contract(
    plugin_dir: Path,
    depends_on: list[str],
    *,
    skills: list[str] | None = None,
    skill_dependencies: dict[str, list[str]] | None = None,
) -> Path:
    path = plugin_dir / "references" / "package-contract.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    document = {
        "plugin_name": plugin_dir.name,
        "depends_on": depends_on,
        "entry_points": {
            "skills": skills or [],
            "agents": [],
            "commands": [],
            "hooks": [],
        },
    }
    if skill_dependencies is not None:
        document["skill_dependencies"] = skill_dependencies
    path.write_text(json.dumps(document), encoding="utf-8")
    return path


def _write_trial_plugin(
    root: Path,
    directory_name: str,
    manifest_name: str,
    skill_name: str = "run-dev-graph-init",
) -> Path:
    plugin_dir = root / "plugins" / directory_name
    (plugin_dir / ".claude-plugin").mkdir(parents=True)
    (plugin_dir / ".claude-plugin" / "plugin.json").write_text(
        json.dumps({"name": manifest_name}), encoding="utf-8"
    )
    skill_dir = plugin_dir / "skills" / skill_name
    skill_dir.mkdir(parents=True)
    (skill_dir / "SKILL.md").write_text(
        "---\ndescription: fixture\n---\n", encoding="utf-8"
    )
    return plugin_dir


def _fake_skill_dir(tmp_path: Path) -> Path:
    skill_dir = tmp_path / "fake-skill"
    (skill_dir / "scripts").mkdir(parents=True, exist_ok=True)
    (skill_dir / "SKILL.md").write_text(
        "---\nname: fake\n---\nbody\n", encoding="utf-8"
    )
    (skill_dir / "scripts" / "a.py").write_text(
        "print('a')\n", encoding="utf-8"
    )
    return skill_dir


def _goal_evaluation_args(
    workdir: Path, transcript: Path, extra: list[str]
) -> list[str]:
    """Build the independent, transcript-bound evidence required by positive trials."""
    if "--goal-result" not in extra:
        return []
    workdir.mkdir(parents=True, exist_ok=True)
    goal_result = extra[extra.index("--goal-result") + 1]
    goal_blockers = [
        extra[index + 1]
        for index, value in enumerate(extra[:-1])
        if value == "--blocker"
    ]
    evidence = workdir / "evaluator-evidence.json"
    evidence.write_text("{}\n", encoding="utf-8")
    goal_evaluation = workdir / "goal-evaluation.json"
    goal_evaluation.write_text(
        json.dumps(
            {
                "result": goal_result,
                "blockers": goal_blockers,
                "evaluator": {
                    "mode": "fresh-independent-context",
                    "id": "pytest-live-trial-goal-evaluator",
                },
                "transcript_sha256": verdict_mod.sha256_file(transcript),
                "evidence_refs": ["evaluator-evidence.json"],
            }
        ),
        encoding="utf-8",
    )
    return ["--goal-evaluation", str(goal_evaluation)]


def _run_verdict(
    tmp_path: Path, transcript: Path, extra: list[str]
) -> tuple[int, Path]:
    workdir = tmp_path / "workdir"
    goal_eval_args = _goal_evaluation_args(workdir, transcript, extra)
    skill_dir = _fake_skill_dir(tmp_path)
    argv = [
        "--workdir",
        str(workdir),
        "--target-skill",
        "some-plugin:run-something",
        "--skill-dir",
        str(skill_dir),
        "--transcript",
        str(transcript),
        "--launch",
        "PASS",
        "--completion",
        "PASS",
        "--poll-exit",
        "DONE",
    ] + goal_eval_args + extra
    return verdict_mod.main(argv), workdir / "verdict.json"
