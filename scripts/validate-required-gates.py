#!/usr/bin/env python3
# /// script
# name: validate-required-gates
# purpose: 必須ゲート台帳 (scripts/required-check-ledger.json) を実 workflow / 実 branch protection と突合し、required 宣言と強制実態の乖離を fail-closed で検出する。
# inputs:
#   - scripts/required-check-ledger.json
#   - scripts/verification-gate-ledger.json
#   - .github/workflows/*.yml
#   - gh api repos/:owner/:repo/branches/<branch>/protection (--check-protection 時のみ)
# outputs:
#   - stdout: 台帳↔workflow の突合サマリと required check 未登録ゲートの一覧
#   - stderr: 違反一覧
# contexts: [C, E]
# network: false
# write-scope: none
# dependencies: [PyYAML]
# requires-python: ">=3.10"
# ///
"""必須ゲート台帳と実態の突合 (HarnessHub-ic7w)。

1. job / step の実在を照合し、context・trigger・paths は YAML から導出する。
2. 未保護方針の根拠・代替手段・残存リスクと未登録 gate を検証する。
3. ``--check-protection`` では GitHub の required status check 実状を照合する。
paths filter 付き job の required 宣言は、対象外 PR を永久 pending にするため拒否する。

Usage:
  python3 scripts/validate-required-gates.py
  python3 scripts/validate-required-gates.py --check-protection
Exit: 0=静的整合 / 1=違反 / 2=入力・protection 取得エラー。
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover - CI/local requirements-dev.txt は PyYAML 前提
    print("[ERR] PyYAML が必要です: pip install pyyaml", file=sys.stderr)
    raise SystemExit(2)

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_LEDGER = Path("scripts/required-check-ledger.json")
DEFAULT_GATE_LEDGER = Path("scripts/verification-gate-ledger.json")
WORKFLOWS_DIR = Path(".github/workflows")
ENFORCEMENTS = ("required", "advisory", "out-of-scope")
POLICY_MODES = ("no-branch-protection", "branch-protection")
WIRING_STATES = ("wired", "unwired")
CHECK_FIELDS = (
    "workflow", "job", "enforcement", "registered_in_branch_protection", "unregistered_reason",
)
DERIVED_CHECK_FIELDS = ("context", "pr_trigger", "path_filtered")


def load_workflow(path: Path) -> dict:
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    if not isinstance(data, dict):
        raise ValueError(f"{path}: workflow root は mapping でなければならない")
    return data


def workflow_triggers(workflow: dict) -> tuple[bool, bool]:
    """(pull_request で起動するか, paths filter を持つか)。

    YAML の ``on:`` は PyYAML が真偽値 True として読むため、両方の鍵を見る。
    ``pull_request:`` が値なしで書かれている場合 (= 全 PR で起動) と、鍵自体が無い場合を
    区別する必要があるので、値ではなく鍵の有無で判定する。
    """
    on = workflow.get(True, workflow.get("on"))
    if not isinstance(on, dict):
        # ``on: push`` のような文字列/配列形。pull_request を含むかだけを見る。
        values = [on] if isinstance(on, str) else list(on or [])
        return ("pull_request" in values), False
    if "pull_request" not in on:
        return False, False
    config = on["pull_request"]
    return True, isinstance(config, dict) and bool(config.get("paths") or config.get("paths-ignore"))


def job_context(job_id: str, job: dict) -> str:
    """GitHub が報告する check run 名 (job の name。無ければ job id)。"""
    name = job.get("name")
    return name if isinstance(name, str) and name else job_id


def step_index(job: dict) -> dict[str, dict]:
    return {
        step["id"]: step
        for step in (job.get("steps") or [])
        if isinstance(step, dict) and isinstance(step.get("id"), str)
    }


def github_env_exports(job: dict) -> set[str]:
    """job 内の step が ``echo "NAME=..." >> $GITHUB_ENV`` で後続へ渡す名前。"""
    exported: set[str] = set()
    for step in job.get("steps") or []:
        if not isinstance(step, dict):
            continue
        run = str(step.get("run") or "")
        if "GITHUB_ENV" not in run:
            continue
        for line in run.splitlines():
            if "GITHUB_ENV" not in line:
                continue
            head = line.strip().removeprefix("echo").strip().strip('"').strip("'")
            name = head.split("=", 1)[0].strip().strip('"').strip("'")
            if name.replace("_", "").isalnum() and name:
                exported.add(name)
    return exported


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def check_ledger_shape(ledger: dict, violations: list[str]) -> bool:
    ok = True
    for field in ("schema_version", "protection_policy", "checks", "verification_gate_sites"):
        if field not in ledger:
            violations.append(f"台帳に必須キー {field} が無い")
            ok = False
    if "covered_workflows" in ledger:
        violations.append(
            "covered_workflows は .github/workflows/*.yml から導出できるため台帳へ複製しない"
        )
        ok = False
    return ok


def validate_policy(policy: dict, checks: list[dict], violations: list[str]) -> None:
    mode = policy.get("mode")
    if mode not in POLICY_MODES:
        violations.append(f"protection_policy.mode が閉列挙外: {mode!r} ({'/'.join(POLICY_MODES)})")
        return
    if not (policy.get("decision") or "").strip():
        violations.append("protection_policy.decision が空 (どちらの方針を選んだかが記録されていない)")
    if not policy.get("reason"):
        violations.append("protection_policy.reason が空 (方針の根拠が記録されていない)")
    observation = policy.get("observation")
    if not isinstance(observation, dict) or not observation.get("result"):
        violations.append("protection_policy.observation.result が無い (実測結果が記録されていない)")

    registered = [c for c in checks if c.get("registered_in_branch_protection")]
    if mode == "no-branch-protection":
        # 敷かない方針を選ぶなら、代替の強制手段が記録されていることを条件にする (ic7w 受入条件3)。
        alternatives = policy.get("alternative_enforcement")
        if not isinstance(alternatives, list) or not alternatives:
            violations.append(
                "protection を敷かない方針なのに alternative_enforcement が空 "
                "(代替の強制手段が記録されていない)"
            )
        else:
            for index, item in enumerate(alternatives):
                if not isinstance(item, dict) or not item.get("mechanism") or not item.get("command"):
                    violations.append(f"alternative_enforcement[{index}] に mechanism / command が無い")
        if not policy.get("residual_risk"):
            violations.append("protection を敷かない方針なのに residual_risk が空 (代替手段の限界が記録されていない)")
        if not policy.get("exit_criteria"):
            violations.append("protection を敷かない方針なのに exit_criteria が空 (いつ敷くのかが記録されていない)")
        for check in registered:
            violations.append(
                f"{check.get('_context')!r}: mode=no-branch-protection と "
                "registered_in_branch_protection=true が矛盾する"
            )
    else:
        for check in checks:
            if check.get("enforcement") == "required" and not check.get("registered_in_branch_protection"):
                violations.append(
                    f"{check.get('_context')!r}: mode=branch-protection なのに required 宣言が未登録"
                )


def validate_checks(
    ledger: dict, workflows: dict[str, dict], violations: list[str]
) -> list[dict]:
    checks = ledger.get("checks")
    if not isinstance(checks, list) or not checks:
        violations.append("checks が空 (必須ゲートの台帳として成立しない)")
        return []

    seen: set[tuple[str, str]] = set()
    for index, check in enumerate(checks):
        where = f"checks[{index}]"
        if not isinstance(check, dict):
            violations.append(f"{where} が object でない")
            continue
        for field in CHECK_FIELDS:
            if field not in check:
                violations.append(f"{where} に必須キー {field} が無い")
        redundant = [field for field in DERIVED_CHECK_FIELDS if field in check]
        if redundant:
            violations.append(
                f"{where}: 実 workflow から導出できるキーを台帳へ重複記録している: "
                f"{', '.join(redundant)}"
            )
        workflow_path = check.get("workflow")
        job_id = check.get("job")
        label = f"{workflow_path}:{job_id}"
        if (workflow_path, job_id) in seen:
            violations.append(f"{where}: 同じ job が二重に宣言されている: {label}")
            continue
        seen.add((workflow_path, job_id))

        if check.get("enforcement") not in ENFORCEMENTS:
            violations.append(f"{where}: enforcement が閉列挙外: {check.get('enforcement')!r}")
        if not check.get("registered_in_branch_protection") and not (
            check.get("unregistered_reason") or ""
        ).strip():
            violations.append(f"{where}: 未登録なのに unregistered_reason が空 ({label})")

        workflow = workflows.get(workflow_path)
        if workflow is None:
            violations.append(f"{where}: workflow が .github/workflows に実在しない: {workflow_path}")
            continue
        jobs = workflow.get("jobs") or {}
        job = jobs.get(job_id)
        if not isinstance(job, dict):
            violations.append(f"{where}: job が実在しない: {label}")
            continue
        check["_context"] = job_context(job_id, job)
        pr_trigger, path_filtered = workflow_triggers(workflow)
        check["_pr_trigger"] = pr_trigger
        check["_path_filtered"] = path_filtered
        enforcement = check.get("enforcement")
        if enforcement == "required":
            if not pr_trigger:
                violations.append(f"{where}: required 宣言だが pull_request で起動しない ({label})")
            if path_filtered:
                violations.append(
                    f"{where}: required 宣言だが paths filter があるため対象外 PR で check run が "
                    f"生成されない (required 化すると永久 pending になる): {label}"
                )
        elif enforcement == "out-of-scope" and pr_trigger:
            violations.append(f"{where}: out-of-scope 宣言だが pull_request で起動する ({label})")
        elif enforcement == "advisory" and not pr_trigger:
            violations.append(f"{where}: advisory 宣言だが pull_request で起動しない (out-of-scope が正) ({label})")

    # 実 workflow 側に台帳へ載っていない job があれば、それは「必須か否かを誰も決めていない」ゲート。
    for workflow_path, workflow in workflows.items():
        for job_id, job in (workflow.get("jobs") or {}).items():
            if not isinstance(job, dict):
                continue
            if (workflow_path, job_id) not in seen:
                violations.append(
                    f"台帳に無い job: {workflow_path}:{job_id} "
                    "(必須か否かを台帳で宣言すること)"
                )
    return [c for c in checks if isinstance(c, dict)]


def validate_gate_sites(
    ledger: dict, gate_ledger: dict, workflows: dict[str, dict], violations: list[str]
) -> None:
    sites = ledger.get("verification_gate_sites")
    if not isinstance(sites, list):
        violations.append("verification_gate_sites が配列でない")
        return
    gates = {g["id"]: g for g in gate_ledger.get("gates", []) if isinstance(g, dict) and g.get("id")}

    seen: set[str] = set()
    for index, site in enumerate(sites):
        where = f"verification_gate_sites[{index}]"
        if not isinstance(site, dict):
            violations.append(f"{where} が object でない")
            continue
        gate_id = site.get("gate_id")
        if gate_id not in gates:
            violations.append(f"{where}: verification-gate-ledger.json に無い gate_id: {gate_id!r}")
            continue
        if gate_id in seen:
            violations.append(f"{where}: gate_id が重複している: {gate_id}")
            continue
        seen.add(gate_id)

        wiring_state = site.get("wiring_state")
        if wiring_state not in WIRING_STATES:
            violations.append(
                f"{where}: wiring_state が閉列挙外または未指定: {wiring_state!r} "
                f"({'/'.join(WIRING_STATES)})"
            )
            continue

        if wiring_state == "unwired":
            if not (site.get("note") or "").strip():
                violations.append(f"{where}: wiring_state=unwired なのに note が空 (残る配線作業が不明)")
            forbidden = [key for key in ("site", "tier_switch", "env_var") if key in site]
            if forbidden:
                violations.append(
                    f"{where}: wiring_state=unwired なのに配線済み用キーがある: {', '.join(forbidden)}"
                )
            continue

        target = site.get("site")
        tier_switch = site.get("tier_switch")
        env_var = site.get("env_var")
        if not isinstance(target, dict):
            violations.append(f"{where}: wiring_state=wired なのに site が object でない")
            continue
        if tier_switch is not True:
            violations.append(f"{where}: wiring_state=wired なのに tier_switch=true でない")
            continue

        workflow = workflows.get(target.get("workflow"))
        if workflow is None:
            violations.append(f"{where}: site.workflow が .github/workflows に実在しない: {target.get('workflow')}")
            continue
        job = (workflow.get("jobs") or {}).get(target.get("job"))
        if not isinstance(job, dict):
            violations.append(f"{where}: site.job が実在しない: {target.get('workflow')}:{target.get('job')}")
            continue
        steps = step_index(job)
        step = steps.get(target.get("step_id"))
        if step is None:
            violations.append(
                f"{where}: site.step_id を持つ step が実在しない: {target.get('step_id')!r} "
                f"({target.get('workflow')}:{target.get('job')})"
            )
            continue
        if target.get("step_name") and step.get("name") != target.get("step_name"):
            violations.append(
                f"{where}: step_name が実体と違う: 台帳={target.get('step_name')!r} / "
                f"実体={step.get('name')!r}"
            )

        expected_env = "HH_GATE_" + str(gate_id).upper().replace("-", "_")
        if env_var != expected_env:
            violations.append(f"{where}: env_var は {expected_env} でなければならない (台帳={env_var!r})")
            continue
        if env_var not in github_env_exports(job):
            violations.append(
                f"{where}: {env_var} を $GITHUB_ENV へ書き出す step が job に無い "
                "(切替値が step へ届かず、条件式が恒久的に空文字で評価される)"
            )
        continue_on_error = str(step.get("continue-on-error", ""))
        if env_var not in continue_on_error:
            violations.append(
                f"{where}: step の continue-on-error が {env_var} を参照していない "
                "(tier に応じた advisory 降格が配線されていない)"
            )
        if gates[gate_id].get("below_tier") == "deferred" and env_var not in str(step.get("if", "")):
            violations.append(
                f"{where}: below_tier=deferred の gate なのに step の if が {env_var} を参照していない "
                "(延期しても step が起動してしまう)"
            )

    for gate_id in gates:
        if gate_id not in seen:
            violations.append(
                f"verification-gate-ledger.json の gate {gate_id!r} が "
                "verification_gate_sites に無い (配線先が宣言されていない)"
            )


def fetch_protection(branch: str, repo_root: Path) -> tuple[str, dict | None, str]:
    """(状態, payload, 詳細)。状態は 'protected' / 'unprotected' / 'error'。"""
    try:
        result = subprocess.run(
            ["gh", "api", f"repos/:owner/:repo/branches/{branch}/protection"],
            cwd=repo_root, capture_output=True, text=True,
        )
    except FileNotFoundError:
        return "error", None, "gh CLI が見つからない"
    if result.returncode == 0:
        try:
            return "protected", json.loads(result.stdout), ""
        except json.JSONDecodeError as exc:
            return "error", None, f"protection 応答を解析できない: {exc}"
    combined = f"{result.stdout}\n{result.stderr}"
    if "Branch not protected" in combined or '"status":"404"' in combined.replace(" ", ""):
        return "unprotected", None, "404 Branch not protected"
    return "error", None, combined.strip()[:400] or f"gh api が exit {result.returncode}"


def validate_protection(
    ledger: dict, checks: list[dict], branch: str, repo_root: Path, violations: list[str]
) -> int:
    state, payload, detail = fetch_protection(branch, repo_root)
    policy_mode = (ledger.get("protection_policy") or {}).get("mode")
    if state == "error":
        # 取得できないことを skip として飲み込むと、台帳が実状と乖離したまま緑になる。
        print(f"ERROR: branch protection の実状を取得できない: {detail}", file=sys.stderr)
        return 2

    if state == "unprotected":
        print(f"protection 実状: {branch} は未保護 (required status check は 0 件)")
        if policy_mode != "no-branch-protection":
            violations.append(
                f"台帳は mode={policy_mode} と宣言しているが、{branch} は実際には未保護"
            )
        for check in checks:
            if check.get("registered_in_branch_protection"):
                violations.append(
                    f"{check.get('_context')!r}: 登録済みと宣言しているが protection 自体が存在しない"
                )
        return 0

    contexts = set(
        ((payload or {}).get("required_status_checks") or {}).get("contexts") or []
    )
    print(f"protection 実状: {branch} は保護あり / required contexts={len(contexts)} 件")
    if policy_mode == "no-branch-protection":
        violations.append(
            f"台帳は mode=no-branch-protection と宣言しているが、{branch} は実際には保護されている"
        )
    for check in checks:
        declared = bool(check.get("registered_in_branch_protection"))
        actual = check.get("_context") in contexts
        if declared != actual:
            violations.append(
                f"{check.get('_context')!r}: registered_in_branch_protection の宣言={declared} だが "
                f"実 protection では {actual}"
            )
    for context in sorted(contexts - {c.get("_context") for c in checks}):
        violations.append(f"protection に台帳外の required context がある: {context!r}")
    return 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="必須ゲート台帳と実 workflow / protection を突合する")
    parser.add_argument("--repo-root", type=Path, default=ROOT)
    parser.add_argument("--ledger", type=Path, default=DEFAULT_LEDGER)
    parser.add_argument("--gate-ledger", type=Path, default=DEFAULT_GATE_LEDGER)
    parser.add_argument("--check-protection", action="store_true",
                        help="gh api で実 branch protection を取得し宣言と突合する")
    parser.add_argument("--branch", default="main")
    args = parser.parse_args(argv)

    root = args.repo_root.resolve()
    ledger_path = args.ledger if args.ledger.is_absolute() else root / args.ledger
    gate_ledger_path = args.gate_ledger if args.gate_ledger.is_absolute() else root / args.gate_ledger
    try:
        ledger = load_json(ledger_path)
        gate_ledger = load_json(gate_ledger_path)
    except (OSError, json.JSONDecodeError) as exc:
        print(f"ERROR: 台帳を読めない: {exc}", file=sys.stderr)
        return 2

    violations: list[str] = []
    if not check_ledger_shape(ledger, violations):
        for line in violations:
            print(f"VIOLATION {line}", file=sys.stderr)
        return 1

    workflows: dict[str, dict] = {}
    actual = sorted(
        p.relative_to(root).as_posix()
        for p in (root / WORKFLOWS_DIR).glob("*.y*ml")
    )
    for relative in actual:
        path = root / relative
        try:
            workflows[relative] = load_workflow(path)
        except (OSError, ValueError, yaml.YAMLError) as exc:
            print(f"ERROR: workflow を解析できない: {exc}", file=sys.stderr)
            return 2

    checks = validate_checks(ledger, workflows, violations)
    validate_policy(ledger.get("protection_policy") or {}, checks, violations)
    validate_gate_sites(ledger, gate_ledger, workflows, violations)

    protection_code = 0
    if args.check_protection:
        protection_code = validate_protection(
            ledger, checks, args.branch, root, violations
        )

    required = [c for c in checks if c.get("enforcement") == "required"]
    unregistered = [c for c in required if not c.get("registered_in_branch_protection")]
    print(
        f"必須ゲート台帳: workflow={len(workflows)} 件 / job={len(checks)} 件 / "
        f"required={len(required)} 件 / うち required check 未登録={len(unregistered)} 件"
    )
    for check in unregistered:
        print(f"  未登録 (required 宣言): {check.get('_context')} <- {check.get('unregistered_reason')}")

    if protection_code == 2:
        return 2
    if violations:
        for line in violations:
            print(f"VIOLATION {line}", file=sys.stderr)
        print(f"summary: 違反 {len(violations)} 件", file=sys.stderr)
        return 1
    print("ok: 台帳構造は実 workflow と整合している")
    if (ledger.get("protection_policy") or {}).get("mode") == "no-branch-protection":
        print(
            "INCOMPLETE: branch protection 未適用のため required 宣言は merge を強制しない "
            f"(未登録 {len(unregistered)} 件)"
        )
    else:
        print("ENFORCED: branch protection 方針で required check 登録済み")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
