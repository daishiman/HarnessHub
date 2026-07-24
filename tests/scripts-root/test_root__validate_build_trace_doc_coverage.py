"""scripts/validate-build-trace.py (doc_coverage 版) の genuine 機能テスト (network 不要)。

注意: 同名スクリプトが
  plugins/harness-creator/skills/run-build-skill/scripts/validate-build-trace.py
にも存在し (manifest 検証版)、そちらは tests/test_validate_build_trace.py /
tests/scripts-plugins/test_harness_creator__validate_build_trace.py が担保する。
本ファイルは別物である **リポジトリ root の scripts/validate-build-trace.py**
(build-trace JSON の doc_coverage 必須キー検証) を対象とし、重複しない。

検証対象の契約 (issue-build-trace-doc-coverage-schema-drift-20260723 で 3 形式化):
  1. dict 形式 (旧 B-3): doc_coverage に ch11/ch13/ch14/ch15/ch16 が全て存在し、
     値が true / "true"。欠落 or false で exit 1。
  2. list 形式 (skill-build-trace.json 実データ): 必須章 11/13/14/15/16 が存在し、
     PASS は evidence 必須、N/A は reason または evidence 必須。
  3. component trace 形式 (plugin 単位 build-evidence/*/build-trace.json):
     doc_coverage なし + components[] の id/sha256 と total/existing 整合。

網羅する分岐:
  _is_true(): bool / "true" / "True" / " TRUE " / "false" / 数値 / None
  validate(): doc_coverage 欠落 / 型違反 / 必須キー欠落 / false 値 / 全 PASS /
              list 形式の必須章・status 契約 / component trace の整合
  main(): 引数なし (exit2) / 未存在ファイル (exit2) / 不正 JSON (exit1) /
          検証失敗 (exit1) / PASS (exit0) / skill 名解決の 3 優先順位
"""
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "validate-build-trace.py"

_SPEC = importlib.util.spec_from_file_location("validate_build_trace_doccov_uut", SCRIPT)
MOD = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(MOD)


def _full_doc_coverage(**over) -> dict:
    cov = {k: True for k in MOD.REQUIRED_DOC_COVERAGE_KEYS}
    cov.update(over)
    return cov


# --- _is_true() --------------------------------------------------------------

@pytest.mark.parametrize("val", [True, "true", "True", " TRUE ", "  true\n"])
def test_is_true_truthy(val):
    assert MOD._is_true(val) is True


@pytest.mark.parametrize("val", [False, "false", "False", "yes", "1", 1, 0, None, ""])
def test_is_true_falsy(val):
    assert MOD._is_true(val) is False


# --- validate(): PASS --------------------------------------------------------

def test_validate_all_true_no_errors():
    trace = {"doc_coverage": _full_doc_coverage()}
    assert MOD.validate(trace) == []


def test_validate_string_true_accepted():
    trace = {"doc_coverage": _full_doc_coverage(
        ch11_templates="true", ch16_frontmatter_spec="True")}
    assert MOD.validate(trace) == []


def test_validate_extra_keys_ignored():
    cov = _full_doc_coverage(ch99_extra=False)  # 余分キーは必須でないので無視
    assert MOD.validate({"doc_coverage": cov}) == []


# --- validate(): doc_coverage 欠落 / 型違反 ---------------------------------

def test_validate_missing_doc_coverage():
    errs = MOD.validate({"other": 1})
    assert errs == ["missing top-level key: doc_coverage"]


def test_validate_doc_coverage_list_of_non_dicts():
    # list 形式は正当な型になったが、entry は dict でなければならない
    errs = MOD.validate({"doc_coverage": ["a", "b"]})
    assert "doc_coverage[0] must be an object/dict" in errs
    assert "doc_coverage[1] must be an object/dict" in errs
    # 必須章はどれも登録されないので missing も併記される
    assert any("missing required chapter" in e for e in errs)


def test_validate_doc_coverage_not_dict_string():
    errs = MOD.validate({"doc_coverage": "yes"})
    assert errs == ["doc_coverage must be an object/dict or a list of entries"]


def test_validate_doc_coverage_null():
    # None は "missing" 扱い (get が None -> 専用メッセージ)
    errs = MOD.validate({"doc_coverage": None})
    assert errs == ["missing top-level key: doc_coverage"]


# --- validate(): 必須キー欠落 -----------------------------------------------

def test_validate_one_key_missing():
    cov = _full_doc_coverage()
    del cov["ch13_checklists"]
    errs = MOD.validate({"doc_coverage": cov})
    assert errs == ["doc_coverage missing required key: ch13_checklists"]


def test_validate_all_keys_missing_reports_each():
    errs = MOD.validate({"doc_coverage": {}})
    assert len(errs) == len(MOD.REQUIRED_DOC_COVERAGE_KEYS)
    for key in MOD.REQUIRED_DOC_COVERAGE_KEYS:
        assert any(key in e for e in errs)


# --- validate(): false 値 ----------------------------------------------------

def test_validate_false_value_reported():
    cov = _full_doc_coverage(ch14_dynamic_injection=False)
    errs = MOD.validate({"doc_coverage": cov})
    assert errs == ["doc_coverage.ch14_dynamic_injection = False (expected true)"]


def test_validate_string_false_value_reported():
    cov = _full_doc_coverage(ch15_official_spec_checked="false")
    errs = MOD.validate({"doc_coverage": cov})
    assert len(errs) == 1
    assert "ch15_official_spec_checked" in errs[0]
    assert "expected true" in errs[0]


def test_validate_mixed_missing_and_false():
    cov = _full_doc_coverage(ch11_templates=False)
    del cov["ch16_frontmatter_spec"]
    errs = MOD.validate({"doc_coverage": cov})
    assert any("missing required key: ch16_frontmatter_spec" in e for e in errs)
    assert any("ch11_templates = False" in e for e in errs)


# --- validate(): list 形式 (skill-build-trace.json 実データ準拠) -------------

def _full_list_coverage(**over) -> list:
    docs = {
        "11": "11-templates",
        "13": "13-checklists",
        "14": "14-dynamic-context-injection",
        "15": "15-official-source-notes",
        "16": "16-official-skills-reference",
    }
    entries = []
    for ch, doc in docs.items():
        entry = {"doc": doc, "status": "PASS", "evidence": f"doc/{doc}.md → SKILL.md"}
        entry.update(over.get(ch, {}))
        entries.append(entry)
    return entries


def test_validate_list_all_pass_no_errors():
    assert MOD.validate({"doc_coverage": _full_list_coverage()}) == []


def test_validate_list_na_with_reason_accepted():
    # 実データ準拠: 15 章は「外部 Web ソース不使用」等の理由付き N/A が正当
    cov = _full_list_coverage(**{"15": {
        "status": "N/A", "evidence": None, "reason": "外部Webソースを生成入力にしないため"}})
    assert MOD.validate({"doc_coverage": cov}) == []


def test_validate_list_na_without_reason_rejected():
    cov = _full_list_coverage(**{"15": {"status": "N/A", "evidence": "", "reason": ""}})
    errs = MOD.validate({"doc_coverage": cov})
    assert len(errs) == 1
    assert "chapter 15" in errs[0]
    assert "N/A" in errs[0]


def test_validate_list_pass_without_evidence_rejected():
    cov = _full_list_coverage(**{"11": {"evidence": ""}})
    errs = MOD.validate({"doc_coverage": cov})
    assert len(errs) == 1
    assert "chapter 11" in errs[0]


def test_validate_list_fail_status_rejected():
    cov = _full_list_coverage(**{"13": {"status": "FAIL"}})
    errs = MOD.validate({"doc_coverage": cov})
    assert len(errs) == 1
    assert "chapter 13" in errs[0]
    assert "'FAIL'" in errs[0]


def test_validate_list_missing_required_chapter():
    cov = [e for e in _full_list_coverage() if not e["doc"].startswith("14-")]
    errs = MOD.validate({"doc_coverage": cov})
    assert errs == [
        "doc_coverage missing required chapter 14 (ch14_dynamic_injection)"
    ]


def test_validate_list_entry_without_doc_key():
    cov = _full_list_coverage() + [{"status": "PASS", "evidence": "x"}]
    errs = MOD.validate({"doc_coverage": cov})
    assert errs == ["doc_coverage[5] missing required key: doc"]


def test_validate_list_extra_chapters_ignored():
    cov = _full_list_coverage() + [
        {"doc": "35-meta-harness-feedback-loop", "status": "N/A", "reason": "未配線"}
    ]
    assert MOD.validate({"doc_coverage": cov}) == []


def test_validate_list_empty_reports_all_required():
    errs = MOD.validate({"doc_coverage": []})
    assert len(errs) == len(MOD.REQUIRED_DOC_CHAPTERS)
    for legacy_key in MOD.REQUIRED_DOC_CHAPTERS.values():
        assert any(legacy_key in e for e in errs)


# --- validate(): component trace 形式 (plugin 単位 build-evidence) -----------

def _component_trace(n=2, **over) -> dict:
    trace = {
        "schema_version": "1",
        "source": "graph",
        "components": [
            {"id": f"C{i:02d}", "kind": "script", "sha256": f"sha256:{i:064x}"}
            for i in range(1, n + 1)
        ],
        "components_total": n,
        "components_existing": n,
    }
    trace.update(over)
    return trace


def test_validate_component_trace_pass():
    assert MOD.validate(_component_trace()) == []


def test_validate_component_trace_total_mismatch():
    errs = MOD.validate(_component_trace(components_total=5))
    assert any("components_total" in e for e in errs)


def test_validate_component_trace_existing_exceeds_total():
    errs = MOD.validate(_component_trace(components_existing=99))
    assert any("components_existing" in e for e in errs)


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("components_total", -1),
        ("components_total", "2"),
        ("components_total", True),
        ("components_existing", -1),
        ("components_existing", "2"),
        ("components_existing", False),
    ],
)
def test_validate_component_trace_counts_require_non_negative_integers(field, value):
    errs = MOD.validate(_component_trace(**{field: value}))
    assert f"{field} must be a non-negative integer" in errs


def test_validate_component_trace_entry_missing_sha256():
    trace = _component_trace()
    del trace["components"][1]["sha256"]
    errs = MOD.validate(trace)
    assert errs == ["components[1] missing required key: sha256"]


def test_validate_component_trace_empty_components():
    errs = MOD.validate({"components": []})
    assert errs == ["components must be a non-empty list"]


def test_validate_component_trace_counts_optional():
    # ubm-goal-setting 実データ準拠: total/existing 欠落でも components が健全なら PASS
    trace = _component_trace()
    del trace["components_total"]
    del trace["components_existing"]
    assert MOD.validate(trace) == []


# --- CLI (main): subprocess で returncode + 出力契約 ------------------------

def _run(*args):
    return subprocess.run(
        [sys.executable, str(SCRIPT), *args], capture_output=True, text=True
    )


def test_cli_no_args_exit2():
    proc = _run()
    assert proc.returncode == 2
    assert "usage" in proc.stderr


def test_cli_missing_file_exit2(tmp_path):
    proc = _run(str(tmp_path / "absent.json"))
    assert proc.returncode == 2
    assert "not found" in proc.stderr


def test_cli_invalid_json_exit1(tmp_path):
    f = tmp_path / "trace.json"
    f.write_text("{not valid json", encoding="utf-8")
    proc = _run(str(f))
    assert proc.returncode == 1
    assert "JSON parse error" in proc.stderr


def test_cli_validation_fail_exit1(tmp_path):
    f = tmp_path / "trace.json"
    cov = _full_doc_coverage(ch14_dynamic_injection=False)
    f.write_text(json.dumps({"doc_coverage": cov}), encoding="utf-8")
    proc = _run(str(f))
    assert proc.returncode == 1
    assert "ch14_dynamic_injection" in proc.stderr


def test_cli_missing_doc_coverage_exit1(tmp_path):
    f = tmp_path / "trace.json"
    f.write_text(json.dumps({"nothing": True}), encoding="utf-8")
    proc = _run(str(f))
    assert proc.returncode == 1
    assert "missing top-level key: doc_coverage" in proc.stderr


def test_cli_pass_exit0_uses_skill_field(tmp_path):
    f = tmp_path / "trace.json"
    f.write_text(
        json.dumps({"skill": "run-demo", "doc_coverage": _full_doc_coverage()}),
        encoding="utf-8",
    )
    proc = _run(str(f))
    assert proc.returncode == 0
    assert "ok: run-demo doc_coverage PASS" in proc.stdout


def test_cli_pass_falls_back_to_name_field(tmp_path):
    f = tmp_path / "trace.json"
    f.write_text(
        json.dumps({"name": "run-named", "doc_coverage": _full_doc_coverage()}),
        encoding="utf-8",
    )
    proc = _run(str(f))
    assert proc.returncode == 0
    assert "ok: run-named doc_coverage PASS" in proc.stdout


def test_cli_pass_falls_back_to_stem(tmp_path):
    f = tmp_path / "my-trace-stem.json"
    f.write_text(json.dumps({"doc_coverage": _full_doc_coverage()}), encoding="utf-8")
    proc = _run(str(f))
    assert proc.returncode == 0
    assert "ok: my-trace-stem doc_coverage PASS" in proc.stdout


# --- main() を in-process でも駆動し net line を確実に計上 -------------------

def test_main_inprocess_pass(tmp_path, monkeypatch, capsys):
    f = tmp_path / "trace.json"
    f.write_text(json.dumps({"doc_coverage": _full_doc_coverage()}), encoding="utf-8")
    monkeypatch.setattr(sys, "argv", ["validate-build-trace.py", str(f)])
    assert MOD.main() == 0
    assert "doc_coverage PASS" in capsys.readouterr().out


def test_main_inprocess_no_args(monkeypatch, capsys):
    monkeypatch.setattr(sys, "argv", ["validate-build-trace.py"])
    assert MOD.main() == 2
    assert "usage" in capsys.readouterr().err


def test_main_inprocess_missing_file(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(sys, "argv", ["validate-build-trace.py", str(tmp_path / "x.json")])
    assert MOD.main() == 2
    assert "not found" in capsys.readouterr().err


def test_main_inprocess_invalid_json(tmp_path, monkeypatch, capsys):
    f = tmp_path / "bad.json"
    f.write_text("{bad", encoding="utf-8")
    monkeypatch.setattr(sys, "argv", ["validate-build-trace.py", str(f)])
    assert MOD.main() == 1
    assert "JSON parse error" in capsys.readouterr().err


def test_main_inprocess_validation_fail(tmp_path, monkeypatch, capsys):
    f = tmp_path / "fail.json"
    f.write_text(json.dumps({"doc_coverage": {}}), encoding="utf-8")
    monkeypatch.setattr(sys, "argv", ["validate-build-trace.py", str(f)])
    assert MOD.main() == 1
    assert "missing required key" in capsys.readouterr().err


# --- CLI: list / component trace 形式 ----------------------------------------

def test_cli_list_format_pass_exit0(tmp_path):
    f = tmp_path / "skill-build-trace.json"
    f.write_text(
        json.dumps({"skill_name": "run-demo", "doc_coverage": _full_list_coverage()}),
        encoding="utf-8",
    )
    proc = _run(str(f))
    assert proc.returncode == 0
    assert "doc_coverage PASS" in proc.stdout


def test_cli_component_trace_pass_exit0(tmp_path):
    f = tmp_path / "build-trace.json"
    f.write_text(json.dumps(_component_trace()), encoding="utf-8")
    proc = _run(str(f))
    assert proc.returncode == 0
    assert "component trace PASS" in proc.stdout


def test_cli_component_trace_fail_exit1(tmp_path):
    f = tmp_path / "build-trace.json"
    f.write_text(json.dumps(_component_trace(components_total=9)), encoding="utf-8")
    proc = _run(str(f))
    assert proc.returncode == 1
    assert "components_total" in proc.stderr


# --- 統合スモーク: リポジトリ実証跡が exit 0 になること (REG-001 gate 再現) --

def _repo_traces() -> list:
    traces = sorted(ROOT.glob("eval-log/**/skill-build-trace.json"))
    traces += sorted(ROOT.glob("eval-log/*/_plugin/build-evidence/*/build-trace.json"))
    return traces


def test_repo_evidence_traces_pass():
    traces = _repo_traces()
    if not traces:
        pytest.skip("eval-log に build trace 実データが無い環境")
    for trace_path in traces:
        proc = _run(str(trace_path))
        assert proc.returncode == 0, (
            f"{trace_path.relative_to(ROOT)} should PASS but: {proc.stderr}"
        )
