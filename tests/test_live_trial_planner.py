"""Incremental and exhaustive live-trial planner tests."""

import json
from pathlib import Path

from live_trial_test_support import (
    _write_package_contract,
    planner_mod,
    verdict_mod,
)


# ---- plan-live-trials: incremental evidence reuse / bounded dispatch ---------

def _planner_plugin(tmp_path: Path, skills: list[str]) -> Path:
    plugin_dir = tmp_path / "plugins" / "sample-plugin"
    (plugin_dir / ".claude-plugin").mkdir(parents=True)
    (plugin_dir / ".claude-plugin" / "plugin.json").write_text(
        json.dumps({"name": "sample-plugin"}), encoding="utf-8"
    )
    for skill in skills:
        skill_dir = plugin_dir / "skills" / skill
        skill_dir.mkdir(parents=True)
        (skill_dir / "SKILL.md").write_text(
            f"---\nname: {skill}\nkind: run\nallowed-tools: [Read, Skill]\n---\nbody\n",
            encoding="utf-8",
        )
    _write_package_contract(plugin_dir, [], skills=skills, skill_dependencies={})
    return plugin_dir


def _write_reusable_verdict(eval_root: Path, plugin_dir: Path, skill: str) -> Path:
    run_dir = eval_root / plugin_dir.name / skill / "live-trial" / "20260713T000000"
    run_dir.mkdir(parents=True)
    transcript = run_dir / "transcript.jsonl"
    transcript.write_text('{"type":"system","subtype":"turn_duration"}\n', encoding="utf-8")
    transcript_sha = planner_mod._sha256(transcript)
    behavior_sha = verdict_mod.skill_dir_tree_sha(plugin_dir / "skills" / skill)
    verdict = {
        "target_skill": f"{plugin_dir.name}:{skill}",
        "args": "",
        "requested_model": "",
        "actual_model": ["claude-test"],
        "nudge_count": 0,
        "gate_response_count": 0,
        "goal_verdict": {"result": "PASS", "blockers": []},
        "overall": {
            "launch": "PASS", "completion": "PASS", "goal_fit": "PASS",
            "verdict": "PASS",
        },
        "skill_dir_tree_sha": behavior_sha,
        "transcript_sha256": transcript_sha,
        "scenario_origin": "synthetic",
        "scenario_id": f"{skill}-positive",
        "environment": {
            "claude_version": "test", "tmux": True,
            "transcript_layer": "jsonl", "permissions_mode": "test",
        },
        "tier": "live",
        "downgrade_reason": None,
        "timeline": {"boot_s": 1, "poll_exit": "DONE", "wall_clock_s": 2},
    }
    path = run_dir / "verdict.json"
    path.write_text(json.dumps(verdict), encoding="utf-8")
    return path


def test_incremental_plan_reuses_current_pass_and_bounds_new_runs(tmp_path):
    skills = ["run-a", "run-b", "run-c"]
    plugin_dir = _planner_plugin(tmp_path, skills)
    eval_root = tmp_path / "eval-log"
    evidence = _write_reusable_verdict(eval_root, plugin_dir, "run-a")

    plan = planner_mod.build_plan(
        plugin_dir, eval_root, profile="incremental",
        max_live_trials=1, max_concurrency=2,
    )
    actions = {record["skill"]: record["action"] for record in plan["skills"]}
    assert actions == {"run-a": "reuse", "run-b": "run", "run-c": "defer"}
    assert plan["live_batches"] == [["run-b"]]
    assert plan["counts"] == {"static": 0, "fork": 0, "reuse": 1, "run": 1, "defer": 1}
    assert plan["skills"][0]["reused_evidence"] == str(evidence)


def test_incremental_plan_invalidates_evidence_on_behavior_change(tmp_path):
    plugin_dir = _planner_plugin(tmp_path, ["run-a", "run-b"])
    eval_root = tmp_path / "eval-log"
    _write_reusable_verdict(eval_root, plugin_dir, "run-a")
    with (plugin_dir / "skills" / "run-a" / "SKILL.md").open("a", encoding="utf-8") as handle:
        handle.write("changed\n")

    plan = planner_mod.build_plan(
        plugin_dir, eval_root, profile="incremental",
        max_live_trials=1, max_concurrency=1,
    )
    assert [record["action"] for record in plan["skills"]] == ["run", "defer"]
    assert plan["skills"][0]["reason"] == "behavior-changed"


def test_exhaustive_plan_explicitly_reruns_current_evidence(tmp_path):
    plugin_dir = _planner_plugin(tmp_path, ["run-a", "run-b"])
    eval_root = tmp_path / "eval-log"
    _write_reusable_verdict(eval_root, plugin_dir, "run-a")

    plan = planner_mod.build_plan(
        plugin_dir, eval_root, profile="exhaustive",
        max_live_trials=0, max_concurrency=1,
    )
    assert [record["action"] for record in plan["skills"]] == ["run", "run"]
    assert plan["policy"]["max_live_trials"] is None
    assert plan["live_batches"] == [["run-a"], ["run-b"]]


def test_build_only_plan_never_schedules_live_session(tmp_path):
    plugin_dir = _planner_plugin(tmp_path, ["run-a", "run-b"])
    eval_root = tmp_path / "eval-log"
    _write_reusable_verdict(eval_root, plugin_dir, "run-a")

    plan = planner_mod.build_plan(
        plugin_dir, eval_root, profile="build-only",
        max_live_trials=9, max_concurrency=9,
    )
    assert [record["action"] for record in plan["skills"]] == ["defer", "defer"]
    assert {record["reason"] for record in plan["skills"]} == {
        "not-run(profile=build-only)"
    }
    assert plan["live_batches"] == []
    assert plan["policy"]["max_live_trials"] == 0
