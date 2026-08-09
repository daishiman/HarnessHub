#!/usr/bin/env python3
"""build-verification-plan.py - 算出 tier と gate 台帳から、この run の blocking 集合を導出する。

正本は system-spec/dev-workflow.md の確定内容 (qa-214【3】【4】【5】/ qa-209【3】)。
台帳は scripts/verification-gate-ledger.json。

導出規則は 3 つだけ:

1. `always_blocking` の gate は tier に依らず blocking (【3】常時 fail-closed の 3 ゲート)
2. tier が gate の `min_tier` 以上なら blocking (【4】tier 別の blocking 集合)
3. 満たないときは `below_tier` に従う
   - `advisory` : 実行はするが run を止めない (disposition = executed / blocking = false)
   - `deferred` : 起動を省き、受け皿 issue を必須にする (disposition = deferred)

`skipped` を出さない理由: 本台帳の gate はいずれも「この tier では恒久的に実行しない」ものが
無く、全て後続で実行され得る。`deferred` を `skipped` へ丸めると「省略した」と「落ちた」が
事後に区別できなくなる (【1】)。恒久的に実行しない gate を将来足すときだけ `skipped` を導入する。

deferred が 1 件でもあるのに --deferred-issue が無ければ fail-closed で拒否する (【5】)。
降格が黙って被覆を消す経路を作らないため、受け皿の無い延期は成立させない。

Usage:
  python3 scripts/build-verification-plan.py --tier mvp
  python3 scripts/build-verification-plan.py --tier mvp --deferred-issue HarnessHub-xxxx
  python3 scripts/build-verification-plan.py --tier-decision eval-log/.../tier-decision.json

Exit codes:
  0 = 導出成功 / 1 = 使い方・入力エラー / 2 = fail-closed 拒否 (受け皿の無い deferred)
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

TIERS = ("mvp", "standard", "critical")
TIER_RANK = {tier: index for index, tier in enumerate(TIERS)}
DEFAULT_LEDGER = Path(__file__).resolve().parent / "verification-gate-ledger.json"
BELOW_TIER_ACTIONS = ("advisory", "deferred")


def load_ledger(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    gates = data.get("gates")
    if not isinstance(gates, list) or not gates:
        raise ValueError(f"gate 台帳に gates が無い: {path}")
    seen = set()
    for gate in gates:
        for key in ("id", "min_tier", "always_blocking", "rerun_command"):
            if key not in gate:
                raise ValueError(f"gate {gate.get('id')!r} に必須キー {key} が無い")
        if gate["min_tier"] not in TIER_RANK:
            raise ValueError(f"gate {gate['id']!r} の min_tier が不正: {gate['min_tier']}")
        # min_tier が最低 tier の gate では below_tier 分岐へ到達しない。書けてしまうと
        # 「低 tier では advisory に落ちる」と読める死んだ設定が台帳に残るため、持たせない。
        if gate["min_tier"] == TIERS[0]:
            if "below_tier" in gate:
                raise ValueError(
                    f"gate {gate['id']!r} の below_tier が不正: min_tier={TIERS[0]} では到達不能"
                )
        elif gate.get("below_tier") not in BELOW_TIER_ACTIONS:
            raise ValueError(f"gate {gate['id']!r} の below_tier が不正: {gate.get('below_tier')}")
        if gate["id"] in seen:
            raise ValueError(f"gate id が重複している: {gate['id']}")
        seen.add(gate["id"])
    return gates


def plan_for(tier: str, gates: list[dict]) -> list[dict]:
    if tier not in TIER_RANK:
        raise ValueError(f"未知の tier: {tier}")
    checks = []
    for gate in gates:
        meets = TIER_RANK[tier] >= TIER_RANK[gate["min_tier"]]
        if gate["always_blocking"]:
            disposition, blocking = "executed", True
            reason = f"tier に依らず常時 blocking: {gate.get('reason', '')}".strip()
        elif meets:
            disposition, blocking = "executed", True
            reason = f"tier={tier} は min_tier={gate['min_tier']} 以上のため blocking"
        elif gate.get("below_tier") == "advisory":
            disposition, blocking = "executed", False
            reason = f"tier={tier} では advisory (実行はするが run を止めない)"
        else:
            disposition, blocking = "deferred", False
            reason = f"tier={tier} では起動せず後続へ延期 (min_tier={gate['min_tier']})"
        checks.append({
            "id": gate["id"],
            "title": gate.get("title", gate["id"]),
            "disposition": disposition,
            "blocking": blocking,
            "reason": reason,
            "rerun_command": gate["rerun_command"],
        })
    return checks


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="tier から blocking 集合を導出する")
    parser.add_argument("--tier", choices=list(TIERS))
    parser.add_argument("--tier-decision", help="select-verification-tier.py の出力 (effective_tier を読む)")
    parser.add_argument("--ledger", default=str(DEFAULT_LEDGER))
    parser.add_argument("--deferred-issue", action="append", default=[])
    parser.add_argument("--out", help="checks 部分の書込先 (既存は上書きしない)")
    args = parser.parse_args(argv)

    if not (args.tier or args.tier_decision):
        print("ERROR: --tier か --tier-decision のいずれかが必要", file=sys.stderr)
        return 1

    tier = args.tier
    if args.tier_decision:
        decision = json.loads(Path(args.tier_decision).read_text(encoding="utf-8"))
        from_file = decision.get("effective_tier") or decision.get("tier")
        if not from_file:
            print(f"ERROR: tier-decision に effective_tier / tier が無い: {args.tier_decision}", file=sys.stderr)
            return 1
        if tier and tier != from_file:
            print(f"ERROR: --tier={tier} と tier-decision の {from_file} が食い違う", file=sys.stderr)
            return 1
        tier = from_file

    try:
        gates = load_ledger(Path(args.ledger))
        checks = plan_for(tier, gates)
    except (ValueError, json.JSONDecodeError, OSError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    deferred = [c["id"] for c in checks if c["disposition"] == "deferred"]
    if deferred and not args.deferred_issue:
        print(
            "ERROR: 受け皿の無い延期は拒否する (fail-closed / dev-workflow.md【5】)。\n"
            f"  deferred: {', '.join(deferred)}\n"
            "  --deferred-issue <beads id> で受け止め先を指定する",
            file=sys.stderr,
        )
        return 2

    payload = {
        "tier": tier,
        "ledger": {"path": Path(args.ledger).name, "gate_count": len(gates)},
        "checks": checks,
        # 延期が 0 件の run に受け皿 id を書かない。CI が受け皿を無条件に渡す運用では、
        # 書いてしまうと「延期があった run」と「無かった run」が台帳上で見分けられなくなる。
        "deferred_issue_refs": list(args.deferred_issue) if deferred else [],
        "blocking_ids": [c["id"] for c in checks if c["blocking"]],
        "advisory_ids": [c["id"] for c in checks if not c["blocking"] and c["disposition"] == "executed"],
        "deferred_ids": deferred,
    }

    if args.out:
        out_path = Path(args.out)
        if out_path.exists():
            print(f"ERROR: 既存の plan を上書きしない (append-only): {out_path}", file=sys.stderr)
            return 2
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
