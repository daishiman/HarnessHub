"""validate-plugin-package.py の run_checks と main (CLI) の genuine 機能テスト。

package_mode ごとの not_applicable 分岐 (run_checks)、subprocess 起動での exit code /
JSON 出力 / 引数エラー (--check 不正・plugin 不在)、および sys.argv monkeypatch による
main() 本体行の直接カバーを担当する (500 行上限による分割)。

sub-check 単体の検証は test_harness_creator__validate_plugin_package.py (純関数・PKG-002〜005)
と test_harness_creator__validate_plugin_package_s2.py (PKG-006〜014) が担当する。
network/keychain は一切叩かない。

実 repo の plugins は一切書き換えず、全 fixture は tmp_path 配下に構築する。
"""
import json
import os
import subprocess
import sys
from pathlib import Path

from _validate_plugin_package_fixtures import (
    SCRIPT,
    _full_required_fm,
    _plugin,
    _write_package_contract,
    _write_plugin_json,
    _write_skill,
    load_uut,
)

MOD = load_uut("validate_plugin_package_cli_uut")


# ============================================================================
# run_checks : package_mode と not_applicable 分岐
# ============================================================================

def test_run_checks_skill_only_na(tmp_path):
    p = _plugin(tmp_path, "demo")
    _write_plugin_json(p, {"name": "demo"})  # package_mode 無し -> skill-only
    result = MOD.run_checks(p, MOD.PKG_IDS)
    # skill-only では NA_FOR_SKILL_ONLY は not_applicable
    for pid in MOD.NA_FOR_SKILL_ONLY:
        assert result["pkg_checks"][pid]["status"] == "not_applicable"
        assert "skip_reason" in result["pkg_checks"][pid]
    # PKG-002/004 は実走
    assert result["pkg_checks"]["PKG-002"]["status"] in ("pass", "fail")
    assert result["verdict"]["total"] == 8
    assert result["verdict"]["not_applicable"] == 6


def test_run_checks_plugin_mode_runs_all(tmp_path):
    p = _plugin(tmp_path, "demo")
    _write_plugin_json(p, {
        "name": "demo", "version": "1", "package_mode": "plugin",
        "description": "d", "entry_points": {},
    })
    _write_skill(p, "sk", _full_required_fm())
    result = MOD.run_checks(p, MOD.PKG_IDS)
    # plugin mode では全 check が pass/fail (not_applicable は出ない)
    for pid in MOD.PKG_IDS:
        assert result["pkg_checks"][pid]["status"] in ("pass", "fail")
    assert result["package_mode"] == "plugin"
    assert result["target_plugin"] == "demo"
    assert "run_id" in result


def test_run_checks_single_id(tmp_path):
    p = _plugin(tmp_path, "demo")
    _write_plugin_json(p, {k: "v" for k in MOD.PLUGIN_JSON_REQUIRED})
    _write_package_contract(p)
    result = MOD.run_checks(p, ["PKG-002"])
    assert result["verdict"]["total"] == 1
    assert result["pkg_checks"]["PKG-002"]["status"] == "pass"


# ============================================================================
# main : subprocess で exit code / 出力 / 引数エラー
# ============================================================================

def _make_plugins_root(tmp_path, name="demo", mode="plugin") -> Path:
    root = tmp_path / "plugins"
    p = _plugin(root, name)
    pj = {"name": name, "version": "1", "description": "d", "entry_points": {}}
    if mode:
        pj["package_mode"] = mode
    _write_plugin_json(p, pj)
    _write_package_contract(p, {"package_mode": mode or "plugin", "entry_points": {}})
    return root


def _run_cli(args: list[str]) -> subprocess.CompletedProcess:
    env = dict(os.environ)
    return subprocess.run(
        [sys.executable, str(SCRIPT), *args],
        capture_output=True, text=True, timeout=120, env=env,
    )


def test_main_plugin_not_found(tmp_path):
    root = _make_plugins_root(tmp_path)
    proc = _run_cli(["--plugin", "nope", "--plugins-root", str(root)])
    assert proc.returncode == 2
    assert "plugin not found" in proc.stderr


def test_main_unsupported_check(tmp_path):
    root = _make_plugins_root(tmp_path)
    proc = _run_cli(["--plugin", "demo", "--plugins-root", str(root),
                     "--check", "pkg-999"])
    assert proc.returncode == 2
    assert "unsupported --check value" in proc.stderr


def test_main_clean_plugin_exit0(tmp_path):
    """全 check pass する完全な plugin -> exit 0、JSON 出力。"""
    root = tmp_path / "plugins"
    p = _plugin(root, "demo")
    _write_plugin_json(p, {
        "name": "demo", "version": "1", "package_mode": "plugin",
        "description": "d", "entry_points": {},
    })
    _write_package_contract(p)
    _write_skill(p, "sk", _full_required_fm())
    proc = _run_cli(["--plugin", "demo", "--plugins-root", str(root)])
    assert proc.returncode == 0, proc.stderr
    out = json.loads(proc.stdout)
    assert out["target_plugin"] == "demo"
    assert out["verdict"]["fail"] == 0


def test_main_plugin_dir_exit0_without_plugins_root(tmp_path):
    """marketplace 単独 install では --plugin-dir だけで検査対象を解決する。"""
    p = _plugin(tmp_path / "anywhere" / "harness-creator", "demo")
    _write_plugin_json(p, {
        "name": "demo", "version": "1", "package_mode": "plugin",
        "description": "d", "entry_points": {},
    })
    _write_package_contract(p)
    _write_skill(p, "sk", _full_required_fm())
    proc = _run_cli(["--plugin-dir", str(p)])
    assert proc.returncode == 0, proc.stderr
    out = json.loads(proc.stdout)
    assert out["target_plugin"] == "demo"


def test_main_uses_claude_plugin_root_when_no_plugin_arg(tmp_path):
    p = _plugin(tmp_path / "marketplace-cache", "harness-creator")
    _write_plugin_json(p, {
        "name": "harness-creator", "version": "1", "package_mode": "plugin",
        "description": "d", "entry_points": {},
    })
    _write_package_contract(p)
    _write_skill(p, "sk", _full_required_fm())
    env = dict(os.environ)
    env["CLAUDE_PLUGIN_ROOT"] = str(p)
    proc = subprocess.run(
        [sys.executable, str(SCRIPT)],
        capture_output=True, text=True, timeout=120, env=env,
    )
    assert proc.returncode == 0, proc.stderr
    out = json.loads(proc.stdout)
    assert out["target_plugin"] == "harness-creator"


def test_main_failing_plugin_exit1(tmp_path):
    """PKG-002 必須キー欠落 -> fail -> exit 1。"""
    root = tmp_path / "plugins"
    p = _plugin(root, "demo")
    # package_mode は plugin にして全 check 走らせるが必須キー欠落で fail
    _write_plugin_json(p, {"name": "demo", "package_mode": "plugin"})
    proc = _run_cli(["--plugin", "demo", "--plugins-root", str(root)])
    assert proc.returncode == 1
    out = json.loads(proc.stdout)
    assert out["verdict"]["fail"] >= 1


def test_main_check_single_normalization(tmp_path):
    """--check 002 (PKG- 接頭辞なし) -> PKG-002 へ正規化されて走る。"""
    root = _make_plugins_root(tmp_path)
    proc = _run_cli(["--plugin", "demo", "--plugins-root", str(root), "--check", "002"])
    assert proc.returncode == 0, proc.stderr
    out = json.loads(proc.stdout)
    assert out["verdict"]["total"] == 1
    assert "PKG-002" in out["pkg_checks"]


def test_main_output_to_file(tmp_path):
    """--output <path> でファイルへ書き出す。"""
    root = _make_plugins_root(tmp_path)
    out_path = tmp_path / "out" / "result.json"
    proc = _run_cli(["--plugin", "demo", "--plugins-root", str(root),
                     "--output", str(out_path)])
    assert proc.returncode == 0, proc.stderr
    assert out_path.exists()
    data = json.loads(out_path.read_text())
    assert data["target_plugin"] == "demo"
    # stdout には JSON は出ない (ファイル出力モード)
    assert proc.stdout.strip() == ""


# ============================================================================
# main : in-process (sys.argv monkeypatch) で main() 本体の行を直接カバー
# ============================================================================

def _argv(monkeypatch, args: list[str]) -> None:
    monkeypatch.setattr(sys, "argv", [str(SCRIPT), *args])


def test_main_inproc_plugin_not_found(tmp_path, monkeypatch, capsys):
    root = _make_plugins_root(tmp_path)
    _argv(monkeypatch, ["--plugin", "ghost", "--plugins-root", str(root)])
    rc = MOD.main()
    assert rc == 2
    assert "plugin not found" in capsys.readouterr().err


def test_main_inproc_unsupported_check(tmp_path, monkeypatch, capsys):
    root = _make_plugins_root(tmp_path)
    _argv(monkeypatch, ["--plugin", "demo", "--plugins-root", str(root),
                        "--check", "pkg-999"])
    rc = MOD.main()
    assert rc == 2
    assert "unsupported --check value" in capsys.readouterr().err


def test_main_inproc_all_clean_exit0(tmp_path, monkeypatch, capsys):
    root = tmp_path / "plugins"
    p = _plugin(root, "demo")
    _write_plugin_json(p, {
        "name": "demo", "version": "1", "package_mode": "plugin",
        "description": "d", "entry_points": {},
    })
    _write_package_contract(p)
    _write_skill(p, "sk", _full_required_fm())
    _argv(monkeypatch, ["--plugin", "demo", "--plugins-root", str(root)])
    rc = MOD.main()
    out = capsys.readouterr().out
    assert rc == 0
    data = json.loads(out)
    assert data["verdict"]["fail"] == 0


def test_main_inproc_failing_exit1(tmp_path, monkeypatch, capsys):
    root = tmp_path / "plugins"
    p = _plugin(root, "demo")
    _write_plugin_json(p, {"name": "demo", "package_mode": "plugin"})
    _argv(monkeypatch, ["--plugin", "demo", "--plugins-root", str(root)])
    rc = MOD.main()
    assert rc == 1
    data = json.loads(capsys.readouterr().out)
    assert data["verdict"]["fail"] >= 1


def test_main_inproc_check_all_branch(tmp_path, monkeypatch, capsys):
    """--check all -> PKG_IDS 全件 (line 379-380 の all 分岐)。"""
    root = _make_plugins_root(tmp_path)
    _argv(monkeypatch, ["--plugin", "demo", "--plugins-root", str(root),
                        "--check", "all"])
    rc = MOD.main()
    data = json.loads(capsys.readouterr().out)
    assert rc in (0, 1)
    assert data["verdict"]["total"] == 8


def test_main_inproc_bare_numeric_check_normalized(tmp_path, monkeypatch, capsys):
    """--check 002 (PKG- 接頭辞なし bare 数字) -> line 384 で PKG-002 へ正規化。"""
    root = _make_plugins_root(tmp_path)
    _argv(monkeypatch, ["--plugin", "demo", "--plugins-root", str(root),
                        "--check", "002"])
    rc = MOD.main()
    data = json.loads(capsys.readouterr().out)
    assert rc == 0
    assert data["verdict"]["total"] == 1
    assert "PKG-002" in data["pkg_checks"]


def test_main_inproc_prefixed_check_passthrough(tmp_path, monkeypatch, capsys):
    """--check pkg-003 -> upper で PKG-003、startswith True -> line 388 でそのまま採用。"""
    root = tmp_path / "plugins"
    p = _plugin(root, "demo")
    _write_plugin_json(p, {
        "name": "demo", "version": "1", "package_mode": "plugin",
        "description": "d", "entry_points": {},
    })
    _argv(monkeypatch, ["--plugin", "demo", "--plugins-root", str(root),
                        "--check", "pkg-003"])
    rc = MOD.main()
    data = json.loads(capsys.readouterr().out)
    assert rc in (0, 1)
    assert "PKG-003" in data["pkg_checks"]
    assert data["verdict"]["total"] == 1


def test_main_inproc_output_to_file(tmp_path, monkeypatch, capsys):
    root = _make_plugins_root(tmp_path)
    out_path = tmp_path / "deep" / "r.json"
    _argv(monkeypatch, ["--plugin", "demo", "--plugins-root", str(root),
                        "--output", str(out_path)])
    rc = MOD.main()
    assert rc == 0
    assert out_path.exists()
    assert capsys.readouterr().out.strip() == ""
