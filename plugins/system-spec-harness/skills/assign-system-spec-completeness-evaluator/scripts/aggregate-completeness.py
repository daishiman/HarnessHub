#!/usr/bin/env python3
# /// script
# name: aggregate-completeness
# version: 0.2.0
# purpose: C05 完成度評価レポートの形状検証と全 6 観点スコア→総合 PASS/FAIL の決定論集約 (Goodhart 防止の fail-closed 集約器)
#          + 独立 auditor 帰属の実 fork 証跡 (PostToolUse 台帳) への接地検証
# inputs:
#   - argv: --report FILE [--fork-ledger FILE] / --matrix FILE [--require-complete]
#   - env: CLAUDE_PROJECT_DIR / SYSTEM_SPEC_AUDIT_FORK_LEDGER (fork 台帳の既定位置解決)
# outputs:
#   - stdout: OK/violation 一覧 or gate 結果 JSON
#   - exit: 0=OK / 1=violation or gate fail / 2=usage error
# contexts: [E, C]
# network: false
# write-scope: none
# dependencies: []
# requires-python: ">=3.9"
# ///
"""assign-system-spec-completeness-evaluator の決定論ヘルパ。

3 つの決定論部品を純関数として提供する (LLM の主観判定から機械層を切り出す)。

1. `validate_report(report, ledger=None)`  — 評価レポートの形状 (観点別スコア + 総合判定 +
   不足事項一覧) と、総合判定が全観点 verdict + high finding 数から fail-closed に再導出した値と
   一致するか (Goodhart 防止の整合検査)、および独立 auditor 帰属が実 fork 証跡に接地しているか
   を検証し、違反文字列のリストを返す。
2. `aggregate_verdict(aspect_verdicts, high_count)` — 全 6 観点 (ASPECTS の全キー: foundation_trace /
   decision_guidance / matrix_coverage / design_knowledge_reflection / doc_freshness / prompt_quality)
   の verdict と high severity finding 数から総合 PASS/FAIL を導出する。
   fail-closed: 全観点 PASS かつ high 0 のときだけ PASS。1 観点でも FAIL/INDETERMINATE、
   または high finding が 1 件でもあれば FAIL。観点の取りこぼし (観点未充足) も FAIL。
3. `validate_attribution(report, ledger)` — 独立 auditor (C07/C08 と matrix_coverage の sub-input
   C06) を名乗る観点が、`audit_delegations[]` の fork receipt を持ち、かつその receipt が
   PostToolUse hook (`hooks/record-audit-fork.py`) の書く台帳で裏取りできるかを検証する。

## 帰属検証 (attribution) がなぜ機械層に要るか

旧実装は `aspects[<id>].auditor` が ASPECTS 定数の期待値と文字列一致するかしか見ていなかった。
これは「どの agent が担当すべきか」の検査であって「その agent が実際に走ったか」の検査ではない。
独立監査を 1 件も fork しない実行でも「独立 auditor が PASS を出した」と名乗るレポートを生成でき、
`--report` は exit 0 で通っていた。レポート digest は graph node の
`confirmation_evidence.evaluated_digest` として confirmed の根拠になるため、fail-closed の証跡連鎖に
「帰属だけ検証されない」穴が残っていた。

監査 agent は Write を持たず自力で痕跡を残せないので、証跡はモデルが書けない層 = PostToolUse hook
が書く append-only 台帳に置く。本 script はレポート側の宣言 (`audit_delegations[]`) を台帳と
突合し、裏取りできない帰属を violation にする (fail-closed: 台帳が無い/空なら緑にしない)。

### 機械層が保証しないこと (正直な境界)

台帳が示すのは「その subagent_type への Task が完了した」ことだけ。監査 prompt が実質を伴うか、
返った verdict がレポートへ忠実に転記されたかは意味層 (content-review / human) の責務。

`run_coverage_gate(...)` は plugin-root の `validate-coverage-matrix.py` (C05 の
deterministic_check) を独立 context で実行し、マトリクス網羅性観点の一次根拠を回収する薄い wrapper。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

EVALUATOR_NAME = "assign-system-spec-completeness-evaluator"

# 評価観点の正本。上位概念・意思決定・deep knowledge・鮮度までをfail-closedで扱う。
# matrix_coverage / doc_freshness は独立 context で fork する監査 sub-agent (component) に接地する。
# design_knowledge_reflection は独立 auditor を持たず C05 (R1-score) が自前評価する:
#   C06 (hearing-auditor) は設計知識 (system-spec/*.md) を読まずヒアリング品質のみを監査するため、
#   design_knowledge を C06 へ束縛するのは虚偽対応だった。C06 は matrix_coverage の sub-input
#   (聞き漏れ/誘導/早期停止/トレーサビリティ = 網羅性・トレース根拠) へ再配置する。
ASPECTS: dict[str, dict[str, str]] = {
    "foundation_trace": {
        "label": "上位概念トレーサビリティ",
        "auditor": "assign-system-spec-completeness-evaluator",
        "component": "C05",
    },
    "decision_guidance": {
        "label": "意思決定支援",
        "auditor": "assign-system-spec-completeness-evaluator",
        "component": "C05",
    },
    "matrix_coverage": {
        "label": "マトリクス網羅性",
        "auditor": "system-spec-matrix-auditor",
        "component": "C07",
    },
    "design_knowledge_reflection": {
        "label": "設計知識反映",
        "auditor": "assign-system-spec-completeness-evaluator",
        "component": "C05",
    },
    "doc_freshness": {
        "label": "最新ドキュメント出典",
        "auditor": "system-spec-doc-freshness-auditor",
        "component": "C08",
    },
    "prompt_quality": {
        "label": "prompt-creator準拠",
        "auditor": "assign-system-spec-completeness-evaluator",
        "component": "C05",
    },
}
ASPECT_VERDICTS = {"PASS", "FAIL", "INDETERMINATE"}
OVERALL_VERDICTS = {"PASS", "FAIL"}
SEVERITIES = {"high", "medium", "low", "info"}

# 観点の一次根拠を独立 auditor に依存しない sub-input 監査 (R2-delegate が併せて fork する)。
# C06 は matrix_coverage の網羅性・トレース補助根拠であり、独立観点には昇格しない。
SUB_INPUT_AUDITORS: dict[str, dict[str, str]] = {
    "matrix_coverage": {"auditor": "system-spec-hearing-auditor", "component": "C06"},
}
DELEGATION_ROLES = {"primary", "sub_input"}
# fork 台帳 (PostToolUse hook `hooks/record-audit-fork.py` が追記する append-only JSONL) の既定位置。
LEDGER_ENV = "SYSTEM_SPEC_AUDIT_FORK_LEDGER"
LEDGER_RELPATH = Path("eval-log") / "system-spec-harness" / "audit-fork-ledger.jsonl"
# 台帳行として受理する subagent 起動ツール名。hook 側は観測名をそのまま記録する
# (旧ハーネス/Codex 系='Task', 現行 Claude Code='Agent')。record-audit-fork.py の
# AUDIT_FORK_TOOL_NAMES と整合を保つこと (issue: HarnessHub-scl)。
LEDGER_TOOL_NAMES = ("Task", "Agent")


def required_delegations() -> list[dict]:
    """fork receipt が必須の (観点, 役割, auditor, component) 一覧を返す。

    - primary: ASPECTS の auditor が C05 自身でない観点 (matrix_coverage=C07 / doc_freshness=C08)。
      C05 自前評価の観点は独立 auditor を持たないので receipt を要求しない (逆に持てば虚偽申告)。
    - sub_input: SUB_INPUT_AUDITORS が宣言する補助監査 (matrix_coverage の C06)。
    副作用なし = 単体テスト可能。
    """
    required = [
        {"aspect": aid, "role": "primary", "auditor": spec["auditor"], "component": spec["component"]}
        for aid, spec in ASPECTS.items()
        if spec["auditor"] != EVALUATOR_NAME
    ]
    required += [
        {"aspect": aid, "role": "sub_input", "auditor": spec["auditor"], "component": spec["component"]}
        for aid, spec in SUB_INPUT_AUDITORS.items()
    ]
    return required


def default_ledger_path() -> Path:
    """fork 台帳の既定位置。env 上書き > CLAUDE_PROJECT_DIR 相対 > cwd 相対 (hook 側と同一規則)。"""
    env = os.environ.get(LEDGER_ENV)
    if env:
        return Path(env)
    return Path(os.environ.get("CLAUDE_PROJECT_DIR") or Path.cwd()) / LEDGER_RELPATH


def empty_ledger() -> dict:
    """台帳が無い/読めないときの空集計。fail-closed の既定値 (裏取り 0 件)。"""
    return {"path": None, "exists": False, "dispatched": {}, "sessions": {}, "malformed": 0}


def load_fork_ledger(path) -> dict:
    """fork 台帳 JSONL を読み subagent_type ごとの完了 fork 件数へ集計する。

    戻り値: {"path": str|None, "exists": bool, "dispatched": {subagent_type: count},
             "sessions": {subagent_type: {session_id: count}}, "malformed": int}
    `sessions` は run/session 束縛 (issue: HarnessHub-x4o) の照合軸。session_id は hook が
    harness の観測値 (payload/env) から書くためモデルは偽造できない。receipt が宣言した
    session_id がここに実在するときだけ裏取りが成立する。
    不正行は数えるだけで捨てる (台帳は追記専用で部分破損しうるため、健全な行の証跡は活かす)。
    """
    if path is None:
        return empty_ledger()
    p = Path(path)
    if not p.is_file():
        return {"path": str(p), "exists": False, "dispatched": {}, "sessions": {}, "malformed": 0}
    dispatched: dict[str, int] = {}
    sessions: dict[str, dict[str, int]] = {}
    malformed = 0
    try:
        lines = p.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeDecodeError):
        return {"path": str(p), "exists": False, "dispatched": {}, "sessions": {}, "malformed": 0}
    for line in lines:
        if not line.strip():
            continue
        try:
            rec = json.loads(line)
        except json.JSONDecodeError:
            malformed += 1
            continue
        if not isinstance(rec, dict) or rec.get("tool_name") not in LEDGER_TOOL_NAMES:
            malformed += 1
            continue
        st = rec.get("subagent_type")
        if not isinstance(st, str) or not st:
            malformed += 1
            continue
        sid = rec.get("session_id")
        if not isinstance(sid, str) or not sid:
            # hook は session 不明時に "unknown" を書く契約 (record-audit-fork.py)。
            # 欄そのものが無い/空の行は契約外なので malformed として捨てる。
            malformed += 1
            continue
        dispatched[st] = dispatched.get(st, 0) + 1
        by_session = sessions.setdefault(st, {})
        by_session[sid] = by_session.get(sid, 0) + 1
    return {"path": str(p), "exists": True, "dispatched": dispatched, "sessions": sessions,
            "malformed": malformed}


def agent_definition_exists(auditor: str) -> bool:
    """auditor 名が本 plugin 同梱の agent 定義に接地するか (実在しない agent 名を名乗らせない)。"""
    if not isinstance(auditor, str) or not auditor or "/" in auditor or auditor.startswith("."):
        return False
    return (_plugin_root() / "agents" / f"{auditor}.md").is_file()


def ledger_corroborates(delegation: dict, ledger: dict) -> tuple[bool, str]:
    """宣言された 1 件の fork receipt を台帳で裏取りできるか判定し `(ok, reason)` を返す。

    引数:
      delegation — レポートの `audit_delegations[]` の 1 要素 (形状検査は呼び出し側で済んでいる)。
      ledger     — `load_fork_ledger()` の戻り値。

    ## 判定方針 (起案根拠)

    照合軸は `dispatch.subagent_type` の完全一致 + 件数 >= 1 の 1 本に絞る。台帳が記録できるのは
    hook が観測した事実 (どの subagent_type への Task が完了したか) だけであり、それ以上の軸
    (prompt 内容の妥当性・監査の実質) は台帳に無い情報なので、ここで判定したことにすると
    「機械層が保証していない範囲を保証したことにする」= 本 issue と同型の Goodhart を再生産する。

    件数を 1 以上とし「receipt 1 件につき台帳 1 件を消費する」多重度照合を採らないのは、
    R2-delegate が同一 auditor を再 fork (INDETERMINATE 後の再実行等) しうるためで、
    多重度を厳格化すると正当な再監査が violation になる。裏取りの目的は
    「fork を 1 件も起こしていない実行を弾く」ことであり、回数の一致ではない。

    fail-closed の順序は「台帳の不在 → subagent_type 未宣言 → 台帳に記録なし」。台帳自体が
    無い場合を最初に切り分けるのは、この 3 者で復旧手順が異なるため (hook 未配線 / レポート不備 /
    fork 省略)。reason には診断に足る文脈 (台帳パス・破損行数) を含める。

    ## run/session 束縛 (issue: HarnessHub-x4o)

    subagent_type 軸だけでは **過去 run の同一 auditor 記録でも裏取りが成立してしまう**。そこで
    receipt の `dispatch.session_id` (宣言) と台帳行の `session_id` (harness 観測) の **両方** を
    要求し、同一 (session_id, subagent_type) の台帳行が実在するときだけ裏取り成立とする。
    宣言単独では自己申告 (書くだけで通る)、台帳単独では過去 run と区別不能であり、両者の突合で
    初めて「この報告が名指しする run で fork が完了した」ことに接地する。宣言なし・
    `"unknown"` 宣言・台帳に無い session の名指しはいずれも fail-closed で False
    ("unknown" の扱いは実装内コメント参照)。
    `validate_attribution` 側は必須 receipt 全件の宣言 session が単一に収束することも要求する
    (複数の過去 run からのつまみ食い遮断)。`--session` で現在 session を明示されたときは
    宣言との一致まで検査する (過去 run 一式の丸ごと再利用の遮断。事後再検証では省略可)。

    ## 残余ギャップ (能動的偽装)

    台帳は読み取り可能なため、過去 run の session_id を receipt へ丸写しする能動的偽装は
    `--session` 併用時を除き機械層では弾けない。guard hook と同じく表層的 adversarial evasion は
    設計上許容し、意味層 (content-review / human) の未閉塞責務として開示する。
    """
    dispatch = delegation.get("dispatch")
    subagent_type = dispatch.get("subagent_type") if isinstance(dispatch, dict) else None

    if not ledger.get("exists"):
        return False, (
            f"fork 台帳が存在しない ({ledger.get('path')}) ため独立監査の帰属を裏取りできない "
            f"(PostToolUse hook record-audit-fork.py の配線を確認するか、監査を実 fork して再評価する)"
        )
    if not isinstance(subagent_type, str) or not subagent_type:
        return False, "dispatch.subagent_type が無く fork 台帳と突合できない"

    if ledger.get("dispatched", {}).get(subagent_type, 0) < 1:
        malformed = ledger.get("malformed", 0)
        suffix = f" / 台帳の破損行 {malformed} 件" if malformed else ""
        return False, (
            f"fork 台帳に subagent_type={subagent_type!r} の完了記録が無い "
            f"(独立監査を起動せずに帰属だけ宣言している疑い。台帳={ledger.get('path')}{suffix})"
        )

    # --- run/session 束縛 (issue: HarnessHub-x4o) ---
    declared_sid = dispatch.get("session_id")
    recorded_sessions = ledger.get("sessions", {}).get(subagent_type, {})
    if not isinstance(declared_sid, str) or not declared_sid:
        return False, (
            "dispatch.session_id が無く fork 台帳の run/session と突合できない "
            "(宣言の無い帰属は自己申告のまま。R2 が fork 起動時の session_id を receipt へ記録する)"
        )
    if declared_sid == "unknown":
        # hook は session を観測できない環境で "unknown" を台帳へ書く (record-audit-fork.py 契約)。
        # "unknown" 宣言を受理すると『任意の過去 "unknown" 行で裏取りが成立する』という本 issue の
        # 穴がそのまま戻るため、fail-closed で拒否する (repo 一貫方針: 台帳不在・空 ledger・
        # INDETERMINATE と同じく、保証できない状態を緑にしない)。session を観測できない
        # ハーネス世代では正当な fork も violation になるが、それは「機械層が run 束縛を
        # 保証できない環境」の正直な申告であり、受理して穴を隠すより安全側に倒す。
        return False, (
            "dispatch.session_id='unknown' は run/session 束縛の裏取りに使えない "
            "(session 不明の fork は過去 run の 'unknown' 行と区別できない。"
            "session_id を観測できるハーネスで再評価する)"
        )
    if declared_sid not in recorded_sessions:
        return False, (
            f"fork 台帳に (session_id={declared_sid!r}, subagent_type={subagent_type!r}) の完了記録が無い "
            f"(宣言 session が台帳へ接地しない = 過去 run の名指し違い / fork 省略 / 偽装の疑い。"
            f"当該 subagent_type の観測済み session {len(recorded_sessions)} 種)"
        )
    return True, ""


def aggregate_verdict(aspect_verdicts: dict, high_count: int) -> str:
    """全観点 verdict + high finding 数から総合 verdict を fail-closed に導出する。

    - 全観点 (ASPECTS のキー) を過不足なく網羅していなければ FAIL (監査観点の取りこぼし防止)。
    - high severity finding が 1 件でもあれば FAIL。
    - 全観点が厳密に PASS のときだけ PASS。FAIL/INDETERMINATE が 1 つでもあれば FAIL。
    副作用なし = 単体テスト可能。
    """
    if set(aspect_verdicts) != set(ASPECTS):
        return "FAIL"
    if any(v not in ASPECT_VERDICTS for v in aspect_verdicts.values()):
        return "FAIL"
    if high_count > 0:
        return "FAIL"
    return "PASS" if all(v == "PASS" for v in aspect_verdicts.values()) else "FAIL"


def _high_count(findings: list) -> int:
    return sum(1 for f in findings if isinstance(f, dict) and f.get("severity") == "high")


def validate_attribution(
    report: dict, ledger: dict | None = None, expected_session: str | None = None
) -> list[str]:
    """独立 auditor 帰属が実 fork 証跡へ接地しているかを検証し違反文字列のリストを返す。

    ledger=None は「fork 証跡が回収できていない」= fail-closed で全独立監査を未接地とみなす。

    expected_session を渡すと、必須 receipt が名指しする session がその値と一致することまで
    検査する (過去 run の記録一式を丸ごと再利用する偽装の遮断; issue: HarnessHub-x4o)。
    None のときは宣言↔台帳の整合のみ検査する (CI や probe の事後再検証では評価時の
    session を知り得ないため省略可能にしている)。
    """
    v: list[str] = []
    ledger = ledger if isinstance(ledger, dict) else empty_ledger()
    aspects = report.get("aspects") if isinstance(report.get("aspects"), dict) else {}

    delegations = report.get("audit_delegations")
    if not isinstance(delegations, list):
        v.append("audit_delegations: 配列でない (独立監査の fork receipt 一覧が無い = 帰属が自己申告のまま)")
        delegations = []

    # --- 索引化 (形状違反はここで拾い、以降の照合は健全な要素のみで行う) ---
    seen: dict[tuple, dict] = {}
    for i, d in enumerate(delegations):
        if not isinstance(d, dict):
            v.append(f"audit_delegations[{i}]: オブジェクトでない")
            continue
        aspect, role = d.get("aspect"), d.get("role")
        if aspect not in ASPECTS:
            v.append(f"audit_delegations[{i}].aspect={aspect!r} が未知の観点")
            continue
        if role not in DELEGATION_ROLES:
            v.append(f"audit_delegations[{i}].role={role!r} が {sorted(DELEGATION_ROLES)} 外")
            continue
        if (aspect, role) in seen:
            v.append(f"audit_delegations: (aspect={aspect}, role={role}) の receipt が重複")
            continue
        seen[(aspect, role)] = d

    required = required_delegations()
    required_keys = {(r["aspect"], r["role"]) for r in required}

    # --- 必須 receipt の実在と整合 ---
    declared_sessions: set[str] = set()  # 必須 receipt が名指しした session (単一 run 収束の検査用)
    for req in required:
        aspect, role = req["aspect"], req["role"]
        d = seen.get((aspect, role))
        if d is None:
            v.append(
                f"audit_delegations: {aspect} の {role} 監査 ({req['auditor']}/{req['component']}) の "
                f"fork receipt が無い (独立監査の帰属が自己申告のまま)"
            )
            continue
        label = f"audit_delegations[{aspect}/{role}]"
        if d.get("auditor") != req["auditor"]:
            v.append(f"{label}.auditor != {req['auditor']!r} (観点↔監査 agent 対応)")
        if d.get("component") != req["component"]:
            v.append(f"{label}.component != {req['component']!r}")
        if not agent_definition_exists(d.get("auditor")):
            v.append(f"{label}.auditor={d.get('auditor')!r} に対応する agent 定義が plugin に実在しない")
        dispatch = d.get("dispatch")
        if not isinstance(dispatch, dict):
            v.append(f"{label}.dispatch: オブジェクトでない (fork の起動方法が記録されていない)")
        else:
            if dispatch.get("tool") not in LEDGER_TOOL_NAMES:
                v.append(
                    f"{label}.dispatch.tool={dispatch.get('tool')!r} が {list(LEDGER_TOOL_NAMES)} 外"
                    " (独立 context の fork は subagent 起動ツール経由必須)"
                )
            if dispatch.get("subagent_type") != req["auditor"]:
                v.append(f"{label}.dispatch.subagent_type != {req['auditor']!r}")
            sid = dispatch.get("session_id")
            if isinstance(sid, str) and sid:
                declared_sessions.add(sid)
        dv = d.get("verdict")
        if dv not in ASPECT_VERDICTS:
            v.append(f"{label}.verdict={dv!r} が {sorted(ASPECT_VERDICTS)} 外")
        elif role == "primary":
            a = aspects.get(aspect)
            av = a.get("verdict") if isinstance(a, dict) else None
            if av in ASPECT_VERDICTS and dv != av:
                v.append(
                    f"{label}.verdict={dv!r} が aspects[{aspect}].verdict={av!r} と不一致 "
                    f"(独立監査の判定が観点 verdict へ忠実に転記されていない)"
                )
        ev = d.get("evidence")
        if not isinstance(ev, list) or not ev:
            v.append(f"{label}.evidence: 非空配列でない (監査の根拠が空)")
        ok, reason = ledger_corroborates(d, ledger)
        if not ok:
            v.append(f"{label}: {reason}")

    # --- 単一 run 収束 (issue: HarnessHub-x4o) ---
    # receipt ごとの宣言↔台帳突合 (ledger_corroborates) を通っても、receipt A は run X・
    # receipt B は run Y の記録を指す「複数の過去 run からのつまみ食い」は成立しうる。
    # 必須 receipt 全件が同一 session へ収束することを要求して遮断する。
    if len(declared_sessions) > 1:
        v.append(
            "audit_delegations: 必須 receipt の dispatch.session_id が単一の評価 run に収束していない "
            f"(宣言された session {len(declared_sessions)} 種: {sorted(declared_sessions)}。"
            "複数 run の fork 記録を組み合わせた帰属は 1 回の独立監査の裏取りにならない)"
        )
    if expected_session and declared_sessions and declared_sessions != {expected_session}:
        v.append(
            f"audit_delegations: 宣言 session {sorted(declared_sessions)} が評価 run の session "
            f"{expected_session!r} と一致しない (過去 run の fork 記録を今回の評価の裏取りへ流用している疑い)"
        )

    # --- 虚偽の独立性主張 (C05 自前評価の観点に独立監査 receipt を付ける) ---
    for (aspect, role) in seen:
        if (aspect, role) in required_keys:
            continue
        if role == "primary" and ASPECTS[aspect]["auditor"] == EVALUATOR_NAME:
            v.append(
                f"audit_delegations: {aspect} は C05 自前評価の観点であり primary の独立監査 receipt を "
                f"持てない (虚偽の独立性主張)"
            )
        else:
            v.append(f"audit_delegations: (aspect={aspect}, role={role}) は必須 receipt 一覧に無い未知の委譲")
    return v


def validate_report(
    report: dict, ledger: dict | None = None, expected_session: str | None = None
) -> list[str]:
    """評価レポートの形状 + 総合判定の整合 + 帰属の fork 証跡接地を検証し違反リストを返す (空=OK)。

    expected_session は帰属検証 (validate_attribution) へそのまま渡す。
    """
    v: list[str] = []
    if not isinstance(report, dict):
        return ["report: オブジェクトでない"]

    ev = report.get("evaluator")
    if not isinstance(ev, dict):
        v.append("evaluator: オブジェクトでない")
    else:
        if ev.get("name") != EVALUATOR_NAME:
            v.append(f"evaluator.name != {EVALUATOR_NAME!r}")
        if ev.get("context") != "fork":
            v.append("evaluator.context != 'fork' (独立 context 必須)")
        if not ev.get("version"):
            v.append("evaluator.version が空")

    verdict = report.get("verdict")
    if verdict not in OVERALL_VERDICTS:
        v.append(f"verdict={verdict!r} が {sorted(OVERALL_VERDICTS)} 外")

    # --- 観点別スコア (全観点を過不足なく) ---
    aspects = report.get("aspects")
    aspect_verdicts: dict[str, str] = {}
    if not isinstance(aspects, dict):
        v.append("aspects: オブジェクトでない")
    else:
        extra = set(aspects) - set(ASPECTS)
        missing = set(ASPECTS) - set(aspects)
        if extra:
            v.append(f"aspects: 未知の観点 {sorted(extra)}")
        if missing:
            v.append(f"aspects: 観点欠落 {sorted(missing)} (全観点を過不足なく)")
        for aid, spec in ASPECTS.items():
            a = aspects.get(aid)
            if not isinstance(a, dict):
                continue
            av = a.get("verdict")
            if av not in ASPECT_VERDICTS:
                v.append(f"aspects[{aid}].verdict={av!r} が {sorted(ASPECT_VERDICTS)} 外")
            else:
                aspect_verdicts[aid] = av
            if a.get("auditor") != spec["auditor"]:
                v.append(f"aspects[{aid}].auditor != {spec['auditor']!r} (観点↔監査 agent 対応)")
            if a.get("component") != spec["component"]:
                v.append(f"aspects[{aid}].component != {spec['component']!r}")
            if not a.get("summary"):
                v.append(f"aspects[{aid}].summary が空")

    # --- 不足事項一覧 ---
    gaps = report.get("gaps")
    if not isinstance(gaps, list):
        v.append("gaps: 配列でない (不足事項一覧)")
        gaps = []

    # --- findings (PASS 時も info 1 件以上) ---
    findings = report.get("findings")
    if not isinstance(findings, list) or not findings:
        v.append("findings: 非空配列でない (PASS 時も info を 1 件以上残す)")
        findings = []
    else:
        for i, f in enumerate(findings):
            if not isinstance(f, dict):
                v.append(f"findings[{i}]: オブジェクトでない")
                continue
            if f.get("severity") not in SEVERITIES:
                v.append(f"findings[{i}].severity={f.get('severity')!r} が {sorted(SEVERITIES)} 外")
            if not f.get("bucket"):
                v.append(f"findings[{i}].bucket が空")
            if not f.get("observation"):
                v.append(f"findings[{i}].observation が空")

    # --- 整合検査: verdict = 再導出値 (Goodhart 防止) ---
    if isinstance(aspects, dict) and verdict in OVERALL_VERDICTS:
        derived = aggregate_verdict(aspect_verdicts, _high_count(findings))
        if derived != verdict:
            v.append(
                f"verdict={verdict!r} が 全観点 + high finding 数からの fail-closed 再導出 "
                f"{derived!r} と不一致 (総合判定が観点スコアに接地していない)"
            )
    # FAIL のとき不足事項が空なら差し戻し材料が欠落
    if verdict == "FAIL" and not gaps:
        v.append("verdict=FAIL だが gaps (不足事項一覧) が空 (差し戻し材料が無い)")

    # --- 帰属検証: 独立 auditor を名乗る観点が実 fork 証跡に接地しているか ---
    v.extend(validate_attribution(report, ledger, expected_session))
    return v


def _plugin_root() -> Path:
    """.../skills/<skill>/scripts/aggregate-completeness.py -> plugin root (parents[3])。"""
    return Path(__file__).resolve().parents[3]


def run_coverage_gate(matrix_path, require_complete: bool = False) -> dict:
    """plugin-root の validate-coverage-matrix.py (C05 deterministic_check) を実行し結果を返す。"""
    gate = _plugin_root() / "scripts" / "validate-coverage-matrix.py"
    cmd = [sys.executable or "python3", str(gate), "--matrix", str(matrix_path)]
    if require_complete:
        cmd.append("--require-complete")
    proc = subprocess.run(cmd, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    return {
        "id": "G-matrix",
        "name": "validate-coverage-matrix",
        "conditions": ["matrix_coverage"],
        "command": [str(x) for x in cmd],
        "exit_code": int(proc.returncode),
        "stdout": proc.stdout.strip(),
        "stderr": proc.stderr.strip(),
    }


def run_knowledge_graph_gate() -> dict:
    """plugin-root の validate-knowledge-graph.py を 4 profile 実行し C13-C16 の機械層根拠を集約する。

    C05 (評価者) は生成時ゲート (C01/C03) の緑を LLM 裁量で信頼せず、出荷済み 3 カタログを
    validator へ独立再実行する (proposer≠approver・保証要件は機械層)。knowledge/doctrine/
    required-info の各 profile と語彙横断 cross の 4 本が全て exit0 で PASS。design_knowledge_reflection
    (C13/C14/C15) と matrix_coverage (C16) の機械層根拠となる。
    """
    root = _plugin_root()
    gate = root / "scripts" / "validate-knowledge-graph.py"
    ref = root / "skills" / "ref-system-design-knowledge" / "references"
    elicit_ref = root / "skills" / "run-system-spec-elicit" / "references"
    knowledge_catalog = ref / "knowledge-catalog.json"
    doctrine = ref / "doctrine-anchor-registry.json"
    taxonomy = ref / "system-category-taxonomy.json"
    required_info = elicit_ref / "required-info-catalog.json"
    py = sys.executable or "python3"
    runs = (
        ("knowledge", [py, str(gate), "--profile", "knowledge", "--input", str(knowledge_catalog)]),
        ("doctrine", [py, str(gate), "--profile", "doctrine", "--input", str(doctrine)]),
        ("required-info", [py, str(gate), "--profile", "required-info", "--input", str(required_info)]),
        ("cross", [py, str(gate), "--profile", "cross", "--taxonomy", str(taxonomy),
                   "--doctrine", str(doctrine), "--required-info", str(required_info)]),
    )
    subgates = []
    worst = 0
    for name, cmd in runs:
        proc = subprocess.run(cmd, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
        subgates.append({
            "profile": name,
            "command": [str(x) for x in cmd],
            "exit_code": int(proc.returncode),
            "stderr": proc.stderr.strip(),
        })
        worst = max(worst, int(proc.returncode))
    return {
        "id": "G-knowledge-graph",
        "name": "validate-knowledge-graph",
        "conditions": ["design_knowledge_reflection", "matrix_coverage"],
        "exit_code": worst,
        "subgates": subgates,
    }


def main(argv: list | None = None) -> int:
    ap = argparse.ArgumentParser(
        description="C05 完成度評価レポートの形状検証 / マトリクス網羅性 + 知識グラフ機械ゲート実行"
    )
    ap.add_argument("--report", help="評価レポート JSON のパス (形状 + 総合判定整合 + 帰属接地を検証)")
    ap.add_argument("--fork-ledger",
                    help="監査 fork 台帳 JSONL のパス (既定: $SYSTEM_SPEC_AUDIT_FORK_LEDGER または "
                         "$CLAUDE_PROJECT_DIR/eval-log/system-spec-harness/audit-fork-ledger.jsonl)")
    ap.add_argument("--session",
                    help="評価 run の session_id。指定すると必須 receipt の宣言 session がこの値へ"
                         "一致することまで検査する (過去 run の fork 記録の丸ごと流用を遮断; "
                         "issue: HarnessHub-x4o)。CI/probe の事後再検証では省略可 (宣言↔台帳整合のみ検査)")
    ap.add_argument("--matrix", help="spec-state.json のパス (マトリクス網羅性ゲートを実行)")
    ap.add_argument("--require-complete", action="store_true", help="ゲートを未収集 0 必須モードで実行")
    ap.add_argument("--knowledge-graph", action="store_true",
                    help="出荷 3 カタログを validate-knowledge-graph.py 4 profile で独立再実行 (C13-C16 機械層)")
    args = ap.parse_args(argv)

    if not args.report and not args.matrix and not args.knowledge_graph:
        ap.error("--report / --matrix / --knowledge-graph のいずれかが必要")

    rc = 0
    if args.matrix:
        result = run_coverage_gate(args.matrix, require_complete=args.require_complete)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        if result["exit_code"] != 0:
            rc = 1
    if args.knowledge_graph:
        kg_result = run_knowledge_graph_gate()
        print(json.dumps(kg_result, ensure_ascii=False, indent=2))
        if kg_result["exit_code"] != 0:
            rc = 1
    if args.report:
        path = Path(args.report)
        if not path.is_file():
            print(f"report ファイルが存在しない: {args.report}", file=sys.stderr)
            return 2
        try:
            report = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            print(f"report の JSON parse 失敗: {exc}", file=sys.stderr)
            return 2
        ledger = load_fork_ledger(args.fork_ledger or default_ledger_path())
        violations = validate_report(report, ledger, expected_session=args.session)
        if violations:
            for msg in violations:
                print(f"VIOLATION: {msg}", file=sys.stderr)
            print(f"FAIL: {len(violations)} 件のレポート整合違反 (fork 台帳: {ledger['path']} / "
                  f"exists={ledger['exists']} / 裏取り fork {sum(ledger['dispatched'].values())} 件)",
                  file=sys.stderr)
            rc = 1
        else:
            print(f"OK: レポート形状・総合判定整合・独立 auditor 帰属の fork 証跡接地を満たす "
                  f"(verdict={report.get('verdict')})")
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
