"""scripts/lint-portability-knowledge-optin.py の genuine で網羅的な機能テスト。

qa-070 の移植チャネル opt-in 検査。仕組みのみ既定・ナレッジ同梱は明示 opt-in を
固定する。悪性 (ナレッジを opt-in なしで同梱) を検出し、良性 (plugin 名のみ /
exclude での opt-out / 明示 opt-in) を PASS させる。

カバー:
- MUST_DETECT: bundle plugins にナレッジ path / plugin.json payload にナレッジ /
  install-bundle.sh がナレッジ content-root を opt-in gate なしで参照
- MUST_PASS: 現状 baseline (plugin 名のみ) / 明示 opt-in / package.exclude の opt-out /
  description の英単語 "knowledge" (false-positive guard) / .sh コメント内の参照
- 実リポジトリ CLI 実行が exit 0 (契約テスト)

network: false, keychain: なし, 実ファイル書換: なし (tmp_path のみ)。
"""
import importlib.util
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "lint-portability-knowledge-optin.py"

SPEC = importlib.util.spec_from_file_location("lint_pko_uut", SCRIPT)
MOD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MOD)


# ── is_knowledge_ref ─────────────────────────────────────────────────────────
def test_is_knowledge_ref_true_cases():
    assert MOD.is_knowledge_ref("docs")
    assert MOD.is_knowledge_ref("system-spec/dev-workflow.md")
    assert MOD.is_knowledge_ref("eval-log/**")
    assert MOD.is_knowledge_ref(".dev-graph/state/graph.json")


def test_is_knowledge_ref_false_cases():
    assert not MOD.is_knowledge_ref("skill-intake")  # plugin 名 (仕組み)
    assert not MOD.is_knowledge_ref("plugins/harness-creator")  # 仕組み root
    assert not MOD.is_knowledge_ref("references/x.md")  # plugin 内 mechanism doc


# ── check_bundles: MUST_DETECT / MUST_PASS ──────────────────────────────────
def test_bundles_detect_knowledge_plugin_entry():
    data = {"bundles": [{"name": "b", "plugins": ["skill-intake", "system-spec/x.md"]}]}
    v = MOD.check_bundles(data)
    assert len(v) == 1 and "system-spec/x.md" in v[0]


def test_bundles_detect_knowledge_list_without_optin():
    data = {"bundles": [{"name": "b", "plugins": ["p"], "knowledge": ["docs"]}]}
    v = MOD.check_bundles(data)
    assert any("knowledge_optin" in x for x in v)


def test_bundles_pass_plugin_names_only():
    data = {"bundles": [{"name": "b", "plugins": ["skill-intake", "company-master"]}]}
    assert MOD.check_bundles(data) == []


def test_bundles_pass_explicit_optin():
    data = {"bundles": [{"name": "b", "plugins": ["p"],
                         "knowledge_optin": True, "knowledge": ["docs"]}]}
    assert MOD.check_bundles(data) == []


def test_bundles_pass_description_mentions_knowledge_word():
    # 説明文の英単語 "knowledge" は構造化 content-root ではない → 非検出。
    data = {"bundles": [{"name": "b", "description": "bundles knowledge and docs tips",
                         "plugins": ["skill-intake"]}]}
    assert MOD.check_bundles(data) == []


# ── check_plugin_manifest: MUST_DETECT / MUST_PASS ──────────────────────────
def test_manifest_detect_knowledge_in_include():
    data = {"name": "p", "package": {"include": ["skills/**", "docs/**"]}}
    v = MOD.check_plugin_manifest("plugins/p/.claude-plugin/plugin.json", data)
    assert len(v) == 1 and "docs/**" in v[0]


def test_manifest_pass_exclude_is_optout():
    # exclude にナレッジ root が載るのは opt-out (compliant) → PASS。
    data = {"name": "p", "package": {"include": ["skills/**"],
                                     "exclude": ["eval-log/**", "docs/tmp"]}}
    assert MOD.check_plugin_manifest("plugins/p/.claude-plugin/plugin.json", data) == []


def test_manifest_pass_explicit_optin():
    data = {"name": "p", "knowledge_optin": True,
            "package": {"include": ["docs/**"]}}
    assert MOD.check_plugin_manifest("plugins/p/.claude-plugin/plugin.json", data) == []


def test_manifest_pass_description_prose():
    data = {"name": "p", "description": "generates docs/foo and reads system-spec/x.md"}
    assert MOD.check_plugin_manifest("plugins/p/.claude-plugin/plugin.json", data) == []


# ── check_install_script: MUST_DETECT / MUST_PASS ───────────────────────────
def test_install_script_detect_knowledge_copy():
    sh = 'set -e\ncp -r system-spec/ "$DEST"/\n'
    v = MOD.check_install_script(sh)
    assert len(v) == 1 and "system-spec/" in v[0]


def test_install_script_pass_plugin_only_baseline():
    sh = 'python3 plugins/harness-creator/scripts/sync-native-surfaces.py --apply\n'
    assert MOD.check_install_script(sh) == []


def test_install_script_pass_comment_reference():
    sh = '# copies nothing from features/ or docs/ by default\nclaude plugin install x\n'
    assert MOD.check_install_script(sh) == []


def test_install_script_pass_with_optin_gate():
    sh = 'if [[ -n "$INCLUDE_KNOWLEDGE" ]]; then\n  cp -r docs/ "$DEST"\nfi\n'
    assert MOD.check_install_script(sh) == []


def test_install_script_detect_fake_gate_in_comment():
    sh = '# INCLUDE_KNOWLEDGE is the opt-in gate\ncp -r docs/ "$DEST"\n'
    v = MOD.check_install_script(sh)
    assert len(v) == 1 and "docs/" in v[0]


def test_install_script_detect_fake_gate_in_non_condition_code():
    # 条件構文らしい単語を含む表示文でも、行頭が echo なら gate ではない。
    sh = 'echo "if INCLUDE_KNOWLEDGE is set"\ncp -r docs/ "$DEST"\n'
    v = MOD.check_install_script(sh)
    assert len(v) == 1 and "docs/" in v[0]


# ── 実リポジトリ契約 (exit 0) ──────────────────────────────────────────────
def test_cli_real_repo_exit_zero():
    res = subprocess.run([sys.executable, str(SCRIPT), "--repo-root", str(ROOT)],
                         text=True, capture_output=True)
    assert res.returncode == 0, f"stdout={res.stdout}\nstderr={res.stderr}"


def test_cli_detects_injected_violation(tmp_path):
    (tmp_path / ".claude-plugin").mkdir()
    (tmp_path / ".claude-plugin" / "bundles.json").write_text(
        '{"bundles": [{"name": "b", "description": "d", "plugins": ["docs/security-spec.md"]}]}',
        encoding="utf-8")
    res = subprocess.run([sys.executable, str(SCRIPT), "--repo-root", str(tmp_path)],
                         text=True, capture_output=True)
    assert res.returncode == 1
    assert "portability-optin" in res.stderr
