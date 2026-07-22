"""auto-record-lesson.py が索引へ append するエントリが KL-002 を満たすことを実証する。

自動記録は「未 triage でも索引として成立する」ことが前提であり、必須フィールドを
欠いたまま append すると governance-check の lint-knowledge-loop --strict が
auto 追記のたびに赤化する (2026-07-21 に lessons-index_009 で実際に発生)。
必須集合は lint 側の定数を直接読み、テストが独自に写経した集合とずれないようにする。
"""
import importlib.util
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "plugins" / "harness-creator" / "skills" / "run-build-skill" / "scripts"


def _load(filename: str, name: str):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / filename)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


RECORDER = _load("auto-record-lesson.py", "auto_record_lesson_schema")
LINT = _load("lint-knowledge-loop.py", "lint_knowledge_loop_schema")

ENTRY = {
    "date": "2026-07-21",
    "trigger_event": "PostToolUse",
    "tool": "Skill",
    "severity": "medium",
    "capability": "skill-invoke",
    "observation": "| FM-005 | low (-3) | FAIL |",
}


def _append(tmp_path: Path) -> dict:
    index = tmp_path / "knowledge" / "knowledge-lessons-index.json"
    lesson = tmp_path / "lessons-learned" / "2026-07-21-posttooluse-skill-x.md"
    lesson.parent.mkdir(parents=True, exist_ok=True)
    lesson.write_text("# lesson", encoding="utf-8")
    assert RECORDER._append_index_entry(index, lesson, dict(ENTRY)) is True
    return json.loads(index.read_text(encoding="utf-8"))["items"][-1]


def test_appended_entry_satisfies_kl002_required_fields(tmp_path):
    item = _append(tmp_path)
    keys = set(item)
    assert LINT.REQUIRED_ENTRY_ALWAYS.issubset(keys)
    assert LINT.REQUIRED_ENTRY_TITLE & keys
    assert LINT.REQUIRED_ENTRY_INTENT & keys
    assert LINT.REQUIRED_ENTRY_KW & keys


def test_appended_entry_carries_detection_context(tmp_path):
    item = _append(tmp_path)
    # background は「何を検知したか」を残す。空の定型文だけでは triage の入力にならない。
    assert ENTRY["observation"][:20] in item["background"]
    assert ENTRY["trigger_event"] in item["background"] and ENTRY["tool"] in item["background"]
    assert item["intent"].strip()


def test_same_source_file_is_not_appended_twice(tmp_path):
    index = tmp_path / "knowledge" / "knowledge-lessons-index.json"
    lesson = tmp_path / "lessons-learned" / "2026-07-21-posttooluse-skill-x.md"
    lesson.parent.mkdir(parents=True, exist_ok=True)
    lesson.write_text("# lesson", encoding="utf-8")
    assert RECORDER._append_index_entry(index, lesson, dict(ENTRY)) is True
    assert RECORDER._append_index_entry(index, lesson, dict(ENTRY)) is False
    assert len(json.loads(index.read_text(encoding="utf-8"))["items"]) == 1
