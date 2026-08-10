#!/usr/bin/env python3
"""validate-tier-decision.py - tier-decision.json が記録として成立しているか検査する。

正本は system-spec/dev-workflow.md の確定内容 (qa-214【1】【2】【3】)。本 script は
「tier をどう決めるか」ではなく「決めた結果の記録が後から検証できる形か」だけを見る。
両者を同じ script に混ぜると、判定ロジックを直すたびに過去記録の検査基準まで動いてしまう。

検査項目:

1. 必須フィールド (run_id / decided_at / target / tier / matched_rules / inputs / checks)
2. `tier_selector` が `absent` でないこと。absent の run は tier 判定の根拠を持たないため
   critical 相当の再検証が必要であり、記録としては不合格 (【3】)
3. `disposition` は executed / deferred / skipped の 3 値。deferred と skipped を潰さない (【1】)
4. `deferred` が 1 件でもあれば `deferred_issue_refs` が非空 (【1】【5】)
5. `cache_hit` を持つ check の `disposition` は `executed` (【2】)
6. 降格記録があるなら理由と受け皿 issue が揃っていること (【2 of qa-208】)

Usage:
  python3 scripts/validate-tier-decision.py --decision eval-log/.../tier-decision.json
  python3 scripts/validate-tier-decision.py --scan eval-log/verification-tier

Exit codes:
  0 = 適合 (検査 0 件も含む) / 1 = 違反あり / 2 = 入力エラー
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REQUIRED_FIELDS = ("run_id", "decided_at", "target", "tier", "matched_rules", "inputs", "checks")
# dev-workflow.md【1】が inputs の実測値として名指しする 4 つ。changed_line_count は git 経路
# でしか実測できないため値の null は許すが、key の不在は許さない (「実測しなかった」と
# 「記録し忘れた」を区別できなくなる)。
REQUIRED_INPUT_FIELDS = (
    "changed_paths", "changed_file_count", "changed_line_count", "affected_package_count",
)
DISPOSITIONS = ("executed", "deferred", "skipped")
TIERS = ("mvp", "standard", "critical")


def validate(decision: dict, label: str) -> list[str]:
    violations = []

    def bad(message: str) -> None:
        violations.append(f"{label}: {message}")

    for field in REQUIRED_FIELDS:
        if decision.get(field) in (None, ""):
            bad(f"必須フィールド {field} が無い")

    tier = decision.get("tier")
    if tier is not None and tier not in TIERS:
        bad(f"tier が閉列挙外: {tier!r}")

    selector = decision.get("tier_selector")
    if selector == "absent":
        bad("tier_selector が absent (判定根拠が無い run は critical 相当の再検証が必要)")
    elif not isinstance(selector, dict):
        bad("tier_selector が無い、または object でない")
    else:
        for field in ("path", "source_digest"):
            if not selector.get(field):
                bad(f"tier_selector.{field} が無い")

    inputs = decision.get("inputs")
    if isinstance(inputs, dict):
        for field in REQUIRED_INPUT_FIELDS:
            if field not in inputs:
                bad(f"inputs.{field} が無い")
    elif inputs is not None:
        # inputs 自体の不在は上の必須フィールド検査が報告済みなので、ここでは型だけ見る。
        bad("inputs が object でない")

    checks = decision.get("checks")
    deferred_ids = []
    if not isinstance(checks, list):
        bad("checks が配列でない")
    else:
        for index, check in enumerate(checks):
            where = f"checks[{index}]"
            if not isinstance(check, dict):
                bad(f"{where} が object でない")
                continue
            if not check.get("id"):
                bad(f"{where}.id が無い")
            disposition = check.get("disposition")
            if disposition not in DISPOSITIONS:
                bad(f"{where}.disposition が閉列挙外: {disposition!r} (executed/deferred/skipped)")
            if disposition == "deferred":
                deferred_ids.append(check.get("id"))
            if check.get("cache_hit") and disposition != "executed":
                # cache hit は「実行を省いた」のではなく「同一入力の結果を再利用した」。
                bad(f"{where} は cache_hit なのに disposition={disposition!r} (executed であるべき)")
            if check.get("cache_hit") and not check.get("cache_key"):
                bad(f"{where} は cache_hit なのに cache_key が無い (どの入力の結果か追えない)")

    refs = decision.get("deferred_issue_refs")
    if deferred_ids and not refs:
        bad(f"deferred な検査 ({', '.join(map(str, deferred_ids))}) があるのに deferred_issue_refs が空")

    downgrade = decision.get("downgrade")
    if isinstance(downgrade, dict):
        if not (downgrade.get("reason") or "").strip():
            bad("downgrade があるのに reason が空")
        if not downgrade.get("deferred_issue_refs"):
            bad("downgrade があるのに deferred_issue_refs が空")

    return violations


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="tier-decision.json の記録妥当性を検査する")
    parser.add_argument("--decision", action="append", default=[])
    parser.add_argument("--scan", help="配下の tier-decision.json を再帰検査する root")
    args = parser.parse_args(argv)

    targets = [Path(p) for p in args.decision]
    if args.scan:
        targets.extend(sorted(Path(args.scan).rglob("tier-decision.json")))
    if not targets:
        if args.scan:
            # 検査対象 0 件を成功と報告するときは、それが「全部通った」ではなく
            # 「1 件も無かった」であることを必ず明示する (0 件の帰属)。
            print(f"OK: tier-decision 適合 (検査 0 件。{args.scan} 配下に記録が無い)")
            return 0
        print("ERROR: --decision か --scan のいずれかが必要", file=sys.stderr)
        return 2

    violations = []
    for path in targets:
        try:
            decision = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            violations.append(f"{path}: 読めない ({exc})")
            continue
        violations.extend(validate(decision, str(path)))

    if violations:
        for line in violations:
            print(f"VIOLATION {line}")
        print(f"summary: 検査 {len(targets)} 件 / 違反 {len(violations)} 件", file=sys.stderr)
        return 1
    print(f"OK: tier-decision 適合 (検査 {len(targets)} 件)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
