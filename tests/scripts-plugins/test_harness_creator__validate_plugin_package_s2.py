"""validate-plugin-package.py の PKG-006〜014 sub-check の genuine 機能テスト。

hook 実体と登録の整合 (PKG-006)・script shebang/+x (PKG-007)・settings JSON 妥当性
(PKG-008)・kind/combinator runtime contract (PKG-014) を担当する (500 行上限による分割)。

PKG-006 と PKG-007 は「hooks/ と scripts/ 配下のファイルは全て起動対象」を前提に
していたため、500 行分割で生まれた import 専用 support module を偽陽性で落としていた。
is_import_only_support_module の判別境界 (実 entry point を素通りさせない) を本ファイルで固定する。

実 repo の plugins は一切書き換えず、全 fixture は tmp_path 配下に構築する。
"""
import json
import os
import stat

from _validate_plugin_package_fixtures import (
    _full_required_fm,
    _plugin,
    _write_package_contract,
    _write_plugin_json,
    _write_skill,
    load_uut,
)

MOD = load_uut("validate_plugin_package_s2_uut")


# ============================================================================
# check_pkg_006 : hook 実体と settings/plugin.json 登録の整合
# ============================================================================

def test_pkg_006_no_hooks_dir(tmp_path):
    p = _plugin(tmp_path)
    assert MOD.check_pkg_006(p) == []


def test_pkg_006_unregistered_hook(tmp_path):
    p = _plugin(tmp_path)
    (p / "hooks").mkdir(parents=True)
    (p / "hooks" / "orphan.py").write_text("#!/usr/bin/env python3\n", encoding="utf-8")
    fs = MOD.check_pkg_006(p)
    assert len(fs) == 1
    assert "orphan.py" in fs[0]["suggested_fix"]


def test_pkg_006_registered_via_plugin_json_hooks(tmp_path):
    p = _plugin(tmp_path)
    (p / "hooks").mkdir(parents=True)
    (p / "hooks" / "guard.py").write_text("#!/usr/bin/env python3\n", encoding="utf-8")
    _write_plugin_json(p, {
        "name": "demo",
        "hooks": {
            "PreToolUse": [
                {"hooks": [{"command": "python3 ${CLAUDE_PLUGIN_ROOT}/hooks/guard.py"}]}
            ]
        },
    })
    assert MOD.check_pkg_006(p) == []


def test_pkg_006_registered_via_entry_points(tmp_path):
    p = _plugin(tmp_path)
    (p / "hooks").mkdir(parents=True)
    (p / "hooks" / "guard.py").write_text("#!/usr/bin/env python3\n", encoding="utf-8")
    _write_plugin_json(p, {
        "name": "demo",
        "entry_points": {"hooks": ["hooks/guard.py"]},
    })
    assert MOD.check_pkg_006(p) == []


def test_pkg_006_registered_via_package_contract_sidecar(tmp_path):
    p = _plugin(tmp_path)
    (p / "hooks").mkdir(parents=True)
    (p / "hooks" / "guard.py").write_text("#!/usr/bin/env python3\n", encoding="utf-8")
    _write_plugin_json(p, {
        "name": "demo",
        "version": "1.0.0",
        "description": "native manifest without harness-only keys",
    })
    _write_package_contract(p, {
        "package_mode": "bundle",
        "entry_points": {"hooks": ["guard"]},
        "distribution": {"distributable": False},
        "pkg_checks": {},
    })

    assert MOD.check_pkg_006(p) == []


def test_pkg_006_registered_via_settings(tmp_path):
    p = _plugin(tmp_path)
    (p / "hooks").mkdir(parents=True)
    (p / "hooks" / "guard.py").write_text("#!/usr/bin/env python3\n", encoding="utf-8")
    (p / "settings").mkdir(parents=True)
    (p / "settings" / "s.json").write_text(json.dumps({
        "hooks": {"PreToolUse": [{"command": "guard.py"}]}
    }), encoding="utf-8")
    assert MOD.check_pkg_006(p) == []


def test_pkg_006_plugin_json_broken_json(tmp_path):
    p = _plugin(tmp_path)
    (p / "hooks").mkdir(parents=True)
    (p / "hooks" / "guard.py").write_text("#!/usr/bin/env python3\n", encoding="utf-8")
    _write_plugin_json(p, None)  # broken JSON -> data={} -> 未登録扱い
    fs = MOD.check_pkg_006(p)
    assert len(fs) == 1


def test_pkg_006_settings_broken_json_skipped(tmp_path):
    p = _plugin(tmp_path)
    (p / "hooks").mkdir(parents=True)
    (p / "hooks" / "guard.py").write_text("#!/usr/bin/env python3\n", encoding="utf-8")
    (p / "settings").mkdir(parents=True)
    (p / "settings" / "bad.json").write_text("{broken", encoding="utf-8")
    # settings は壊れていて skip、registered 空 -> 未登録 finding
    fs = MOD.check_pkg_006(p)
    assert len(fs) == 1


def test_pkg_006_invalid_shlex_command_falls_back_to_split(tmp_path):
    p = _plugin(tmp_path)
    (p / "hooks").mkdir(parents=True)
    (p / "hooks" / "guard.py").write_text("#!/usr/bin/env python3\n", encoding="utf-8")
    # 閉じない引用符で shlex.split が ValueError -> .split() フォールバック
    _write_plugin_json(p, {
        "name": "demo",
        "hooks": {
            "PreToolUse": [
                {"hooks": [{"command": "python3 'unclosed /hooks/guard.py"}]}
            ]
        },
    })
    assert MOD.check_pkg_006(p) == []


def test_pkg_006_import_only_support_module_is_exempt(tmp_path):
    """500 行分割で hooks/ に生まれた import 専用 module は起動対象ではないので未登録でよい。"""
    p = _plugin(tmp_path)
    (p / "hooks").mkdir(parents=True)
    (p / "hooks" / "guard_commands.py").write_text(
        "\"\"\"guard 本体から import される判定関数群。\"\"\"\n\n\n"
        "def is_destructive(cmd):\n    return False\n",
        encoding="utf-8")
    assert MOD.check_pkg_006(p) == []


def test_pkg_006_underscore_hook_with_main_guard_still_fails(tmp_path):
    """underscore 名でも __main__ guard があれば実 hook なので、宣言漏れを素通りさせない。"""
    p = _plugin(tmp_path)
    (p / "hooks").mkdir(parents=True)
    (p / "hooks" / "guard_commands.py").write_text(
        "def main():\n    pass\n\n\nif __name__ == \"__main__\":\n    main()\n",
        encoding="utf-8")
    fs = MOD.check_pkg_006(p)
    assert len(fs) == 1
    assert "guard_commands.py" in fs[0]["suggested_fix"]


# ============================================================================
# is_import_only_support_module : 起動される入口かどうかの構造判定
# ============================================================================

def test_support_module_predicate_rejects_non_python(tmp_path):
    sh = tmp_path / "helper.sh"
    sh.write_text("echo hi\n", encoding="utf-8")
    assert MOD.is_import_only_support_module(sh) is False


def test_support_module_predicate_rejects_non_importable_name(tmp_path):
    py = tmp_path / "build-thing.py"
    py.write_text("x = 1\n", encoding="utf-8")
    assert MOD.is_import_only_support_module(py) is False


def test_support_module_predicate_rejects_shebang(tmp_path):
    py = tmp_path / "helper.py"
    py.write_text("#!/usr/bin/env python3\nx = 1\n", encoding="utf-8")
    assert MOD.is_import_only_support_module(py) is False


def test_support_module_predicate_accepts_import_only(tmp_path):
    py = tmp_path / "helper.py"
    py.write_text("def f():\n    return 1\n", encoding="utf-8")
    assert MOD.is_import_only_support_module(py) is True


# ============================================================================
# check_pkg_007 : script shebang / +x
# ============================================================================

def test_pkg_007_no_scripts_dir(tmp_path):
    p = _plugin(tmp_path)
    assert MOD.check_pkg_007(p) == []


def test_pkg_007_missing_shebang(tmp_path):
    """verb-hyphen 名 (import 不能 = 起動されるしかない) の shebang 欠落は従来どおり FAIL。"""
    p = _plugin(tmp_path)
    (p / "scripts").mkdir(parents=True)
    (p / "scripts" / "build-thing.py").write_text("print('hi')\n", encoding="utf-8")
    fs = MOD.check_pkg_007(p)
    assert any("shebang 欠落" in f["evidence"] for f in fs)


def test_pkg_007_underscore_module_with_main_guard_still_fails(tmp_path):
    """import 可能な名前でも __main__ guard があれば entry point なので shebang を要求する。"""
    p = _plugin(tmp_path)
    (p / "scripts").mkdir(parents=True)
    (p / "scripts" / "node_body.py").write_text(
        "def run():\n    pass\n\n\nif __name__ == \"__main__\":\n    run()\n",
        encoding="utf-8")
    fs = MOD.check_pkg_007(p)
    assert any("shebang 欠落" in f["evidence"] for f in fs)


def test_pkg_007_import_only_support_module_is_exempt(tmp_path):
    """500 行分割で生まれた import 専用 module に shebang を強要しない (偽陽性の解消)。"""
    p = _plugin(tmp_path)
    (p / "scripts").mkdir(parents=True)
    (p / "scripts" / "node_body.py").write_text(
        "\"\"\"共有ヘルパ。\"\"\"\n\n\ndef build_body(node):\n    return node\n",
        encoding="utf-8")
    assert MOD.check_pkg_007(p) == []


def test_pkg_007_shebang_but_not_executable(tmp_path):
    p = _plugin(tmp_path)
    (p / "scripts").mkdir(parents=True)
    sc = p / "scripts" / "ok.py"
    sc.write_text("#!/usr/bin/env python3\nprint('hi')\n", encoding="utf-8")
    sc.chmod(0o644)  # 実行ビットなし
    fs = MOD.check_pkg_007(p)
    assert any("実行可能ビットなし" in f["evidence"] for f in fs)
    assert any(f["auto_fixable"] for f in fs)


def test_pkg_007_shebang_and_executable_clean(tmp_path):
    p = _plugin(tmp_path)
    (p / "scripts").mkdir(parents=True)
    sc = p / "scripts" / "ok.py"
    sc.write_text("#!/usr/bin/env python3\nprint('hi')\n", encoding="utf-8")
    sc.chmod(sc.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    assert MOD.check_pkg_007(p) == []


def test_pkg_007_non_script_files_ignored(tmp_path):
    p = _plugin(tmp_path)
    (p / "scripts").mkdir(parents=True)
    (p / "scripts" / "data.txt").write_text("not a script", encoding="utf-8")
    (p / "scripts" / "subdir").mkdir()  # ディレクトリは is_file=False で無視
    assert MOD.check_pkg_007(p) == []


# ============================================================================
# check_pkg_008 : settings/*.json の $schema / JSON 妥当性
# ============================================================================

def test_pkg_008_no_settings_dir(tmp_path):
    p = _plugin(tmp_path)
    assert MOD.check_pkg_008(p) == []


def test_pkg_008_missing_schema(tmp_path):
    p = _plugin(tmp_path)
    (p / "settings").mkdir(parents=True)
    (p / "settings" / "s.json").write_text(json.dumps({"hooks": {}}), encoding="utf-8")
    fs = MOD.check_pkg_008(p)
    assert len(fs) == 1
    assert "$schema" in fs[0]["evidence"]
    assert fs[0]["severity"] == "P1"


def test_pkg_008_has_schema_clean(tmp_path):
    p = _plugin(tmp_path)
    (p / "settings").mkdir(parents=True)
    (p / "settings" / "s.json").write_text(
        json.dumps({"$schema": "x", "hooks": {}}), encoding="utf-8")
    assert MOD.check_pkg_008(p) == []


def test_pkg_008_broken_json(tmp_path):
    p = _plugin(tmp_path)
    (p / "settings").mkdir(parents=True)
    (p / "settings" / "bad.json").write_text("{broken", encoding="utf-8")
    fs = MOD.check_pkg_008(p)
    assert len(fs) == 1
    assert "JSON 解析エラー" in fs[0]["evidence"]


# ============================================================================
# check_pkg_014 : kind/combinator runtime contract
# ============================================================================

def _runtime_fm(*, kind: str = "run", combinators: str = "") -> str:
    extra = f"\ncombinators: {combinators}" if combinators else ""
    return _full_required_fm() + extra


def test_pkg_014_plain_run_without_optional_combinator_is_clean(tmp_path):
    p = _plugin(tmp_path)
    _write_skill(p, "run-demo", _runtime_fm(), body="# body")
    assert MOD.check_pkg_014(p) == []


def test_pkg_014_goal_seek_and_feedback_wiring_clean(tmp_path):
    p = _plugin(tmp_path)
    fm = _runtime_fm(combinators="[with-goal-seek, with-feedback-contract]") + (
        "\ngoal_seek:\n"
        "  engine: inline\n"
        "  fork: subagent\n"
        "  max_loops: 5\n"
        "feedback_contract:\n"
        "  max_iterations: 3\n"
        "  criteria:\n"
        "    - id: IN1\n"
        "      loop_scope: inner\n"
        "    - id: OUT1\n"
        "      loop_scope: outer"
    )
    _write_skill(p, "run-demo", fm, body="## ゴールシーク実行\nloop and stop")
    assert MOD.check_pkg_014(p) == []


def test_pkg_014_declared_goal_seek_requires_runtime_mapping_and_body(tmp_path):
    p = _plugin(tmp_path)
    _write_skill(p, "run-demo", _runtime_fm(combinators="[with-goal-seek]"))
    fs = MOD.check_pkg_014(p)
    evid = {f["evidence"] for f in fs}
    assert any("goal_seek mapping" in e for e in evid)
    assert any("ゴールシーク実行配線" in e for e in evid)


def test_pkg_014_feedback_contract_requires_inner_and_outer(tmp_path):
    p = _plugin(tmp_path)
    fm = _runtime_fm(combinators="[with-feedback-contract]") + (
        "\nfeedback_contract:\n"
        "  max_iterations: 3\n"
        "  criteria:\n"
        "    - id: IN1\n"
        "      loop_scope: inner"
    )
    _write_skill(p, "run-demo", fm)
    fs = MOD.check_pkg_014(p)
    assert any("loop_scope=outer" in f["evidence"] for f in fs)


def test_pkg_014_runtime_mapping_without_combinator_fails(tmp_path):
    p = _plugin(tmp_path)
    fm = _runtime_fm() + "\ngoal_seek:\n  engine: inline\n  fork: inline\n  max_loops: 1"
    _write_skill(p, "run-demo", fm, body="## ゴールシーク実行")
    fs = MOD.check_pkg_014(p)
    assert any("with-goal-seek combinator が未宣言" in f["evidence"] for f in fs)


def test_pkg_014_feedback_skip_reason_is_explicit_runtime_exemption(tmp_path):
    p = _plugin(tmp_path)
    fm = _runtime_fm(kind="assign") + (
        "\nfeedback_contract:\n"
        "  skip_reason: assign evaluator uses its rubric and fail-closed aggregate gate"
    )
    _write_skill(p, "assign-demo", fm)
    assert MOD.check_pkg_014(p) == []


def test_pkg_014_symlinked_compatibility_skill_is_source_owned(tmp_path):
    p = _plugin(tmp_path)
    (p / "skills").mkdir()
    source = tmp_path / "source-skill"
    source.mkdir()
    (source / "SKILL.md").write_text(
        "---\n" + _runtime_fm() + "\nfeedback_contract:\n  max_iterations: 1\n---\n",
        encoding="utf-8",
    )
    os.symlink(source, p / "skills" / "run-shared")
    assert MOD.check_pkg_014(p) == []


def test_pkg_014_unknown_combinator_fails_closed(tmp_path):
    p = _plugin(tmp_path)
    _write_skill(p, "run-demo", _runtime_fm(combinators="[with-magic]"))
    fs = MOD.check_pkg_014(p)
    assert any("未定義 combinator" in f["evidence"] for f in fs)


