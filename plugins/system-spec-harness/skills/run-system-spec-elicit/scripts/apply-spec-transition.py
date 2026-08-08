#!/usr/bin/env python3
# /// script
# name: apply-spec-transition
# version: 0.2.0
# purpose: spec-state の単一 writer CLI。各責務は state_transition_{matrix,foundation,knowledge}.py へ分離する。
# inputs: [init|apply|chunk|aggregate|set-targets|set-foundation|set-decision|set-knowledge-candidate]
# outputs: [spec-state.json or stdout]
# network: false
# write-scope: spec-state.json
# requires-python: ">=3.9"
# ///
"""Thin CLI and compatibility facade for the split spec-state transition writer."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))
SUPPORT_SCRIPTS = Path(__file__).resolve().parents[3] / "scripts"
if str(SUPPORT_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SUPPORT_SCRIPTS))

from state_transition_common import (
    CANONICAL_PLATFORMS,
    CELL_STATES,
    DECISION_COMPARISON_AXES,
    DECISION_COST_CATEGORIES,
    FOUNDATION_KEYS,
    FOUNDATION_NA_FORBIDDEN,
    FOUNDATION_U_KEYS,
    MAX_LOOPS_DEFAULT,
    PLATFORM_LABELS,
    TransitionError,
    empty_foundation,
    foundation_goal_ids as _foundation_goal_ids,
    has_entry as _has_entry,
    is_explicit_na as _is_explicit_na,
    normalize_serves as _normalize_serves,
)
from state_transition_foundation import set_decision, set_foundation
from state_transition_knowledge import set_knowledge_candidate
from state_transition_matrix import (
    add_category,
    apply_cell_op,
    apply_turn,
    bootstrap_state,
    count_unresolved,
    derive_aggregate,
    init_state,
    next_unresolved_question,
    recompute_aggregates,
    run_chunk,
    set_targets,
)


def load_json(path: str) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def load_json_arg(raw: str):
    stripped = raw.lstrip()
    if stripped.startswith(("{", "[")):
        return json.loads(raw)
    return json.loads(Path(raw).read_text(encoding="utf-8"))


def dump_state(state: dict) -> str:
    return json.dumps(state, ensure_ascii=False, indent=2) + "\n"


def _emit(state: dict, out: str | None) -> None:
    text = dump_state(state)
    if out:
        Path(out).write_text(text, encoding="utf-8")
    else:
        sys.stdout.write(text)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="spec-state.json 単一 transition writer (run-system-spec-elicit)")
    sub = parser.add_subparsers(dest="cmd", required=True)
    boot = sub.add_parser("bootstrap", help="R0 用の空 state envelope を生成")
    boot.add_argument("--out")
    init = sub.add_parser("init", help="taxonomy からマトリクスを初期化")
    init.add_argument("--taxonomy", required=True)
    init.add_argument("--state", help="bootstrap済みstate (foundation/decisionsを保持)")
    init.add_argument("--out")
    add_category_parser = sub.add_parser("add-category", help="カテゴリ軸を 1 件拡張")
    add_category_parser.add_argument("--state", required=True)
    add_category_parser.add_argument("--category", required=True, help="category JSON文字列またはファイル")
    add_category_parser.add_argument("--out")
    apply = sub.add_parser("apply", help="単一セル op を適用")
    apply.add_argument("--state", required=True)
    apply.add_argument("--op", required=True, help="JSON 文字列の cell op")
    apply.add_argument("--out")
    chunk = sub.add_parser("chunk", help="ターン列を 1 invocation ぶん適用")
    chunk.add_argument("--state", required=True)
    chunk.add_argument("--turns", required=True, help="ターン列 JSON ファイル")
    chunk.add_argument("--max-loops", type=int, default=MAX_LOOPS_DEFAULT)
    chunk.add_argument("--out")
    aggregate = sub.add_parser("aggregate", help="集約状態を再計算")
    aggregate.add_argument("--state", required=True)
    aggregate.add_argument("--out")
    targets = sub.add_parser("set-targets", help="取得対象一覧 targets[] を設定")
    targets.add_argument("--state", required=True)
    targets.add_argument("--targets", required=True, help="targets JSON配列または JSON ファイル")
    targets.add_argument("--out")
    foundation = sub.add_parser("set-foundation", help="requirements_foundation (U1-U9) を設定/確定")
    foundation.add_argument("--state", required=True)
    foundation.add_argument("--foundation", required=True, help="foundation JSON文字列またはファイル")
    foundation.add_argument("--out")
    decision = sub.add_parser("set-decision", help="意思決定支援 record を upsert")
    decision.add_argument("--state", required=True)
    decision.add_argument("--decision", required=True, help="decision JSON文字列またはファイル")
    decision.add_argument("--out")
    candidate = sub.add_parser("set-knowledge-candidate", help="knowledge candidate を lifecycle 付きで upsert")
    candidate.add_argument("--state", required=True)
    candidate.add_argument("--candidate", required=True, help="candidate JSON文字列またはファイル")
    candidate.add_argument("--out")
    args = parser.parse_args(argv)
    try:
        if args.cmd == "bootstrap":
            _emit(bootstrap_state(), args.out)
        elif args.cmd == "init":
            _emit(init_state(load_json(args.taxonomy), load_json(args.state) if args.state else None), args.out)
        else:
            state = load_json(args.state)
            if args.cmd == "add-category":
                add_category(state, load_json_arg(args.category))
            elif args.cmd == "apply":
                apply_turn(state, {"ops": [json.loads(args.op)]})
            elif args.cmd == "chunk":
                run_chunk(state, load_json(args.turns), max_loops=args.max_loops)
            elif args.cmd == "aggregate":
                recompute_aggregates(state)
            elif args.cmd == "set-targets":
                value = load_json_arg(args.targets)
                set_targets(state, value["targets"] if isinstance(value, dict) and "targets" in value else value)
            elif args.cmd == "set-foundation":
                set_foundation(state, load_json_arg(args.foundation))
            elif args.cmd == "set-decision":
                set_decision(state, load_json_arg(args.decision))
            elif args.cmd == "set-knowledge-candidate":
                set_knowledge_candidate(state, load_json_arg(args.candidate))
            _emit(state, args.out or args.state)
    except TransitionError as exc:
        print(f"TransitionError: {exc}", file=sys.stderr)
        return 1
    except (OSError, json.JSONDecodeError) as exc:
        print(f"IO/JSON error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
