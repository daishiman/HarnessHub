"""Verdict gates for target-skill invocation and goal-seek evidence."""

import hashlib
import json
from pathlib import Path

import pytest

from live_trial_test_support import (
    SCHEMA,
    _prompt,
    _run_verdict,
    _tool_result,
    _tool_use,
    _turn_end,
    _write_jsonl,
    verdict_mod,
)


@pytest.fixture()
def transcript(tmp_path):
    entries = [
        dict(_prompt()),
        dict(_tool_use("t8", "Skill", {"skill": "some-plugin:run-something"})),
        dict(_tool_result("t8")),
        dict(_tool_use("t9", "Bash")),
        dict(_tool_result("t9")),
        dict(_turn_end()),
    ]
    entries[1]["version"] = "2.1.173"
    return _write_jsonl(tmp_path / "src" / "u-9.jsonl", entries)


def test_verdict_fails_when_the_target_skill_was_never_invoked(tmp_path):
    """被験 skill を起動せず script を直接叩いた実走は launch=FAIL になる。

    2026-07-21 live-trial r14 の C05 (render) は Skill 呼出しが transcript に0件のまま
    render-graph-html.py を Bash から直接実行し、成果物が出たため PASS を自己申告した。
    起動の有無を orchestrator の --launch ではなく transcript の機械判定へ移す。
    """
    entries = [dict(_prompt()), dict(_tool_use("t1", "Bash")),
               dict(_tool_result("t1")), dict(_turn_end())]
    src = _write_jsonl(tmp_path / "src" / "no-skill.jsonl", entries)

    rc, out = _run_verdict(tmp_path, src, ["--goal-result", "PASS"])
    assert rc == 0
    doc = json.loads(out.read_text())
    assert verdict_mod.validate_schema(doc, json.loads(SCHEMA.read_text())) == []
    assert doc["invoked_skills"] == []
    assert doc["overall"]["launch"] == "FAIL"
    assert doc["overall"]["verdict"] == "FAIL"
    assert any("Skill 呼出しが transcript に0件" in b for b in doc["goal_verdict"]["blockers"])


def test_verdict_accepts_a_trial_that_invoked_the_target_skill(tmp_path):
    """target skill を起動した実走は従来どおり通り、invoked_skills に記録される。"""
    entries = [dict(_prompt()),
               dict(_tool_use("t1", "Skill", {"skill": "some-plugin:run-something"})),
               dict(_tool_result("t1")),
               dict(_tool_use("t2", "Skill", {"skill": "other-plugin:run-helper"})),
               dict(_tool_result("t2")), dict(_turn_end())]
    src = _write_jsonl(tmp_path / "src" / "with-skill.jsonl", entries)

    rc, out = _run_verdict(tmp_path, src, ["--goal-result", "PASS"])
    assert rc == 0
    doc = json.loads(out.read_text())
    assert doc["invoked_skills"] == ["other-plugin:run-helper", "some-plugin:run-something"]
    assert doc["overall"]["launch"] == "PASS"
    assert doc["overall"]["verdict"] == "PASS"


def _goal_seek_skill_dir(tmp_path: Path) -> Path:
    """goal_seek を宣言した被験 skill (実行契約として配線成果物を要求する)。"""
    d = tmp_path / "run-something"
    (d / "scripts").mkdir(parents=True, exist_ok=True)
    (d / "SKILL.md").write_text(
        "---\nname: run-something\ncombinators:\n  - with-goal-seek\n"
        "goal_seek:\n  engine: inline\n  fork: subagent\n  max_loops: 5\n---\nbody\n",
        encoding="utf-8",
    )
    (d / "scripts" / "a.py").write_text("print('a')\n", encoding="utf-8")
    return d


def _run_verdict_with_skill_dir(
    tmp_path, transcript: Path, skill_dir: Path, extra: list[str], eval_root: Path | None = None
):
    workdir = tmp_path / "workdir"
    argv = [
        "--workdir", str(workdir),
        "--target-skill", "some-plugin:run-something",
        "--skill-dir", str(skill_dir),
        "--transcript", str(transcript),
        "--launch", "PASS", "--completion", "PASS",
        "--poll-exit", "DONE",
    ]
    if eval_root is not None:
        argv.extend(["--goal-seek-eval-root", str(eval_root)])
    argv.extend(extra)
    return verdict_mod.main(argv), workdir / "verdict.json"


def _skill_invocation_entries():
    return [dict(_prompt()),
            dict(_tool_use("s1", "Skill", {"skill": "some-plugin:run-something"})),
            dict(_tool_result("s1"))]


def test_verdict_flags_missing_goal_seek_wiring(tmp_path):
    """goal_seek を宣言した skill が配線成果物を残さない実走を機械検出する。

    2026-07-21 の live-trial r13/r14 では 7 skill で goal-spec.json / progress.json /
    intermediate.jsonl が一つも生成されず、SKILL.md の実行契約が一律に省略されていた。
    fresh evaluator の目視ではなく transcript の書込み記録で判定する。
    """
    entries = _skill_invocation_entries() + [dict(_tool_use("t1", "Bash")),
                                             dict(_tool_result("t1")), dict(_turn_end())]
    src = _write_jsonl(tmp_path / "src" / "no-wiring.jsonl", entries)
    eval_root = tmp_path / "eval-log"
    eval_root.mkdir()

    rc, out = _run_verdict_with_skill_dir(
        tmp_path,
        src,
        _goal_seek_skill_dir(tmp_path),
        ["--goal-result", "PASS"],
        eval_root,
    )
    assert rc == 0
    doc = json.loads(out.read_text())
    assert verdict_mod.validate_schema(doc, json.loads(SCHEMA.read_text())) == []
    assert set(doc["missing_goal_seek_artifacts"]) == {
        "goal-spec.json", "progress.json", "intermediate.jsonl"}
    # evaluator が PASS を返しても機械 gate が勝つ (fail-closed)
    assert doc["overall"]["goal_fit"] == "FAIL"
    assert doc["overall"]["verdict"] == "DEGRADED"
    assert any("ゴールシーク配線" in b for b in doc["goal_verdict"]["blockers"])


def test_verdict_accepts_complete_goal_seek_wiring(tmp_path):
    """3 種の配線成果物が実在し、内容も整合する実走は gate を通る。"""
    entries = _skill_invocation_entries() + [dict(_turn_end())]
    src = _write_jsonl(tmp_path / "src" / "wired.jsonl", entries)
    eval_root = tmp_path / "eval-log"
    eval_root.mkdir()
    goal = "target skill の目的を最後まで達成する"
    goal_hash = hashlib.sha256(goal.encode("utf-8")).hexdigest()
    (eval_root / "run-something-goal-spec.json").write_text(
        json.dumps({"original_goal": goal}), encoding="utf-8"
    )
    (eval_root / "run-something-progress.json").write_text(
        json.dumps({"checklist": ["done"]}), encoding="utf-8"
    )
    (eval_root / "run-something-intermediate.jsonl").write_text(
        json.dumps(
            {
                "original_goal": goal,
                "original_goal_hash": goal_hash,
                "current_goal_snapshot": goal,
                "delta_from_original": "none",
                "merged_directive_for_next": "continue",
                "drift_signal": "none",
            }
        )
        + "\n",
        encoding="utf-8",
    )

    rc, out = _run_verdict_with_skill_dir(
        tmp_path,
        src,
        _goal_seek_skill_dir(tmp_path),
        ["--goal-result", "PASS"],
        eval_root,
    )
    assert rc == 0
    doc = json.loads(out.read_text())
    assert doc["missing_goal_seek_artifacts"] == []
    assert doc["goal_seek_evidence_violations"] == []
    assert doc["overall"]["verdict"] == "PASS"


def test_verdict_rejects_goal_seek_files_with_invalid_content(tmp_path):
    """ファイル名だけ揃えたダミー成果物は goal_seek 履行の証拠にしない。"""
    entries = _skill_invocation_entries() + [dict(_turn_end())]
    src = _write_jsonl(tmp_path / "src" / "invalid-wiring.jsonl", entries)
    eval_root = tmp_path / "eval-log"
    eval_root.mkdir()
    (eval_root / "run-something-goal-spec.json").write_text(
        json.dumps({"original_goal": "goal"}), encoding="utf-8"
    )
    (eval_root / "run-something-progress.json").write_text("{}", encoding="utf-8")
    (eval_root / "run-something-intermediate.jsonl").write_text("{}\n", encoding="utf-8")

    rc, out = _run_verdict_with_skill_dir(
        tmp_path,
        src,
        _goal_seek_skill_dir(tmp_path),
        ["--goal-result", "PASS"],
        eval_root,
    )
    assert rc == 0
    doc = json.loads(out.read_text())
    assert doc["goal_seek_evidence_violations"]
    assert doc["overall"]["goal_fit"] == "FAIL"


def test_verdict_skips_wiring_gate_when_skill_does_not_declare_goal_seek(tmp_path, transcript):
    """goal_seek 非宣言の skill には配線 gate を適用しない (過剰適用の防止)。"""
    rc, out = _run_verdict(tmp_path, transcript, ["--goal-result", "PASS"])
    assert rc == 0
    doc = json.loads(out.read_text())
    assert doc["missing_goal_seek_artifacts"] == []
    assert doc["overall"]["verdict"] == "PASS"
