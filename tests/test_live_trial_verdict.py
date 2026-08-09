"""live-trial verdict schema and behavior-closure tests."""

import json
from pathlib import Path

import pytest

from live_trial_test_support import (
    SCHEMA,
    _prompt,
    _tool_result,
    _tool_use,
    _turn_end,
    _write_jsonl,
    _write_trial_plugin,
    verdict_mod,
)


# ---- live-trial-verdict: schema / tree sha / gate ----------------------------

def _fake_skill_dir(tmp_path: Path) -> Path:
    d = tmp_path / "fake-skill"
    (d / "scripts").mkdir(parents=True, exist_ok=True)
    (d / "SKILL.md").write_text("---\nname: fake\n---\nbody\n", encoding="utf-8")
    (d / "scripts" / "a.py").write_text("print('a')\n", encoding="utf-8")
    return d


def _run_verdict(tmp_path, transcript: Path, extra: list[str]) -> tuple[int, Path]:
    workdir = tmp_path / "workdir"
    workdir.mkdir(parents=True, exist_ok=True)
    evidence = workdir / "evaluator-evidence.json"
    evidence.write_text("{}\n", encoding="utf-8")
    goal_result = "FAIL"
    if "--goal-result" in extra:
        goal_result = extra[extra.index("--goal-result") + 1]
    goal_blockers = [
        extra[index + 1]
        for index, value in enumerate(extra[:-1])
        if value == "--blocker"
    ]
    goal_eval_args: list[str] = []
    if "--goal-result" in extra:
        goal_evaluation = workdir / "goal-evaluation.json"
        goal_evaluation.write_text(json.dumps({
            "result": goal_result,
            "blockers": goal_blockers,
            "evaluator": {
                "mode": "fresh-independent-context",
                "id": "pytest-live-trial-goal-evaluator",
            },
            "transcript_sha256": verdict_mod.sha256_file(transcript),
            "evidence_refs": ["evaluator-evidence.json"],
        }), encoding="utf-8")
        goal_eval_args = ["--goal-evaluation", str(goal_evaluation)]
    skill_dir = _fake_skill_dir(tmp_path)
    argv = [
        "--workdir", str(workdir),
        "--target-skill", "some-plugin:run-something",
        "--skill-dir", str(skill_dir),
        "--transcript", str(transcript),
        "--launch", "PASS", "--completion", "PASS",
        "--poll-exit", "DONE",
    ] + goal_eval_args + extra
    rc = verdict_mod.main(argv)
    return rc, workdir / "verdict.json"


@pytest.fixture()
def transcript(tmp_path):
    entries = [dict(_prompt()),
               dict(_tool_use("t8", "Skill", {"skill": "some-plugin:run-something"})),
               dict(_tool_result("t8")), dict(_tool_use("t9", "Bash")),
               dict(_tool_result("t9")), dict(_turn_end())]
    entries[1]["version"] = "2.1.173"
    return _write_jsonl(tmp_path / "src" / "u-9.jsonl", entries)


def test_verdict_pass_and_schema_valid(tmp_path, transcript):
    rc, out = _run_verdict(tmp_path, transcript, ["--goal-result", "PASS"])
    assert rc == 0
    doc = json.loads(out.read_text())
    schema = json.loads(SCHEMA.read_text())
    assert verdict_mod.validate_schema(doc, schema) == []
    assert doc["overall"]["verdict"] == "PASS"
    assert doc["actual_model"] == ["claude-opus-4-8"]
    assert doc["environment"]["claude_version"] == "2.1.173"
    assert doc["environment"]["transcript_layer"] == "jsonl"
    assert doc["transcript_sha256"] and len(doc["transcript_sha256"]) == 64
    assert (tmp_path / "workdir" / "transcript.jsonl").is_file()


def test_verdict_goal_fail_degrades(tmp_path, transcript):
    rc, out = _run_verdict(tmp_path, transcript,
                           ["--goal-result", "FAIL", "--blocker", "成果物が目的を満たさない"])
    assert rc == 0
    doc = json.loads(out.read_text())
    assert doc["overall"]["verdict"] == "DEGRADED"
    assert "goal-proxy" in doc["downgrade_reason"]


def test_verdict_nudge_degrades(tmp_path, transcript):
    rc, out = _run_verdict(tmp_path, transcript,
                           ["--goal-result", "PASS", "--nudge-count", "1"])
    doc = json.loads(out.read_text())
    assert doc["overall"]["verdict"] == "DEGRADED"
    assert "自走未達" in doc["downgrade_reason"]


def test_verdict_proof_model_gate(tmp_path, transcript):
    # transcript の actual は claude-opus-4-8 — requested と不一致なら proof は FAIL
    rc, out = _run_verdict(tmp_path, transcript,
                           ["--goal-result", "PASS", "--proof",
                            "--requested-model", "claude-sonnet-5"])
    doc = json.loads(out.read_text())
    assert doc["overall"]["verdict"] == "FAIL"
    assert "proof" in doc["downgrade_reason"]
    # 一致すれば PASS
    rc2, out2 = _run_verdict(tmp_path, transcript,
                             ["--goal-result", "PASS", "--proof",
                              "--requested-model", "claude-opus-4-8"])
    assert json.loads(out2.read_text())["overall"]["verdict"] == "PASS"


def test_verdict_blocked_fail_closed(tmp_path, transcript):
    rc, out = _run_verdict(tmp_path, transcript, ["--blocked"])
    doc = json.loads(out.read_text())
    assert doc["overall"]["verdict"] == "BLOCKED"
    assert doc["overall"]["goal_fit"] == "NOT_EVALUATED"
    assert doc["goal_verdict"]["blockers"]  # 未実施の blocker が自動記録される


def test_verdict_denylist_rejected(tmp_path, transcript, capsys):
    workdir = tmp_path / "wd"
    rc = verdict_mod.main([
        "--workdir", str(workdir),
        "--target-skill", "harness-creator:run-skill-live-trial",
        "--skill-dir", str(_fake_skill_dir(tmp_path)),
        "--transcript", str(transcript),
        "--launch", "PASS", "--completion", "PASS",
    ])
    assert rc == 2
    assert "DENYLIST" in capsys.readouterr().err


def test_tree_sha_deterministic_and_content_sensitive(tmp_path):
    d1 = _fake_skill_dir(tmp_path / "a")
    d2 = _fake_skill_dir(tmp_path / "b")
    sha1 = verdict_mod.skill_dir_tree_sha(d1)
    assert sha1 == verdict_mod.skill_dir_tree_sha(d1)  # 決定論
    assert sha1 == verdict_mod.skill_dir_tree_sha(d2)  # 同内容 → 同 sha
    (d2 / "scripts" / "a.py").write_text("print('b')\n", encoding="utf-8")
    assert sha1 != verdict_mod.skill_dir_tree_sha(d2)  # 内容変更で変わる


def test_tree_sha_ignores_pytest_cache_artifacts(tmp_path):
    d = _fake_skill_dir(tmp_path)
    baseline = verdict_mod.skill_dir_tree_sha(d)
    cache_dir = d / "scripts" / ".pytest_cache" / "v" / "cache"
    cache_dir.mkdir(parents=True)
    (cache_dir / "nodeids").write_text('["scripts/test_a.py::test_x"]', encoding="utf-8")
    (d / "scripts" / ".pytest_cache" / "v" / "cache" / "lastfailed").write_text(
        "{}", encoding="utf-8"
    )
    assert verdict_mod.skill_dir_tree_sha(d) == baseline  # 非決定的な pytest artifact は無視


def _write_package_contract(
    plugin_dir: Path, depends_on: list[str], *, skills: list[str] | None = None,
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


def _behavior_closure_fixture(tmp_path: Path) -> tuple[Path, Path]:
    plugin_dir = _write_trial_plugin(
        tmp_path, "dev-graph", "dev-graph", skill_name="run-behavior"
    )
    dependency = _write_trial_plugin(
        tmp_path, "system-spec-harness", "system-spec-harness", skill_name="run-delegate"
    )
    _write_package_contract(plugin_dir, ["system-spec-harness"])
    _write_package_contract(dependency, [], skills=["run-delegate"])
    skill_dir = plugin_dir / "skills" / "run-behavior"
    (skill_dir / "scripts").mkdir()
    (skill_dir / "scripts" / "local.py").write_text("print('local')\n", encoding="utf-8")
    (skill_dir / "prompts").mkdir()
    (skill_dir / "prompts" / "R0.md").write_text("prompt-v1\n", encoding="utf-8")
    (plugin_dir / "scripts").mkdir()
    (plugin_dir / "scripts" / "shared.py").write_text("print('shared')\n", encoding="utf-8")
    (plugin_dir / "references" / "contract.md").write_text("contract-v1\n", encoding="utf-8")
    (plugin_dir / "hooks").mkdir()
    (plugin_dir / "hooks" / "hooks.json").write_text("{}\n", encoding="utf-8")
    (dependency / "hooks").mkdir()
    (dependency / "hooks" / "hooks.json").write_text("{}\n", encoding="utf-8")
    (skill_dir / "SKILL.md").write_text(
        "---\n"
        "name: run-behavior\n"
        "script_refs: [../../scripts/shared.py]\n"
        "reference_refs:\n"
        "  - ../../references/contract.md\n"
        "responsibility_refs: [prompts/R0.md]\n"
        "---\nbody\n",
        encoding="utf-8",
    )
    return plugin_dir, skill_dir


@pytest.mark.parametrize("relative_path", [
    "prompts/R0.md",
    "../../scripts/shared.py",
    "../../references/contract.md",
    "../../hooks/hooks.json",
    "../../.claude-plugin/plugin.json",
])
def test_tree_sha_binds_declared_behavior_closure(tmp_path, relative_path):
    _plugin_dir, skill_dir = _behavior_closure_fixture(tmp_path)
    before = verdict_mod.skill_dir_tree_sha(skill_dir)
    path = (skill_dir / relative_path).resolve()
    if path.name == "plugin.json":
        manifest = json.loads(path.read_text(encoding="utf-8"))
        manifest["version"] = "0.1.1"
        path.write_text(json.dumps(manifest), encoding="utf-8")
    else:
        path.write_text(path.read_text(encoding="utf-8") + "changed\n", encoding="utf-8")
    assert verdict_mod.skill_dir_tree_sha(skill_dir) != before


def test_tree_sha_binds_declared_dependency_manifest_and_hooks(tmp_path):
    _plugin_dir, skill_dir = _behavior_closure_fixture(tmp_path)
    before = verdict_mod.skill_dir_tree_sha(skill_dir)
    dependency = tmp_path / "plugins" / "system-spec-harness"
    (dependency / "hooks" / "hooks.json").write_text('{"changed":true}\n', encoding="utf-8")
    assert verdict_mod.skill_dir_tree_sha(skill_dir) != before


def test_tree_sha_binds_declared_dependency_skill_behavior(tmp_path):
    _plugin_dir, skill_dir = _behavior_closure_fixture(tmp_path)
    before = verdict_mod.skill_dir_tree_sha(skill_dir)
    dependency_skill = (
        tmp_path / "plugins" / "system-spec-harness" / "skills"
        / "run-delegate" / "SKILL.md"
    )
    dependency_skill.write_text("---\nname: run-delegate\n---\nchanged\n", encoding="utf-8")
    assert verdict_mod.skill_dir_tree_sha(skill_dir) != before


def test_tree_sha_resolves_declared_repo_root_relative_ref(tmp_path):
    _plugin_dir, skill_dir = _behavior_closure_fixture(tmp_path)
    repo_ref = tmp_path / "doc" / "notion-schema" / "contract.md"
    repo_ref.parent.mkdir(parents=True)
    repo_ref.write_text("repo-contract-v1\n", encoding="utf-8")
    (skill_dir / "SKILL.md").write_text(
        "---\n"
        "name: run-behavior\n"
        "reference_refs: [doc/notion-schema/contract.md]\n"
        "---\nbody\n",
        encoding="utf-8",
    )

    before = verdict_mod.skill_dir_tree_sha(skill_dir)
    repo_ref.write_text("repo-contract-v2\n", encoding="utf-8")

    assert verdict_mod.skill_dir_tree_sha(skill_dir) != before


def test_tree_sha_prefers_skill_relative_ref_over_repo_root_ref(tmp_path):
    _plugin_dir, skill_dir = _behavior_closure_fixture(tmp_path)
    relative = Path("doc/notion-schema/contract.md")
    repo_ref = tmp_path / relative
    skill_ref = skill_dir / relative
    repo_ref.parent.mkdir(parents=True)
    skill_ref.parent.mkdir(parents=True)
    repo_ref.write_text("repo-contract-v1\n", encoding="utf-8")
    skill_ref.write_text("skill-contract-v1\n", encoding="utf-8")
    (skill_dir / "SKILL.md").write_text(
        "---\n"
        "name: run-behavior\n"
        "reference_refs: [doc/notion-schema/contract.md]\n"
        "---\nbody\n",
        encoding="utf-8",
    )

    before = verdict_mod.skill_dir_tree_sha(skill_dir)
    repo_ref.write_text("repo-contract-v2\n", encoding="utf-8")
    assert verdict_mod.skill_dir_tree_sha(skill_dir) == before

    skill_ref.write_text("skill-contract-v2\n", encoding="utf-8")
    assert verdict_mod.skill_dir_tree_sha(skill_dir) != before


def test_tree_sha_ignores_dependency_outside_skill_scope(tmp_path):
    plugin_dir, skill_dir = _behavior_closure_fixture(tmp_path)
    _write_package_contract(
        plugin_dir,
        ["system-spec-harness"],
        skills=["run-behavior"],
        skill_dependencies={},
    )
    before = verdict_mod.skill_dir_tree_sha(skill_dir)
    dependency_skill = (
        tmp_path / "plugins" / "system-spec-harness" / "skills"
        / "run-delegate" / "SKILL.md"
    )
    dependency_skill.write_text("---\nname: run-delegate\n---\nchanged\n", encoding="utf-8")
    assert verdict_mod.skill_dir_tree_sha(skill_dir) == before


def test_tree_sha_ignores_other_skills_package_contract_projection(tmp_path):
    plugin_dir, skill_dir = _behavior_closure_fixture(tmp_path)
    _write_package_contract(
        plugin_dir,
        ["system-spec-harness"],
        skills=["run-behavior", "run-other"],
        skill_dependencies={"run-behavior": []},
    )
    before = verdict_mod.skill_dir_tree_sha(skill_dir)
    _write_package_contract(
        plugin_dir,
        ["system-spec-harness"],
        skills=["run-behavior", "run-other"],
        skill_dependencies={
            "run-behavior": [],
            "run-other": ["system-spec-harness"],
        },
    )
    assert verdict_mod.skill_dir_tree_sha(skill_dir) == before


def test_tree_sha_rejects_missing_and_symlink_escape_refs(tmp_path):
    plugin_dir, skill_dir = _behavior_closure_fixture(tmp_path)
    (skill_dir / "SKILL.md").write_text(
        "---\nname: run-behavior\nscript_refs: [scripts/missing.py]\n---\n",
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="missing"):
        verdict_mod.skill_dir_tree_sha(skill_dir)

    outside = tmp_path.parent / f"{tmp_path.name}-outside.py"
    outside.write_text("unsafe\n", encoding="utf-8")
    (plugin_dir / "scripts" / "escape.py").symlink_to(outside)
    (skill_dir / "SKILL.md").write_text(
        "---\nname: run-behavior\nscript_refs: [../../scripts/escape.py]\n---\n",
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="escapes repository"):
        verdict_mod.skill_dir_tree_sha(skill_dir)

    (plugin_dir / "scripts" / "escape.py").unlink()
    (skill_dir / "SKILL.md").write_text(
        "---\nname: run-behavior\nscript_refs: [../../scripts/shared.py]\n---\n",
        encoding="utf-8",
    )
    outside_dir = tmp_path.parent / f"{tmp_path.name}-outside-dir"
    outside_dir.mkdir()
    (plugin_dir / "hooks" / "escape-dir").symlink_to(
        outside_dir, target_is_directory=True
    )
    with pytest.raises(ValueError, match="escapes repository"):
        verdict_mod.skill_dir_tree_sha(skill_dir)


def test_tree_sha_rejects_undeclared_cross_plugin_ref(tmp_path):
    plugin_dir, skill_dir = _behavior_closure_fixture(tmp_path)
    extra = _write_trial_plugin(tmp_path, "undeclared", "undeclared", skill_name="run-x")
    (extra / "references").mkdir()
    (extra / "references" / "behavior.md").write_text("external\n", encoding="utf-8")
    (skill_dir / "SKILL.md").write_text(
        "---\nname: run-behavior\n"
        "reference_refs: [../../../undeclared/references/behavior.md]\n"
        "---\n",
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="not declared"):
        verdict_mod.skill_dir_tree_sha(skill_dir)
    _write_package_contract(extra, [], skills=["run-x"])
    _write_package_contract(plugin_dir, ["system-spec-harness", "undeclared"])
    assert len(verdict_mod.skill_dir_tree_sha(skill_dir)) == 64


def test_schema_rejects_additional_properties(tmp_path, transcript):
    rc, out = _run_verdict(tmp_path, transcript, ["--goal-result", "PASS"])
    doc = json.loads(out.read_text())
    schema = json.loads(SCHEMA.read_text())
    doc["extra_key"] = 1
    errs = verdict_mod.validate_schema(doc, schema)
    assert any("additionalProperties" in e for e in errs)
    del doc["extra_key"]
    del doc["timeline"]
    errs = verdict_mod.validate_schema(doc, schema)
    assert any("timeline" in e for e in errs)
