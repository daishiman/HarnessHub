#!/usr/bin/env python3
"""監査 fork 台帳の pending 行を、fork 完了後に resolved へ単調に確定させる。

## なぜ必要か

`record-audit-fork.py` は PostToolUse(Task|Agent) で走る。ところが現行ハーネスの
`Agent` は **非同期起動** で、PostToolUse が観測できる `tool_response` は
`status=async_launched` の起動受理でしかない。最終応答 (`AUDIT_VERDICT: <verdict>`)
はそこに存在しないため、台帳は必ず `verdict_state=pending` / `audit_verdict=null` で
着地する。一方 `audit_fork_attribution.py` は receipt に `verdict_state=resolved` を
要求するので、監査 fork を正しく回しても fork 帰属検証が構造的に FAIL し続ける。

本 hook は SubagentStop / Stop で走り、pending 行だけを、ハーネスが書いた当該 fork の
transcript (モデルの自己申告ではなく実行基盤の記録) から確定させる。

## 不変則

- **単調性**: `verdict_state=pending` の行だけを遷移させる。既に resolved / absent /
  ambiguous の行と legacy 1.1 行は一切触らない。verdict の書き換えは行わない。
- **in-place 昇格**: 追記ではなく同一行の更新にする。reader の
  `receipts_v12[session_id][tool_use_id]` は list で、同じ `tool_use_id` が 2 行あると
  `len(candidates) != 1` で malformed 扱いになるため、追記は台帳を壊す。
- **verdict は marker のみ**: 最終 assistant text block の最終非空行が
  `AUDIT_VERDICT: <PASS|FAIL|INDETERMINATE>` に完全一致する場合だけ確定する。
  候補が 0 件なら absent、複数なら ambiguous とし、pending のまま放置しない。
- **観測専用**: 例外は握り潰して exit 0 にする。この hook は証跡の解決役であって、
  本流の作業を止める門ではない。
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import tempfile
from pathlib import Path

SCHEMA_VERSION = "1.2"
VERDICT_STATE_RESOLVED = "resolved"
VERDICT_STATE_ABSENT = "absent"
VERDICT_STATE_PENDING = "pending"
VERDICT_STATE_AMBIGUOUS = "ambiguous"
AUDIT_VERDICTS = ("PASS", "FAIL", "INDETERMINATE")
AUDIT_VERDICT_LINE_RE = re.compile(r"^AUDIT_VERDICT: (PASS|FAIL|INDETERMINATE)\s*$")

LEDGER_RELPATH = Path("eval-log") / "system-spec-harness" / "audit-fork-ledger.jsonl"
TRANSCRIPT_DIR_ENV = "SYSTEM_SPEC_AUDIT_FORK_TRANSCRIPT_DIR"
RESOLUTION_SOURCE = "subagent-transcript-final-text"
# fork transcript は 1 session あたり高々数十件。探索は session dir 直下 + 1 段だけに絞る。
MAX_SEARCH_DEPTH = 3
# 起動記録を探す親 transcript の上限 (project dir に無関係な過去 session を全走査しない)。
MAX_LAUNCH_TRANSCRIPTS = 10
AGENT_ID_RE = re.compile(r"agentId:\s*([0-9a-zA-Z_-]{6,})")


def read_payload() -> dict:
    if sys.stdin.isatty():
        return {}
    try:
        raw = sys.stdin.read()
        return json.loads(raw) if raw.strip() else {}
    except (json.JSONDecodeError, UnicodeDecodeError, OSError):
        return {}


def resolve_repo_root(payload: dict) -> Path:
    for candidate in (payload.get("cwd"), os.environ.get("CLAUDE_PROJECT_DIR"), os.getcwd()):
        if candidate:
            return Path(candidate)
    return Path.cwd()


def transcript_search_roots(payload: dict) -> list[Path]:
    """fork transcript を探す候補ディレクトリを、狭い順に返す。"""
    roots: list[Path] = []
    override = os.environ.get(TRANSCRIPT_DIR_ENV)
    if override:
        roots.append(Path(override))
    transcript_path = payload.get("transcript_path")
    session_id = payload.get("session_id")
    if isinstance(transcript_path, str) and transcript_path:
        tp = Path(transcript_path)
        # 親 session の transcript は <project>/<session>.jsonl、fork は
        # <project>/<session>/subagents/agent-<id>.jsonl に置かれる。
        roots.append(tp.parent / tp.stem / "subagents")
        roots.append(tp.parent / "subagents")
        if isinstance(session_id, str) and session_id:
            roots.append(tp.parent / session_id / "subagents")
        roots.append(tp.parent)
    seen: set[str] = set()
    unique: list[Path] = []
    for root in roots:
        key = str(root)
        if key not in seen:
            seen.add(key)
            unique.append(root)
    return unique


def find_transcript_by_meta(agent_id: str, roots: list[Path]) -> Path | None:
    """名前付き fork の ``<name>@<teamName>`` 形式 agent_id から transcript を引く。

    名前を付けて起動した fork (in_process_teammate) は、台帳の agent_id が
    ``c07-matrix-r8@session-0b3baed6`` のような ``<name>@<teamName>`` 形式になる一方、
    transcript の実ファイル名は ``agent-a<name>-<hash>.jsonl`` で hash が付く。
    そのため ``agent-<agent_id>.jsonl`` の完全一致では永久に一致せず、
    実際には marker を書き終えた fork でも台帳が pending のまま残る。

    ファイル名の glob で拾うと同名 fork の再起動時にどれを指すか決められないので、
    併置された ``*.meta.json`` の ``name`` と ``teamName`` で厳密に突き合わせる。
    候補が 1 件に定まらないときは解決せず None を返す (fail-closed)。
    誤った transcript から verdict を読むより pending を残す方が安全側にある。
    """
    if "@" not in agent_id:
        return None
    name, _, team = agent_id.partition("@")
    if not name or not team:
        return None
    hits: list[Path] = []
    for root in roots:
        if not root.is_dir():
            continue
        try:
            metas = sorted(root.glob("agent-*.meta.json"))
        except OSError:
            continue
        for meta_path in metas:
            try:
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                continue
            if not isinstance(meta, dict):
                continue
            if meta.get("name") != name or meta.get("teamName") != team:
                continue
            transcript = meta_path.with_name(meta_path.name[: -len(".meta.json")] + ".jsonl")
            if transcript.is_file() and transcript not in hits:
                hits.append(transcript)
    return hits[0] if len(hits) == 1 else None


def find_transcript(agent_id: str, roots: list[Path]) -> Path | None:
    name = f"agent-{agent_id}.jsonl"
    for root in roots:
        if not root.is_dir():
            continue
        direct = root / name
        if direct.is_file():
            return direct
        try:
            for depth in range(1, MAX_SEARCH_DEPTH + 1):
                pattern = "/".join(["*"] * depth) + "/" + name
                for hit in root.glob(pattern):
                    if hit.is_file():
                        return hit
        except OSError:
            continue
    return find_transcript_by_meta(agent_id, roots)


def launch_transcripts(payload: dict) -> list[Path]:
    """Agent 起動を記録している可能性のある transcript を、狭い順に列挙する。

    監査 fork は evaluator 自身 (= subagent) が起動するため、起動記録は親 session の
    transcript ではなく ``<project>/<session>/subagents/agent-*.jsonl`` 側にあることがある。
    どちらの世代でも拾えるよう両方を候補にする。
    """
    candidates: list[Path] = []
    transcript_path = payload.get("transcript_path")
    if not isinstance(transcript_path, str) or not transcript_path:
        return candidates
    tp = Path(transcript_path)
    if tp.is_file():
        candidates.append(tp)
    project_dir = tp.parent
    for sub_dir in (tp.parent / tp.stem / "subagents", tp.parent / "subagents"):
        if sub_dir.is_dir():
            try:
                candidates.extend(
                    sorted(sub_dir.glob("agent-*.jsonl"), key=lambda p: p.stat().st_mtime, reverse=True)
                )
            except OSError:
                pass
    if project_dir.is_dir():
        try:
            candidates.extend(
                sorted(project_dir.glob("*.jsonl"), key=lambda p: p.stat().st_mtime, reverse=True)[
                    :MAX_LAUNCH_TRANSCRIPTS
                ]
            )
        except OSError:
            pass
    seen: set[str] = set()
    unique: list[Path] = []
    for path in candidates:
        key = str(path)
        if key not in seen:
            seen.add(key)
            unique.append(path)
    return unique


def agent_id_for_tool_use(tool_use_id: str, transcripts: list[Path]) -> str | None:
    """起動受理の tool_result から、当該 call の fork 実行 ID を引き当てる。

    `record-audit-fork.py` が `agent_id` を記録するようになる前に書かれた pending 行
    (旧 hook 世代) を、ハーネス自身の記録だけを根拠に結び直すための後方互換経路。
    ここでも verdict は一切読まない (読むのは ID だけ)。
    """
    for transcript in transcripts:
        try:
            lines = transcript.read_text(encoding="utf-8").splitlines()
        except OSError:
            continue
        for line in lines:
            if tool_use_id not in line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            message = row.get("message")
            blocks = message.get("content") if isinstance(message, dict) else None
            for block in blocks if isinstance(blocks, list) else []:
                if not isinstance(block, dict):
                    continue
                if block.get("tool_use_id") != tool_use_id:
                    continue
                match = AGENT_ID_RE.search(
                    json.dumps(block.get("content"), ensure_ascii=False, sort_keys=True)
                )
                if match:
                    return match.group(1)
    return None


def final_assistant_text(transcript: Path) -> str | None:
    """fork transcript の最終 assistant text block を返す。"""
    try:
        lines = transcript.read_text(encoding="utf-8").splitlines()
    except OSError:
        return None
    for line in reversed(lines):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        message = row.get("message")
        if not isinstance(message, dict) or message.get("role") != "assistant":
            continue
        content = message.get("content")
        blocks = content if isinstance(content, list) else []
        for block in reversed(blocks):
            if not isinstance(block, dict) or block.get("type") != "text":
                continue
            text = block.get("text")
            if isinstance(text, str) and text.strip():
                return text
    return None


def verdict_from_text(text: str) -> str | None:
    """最終非空行が正規 marker のときだけ verdict を返す。無ければ None。"""
    final_line = None
    for line in text.splitlines():
        if line.strip():
            final_line = line.strip()
    match = AUDIT_VERDICT_LINE_RE.fullmatch(final_line or "")
    if match and match.group(1) in AUDIT_VERDICTS:
        return match.group(1)
    return None


def _is_retryable(row: dict) -> bool:
    """まだ解決を試してよい行かを判定する。

    通常は ``pending`` だけが対象。ただし本 hook の初版は marker 未検出時に
    ``absent`` を書いており、実行中 fork の transcript を早取りして終端状態へ
    凍結した行が残る。それらは自分が書いた痕跡 (``resolution_source``) で識別できるので、
    再試行の対象へ戻す。PostToolUse が完全な応答を見たうえで書いた ``absent``
    (``resolution_source`` を持たない) は正当な終端状態なので触らない。
    """
    state = row.get("verdict_state")
    if state == VERDICT_STATE_PENDING:
        return True
    return (
        state == VERDICT_STATE_ABSENT
        and row.get("resolution_source") == RESOLUTION_SOURCE
        and row.get("audit_verdict") is None
    )


def resolve_row(row: dict, roots: list[Path], launch_records: list[Path]) -> bool:
    """pending 行を 1 件だけ昇格させる。変更したら True。"""
    if row.get("schema_version") != SCHEMA_VERSION:
        return False
    if not _is_retryable(row):
        return False
    agent_id = row.get("agent_id")
    if not isinstance(agent_id, str) or not agent_id.strip():
        tool_use_id = row.get("tool_use_id")
        if not isinstance(tool_use_id, str) or not tool_use_id.strip():
            return False
        agent_id = agent_id_for_tool_use(tool_use_id.strip(), launch_records)
        if not agent_id:
            return False
        row["agent_id"] = agent_id
        row["agent_id_source"] = "launch-transcript-backfill"
    transcript = find_transcript(agent_id.strip(), roots)
    if transcript is None:
        return False
    text = final_assistant_text(transcript)
    if text is None:
        return False
    verdict = verdict_from_text(text)
    if verdict is None:
        # marker が無いのは「監査が marker を出さなかった」とは限らず、
        # 「まだ書き終えていない」場合がある。SubagentStop は個別 fork の停止で発火するのに
        # 本 hook は台帳全体を掃くため、fork A の停止が実行中の fork B の transcript を
        # 覗いてしまう。ここで absent へ落とすと、その後 marker が現れても終端状態に
        # 凍結されてしまうので、判定を確定させず pending のままにして次の掃きへ委ねる。
        # pending は receipt に使えない状態なので、留保しても安全側から外れない。
        return False
    row["audit_verdict"] = verdict
    row["verdict_state"] = VERDICT_STATE_RESOLVED
    row["response_sha256"] = hashlib.sha256(text.encode("utf-8")).hexdigest()
    row["resolution_source"] = RESOLUTION_SOURCE
    row["resolved_from"] = transcript.name
    return True


def rewrite_ledger(path: Path, rows: list[str]) -> None:
    """同一 directory の tmp へ書いてから os.replace で差し替える (部分書込みを残さない)。"""
    fd, tmp_name = tempfile.mkstemp(dir=str(path.parent), prefix=".audit-fork-ledger.", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            for line in rows:
                handle.write(line + "\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp_name, path)
    except BaseException:
        try:
            os.unlink(tmp_name)
        except OSError:
            pass
        raise


def main() -> int:
    payload = read_payload()
    ledger = resolve_repo_root(payload) / LEDGER_RELPATH
    if not ledger.is_file():
        return 0
    roots = transcript_search_roots(payload)
    if not roots:
        return 0
    try:
        raw_lines = ledger.read_text(encoding="utf-8").splitlines()
    except OSError:
        return 0

    launch_records = launch_transcripts(payload)
    out: list[str] = []
    changed = 0
    for raw in raw_lines:
        if not raw.strip():
            continue
        try:
            row = json.loads(raw)
        except json.JSONDecodeError:
            out.append(raw)  # 解釈できない行は逐語で保全する
            continue
        if isinstance(row, dict) and resolve_row(row, roots, launch_records):
            changed += 1
            out.append(json.dumps(row, ensure_ascii=False, sort_keys=True))
        else:
            out.append(raw)

    if changed:
        rewrite_ledger(ledger, out)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:  # 観測専用 hook: 本流を止めない
        sys.exit(0)
