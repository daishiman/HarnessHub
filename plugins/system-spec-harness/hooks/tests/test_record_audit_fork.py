#!/usr/bin/env python3
"""record-audit-fork hook の回帰テスト。

## テスト戦略

本 hook は「保護」ではなく「証跡」の層なので、固定すべき契約は 3 つ:

1. **記録の担保**: 本 plugin 同梱 agent への subagent 起動 (`Task`/`Agent`) は台帳へ 1 行追記される。この行が
   `aggregate-completeness.py` の帰属検証の唯一の裏取り材料なので、落とすと fail-closed で
   評価ゲートが通らなくなる (= 緑にはならないが、正当な実行まで止まる)。
2. **記録対象の限定**: 無関係な Task / 非 Task / 未知の subagent_type は記録しない。
   台帳の肥大化と、他 plugin の agent 名で帰属を偽装する経路を断つ。
3. **非 blocking**: 観測専用なので、payload が壊れていても台帳が書けなくても exit 0 を返し
   session を止めない (証跡の欠落は下流が fail-closed で拾う)。

実行: python3 -m unittest discover plugins/system-spec-harness/hooks/tests
"""
from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

_HOOK_PATH = Path(__file__).resolve().parents[1] / "record-audit-fork.py"
_spec = importlib.util.spec_from_file_location("record_audit_fork", _HOOK_PATH)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)

_PLUGIN_ROOT = Path(__file__).resolve().parents[2]
_MATRIX_AUDITOR = "system-spec-matrix-auditor"
_HEARING_AUDITOR = "system-spec-hearing-auditor"
_DOC_AUDITOR = "system-spec-doc-freshness-auditor"


def _payload(subagent_type: str, tool_name: str = "Task", prompt: str = "監査してください") -> dict:
    return {
        "session_id": "sess-1",
        "cwd": "/tmp/project",
        "tool_name": tool_name,
        "tool_input": {"subagent_type": subagent_type, "prompt": prompt},
        "tool_response": {"success": True},
    }


class AuditAgentRegistryTest(unittest.TestCase):
    """記録対象は plugin 同梱 agent のレジストリに自動追従する。"""

    def test_shipped_auditors_are_registered(self):
        agents = hook.audit_agents(_PLUGIN_ROOT)
        for name in (_MATRIX_AUDITOR, _HEARING_AUDITOR, _DOC_AUDITOR):
            self.assertIn(name, agents, f"{name} が agents/ レジストリに無い")

    def test_missing_agents_dir_is_empty_not_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertEqual(hook.audit_agents(Path(tmp)), set())


class BuildRecordTest(unittest.TestCase):
    KNOWN = {_MATRIX_AUDITOR, _HEARING_AUDITOR, _DOC_AUDITOR}

    def test_records_known_auditor_fork(self):
        rec = hook.build_record(_payload(_MATRIX_AUDITOR), self.KNOWN)
        self.assertIsNotNone(rec)
        self.assertEqual(rec["tool_name"], "Task")
        self.assertEqual(rec["subagent_type"], _MATRIX_AUDITOR)
        self.assertEqual(rec["session_id"], "sess-1")
        self.assertEqual(rec["schema_version"], hook.SCHEMA_VERSION)
        self.assertTrue(rec["ts"].endswith("Z"))
        self.assertEqual(len(rec["prompt_sha256"]), 64)

    def test_records_agent_tool_fork_with_observed_name(self):
        """現行ハーネスの起動ツール名 'Agent' も記録対象。台帳へは観測名をそのまま書く
        (正規化しない = 証跡は harness の観測事実。issue: HarnessHub-scl)。"""
        rec = hook.build_record(_payload(_MATRIX_AUDITOR, tool_name="Agent"), self.KNOWN)
        self.assertIsNotNone(rec)
        self.assertEqual(rec["tool_name"], "Agent")
        self.assertEqual(rec["subagent_type"], _MATRIX_AUDITOR)

    def test_records_plugin_qualified_auditor_fork_as_local_stem(self):
        """live-trial の実 payload は ``plugin:agent``。ledger は consumer 契約の stem へ揃える。"""
        rec = hook.build_record(
            _payload(f"{hook.PLUGIN_NAME}:{_MATRIX_AUDITOR}"), self.KNOWN
        )
        self.assertIsNotNone(rec)
        self.assertEqual(rec["subagent_type"], _MATRIX_AUDITOR)

    def test_other_plugin_qualified_auditor_is_not_recorded(self):
        self.assertIsNone(
            hook.build_record(_payload(f"other-plugin:{_MATRIX_AUDITOR}"), self.KNOWN)
        )

    def test_prompt_body_is_not_recorded(self):
        rec = hook.build_record(_payload(_MATRIX_AUDITOR, prompt="機微な本文"), self.KNOWN)
        self.assertNotIn("機微な本文", json.dumps(rec, ensure_ascii=False))

    def test_unknown_subagent_type_is_not_recorded(self):
        # 他 plugin の agent 名で帰属を偽装する経路を断つ。
        self.assertIsNone(hook.build_record(_payload("general-purpose"), self.KNOWN))

    def test_non_subagent_tool_is_not_recorded(self):
        for tool_name in ("Bash", "Skill", "TaskCreate", ""):
            self.assertIsNone(
                hook.build_record(_payload(_MATRIX_AUDITOR, tool_name=tool_name), self.KNOWN),
                f"tool_name={tool_name!r} が記録された",
            )

    def test_missing_subagent_type_is_not_recorded(self):
        payload = {"tool_name": "Task", "tool_input": {"prompt": "x"}}
        self.assertIsNone(hook.build_record(payload, self.KNOWN))

    def test_malformed_tool_input_is_not_recorded(self):
        self.assertIsNone(hook.build_record({"tool_name": "Task", "tool_input": "oops"}, self.KNOWN))

    def test_empty_payload_is_not_recorded(self):
        self.assertIsNone(hook.build_record({}, self.KNOWN))


class LedgerPathTest(unittest.TestCase):
    def test_env_override_wins(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "custom.jsonl"
            os.environ[hook.LEDGER_ENV] = str(target)
            try:
                self.assertEqual(hook.ledger_path(), target)
            finally:
                del os.environ[hook.LEDGER_ENV]

    def test_project_dir_relative_default(self):
        with tempfile.TemporaryDirectory() as tmp:
            os.environ.pop(hook.LEDGER_ENV, None)
            os.environ["CLAUDE_PROJECT_DIR"] = tmp
            try:
                self.assertEqual(hook.ledger_path(), Path(tmp) / hook.LEDGER_RELPATH)
            finally:
                del os.environ["CLAUDE_PROJECT_DIR"]


class EndToEndTest(unittest.TestCase):
    """実 hook プロセスを stdin 経由で起動し、台帳追記と exit 0 を固定する。"""

    def _run(self, payload: dict, ledger: Path) -> subprocess.CompletedProcess:
        env = dict(os.environ)
        env[hook.LEDGER_ENV] = str(ledger)
        env["CLAUDE_PLUGIN_ROOT"] = str(_PLUGIN_ROOT)
        return subprocess.run(
            [sys.executable, str(_HOOK_PATH)],
            input=json.dumps(payload, ensure_ascii=False),
            text=True,
            capture_output=True,
            env=env,
            check=False,
        )

    def test_append_only_accumulates_forks(self):
        with tempfile.TemporaryDirectory() as tmp:
            ledger = Path(tmp) / "nested" / "audit-fork-ledger.jsonl"
            for name in (_MATRIX_AUDITOR, _HEARING_AUDITOR, _DOC_AUDITOR):
                # pinned plugin を使う live-trial と同じ qualified payload を固定する。
                proc = self._run(_payload(f"{hook.PLUGIN_NAME}:{name}"), ledger)
                self.assertEqual(proc.returncode, 0, proc.stderr)
            lines = [json.loads(x) for x in ledger.read_text(encoding="utf-8").splitlines() if x.strip()]
            self.assertEqual([r["subagent_type"] for r in lines], [_MATRIX_AUDITOR, _HEARING_AUDITOR, _DOC_AUDITOR])

    def test_agent_tool_fork_lands_in_ledger(self):
        """現行ハーネス ('Agent') 経由の実 fork が end-to-end で台帳に残ること (issue: HarnessHub-scl の再発防止)。"""
        with tempfile.TemporaryDirectory() as tmp:
            ledger = Path(tmp) / "audit-fork-ledger.jsonl"
            proc = self._run(_payload(f"{hook.PLUGIN_NAME}:{_HEARING_AUDITOR}", tool_name="Agent"), ledger)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            lines = [json.loads(x) for x in ledger.read_text(encoding="utf-8").splitlines() if x.strip()]
            self.assertEqual(len(lines), 1)
            self.assertEqual(lines[0]["tool_name"], "Agent")
            self.assertEqual(lines[0]["subagent_type"], _HEARING_AUDITOR)

    def test_unrelated_task_leaves_no_ledger(self):
        with tempfile.TemporaryDirectory() as tmp:
            ledger = Path(tmp) / "audit-fork-ledger.jsonl"
            proc = self._run(_payload("general-purpose"), ledger)
            self.assertEqual(proc.returncode, 0)
            self.assertFalse(ledger.exists(), "記録対象外の Task で台帳が生成された")

    def test_broken_payload_is_non_blocking(self):
        with tempfile.TemporaryDirectory() as tmp:
            ledger = Path(tmp) / "audit-fork-ledger.jsonl"
            env = dict(os.environ)
            env[hook.LEDGER_ENV] = str(ledger)
            proc = subprocess.run(
                [sys.executable, str(_HOOK_PATH)],
                input="{not json",
                text=True,
                capture_output=True,
                env=env,
                check=False,
            )
            self.assertEqual(proc.returncode, 0, "観測専用 hook が session を blocking した")


if __name__ == "__main__":
    unittest.main()
