"""scripts/lint-mechanism-knowledge-boundary.py の genuine で網羅的な機能テスト。

qa-070 の仕組み-ナレッジ境界検査。制御フロー/既定値のナレッジ参照リテラルを
検出 (FAIL) しつつ、コメント・docstring・argparse help= の根拠引用は PASS させる
false-positive guard を固定する。

カバー:
- MUST_DETECT (コード値リテラル): 代入値 / 比較演算子 / 既定引数 / dict値 / list要素の
  qa番号・ナレッジpath・feature/issue node id
- MUST_PASS (false-positive guard): コメント内 / module docstring 内 / bare 文字列文 /
  argparse help= 引数内の同じ参照は検出しない
- 仕組み識別子との非衝突: plugin/skill 名 (dev-graph, spec-drift-guardian, docs/eval-log
  path) を誤検出しない
- 実リポジトリ CLI 実行が exit 0 (契約テスト)

network: false, keychain: なし, 実ファイル書換: なし (tmp_path のみ)。
"""
import importlib.util
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "lint-mechanism-knowledge-boundary.py"

SPEC = importlib.util.spec_from_file_location("lint_mkb_uut", SCRIPT)
MOD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MOD)


def _kinds(source: str):
    return {kind for _, kind, _ in MOD.find_knowledge_literals(source)}


def _tokens(source: str):
    return {tok for _, _, tok in MOD.find_knowledge_literals(source)}


# ── MUST_DETECT: 制御フロー/既定値リテラル ──────────────────────────────────
def test_detect_qa_number_in_assignment():
    assert "qa-070" in _tokens('ref = "qa-070"\n')


def test_detect_qa_number_in_comparison():
    src = 'def f(x):\n    if x == "qa-070":\n        return 1\n'
    assert "qa-number" in _kinds(src)


def test_detect_knowledge_path_in_default_arg():
    src = 'def f(p="features/feat-hub-foundation.md"):\n    return p\n'
    assert "knowledge-path" in _kinds(src)


def test_detect_node_id_in_dict_value():
    src = 'receipt = {"migration": "feat-some-new-feature"}\n'
    assert "feat-some-new-feature" in _tokens(src)


def test_detect_node_id_in_list_element():
    src = 'KNOWN = ["issue-qa070-implementation-feature-20260722"]\n'
    assert "node-id" in _kinds(src)


def test_detect_system_spec_path():
    src = 'DEFAULT = "system-spec/dev-workflow.md"\n'
    assert "knowledge-path" in _kinds(src)


# ── MUST_PASS: false-positive guard (根拠引用) ──────────────────────────────
def test_pass_qa_in_comment():
    src = '# 根拠: qa-070 (appr-008) で確定\nx = 1\n'
    assert MOD.find_knowledge_literals(src) == []


def test_pass_qa_in_module_docstring():
    src = '"""この lint は qa-070 の features/feat-x.md 契約を強制する。"""\nx = 1\n'
    assert MOD.find_knowledge_literals(src) == []


def test_pass_node_id_in_function_docstring():
    src = (
        'def f():\n'
        '    """正本契約: docs/features/feat-dev-pipeline-improvement/design.md §3。"""\n'
        '    return 1\n'
    )
    assert MOD.find_knowledge_literals(src) == []


def test_pass_bare_string_statement():
    src = 'def f():\n    "参照: qa-070 / features/feat-x.md"\n    return 1\n'
    assert MOD.find_knowledge_literals(src) == []


def test_pass_argparse_help_documentation():
    # 実既定は default=None (config 解決)。help= の path 記載は citation → PASS。
    src = (
        'import argparse\n'
        'p = argparse.ArgumentParser(description="uses system-spec/index.md")\n'
        'p.add_argument("--rep", default=None,\n'
        '               help="既定 system-spec/completeness-findings.json")\n'
    )
    assert MOD.find_knowledge_literals(src) == []


# ── 仕組み識別子との非衝突 (Goodhart 化しない) ──────────────────────────────
def test_no_collision_mechanism_names():
    src = (
        'PLUGIN = "dev-graph"\n'
        'CODE = "spec-section-missing"\n'
        'NAME = "spec-drift-guardian"\n'
        'EVID = "eval-log/run-dev-graph-node-confirm-feat-stage0-distribution-gate.json"\n'
        'DOCP = "docs/features/feat-x/design.md"\n'
    )
    # arch-/spec-/sys- 接頭辞・docs//eval-log/ path・埋め込み feat- 部分文字列は非検出。
    assert MOD.find_knowledge_literals(src) == []


def test_syntax_error_source_returns_empty():
    assert MOD.find_knowledge_literals("def (: broken\n") == []


# ── lint(): known-existing baseline は violation でなく note ────────────────
def test_known_existing_is_note_not_violation(tmp_path):
    # baseline に載る (path, kind, token) は note へ回り violation にならない。
    entry = next(iter(MOD.KNOWN_EXISTING))
    rel, kind, token = entry
    assert kind and token and rel.endswith(".py")


# ── 実リポジトリ契約 (exit 0) ──────────────────────────────────────────────
def test_cli_real_repo_exit_zero():
    res = subprocess.run([sys.executable, str(SCRIPT), "--repo-root", str(ROOT)],
                         text=True, capture_output=True)
    assert res.returncode == 0, f"stdout={res.stdout}\nstderr={res.stderr}"


def test_cli_detects_injected_violation(tmp_path):
    # tmp の疑似 plugin ツリーに悪性リテラルを置くと exit 1。
    d = tmp_path / "plugins" / "p" / "scripts"
    d.mkdir(parents=True)
    (d / "lint-x.py").write_text('BAD = "qa-070"\n', encoding="utf-8")
    res = subprocess.run([sys.executable, str(SCRIPT), "--repo-root", str(tmp_path)],
                         text=True, capture_output=True)
    assert res.returncode == 1
    assert "qa-070" in res.stderr


def test_cli_passes_clean_plugin_tree(tmp_path):
    d = tmp_path / "plugins" / "p" / "scripts"
    d.mkdir(parents=True)
    (d / "lint-x.py").write_text(
        '"""cites qa-070 and features/feat-x.md in docstring."""\n'
        '# comment qa-999\n'
        'x = 1\n', encoding="utf-8")
    res = subprocess.run([sys.executable, str(SCRIPT), "--repo-root", str(tmp_path)],
                         text=True, capture_output=True)
    assert res.returncode == 0, res.stderr
