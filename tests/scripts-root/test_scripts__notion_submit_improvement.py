"""run-skill-feedback の Notion 投入境界をネットワーク無しで固定する。"""

import importlib.util
import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "notion-submit-improvement.py"
SKILL = ROOT / "plugins" / "harness-creator" / "skills" / "run-skill-feedback" / "SKILL.md"
MANIFEST = SKILL.parent / "workflow-manifest.json"


def _load():
    spec = importlib.util.spec_from_file_location("notion_submit_improvement", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


def _argv(*extra: str) -> list[str]:
    return [
        "notion-submit-improvement.py",
        "--title",
        "title",
        "--plugin",
        "sample-plugin",
        "--type",
        "バグ",
        "--desire",
        "fix it",
        *extra,
    ]


def test_dry_run_only_prints_payload(monkeypatch, capsys):
    mod = _load()
    monkeypatch.setattr(
        mod.notion_config,
        "require_or_skip",
        lambda *_a, **_kw: pytest.fail("dry-run で Notion 設定を解決してはいけない"),
    )
    monkeypatch.setattr(sys, "argv", _argv("--dry-run"))

    mod.main()

    payload = json.loads(capsys.readouterr().out)
    assert payload["plugin"] == "sample-plugin"
    assert payload["dry_run"] is True


def test_unregistered_plugin_reports_canonical_recovery_command(monkeypatch, capsys):
    mod = _load()
    monkeypatch.setattr(
        mod.notion_config,
        "require_or_skip",
        lambda *_a: ({"configured": True}, "secret-token"),
    )
    monkeypatch.setattr(mod.notion_config, "get_db_id", lambda key: f"{key}-db")
    monkeypatch.setattr(mod, "find_plugin_page", lambda *_a: None)
    monkeypatch.setattr(sys, "argv", _argv())

    with pytest.raises(SystemExit) as exc:
        mod.main()

    assert exc.value.code == 2
    output = capsys.readouterr().out
    assert "python3 scripts/notion-upsert-plugin.py --plugin 'sample-plugin'" in output
    assert "secret-token" not in output


@pytest.mark.parametrize("missing_key", ["skill-list", "improvement-request"])
def test_missing_required_db_id_fails_closed(monkeypatch, capsys, missing_key):
    mod = _load()
    monkeypatch.setattr(
        mod.notion_config,
        "require_or_skip",
        lambda *_a: ({"configured": True}, "secret-token"),
    )
    monkeypatch.setattr(
        mod.notion_config,
        "get_db_id",
        lambda key: None if key == missing_key else f"{key}-db",
    )
    monkeypatch.setattr(
        mod,
        "find_plugin_page",
        lambda *_a: pytest.fail("DB ID 不足時に Notion を参照してはいけない"),
    )
    monkeypatch.setattr(sys, "argv", _argv())

    with pytest.raises(SystemExit) as exc:
        mod.main()

    assert exc.value.code == 2
    error = capsys.readouterr().err
    assert missing_key in error
    assert "secret-token" not in error


def test_created_record_prints_notion_page_url(monkeypatch, capsys):
    mod = _load()
    monkeypatch.setattr(
        mod.notion_config,
        "require_or_skip",
        lambda *_a: ({"configured": True}, "secret-token"),
    )
    monkeypatch.setattr(mod.notion_config, "get_db_id", lambda key: f"{key}-db")
    monkeypatch.setattr(mod, "find_plugin_page", lambda *_a: "plugin-page-id")
    monkeypatch.setattr(
        mod,
        "curl",
        lambda *_a, **_kw: (
            200,
            {
                "id": "01234567-89ab-cdef-0123-456789abcdef",
                "url": "https://www.notion.so/example-page",
            },
        ),
    )
    monkeypatch.setattr(sys, "argv", _argv())

    mod.main()

    output = capsys.readouterr().out
    assert "https://www.notion.so/example-page" in output
    assert "secret-token" not in output


def test_manifest_models_registration_check_inside_submit():
    phases = json.loads(MANIFEST.read_text(encoding="utf-8"))["phases"]
    by_id = {phase["id"]: phase for phase in phases}

    assert "verify-plugin" not in by_id
    assert by_id["submit"]["dependsOn"] == ["collect"]
    assert "find_plugin_page" in by_id["submit"]["title"]
    assert by_id["submit"]["output_artifact"] == "Notion page URL"


def test_token_and_db_resolution_order_has_one_documentation_ssot():
    skill = SKILL.read_text(encoding="utf-8")

    assert skill.count("設定/認証の解決順 (SSOT)") == 1
    assert skill.count("NOTION_CONFIG_PATH` > repo-root") == 1
    assert "CLI > env > per-repo" not in skill
    assert "CLI > env > `.notion-config.json`" not in skill


def test_skill_scan_instruction_uses_declared_tools():
    skill = SKILL.read_text(encoding="utf-8")

    assert "`Glob` で `plugins/*/skills/*/SKILL.md`" in skill
    assert "`Read` して候補一覧" in skill
    assert "`Read` で `plugins/<plugin>/skills/<skill_name>/SKILL.md`" in skill
    assert "grep -r --include=\"SKILL.md\"" not in skill
    assert "cat plugins/<plugin>/skills/<skill_name>/SKILL.md" not in skill


def test_goal_seek_wiring_uses_explicit_inline_engine_and_separate_state_files():
    skill = SKILL.read_text(encoding="utf-8")

    assert "goal_seek:\n  engine: inline" in skill
    assert "  progress: eval-log/run-skill-feedback-progress.json" in skill
    assert "  intermediate: eval-log/run-skill-feedback-intermediate.jsonl" in skill
    assert "  fork: subagent" in skill
    assert "ループ本体は常に `Agent` で SubAgent へ fork" in skill
    assert "1 周回 1 item 制約は適用しない" in skill
