#!/usr/bin/env python3
# /// script
# name: build-tier-gate-env
# purpose: tier-decision.json と必須ゲート台帳から、CI step の blocking/advisory/deferred を切り替える環境変数を導出する。
# inputs:
#   - eval-log/verification-tier/<run-id>/tier-decision.json
#   - scripts/required-check-ledger.json
# outputs:
#   - stdout: 導出した各 gate の切替値
#   - --out: shell から source できる export 行
# contexts: [C, E]
# network: false
# write-scope: run-local (--out で指定した一時ファイルのみ)
# requires-python: ">=3.10"
# ///
"""記録された tier を、実際の step の強制力へ翻訳する (HarnessHub-xcl3 (3))。

tier-decision.json の checks[] は「この run で各 gate をどう扱うと決めたか」を持つが、
それだけでは CI 上の step の挙動は何も変わらない。本 script は台帳
(scripts/required-check-ledger.json の verification_gate_sites) が step へ配線済みと
宣言している gate についてのみ、切替値を環境変数として出力する。

切替値は 4 値で、tier により省いたのか後段へ延期したのかを潰さない (dev-workflow.md【1】):

  blocking : 実行し、失敗したら run を止める
  advisory : 実行するが run は止めない (continue-on-error)
  deferred : この周回では起動せず、受け皿 issue が回収する
  skipped  : この tier では恒久的に実行しない

台帳に unwired が 1 件でもある場合、または wired と宣言した gate が tier-decision に無い
場合は fail-closed で拒否する。部分配線の env を生成して「tier 切替が有効」と読める状態を
作らず、9 gate の共通配線が揃うまで本 script 自体を有効化できないようにする。

Usage:
  python3 scripts/build-tier-gate-env.py --decision <tier-decision.json> \
      --ledger scripts/required-check-ledger.json --out "$RUNNER_TEMP/gate-env.sh"

Exit codes:
  0 = 導出成功 / 1 = 入力エラー / 2 = fail-closed 拒否 (未配線・決定記録欠落)
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_LEDGER = ROOT / "scripts/required-check-ledger.json"


def env_name(gate_id: str) -> str:
    return "HH_GATE_" + gate_id.upper().replace("-", "_")


def switch_value(check: dict) -> str:
    disposition = check.get("disposition")
    if disposition in ("deferred", "skipped"):
        return disposition
    if disposition != "executed":
        raise ValueError(f"disposition が閉列挙外: {disposition!r}")
    return "blocking" if check.get("blocking") else "advisory"


def derive(decision: dict, ledger: dict) -> tuple[dict[str, str], list[str]]:
    checks = {c.get("id"): c for c in decision.get("checks") or [] if isinstance(c, dict)}
    values: dict[str, str] = {}
    errors: list[str] = []
    for index, site in enumerate(ledger.get("verification_gate_sites") or []):
        if not isinstance(site, dict):
            errors.append(f"verification_gate_sites[{index}] が object でない")
            continue
        state = site.get("wiring_state")
        if state == "unwired":
            errors.append(
                f"gate {site.get('gate_id')!r}: wiring_state=unwired のため tier 切替を有効化できない"
            )
            continue
        if state != "wired":
            errors.append(
                f"gate {site.get('gate_id')!r}: wiring_state が閉列挙外または未指定: {state!r}"
            )
            continue
        if site.get("tier_switch") is not True:
            errors.append(f"gate {site.get('gate_id')!r}: wired なのに tier_switch=true でない")
            continue
        gate_id = site.get("gate_id")
        check = checks.get(gate_id)
        if check is None:
            errors.append(
                f"台帳が step へ配線済みと宣言する gate {gate_id!r} が tier-decision の checks に無い"
            )
            continue
        try:
            values[site.get("env_var") or env_name(str(gate_id))] = switch_value(check)
        except ValueError as exc:
            errors.append(f"gate {gate_id!r}: {exc}")
    return values, errors


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="tier から step の強制力を導出する")
    parser.add_argument("--decision", required=True)
    parser.add_argument("--ledger", default=str(DEFAULT_LEDGER))
    parser.add_argument("--out", help="shell から source できる export 行の書込先")
    args = parser.parse_args(argv)

    try:
        decision = json.loads(Path(args.decision).read_text(encoding="utf-8"))
        ledger = json.loads(Path(args.ledger).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"ERROR: 入力を読めない: {exc}", file=sys.stderr)
        return 1

    values, errors = derive(decision, ledger)
    if errors:
        for line in errors:
            print(f"ERROR: {line}", file=sys.stderr)
        return 2

    tier = decision.get("effective_tier") or decision.get("tier")
    lines = [f"export {name}={value}" for name, value in sorted(values.items())]
    if args.out:
        Path(args.out).write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
    print(f"tier={tier} / 切替対象 gate={len(values)} 件")
    for name, value in sorted(values.items()):
        print(f"  {name}={value}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
