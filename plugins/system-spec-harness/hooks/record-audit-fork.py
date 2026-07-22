#!/usr/bin/env python3
# /// script
# name: record-audit-fork
# version: 0.1.0
# purpose: 監査 sub-agent への Task fork が実際に完了したことを PostToolUse で append-only 台帳へ記録する
#          (completeness-report の auditor 帰属を自己申告でなく実 fork 証跡へ接地させるための証跡 writer)。
# inputs:
#   - stdin: PostToolUse hook JSON ({session_id, tool_name, tool_input{subagent_type, prompt}, tool_response})
#   - env: CLAUDE_PROJECT_DIR (台帳の書込起点。未設定時は cwd)
#          CLAUDE_PLUGIN_ROOT (監査 agent レジストリの探索起点。未設定時は本ファイルの親の親)
#          SYSTEM_SPEC_AUDIT_FORK_LEDGER (台帳パスの明示上書き。テスト・live-trial 用)
# outputs:
#   - file: <project>/eval-log/system-spec-harness/audit-fork-ledger.jsonl (1 fork = 1 行の追記)
#   - exit: 0 always (観測専用。session を blocking しない)
# contexts: [E]
# network: false
# write-scope: workspace
# dependencies: []
# requires-python: ">=3.9"
# ///
"""PostToolUse(Task) 監査 fork 台帳 writer。

## なぜ必要か (issue: completeness-report の auditor 帰属が実 fork 証跡に接地しない)

`assign-system-spec-completeness-evaluator` の評価レポートは観点ごとに `auditor`
(例 `matrix_coverage` → `system-spec-matrix-auditor`) を宣言するが、これは **評価者自身が書く
文字列** であり、実際に Task fork が起きたかを何も表していなかった。独立監査を 1 件も起動しない
実行でも「独立 auditor が PASS を出した」と名乗るレポートを生成でき、`aggregate-completeness.py
--report` は exit 0 で通っていた。レポート digest は graph node の
`confirmation_evidence.evaluated_digest` として confirmed の根拠になるため、fail-closed の証跡連鎖に
「帰属だけ検証されない」穴が残っていた。

監査 agent (`system-spec-{matrix,hearing,doc-freshness}-auditor`) は `tools: Read[, Bash]` のみで
**Write を持たない** ため、自力ではディスク上に「自分が走った」痕跡を残せない。そこで
「モデルが書けない層」である hook が fork の完了を記録する。台帳はモデルの出力ではなく harness の
副作用なので、レポート側の宣言と独立した corroboration (裏取り) になる。

## 記録対象

本 plugin が同梱する agent (`<plugin_root>/agents/*.md` の stem) を `subagent_type` に持つ Task のみ。
Claude Code が pinned plugin の agent を `system-spec-harness:<agent>` として渡す場合は、自 plugin の
qualifier だけを受理して stem へ正規化する。無関係な Task で台帳が膨らむのを避け、レジストリ追加に
自動追従する (agent を足せば記録対象になる)。

## 記録しないもの

prompt 本文は記録せず sha256 のみ (機微情報を台帳へ持ち込まない)。tool_response 本文も記録しない。

## 既知の限界 (正直な境界)

- 台帳が証明するのは「その subagent_type への Task が完了した」ことだけ。監査 prompt が実質を伴うか、
  返った verdict がレポートへ忠実に転記されたかは機械層では判定できない (意味層 = content-review/human)。
- hook が無効化された環境では台帳が空になる。その場合 `aggregate-completeness.py` は
  fail-closed で「帰属未接地」の violation を出す (緑にはならない = 安全側)。
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
import sys
from pathlib import Path

SCHEMA_VERSION = "1.0"
HOOK_NAME = "record-audit-fork"
PLUGIN_NAME = "system-spec-harness"
LEDGER_RELPATH = Path("eval-log") / "system-spec-harness" / "audit-fork-ledger.jsonl"
LEDGER_ENV = "SYSTEM_SPEC_AUDIT_FORK_LEDGER"


def plugin_root() -> Path:
    """hooks/record-audit-fork.py -> plugin root (parents[1])。env 指定があれば優先。"""
    env = os.environ.get("CLAUDE_PLUGIN_ROOT")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[1]


def audit_agents(root: Path | None = None) -> set[str]:
    """本 plugin が同梱する agent 名 (= 記録対象の subagent_type) を返す。"""
    agents_dir = (root or plugin_root()) / "agents"
    try:
        return {p.stem for p in agents_dir.glob("*.md")}
    except OSError:
        return set()


def ledger_path() -> Path:
    """台帳パス。env 上書き > CLAUDE_PROJECT_DIR 相対 > cwd 相対。"""
    env = os.environ.get(LEDGER_ENV)
    if env:
        return Path(env)
    root = Path(os.environ.get("CLAUDE_PROJECT_DIR") or Path.cwd())
    return root / LEDGER_RELPATH


def read_payload() -> dict:
    """hook は stdin で JSON を渡す。空・不正なら {} (観測専用なので落とさない)。"""
    if sys.stdin.isatty():
        return {}
    try:
        raw = sys.stdin.read()
        return json.loads(raw) if raw.strip() else {}
    except (json.JSONDecodeError, UnicodeDecodeError, OSError):
        return {}


def normalize_subagent_type(subagent_type: object, known_agents: set[str]) -> str | None:
    """Task payload の agent 名を plugin-local stem へ正規化する。

    Claude Code は plain agent を ``<agent>``、``--plugin-dir`` で pin した agent を
    ``<plugin>:<agent>`` として渡す。qualified 名は本 plugin の qualifier だけを受理し、
    他 plugin が同じ stem を名乗って台帳へ混入する経路を閉じる。
    """
    if not isinstance(subagent_type, str) or not subagent_type:
        return None
    if ":" in subagent_type:
        plugin, agent = subagent_type.split(":", 1)
        if plugin != PLUGIN_NAME:
            return None
    else:
        agent = subagent_type
    return agent if agent in known_agents else None


def build_record(payload: dict, known_agents: set[str]) -> dict | None:
    """記録対象なら台帳 1 行を組み立てる。対象外なら None。"""
    if payload.get("tool_name") != "Task":
        return None
    tin = payload.get("tool_input")
    if not isinstance(tin, dict):
        return None
    subagent_type = normalize_subagent_type(tin.get("subagent_type"), known_agents)
    if subagent_type is None:
        return None
    prompt = tin.get("prompt")
    prompt_sha256 = (
        hashlib.sha256(prompt.encode("utf-8")).hexdigest() if isinstance(prompt, str) and prompt else None
    )
    return {
        "schema_version": SCHEMA_VERSION,
        "ts": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "session_id": payload.get("session_id") or os.environ.get("CLAUDE_SESSION_ID") or "unknown",
        "tool_name": "Task",
        "subagent_type": subagent_type,
        "prompt_sha256": prompt_sha256,
        "cwd": payload.get("cwd") or str(Path.cwd()),
    }


def append_record(record: dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n")


def main(argv: list | None = None) -> int:
    payload = read_payload()
    try:
        record = build_record(payload, audit_agents())
        if record is not None:
            append_record(record, ledger_path())
    except OSError as exc:  # 台帳が書けなくても session は止めない (証跡欠落は下流が fail-closed で拾う)
        print(f"WARN {HOOK_NAME}: {exc}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
