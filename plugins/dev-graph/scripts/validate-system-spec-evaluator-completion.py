#!/usr/bin/env python3
# /// script
# name: validate-system-spec-evaluator-completion
# purpose: C19 live trial の evaluator fork 完了と C02 import の順序・非代筆を transcript から検証する。
# inputs: [argv --transcript]
# outputs: [stdout JSON, exit 0 pass, exit 2 fail-closed]
# contexts: [E]
# network: false
# write-scope: none
# requires-python: ">=3.11"
# ///
"""C19 の completeness evaluator 完了境界を transcript で検証する。

``context: fork`` の Skill 起動結果には完全な ``agentId`` が含まれる一方、UI の
subagent 一覧には ``TaskOutput`` と互換でない短縮 ID が表示されることがある。そのため
特定ツールの自己申告ではなく、次の因果関係を JSONL transcript のイベント順で閉じる。

1. assign-system-spec-completeness-evaluator の Skill 起動結果から完全な agentId を得る。
2. 同じ agentId/tool-use-id の native task-notification が completed かつ結果本文を持つ。
3. その完了通知より後に初めて upsert-node.py (C02 import) が実行される。
4. 待機中に TaskStop を使わず、outer session が completeness-report.json を代筆しない。

一つでも証明できなければ exit 2 とする。TaskOutput は runtime が互換 ID を公開した場合の
任意の待機手段であり、本 gate の authority は完全 agentId に結びついた native notification。
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Iterable


EVALUATOR_SKILL = "system-spec-harness:assign-system-spec-completeness-evaluator"
REPORT_NAME = "completeness-report.json"
UPSERT_EXECUTION = re.compile(
    r"^\s*(?:python(?:3(?:\.\d+)?)?|uv\s+run\s+python(?:3(?:\.\d+)?)?)\s+"
    r"(?:\"[^\"\n]*upsert-node\.py\"|'[^'\n]*upsert-node\.py'|[^\s;\n]*upsert-node\.py)"
    r"(?:\s|;|$)",
    re.MULTILINE,
)
LOOPING_SLEEP = re.compile(r"\b(?:until|while|for)\b[\s\S]*\bsleep\b")
LONG_SLEEP = re.compile(r"\bsleep\s+(?P<seconds>\d+(?:\.\d+)?)\b")


def _blocks(record: dict[str, Any]) -> Iterable[dict[str, Any]]:
    message = record.get("message")
    content = message.get("content") if isinstance(message, dict) else None
    if not isinstance(content, list):
        return ()
    return (block for block in content if isinstance(block, dict))


def _tool_uses(record: dict[str, Any]) -> Iterable[dict[str, Any]]:
    return (block for block in _blocks(record) if block.get("type") == "tool_use")


def _tool_results(record: dict[str, Any]) -> Iterable[dict[str, Any]]:
    return (block for block in _blocks(record) if block.get("type") == "tool_result")


def _load(path: Path) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    records: list[dict[str, Any]] = []
    violations: list[dict[str, Any]] = []
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError as exc:
        return [], [{"rule": "EV-001", "detail": f"transcript を読めない: {exc}"}]
    for line_number, line in enumerate(lines, start=1):
        if not line.strip():
            continue
        try:
            value = json.loads(line)
        except json.JSONDecodeError as exc:
            violations.append({
                "rule": "EV-002",
                "line": line_number,
                "detail": f"JSONL record が壊れている: {exc}",
            })
            continue
        if not isinstance(value, dict):
            violations.append({
                "rule": "EV-002",
                "line": line_number,
                "detail": "JSONL record が object でない",
            })
            continue
        value["_line"] = line_number
        records.append(value)
    return records, violations


def _tag(prompt: str, name: str) -> str | None:
    found = re.search(rf"<{re.escape(name)}>(.*?)</{re.escape(name)}>", prompt, re.DOTALL)
    return found.group(1).strip() if found else None


def _is_upsert_mutation(command: str) -> bool:
    """``upsert-node.py --help/-h`` の read-only CLI 参照を mutation から除外する。"""
    for found in UPSERT_EXECUTION.finditer(command):
        line_end = command.find("\n", found.start())
        line = command[found.start():line_end if line_end >= 0 else len(command)]
        if re.search(r"(?:^|\s)(?:--help|-h)(?:\s|$)", line):
            continue
        return True
    return False


def validate(records: list[dict[str, Any]]) -> dict[str, Any]:
    violations: list[dict[str, Any]] = []
    launches: list[dict[str, Any]] = []
    result_by_use_id: dict[str, tuple[int, dict[str, Any], dict[str, Any]]] = {}

    for index, record in enumerate(records):
        for result in _tool_results(record):
            use_id = result.get("tool_use_id")
            if isinstance(use_id, str):
                result_by_use_id[use_id] = (index, record, result)

    for index, record in enumerate(records):
        for tool in _tool_uses(record):
            inputs = tool.get("input")
            if tool.get("name") != "Skill" or not isinstance(inputs, dict):
                continue
            if inputs.get("skill") != EVALUATOR_SKILL:
                continue
            use_id = tool.get("id")
            launch: dict[str, Any] = {
                "tool_use_id": use_id,
                "launch_line": record.get("_line"),
                "agent_id": None,
                "completion_line": None,
            }
            result_entry = result_by_use_id.get(str(use_id))
            if result_entry is None:
                violations.append({
                    "rule": "EV-003",
                    "line": record.get("_line"),
                    "detail": "evaluator Skill 起動の tool_result が無い",
                })
            else:
                _, result_record, result_block = result_entry
                tool_result = result_record.get("toolUseResult")
                agent_id = tool_result.get("agentId") if isinstance(tool_result, dict) else None
                success = tool_result.get("success") if isinstance(tool_result, dict) else None
                background = tool_result.get("background") if isinstance(tool_result, dict) else None
                if not isinstance(agent_id, str) or not agent_id:
                    violations.append({
                        "rule": "EV-004",
                        "line": result_record.get("_line"),
                        "detail": "Skill 起動結果に完全な agentId が無い",
                    })
                elif success is not True or background is not True or result_block.get("is_error") is True:
                    violations.append({
                        "rule": "EV-005",
                        "line": result_record.get("_line"),
                        "detail": "evaluator Skill が background fork として正常起動していない",
                    })
                else:
                    launch["agent_id"] = agent_id
            launch["_index"] = index
            launches.append(launch)

    import_events: list[dict[str, Any]] = []
    stop_events: list[dict[str, Any]] = []
    outer_report_writes: list[dict[str, Any]] = []
    foreground_blocking_waits: list[dict[str, Any]] = []
    notifications: list[dict[str, Any]] = []
    task_output_attempts: list[dict[str, Any]] = []

    for index, record in enumerate(records):
        for tool in _tool_uses(record):
            name = tool.get("name")
            inputs = tool.get("input") if isinstance(tool.get("input"), dict) else {}
            rendered = json.dumps(inputs, ensure_ascii=False, sort_keys=True)
            event = {"line": record.get("_line"), "index": index, "input": inputs}
            command = inputs.get("command")
            if name == "Bash" and isinstance(command, str) and _is_upsert_mutation(command):
                import_events.append(event)
            if name == "TaskStop":
                stop_events.append(event)
            if name == "TaskOutput":
                task_output_attempts.append(event)
            if name in {"Write", "Edit"} and REPORT_NAME in rendered and not record.get("isSidechain", False):
                outer_report_writes.append(event)
            if name == "Bash" and isinstance(command, str) and not inputs.get("run_in_background", False):
                long_sleeps = [
                    float(found.group("seconds"))
                    for found in LONG_SLEEP.finditer(command)
                ]
                if LOOPING_SLEEP.search(command) or any(seconds > 30 for seconds in long_sleeps):
                    foreground_blocking_waits.append(event)

        attachment = record.get("attachment")
        if not isinstance(attachment, dict) or attachment.get("commandMode") != "task-notification":
            continue
        prompt = attachment.get("prompt")
        if not isinstance(prompt, str):
            continue
        notifications.append({
            "line": record.get("_line"),
            "index": index,
            "task_id": _tag(prompt, "task-id"),
            "tool_use_id": _tag(prompt, "tool-use-id"),
            "status": _tag(prompt, "status"),
            "summary": _tag(prompt, "summary"),
            "result": _tag(prompt, "result"),
        })

    if not launches:
        violations.append({"rule": "EV-006", "detail": "evaluator Skill 起動が 0 件"})
    if not import_events:
        violations.append({"rule": "EV-007", "detail": "upsert-node.py による C02 import が 0 件"})

    first_import = min(import_events, key=lambda item: item["index"]) if import_events else None
    for launch in launches:
        agent_id = launch.get("agent_id")
        if not isinstance(agent_id, str):
            continue
        matching = [
            item for item in notifications
            if item["task_id"] == agent_id
            and item["tool_use_id"] == launch["tool_use_id"]
            and item["status"] == "completed"
            and isinstance(item["summary"], str)
            and "Agent" in item["summary"]
            and "finished" in item["summary"]
            and isinstance(item["result"], str)
            and item["result"].strip()
        ]
        if not matching:
            violations.append({
                "rule": "EV-008",
                "line": launch["launch_line"],
                "detail": f"agentId={agent_id} の完了結果つき native task-notification が無い",
            })
            continue
        completion = min(matching, key=lambda item: item["index"])
        launch["completion_line"] = completion["line"]
        launch["_completion_index"] = completion["index"]
        if first_import and completion["index"] >= first_import["index"]:
            violations.append({
                "rule": "EV-009",
                "line": first_import["line"],
                "detail": "evaluator 完了通知より前に C02 import が始まった",
            })

    for event in stop_events:
        if any(launch["_index"] <= event["index"] for launch in launches):
            violations.append({
                "rule": "EV-010",
                "line": event["line"],
                "detail": "evaluator 起動後に TaskStop が使われた",
            })
    for event in outer_report_writes:
        violations.append({
            "rule": "EV-011",
            "line": event["line"],
            "detail": "outer session が completeness-report.json を Write/Edit した",
        })
    for event in foreground_blocking_waits:
        if not any(
            launch["_index"] <= event["index"]
            and event["index"] <= launch.get("_completion_index", len(records))
            for launch in launches
        ):
            continue
        violations.append({
            "rule": "EV-012",
            "line": event["line"],
            "detail": "evaluator 待機中に loop または30秒超の foreground sleep で native notification を塞いだ",
        })

    public_launches = [
        {key: value for key, value in launch.items() if not key.startswith("_")}
        for launch in launches
    ]
    return {
        "status": "PASS" if not violations else "FAIL",
        "evaluator_launches": public_launches,
        "first_import_line": first_import["line"] if first_import else None,
        "task_output_attempts": len(task_output_attempts),
        "task_stop_events": len(stop_events),
        "outer_report_writes": len(outer_report_writes),
        "foreground_blocking_waits": len(foreground_blocking_waits),
        "violations": violations,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--transcript", required=True, type=Path)
    args = parser.parse_args()
    records, load_violations = _load(args.transcript)
    report = validate(records)
    if load_violations:
        report["status"] = "FAIL"
        report["violations"] = load_violations + report["violations"]
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["status"] == "PASS" else 2


if __name__ == "__main__":
    sys.exit(main())
