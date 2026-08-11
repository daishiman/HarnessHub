#!/usr/bin/env python3
# /// script
# name: validate-gate-execution
# purpose: tier で切り替えた blocking 集合の gate が、その run で実際に走った (または宣言どおり延期された) ことを step 実行記録と突合する。
# inputs:
#   - eval-log/verification-tier/<run-id>/tier-decision.json
#   - scripts/required-check-ledger.json
#   - toJSON(steps) の step 実行記録 (--outcomes-env / --outcomes-file)
# outputs:
#   - stdout: gate ごとの決定と実行結果の突合サマリ
#   - stderr: 乖離一覧
# contexts: [C, E]
# network: false
# write-scope: none
# requires-python: ">=3.10"
# ///
"""切替の検算 (HarnessHub-xcl3 (3))。

tier に応じて blocking 集合を切り替えると、判定が壊れた瞬間に検査が黙って消える経路が
生まれる。「検査した」と「検査したことになっていた」を事後に区別するため、切替と同じ
周回で次を機械検査する。

  executed かつ blocking  -> その step が実際に走り、成功していること
  executed かつ advisory  -> その step が実際に走っていること (失敗は許容する)
  deferred / skipped      -> その step が起動していないこと

step の実行記録は GitHub Actions の ``toJSON(steps)`` を渡す。id を持つ step だけが現れる
ため、台帳が配線済みと宣言した step の id が記録に無い場合は fail-closed で違反にする
(id の消失や rename を「走ったことにする」経路を作らない)。

決定記録に載っているのに未配線、または別 workflow にしか配線されていない gate は、
「検算対象外だから成功」としない。全 gate の実行証跡をこの invocation へ集約できるまでは
検算結果を fail-closed にし、tier 切替の完成を主張させない。

Usage:
  python3 scripts/validate-gate-execution.py --decision <tier-decision.json> \
      --ledger scripts/required-check-ledger.json \
      --workflow .github/workflows/governance-check.yml --job change-category-guard \
      --outcomes-env GATE_STEP_OUTCOMES

Exit codes:
  0 = 決定と実行が一致 / 1 = 乖離あり / 2 = 入力エラー
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_LEDGER = ROOT / "scripts/required-check-ledger.json"
NOT_RUN = ("skipped",)


def load_outcomes(args) -> dict:
    if args.outcomes_file:
        raw = Path(args.outcomes_file).read_text(encoding="utf-8")
    else:
        raw = os.environ.get(args.outcomes_env, "")
        if not raw.strip():
            raise ValueError(f"環境変数 {args.outcomes_env} が空 (step 実行記録が渡っていない)")
    data = json.loads(raw)
    if not isinstance(data, dict):
        raise ValueError("step 実行記録が object でない")
    return data


def verify(decision: dict, ledger: dict, outcomes: dict, workflow: str, job: str):
    checks = {c.get("id"): c for c in decision.get("checks") or [] if isinstance(c, dict)}
    violations: list[str] = []
    verified: list[str] = []
    unverified: list[str] = []

    sites = {
        site.get("gate_id"): site
        for site in ledger.get("verification_gate_sites") or []
        if isinstance(site, dict) and site.get("gate_id")
    }
    for gate_id, check in checks.items():
        site = sites.get(gate_id)
        if site is None:
            message = f"gate {gate_id!r}: 配線状態が台帳に無く実行を検算できない"
            unverified.append(message)
            violations.append(message)
            continue
        state = site.get("wiring_state")
        if state == "unwired":
            message = (
                f"gate {gate_id!r}: wiring_state=unwired のため "
                f"{check.get('disposition')} を実行検算できない"
            )
            unverified.append(message)
            violations.append(message)
            continue
        if state != "wired":
            message = f"gate {gate_id!r}: wiring_state が閉列挙外または未指定: {state!r}"
            unverified.append(message)
            violations.append(message)
            continue
        target = site.get("site")
        if not isinstance(target, dict):
            message = f"gate {gate_id!r}: wired なのに site が無い"
            unverified.append(message)
            violations.append(message)
            continue
        if target.get("workflow") != workflow or target.get("job") != job:
            message = (
                f"gate {gate_id!r}: {target.get('workflow')}:{target.get('job')} の実行記録が "
                "この検算へ集約されていない"
            )
            unverified.append(message)
            violations.append(message)
            continue
        check = checks.get(gate_id)
        step_id = target.get("step_id")
        record = outcomes.get(step_id)
        if not isinstance(record, dict) or not record.get("outcome"):
            violations.append(
                f"gate {gate_id!r}: step id {step_id!r} の実行記録が無い "
                "(step の id が消えた、または step 自体が存在しない)"
            )
            continue
        outcome = record.get("outcome")
        disposition = check.get("disposition")
        blocking = bool(check.get("blocking"))

        if disposition == "executed":
            if outcome in NOT_RUN:
                violations.append(
                    f"gate {gate_id!r}: {'blocking' if blocking else 'advisory'} と決定したのに "
                    f"step {step_id!r} が起動していない (outcome={outcome})"
                )
                continue
            if blocking and outcome != "success":
                violations.append(
                    f"gate {gate_id!r}: blocking と決定した step {step_id!r} が成功していない "
                    f"(outcome={outcome})"
                )
                continue
        elif disposition in ("deferred", "skipped"):
            if outcome not in NOT_RUN:
                violations.append(
                    f"gate {gate_id!r}: {disposition} と決定したのに step {step_id!r} が起動している "
                    f"(outcome={outcome})"
                )
                continue
            if disposition == "deferred" and not decision.get("deferred_issue_refs"):
                violations.append(f"gate {gate_id!r}: deferred なのに deferred_issue_refs が空")
                continue
        else:
            violations.append(f"gate {gate_id!r}: disposition が閉列挙外: {disposition!r}")
            continue
        verified.append(f"{gate_id}: {disposition}/{'blocking' if blocking else 'advisory'} <- outcome={outcome}")

    for gate_id, site in sites.items():
        if site.get("wiring_state") == "wired" and gate_id not in checks:
            violations.append(f"gate {gate_id!r}: 台帳は wired だが tier-decision の checks に無い")
    return violations, verified, unverified


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="決定した blocking 集合が実際に走ったかを検算する")
    parser.add_argument("--decision", required=True)
    parser.add_argument("--ledger", default=str(DEFAULT_LEDGER))
    parser.add_argument("--workflow", required=True)
    parser.add_argument("--job", required=True)
    parser.add_argument("--outcomes-env", default="GATE_STEP_OUTCOMES")
    parser.add_argument("--outcomes-file")
    args = parser.parse_args(argv)

    try:
        decision = json.loads(Path(args.decision).read_text(encoding="utf-8"))
        ledger = json.loads(Path(args.ledger).read_text(encoding="utf-8"))
        outcomes = load_outcomes(args)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"ERROR: 入力を読めない: {exc}", file=sys.stderr)
        return 2

    violations, verified, unverified = verify(
        decision, ledger, outcomes, args.workflow, args.job
    )
    tier = decision.get("effective_tier") or decision.get("tier")
    print(f"gate 実行検算: tier={tier} / 検算 {len(verified)} 件 / 未検算 {len(unverified)} 件")
    for line in verified:
        print(f"  OK {line}")
    for line in unverified:
        print(f"  INCOMPLETE {line}")
    if violations:
        for line in violations:
            print(f"VIOLATION {line}", file=sys.stderr)
        print(f"summary: 乖離 {len(violations)} 件", file=sys.stderr)
        return 1
    print("ok: 決定した blocking 集合と実際の step 実行が一致している")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
