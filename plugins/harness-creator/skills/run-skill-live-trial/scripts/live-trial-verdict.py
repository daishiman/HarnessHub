#!/usr/bin/env python3
# /// script
# name: live-trial-verdict
# purpose: trial 成果 (transcript/成果物/判定入力) を回収し、schema 自己検証済みの live-trial verdict.json を生成する。
# inputs:
#   - argv: --workdir --target-skill --skill-dir --launch --completion --goal-result --scenario-id --scenario-file --observation ほか (下記 usage)
#   - env: CLAUDE_PROJECTS_DIR ($HOME/.claude/projects)
# outputs:
#   - stdout: verdict 要約 + 書出パス
#   - exit: 0=生成成功 / 1=schema 不適合・回収失敗 / 2=usage・denylist
# contexts: [C, E]
# network: false
# write-scope: --workdir 配下のみ (transcript.jsonl / verdict.json)
# dependencies: []
# requires-python: ">=3.10"
# ///
"""live-trial の runtime-evidence 契約 (D10) を機械生成する。

- transcript 回収: ~/.claude/projects/*/<session-id>.jsonl → workdir/transcript.jsonl
- actual_model 抽出: transcript を json.loads ループで走査 (旧 AG 版の jq 代替) し
  assistant.message.model の unique 集合を得る。proof trial の唯一の実走 model 証明。
- skill_dir_tree_sha: 被験 skill の挙動閉包 (SKILL/scripts/prompts/宣言 refs と
  plugin manifest/hooks) の複合 sha256 (repo 相対パス + 内容)。
- 生成した verdict は同梱 schemas/live-trial-verdict.schema.json で自己検証してから
  書き出す (required / enum / additionalProperties false / pattern)。
- scenario 契約: --scenario-id を名乗る trial は --scenario-file (required_observations の
  正本) を必須とし、--observation N=<evidence ref> で回収を宣言する。未回収項目と
  task_args_template との乖離は scenario_contract へ機械的に列挙され、未回収があれば
  goal_verdict は FAIL になる。scenario_id 一致だけの verdict は契約充足を意味しない。
- 被験 skill denylist (再帰遮断) は backend.deny_target_skill が正本。
"""
from __future__ import annotations

import argparse
import glob as globmod
import hashlib
import importlib.util
import json
import os
import re
import shutil
import sys
from pathlib import Path


def _load_sibling(stem: str):
    path = Path(__file__).resolve().parent / f"{stem}.py"
    spec = importlib.util.spec_from_file_location(stem.replace("-", "_"), path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _schema_path() -> Path:
    return Path(__file__).resolve().parent.parent / "schemas" / "live-trial-verdict.schema.json"


def find_transcript(projects_dir: str, session_id: str) -> Path | None:
    for p in globmod.glob(os.path.join(projects_dir, "*", f"{session_id}.jsonl")):
        if Path(p).is_file():
            return Path(p)
    return None


def iter_transcript(path: Path):
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(obj, dict):
            yield obj


def extract_models(path: Path) -> list[str]:
    models: set[str] = set()
    for obj in iter_transcript(path):
        if obj.get("type") == "assistant":
            model = (obj.get("message") or {}).get("model")
            if isinstance(model, str) and model:
                models.add(model)
    return sorted(models)


def extract_skill_invocations(path: Path) -> list[str]:
    """transcript に残る Skill ツール呼出しの skill 名を返す (重複なし・昇順)。

    「被験 skill を起動せず、その中で使われる script を Bash から直接叩く」実走は、
    成果物が出ても skill の受け入れ検証になっていない (2026-07-21 live-trial r14 の C05)。
    起動の有無を orchestrator の自己申告ではなく transcript から機械判定する。
    """
    skills: set[str] = set()
    for obj in iter_transcript(path):
        content = (obj.get("message") or {}).get("content")
        if not isinstance(content, list):
            continue
        for block in content:
            if not isinstance(block, dict) or block.get("type") != "tool_use":
                continue
            if block.get("name") != "Skill":
                continue
            name = (block.get("input") or {}).get("skill")
            if isinstance(name, str) and name:
                skills.add(name)
    return sorted(skills)


GOAL_SEEK_ARTIFACTS = ("goal-spec.json", "progress.json", "intermediate.jsonl")


def validate_goal_seek_evidence(skill_dir: Path, eval_root: Path | None) -> dict:
    """goal_seek 成果物の実体と内容を独立 validator で検証する。

    transcript の command/file_path 文字列だけでは、ファイル名を言及しただけの run や
    空のダミー成果物を PASS にできる。宣言済み skill は eval root 未指定も fail-closed にする。
    """
    validator = _load_sibling("validate-goal-seek-evidence")
    if not validator.declares_goal_seek(skill_dir / "SKILL.md"):
        return {
            "valid": True,
            "goal_seek_declared": False,
            "violations": [],
            "checked": {"skipped": "frontmatter に goal_seek 宣言なし"},
        }
    if eval_root is None:
        return {
            "valid": False,
            "goal_seek_declared": True,
            "violations": [
                "eval-root-missing: goal_seek 宣言 skill は --goal-seek-eval-root が必須"
            ],
            "checked": {},
        }
    return validator.verify(skill_dir, eval_root)


def extract_claude_version(path: Path) -> str | None:
    for obj in iter_transcript(path):
        ver = obj.get("version")
        if isinstance(ver, str) and ver:
            return ver
    return None


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


_BEHAVIOR = _load_sibling("build-skill-behavior-closure")
behavior_closure_files = _BEHAVIOR.behavior_closure_files
skill_dir_tree_sha = _BEHAVIOR.skill_dir_tree_sha


_SCENARIO = _load_sibling("validate-live-trial-scenario-contract")
_FLAG_PATTERN = _SCENARIO._FLAG_PATTERN
load_scenario = _SCENARIO.load_scenario
parse_observation_claims = _SCENARIO.parse_observation_claims
validate_evidence_claims = _SCENARIO.validate_evidence_claims
observation_coverage = _SCENARIO.observation_coverage
args_divergence = _SCENARIO.args_divergence
validate_task_contract = _SCENARIO.validate_task_contract
scenario_contract_blockers = _SCENARIO.scenario_contract_blockers


def derive_overall(*, launch: str, completion: str, goal_result: str | None,
                   nudge: int, gate: int, proof: bool,
                   requested_model: str, actual_model: list[str],
                   blocked: bool) -> tuple[str, str, str | None]:
    """判定ロジック表 (SKILL.md) の機械実装。returns (goal_fit, verdict, downgrade_reason)。"""
    goal_fit = goal_result if goal_result else "NOT_EVALUATED"
    if blocked:
        return goal_fit, "BLOCKED", "tmux 不在 / HARD_CAP 超過等の fail-closed"
    if launch == "FAIL":
        return goal_fit, "FAIL", None
    if completion == "FAIL":
        return goal_fit, "FAIL", None
    if proof and actual_model != [requested_model]:
        return goal_fit, "FAIL", (
            f"proof trial: actual_model {actual_model} != requested_model "
            f"[{requested_model}] (transcript 機械 gate)"
        )
    degrade: list[str] = []
    if goal_fit == "FAIL":
        degrade.append("goal-proxy 乖離 (完走するが目的を果たさない)")
    if nudge > 0 or gate > 0:
        degrade.append(f"自走未達 (nudge={nudge} gate応答={gate} — 自動送信でも介入)")
    if degrade:
        reason = " / ".join(degrade)
        # proof trial は「人手介入なし PASS」が受け入れ条件 — ⚠️ 相当も不合格
        return goal_fit, ("FAIL" if proof else "DEGRADED"), reason
    if goal_fit == "NOT_EVALUATED":
        return goal_fit, "DEGRADED", "goal 判定未実施 (fresh evaluator 未起動)"
    return goal_fit, "PASS", None


def validate_schema(doc, schema, path: str = "$") -> list[str]:
    """同梱 schema 用の最小 validator。

    type/enum/required/properties/additionalProperties/items/uniqueItems/
    pattern/minimum/minLength を扱う。
    """
    errs: list[str] = []
    types = schema.get("type")
    if types is not None:
        allowed = types if isinstance(types, list) else [types]
        ok = False
        for t in allowed:
            if (
                (t == "object" and isinstance(doc, dict))
                or (t == "array" and isinstance(doc, list))
                or (t == "string" and isinstance(doc, str))
                or (t == "integer" and isinstance(doc, int) and not isinstance(doc, bool))
                or (t == "number" and isinstance(doc, (int, float)) and not isinstance(doc, bool))
                or (t == "boolean" and isinstance(doc, bool))
                or (t == "null" and doc is None)
            ):
                ok = True
        if not ok:
            return [f"{path}: type {allowed} 不一致 (got {type(doc).__name__})"]
    if "enum" in schema and doc not in schema["enum"]:
        return [f"{path}: enum {schema['enum']} 外の値 {doc!r}"]
    if isinstance(doc, str):
        if "pattern" in schema and not re.search(schema["pattern"], doc):
            errs.append(f"{path}: pattern {schema['pattern']} 不一致")
        if "minLength" in schema and len(doc) < schema["minLength"]:
            errs.append(f"{path}: minLength {schema['minLength']} 未満")
    if isinstance(doc, int) and not isinstance(doc, bool) and "minimum" in schema:
        if doc < schema["minimum"]:
            errs.append(f"{path}: minimum {schema['minimum']} 未満")
    if isinstance(doc, dict):
        props = schema.get("properties", {})
        for key in schema.get("required", []):
            if key not in doc:
                errs.append(f"{path}: required key '{key}' 欠落")
        if schema.get("additionalProperties") is False:
            for key in doc:
                if key not in props:
                    errs.append(f"{path}: additionalProperties false 違反 '{key}'")
        for key, sub in props.items():
            if key in doc:
                errs.extend(validate_schema(doc[key], sub, f"{path}.{key}"))
    if isinstance(doc, list):
        if schema.get("uniqueItems"):
            seen: set[str] = set()
            for item in doc:
                identity = json.dumps(
                    item,
                    ensure_ascii=False,
                    sort_keys=True,
                    separators=(",", ":"),
                )
                if identity in seen:
                    errs.append(f"{path}: uniqueItems 違反 {item!r}")
                    break
                seen.add(identity)
        if "items" in schema:
            for i, item in enumerate(doc):
                errs.extend(validate_schema(item, schema["items"], f"{path}[{i}]"))
    return errs


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--workdir", required=True, help="eval-log/<plugin>/<skill>/live-trial/<run-id>/")
    ap.add_argument("--target-skill", required=True, help="plugin:skill")
    ap.add_argument("--skill-dir", required=True, help="被験 skill のディレクトリ (tree sha 対象)")
    ap.add_argument("--args", default="", dest="trial_args")
    ap.add_argument("--requested-model", default="")
    ap.add_argument("--session-id", default="", help="transcript 回収用 UUID")
    ap.add_argument("--transcript", default="", help="回収済み transcript のパス (session-id 探索より優先)")
    ap.add_argument(
        "--goal-seek-eval-root",
        default="",
        help="被験 skill が goal_seek 成果物を書いた eval-log directory",
    )
    ap.add_argument("--launch", required=True, choices=["PASS", "FAIL"])
    ap.add_argument("--completion", required=True, choices=["PASS", "FAIL"])
    ap.add_argument("--goal-result", default="", choices=["", "PASS", "FAIL"],
                    help="fresh evaluator の達成判定。未実施は省略 (--no-goal-eval 相当)")
    ap.add_argument("--blocker", action="append", default=[], help="goal 未達点 (複数可)")
    ap.add_argument("--nudge-count", type=int, default=0)
    ap.add_argument("--gate-response-count", type=int, default=0)
    ap.add_argument("--proof", action="store_true", help="proof trial (model 一致の機械 gate を厳格適用)")
    ap.add_argument("--blocked", action="store_true", help="tmux 不在 / HARD_CAP 超過等の fail-closed 記録")
    ap.add_argument("--scenario-origin", default="synthetic", choices=["synthetic", "replay"])
    ap.add_argument("--scenario-id", default="",
                    help="criteria receipt と実走を束縛する stable scenario id (任意。指定時は --scenario-file 必須)")
    ap.add_argument("--scenario-file", default="",
                    help="required_observations の正本 (scenarios[] を持つ JSON)")
    ap.add_argument("--observation", action="append", default=[],
                    help="回収済み required_observation を N=<evidence ref> で指定 (複数可)")
    ap.add_argument("--tier", default="live", choices=["static", "fork", "live"])
    ap.add_argument("--downgrade-reason", default="")
    ap.add_argument("--permissions-mode", default="bypassPermissions")
    ap.add_argument("--boot-s", type=float, default=None)
    ap.add_argument("--poll-exit", default="")
    ap.add_argument("--wall-clock-s", type=float, default=None)
    ns = ap.parse_args(argv)

    backend = _load_sibling("live-trial-backend")
    if backend.deny_target_skill(ns.target_skill):
        print(f"[ERROR] DENYLIST: 被験 skill {ns.target_skill} は再帰遮断対象 "
              f"({sorted(backend.DENY_TARGET_SKILLS)})", file=sys.stderr)
        return 2

    workdir = Path(ns.workdir)
    workdir.mkdir(parents=True, exist_ok=True)
    skill_dir = Path(ns.skill_dir)
    if not (skill_dir / "SKILL.md").is_file():
        print(f"[ERROR] skill dir に SKILL.md がない: {skill_dir}", file=sys.stderr)
        return 1

    # transcript 回収 (一次証拠)
    projects_dir = os.environ.get(
        "CLAUDE_PROJECTS_DIR", str(Path.home() / ".claude" / "projects")
    )
    src: Path | None = Path(ns.transcript) if ns.transcript else None
    if src is None and ns.session_id:
        src = find_transcript(projects_dir, ns.session_id)
    transcript_dst: Path | None = None
    if src is not None and src.is_file():
        transcript_dst = workdir / "transcript.jsonl"
        if src.resolve() != transcript_dst.resolve():
            shutil.copyfile(src, transcript_dst)

    actual_model = extract_models(transcript_dst) if transcript_dst else []
    claude_version = extract_claude_version(transcript_dst) if transcript_dst else None
    transcript_sha = sha256_file(transcript_dst) if transcript_dst else None
    transcript_layer = "jsonl" if transcript_dst else "tui"

    invoked_skills = extract_skill_invocations(transcript_dst) if transcript_dst else []

    goal_result = ns.goal_result or None
    blockers = list(ns.blocker)
    if goal_result is None and not blockers:
        blockers = ["goal 判定未実施 (trial が完走せず fresh evaluator を起動できない)"]

    # 起動の機械 gate: transcript が取れているのに被験 skill の Skill 呼出しが1件も無ければ
    # launch は PASS になりえない。orchestrator の --launch PASS 自己申告を上書きする。
    launch = ns.launch
    if transcript_dst and not ns.blocked and ns.target_skill not in invoked_skills:
        launch = "FAIL"
        blockers.append(
            f"被験 skill {ns.target_skill} の Skill 呼出しが transcript に0件 "
            f"(実行された Skill: {invoked_skills or 'なし'})。skill を起動せず script を"
            "直接実行した実走は受け入れ検証にならない"
        )

    # 配線の機械 gate: ファイル名の transcript 言及ではなく、成果物の実体・必須キー・
    # original_goal/hash の整合を検証する。fresh evaluator の PASS より機械判定を優先する。
    goal_seek_evidence = validate_goal_seek_evidence(
        skill_dir,
        Path(ns.goal_seek_eval_root) if ns.goal_seek_eval_root else None,
    )
    wiring_violations = list(goal_seek_evidence.get("violations") or [])
    missing_labels = {
        "goal-spec.json": "goal-spec-missing",
        "progress.json": "progress-missing",
        "intermediate.jsonl": "intermediate-missing",
    }
    missing_wiring = [
        artifact
        for artifact in GOAL_SEEK_ARTIFACTS
        if any(missing_labels[artifact] in value for value in wiring_violations)
    ]
    if wiring_violations and not ns.blocked:
        goal_result = "FAIL"
        blockers.append(
            "ゴールシーク配線の実体検証に失敗: " + " | ".join(wiring_violations)
        )

    # scenario 契約の機械 gate: scenario_id を名乗る trial は required_observations の
    # 回収状況を開示する。scenario_id の一致だけでは「契約が要求する観測を一つも
    # 取っていない run」も PASS になる (HarnessHub-dyxr)。
    scenario_contract: dict | None = None
    if ns.scenario_id and not ns.scenario_file:
        print(
            "[ERROR] --scenario-id を名乗る trial は --scenario-file が必須 "
            "(required_observations の回収を検査できないため)",
            file=sys.stderr,
        )
        return 2
    if ns.scenario_file:
        if not ns.scenario_id:
            print("[ERROR] --scenario-file には --scenario-id が必須", file=sys.stderr)
            return 2
        try:
            scenario = load_scenario(Path(ns.scenario_file), ns.scenario_id)
            required_observations = list(scenario["required_observations"])
            claims = parse_observation_claims(ns.observation, len(required_observations))
            claims = validate_evidence_claims(workdir, claims)
        except ValueError as exc:
            print(f"[ERROR] {exc}", file=sys.stderr)
            return 2
        observed, unobserved = observation_coverage(required_observations, claims)
        scenario_contract = {
            "scenario_file": ns.scenario_file,
            "scenario_id": ns.scenario_id,
            "required_observations": required_observations,
            "observed": observed,
            "unobserved": unobserved,
            "args_divergence": args_divergence(
                scenario.get("task_args_template", ""), ns.trial_args
            ),
            "task_contract": validate_task_contract(scenario, workdir / "task.md"),
        }
        contract_blockers = scenario_contract_blockers(scenario_contract)
        if contract_blockers and not ns.blocked:
            goal_result = "FAIL"
            blockers.extend(contract_blockers)

    goal_fit, verdict, auto_reason = derive_overall(
        launch=launch, completion=ns.completion, goal_result=goal_result,
        nudge=ns.nudge_count, gate=ns.gate_response_count, proof=ns.proof,
        requested_model=ns.requested_model, actual_model=actual_model,
        blocked=ns.blocked,
    )
    doc = {
        "target_skill": ns.target_skill,
        "args": ns.trial_args,
        "requested_model": ns.requested_model,
        "actual_model": actual_model,
        "nudge_count": ns.nudge_count,
        "gate_response_count": ns.gate_response_count,
        "goal_verdict": {
            "result": goal_result or "FAIL",
            "blockers": blockers,
        },
        "invoked_skills": invoked_skills,
        "missing_goal_seek_artifacts": missing_wiring,
        "goal_seek_evidence_violations": wiring_violations,
        "overall": {
            "launch": launch,
            "completion": ns.completion,
            "goal_fit": goal_fit,
            "verdict": verdict,
        },
        "skill_dir_tree_sha": skill_dir_tree_sha(skill_dir),
        "transcript_sha256": transcript_sha,
        "scenario_origin": ns.scenario_origin,
        "environment": {
            "claude_version": claude_version,
            "tmux": backend.tmux_available(),
            "transcript_layer": transcript_layer,
            "permissions_mode": ns.permissions_mode,
        },
        "tier": ns.tier,
        "downgrade_reason": ns.downgrade_reason or auto_reason,
        "timeline": {
            "boot_s": ns.boot_s,
            "poll_exit": ns.poll_exit or None,
            "wall_clock_s": ns.wall_clock_s,
        },
    }
    if ns.scenario_id:
        doc["scenario_id"] = ns.scenario_id
    if scenario_contract is not None:
        doc["scenario_contract"] = scenario_contract

    schema = json.loads(_schema_path().read_text(encoding="utf-8"))
    errs = validate_schema(doc, schema)
    if errs:
        print("[ERROR] verdict が schema 不適合 (書き出し中止):", file=sys.stderr)
        for e in errs:
            print(f"  - {e}", file=sys.stderr)
        return 1

    out = workdir / "verdict.json"
    out.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"VERDICT: {doc['overall']['verdict']} (launch={doc['overall']['launch']} completion={ns.completion} "
          f"goal_fit={goal_fit} nudge={ns.nudge_count} gate={ns.gate_response_count})")
    print(f"WROTE: {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
