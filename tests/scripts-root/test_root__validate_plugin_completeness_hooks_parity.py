"""scripts/validate-plugin-completeness.py の hooks entry point parity 検査 (HK-001..003)。

宣言 (package-contract.entry_points.hooks)・登録 (hooks.json / manifest inline)・
実体 (hooks/ のファイル) の 3 者一致を、tmp_path 上の擬似 plugin ツリーへ実入力で
collect() → validate() を通して検証する。

本ファイルの主眼は「台帳の過少申告」の検出である。宣言 ⊆ 実体だけを見る検査は
hooks.json へ登録済みで未宣言の hook を素通りさせるため、その逆方向 (HK-001) と、
support module を宣言漏れと取り違えない偽陽性回帰 (HK-003) をここで固定する。

収集/検証の一般機能は test_root__validate_plugin_completeness.py、登録の予防層と
CLI は _s2.py、実 repo (dev-graph) の不変条件は
test_root__plugin_hooks_entry_point_contract.py が担当する。
外部 I/O は一切なし (純粋なファイル検査スクリプト)。
"""
import json

import pytest

from _plugin_completeness_fixtures import _make_plugin, _write_hooks_json, load_uut

MOD = load_uut("validate_plugin_completeness_hooks_uut")

MANIFEST = {
    "name": "p",
    "version": "1.0.0",
    "description": "d",
    "hooks": "./hooks/hooks.json",
}


def _plugin(tmp_path, *, hook_files: dict[str, str], declared, registered=None,
            manifest=None):
    """hooks/ の実体・hooks.json の登録・contract の宣言を独立に指定できる plugin。

    3 者を別々に組めることが本ファイルの前提 (一致を検査するのだから、
    ずらせない fixture では検査が効いていることを示せない)。
    """
    plugin_dir = _make_plugin(
        tmp_path / "plugins", "p",
        manifest=dict(manifest if manifest is not None else MANIFEST),
        skills=["run-a"],
    )
    hooks_dir = plugin_dir / "hooks"
    hooks_dir.mkdir(parents=True, exist_ok=True)
    for name, text in hook_files.items():
        (hooks_dir / name).write_text(text, encoding="utf-8")
    if registered is not None:
        _write_hooks_json(plugin_dir, *registered)
    contract = {
        "plugin_name": "p",
        "entry_points": {"skills": ["run-a"], "agents": [], "commands": [],
                         "hooks": list(declared)},
        "distribution": {"distributable": False},
    }
    ref = plugin_dir / "references"
    ref.mkdir(parents=True, exist_ok=True)
    (ref / "package-contract.json").write_text(
        json.dumps(contract, ensure_ascii=False), encoding="utf-8")
    return plugin_dir


def _errs(plugin_dir):
    return MOD.validate("p", MOD.collect(plugin_dir), set(), {})


ENTRY_POINT = "#!/usr/bin/env python3\nX = 1\nif __name__ == '__main__':\n    pass\n"
SUPPORT_MODULE = '"""helper."""\nimport re\n\nX = re.compile("a")\n'


# --- HK-001: 登録 ⊆ 宣言 (台帳の過少申告) ------------------------------------

def test_registered_but_undeclared_hook_is_violation(tmp_path):
    plugin_dir = _plugin(
        tmp_path,
        hook_files={"guard-a.py": ENTRY_POINT},
        declared=[],
        registered=["guard-a.py"],
    )

    errs = _errs(plugin_dir)

    assert any("(HK-001)" in e and "guard-a" in e for e in errs), errs


def test_declared_and_registered_hook_has_no_violation(tmp_path):
    plugin_dir = _plugin(
        tmp_path,
        hook_files={"guard-a.py": ENTRY_POINT},
        declared=["guard-a.py"],
        registered=["guard-a.py"],
    )

    assert _errs(plugin_dir) == []


def test_missing_hooks_key_in_entry_points_still_detects_registration(tmp_path):
    """entry_points から hooks キーごと落としても検査は素通りしない (fail-closed)。"""
    plugin_dir = _plugin(
        tmp_path,
        hook_files={"guard-a.py": ENTRY_POINT},
        declared=[],
        registered=["guard-a.py"],
    )
    contract_path = plugin_dir / "references" / "package-contract.json"
    contract = json.loads(contract_path.read_text())
    contract["entry_points"].pop("hooks")
    contract_path.write_text(json.dumps(contract), encoding="utf-8")

    assert any("(HK-001)" in e for e in _errs(plugin_dir))


def test_inline_manifest_hooks_count_as_registration(tmp_path):
    """hooks.json を経由せず manifest へ inline 展開した hook も登録として拾う。"""
    manifest = {
        "name": "p", "version": "1.0.0", "description": "d",
        "hooks": {"SessionStart": [{"matcher": "startup", "hooks": [
            {"type": "command",
             "command": 'python3 "$CLAUDE_PLUGIN_ROOT/hooks/guard-a.py"'}]}]},
    }
    plugin_dir = _plugin(
        tmp_path,
        hook_files={"guard-a.py": ENTRY_POINT},
        declared=[],
        manifest=manifest,
    )

    assert any("(HK-001)" in e and "guard-a" in e for e in _errs(plugin_dir))


def test_inline_manifest_detects_declared_but_unregistered_hook(tmp_path):
    """inline 登録も HK-002 の登録経路なので、宣言だけを残せない。"""
    manifest = {
        "name": "p", "version": "1.0.0", "description": "d",
        "hooks": {"SessionStart": [{"matcher": "startup", "hooks": [
            {"type": "command", "command": "python3 hooks/guard-a.py"},
        ]}]},
    }
    plugin_dir = _plugin(
        tmp_path,
        hook_files={"guard-a.py": ENTRY_POINT, "guard-b.py": ENTRY_POINT},
        declared=["guard-a.py", "guard-b.py"],
        manifest=manifest,
    )

    errs = _errs(plugin_dir)

    assert any("(HK-002)" in e and "guard-b" in e for e in errs), errs


# --- HK-002: 宣言 ⊆ 登録 -----------------------------------------------------

def test_declared_hook_not_registered_is_violation(tmp_path):
    plugin_dir = _plugin(
        tmp_path,
        hook_files={"guard-a.py": ENTRY_POINT, "guard-b.py": ENTRY_POINT},
        declared=["guard-a.py", "guard-b.py"],
        registered=["guard-a.py"],
    )

    errs = _errs(plugin_dir)

    assert any("(HK-002)" in e and "guard-b" in e for e in errs), errs


def test_plugin_without_hooks_json_is_not_flagged_as_unregistered(tmp_path):
    """登録経路 (hooks.json) 自体を持たない plugin へ HK-002 を適用しない。

    hooks.json が無い plugin は「宣言漏れ」ではなく「この経路で配線していない」。
    両者を取り違えると、既存の大多数の plugin が一斉に偽陽性で落ちる。
    """
    plugin_dir = _plugin(
        tmp_path,
        hook_files={"guard-a.py": ENTRY_POINT},
        declared=["guard-a.py"],
        registered=None,
        # 実 repo の該当 plugin と同じく manifest も hooks を参照しない。
        manifest={"name": "p", "version": "1.0.0", "description": "d"},
    )

    assert _errs(plugin_dir) == []


# --- HK-003: 残余は import 専用 support module ------------------------------

def test_import_only_support_module_is_not_a_false_positive(tmp_path):
    """責務分割で生まれた import 専用 module を宣言漏れとして誤検出しない。"""
    plugin_dir = _plugin(
        tmp_path,
        hook_files={"guard-a.py": ENTRY_POINT, "guard_a_commands.py": SUPPORT_MODULE},
        declared=["guard-a.py"],
        registered=["guard-a.py"],
    )

    assert _errs(plugin_dir) == []


@pytest.mark.parametrize("name, text", [
    # kebab-case は import 不能なので entry point 命名。
    ("guard-b.py", '"""hook."""\nX = 1\n'),
    # shebang は単体起動の意図。
    ("guard_b.py", "#!/usr/bin/env python3\nX = 1\n"),
    # __main__ ブロックを持つなら単体起動できる = entry point。
    ("guard_b.py", 'X = 1\nif __name__ == "__main__":\n    raise SystemExit(0)\n'),
    # .sh は import できないため必ず entry point。
    ("guard_b.sh", "echo hi\n"),
])
def test_unregistered_entry_point_shaped_file_is_violation(tmp_path, name, text):
    plugin_dir = _plugin(
        tmp_path,
        hook_files={"guard-a.py": ENTRY_POINT, name: text},
        declared=["guard-a.py"],
        registered=["guard-a.py"],
    )

    errs = _errs(plugin_dir)

    assert any("(HK-003)" in e and name in e for e in errs), errs


# --- hooks.json 構文エラーの伝播 (握り潰し禁止) ------------------------------

def test_invalid_hooks_json_is_reported_not_silently_dropped(tmp_path):
    """hooks.json が壊れている場合、登録 0 件 (HK-002 誤検出) ではなく明示エラーにする。"""
    plugin_dir = _plugin(
        tmp_path,
        hook_files={"guard-a.py": ENTRY_POINT},
        declared=["guard-a.py"],
    )
    (plugin_dir / "hooks" / "hooks.json").write_text("{not json", encoding="utf-8")

    data = MOD.collect(plugin_dir)
    errs = MOD.validate("p", data, set(), {})

    assert data["registered_hooks_error"] is not None
    assert any("hooks/hooks.json invalid" in e for e in errs), errs


# --- CLAUDE_PLUGIN_ROOT を経由しない "/hooks/" は対象外 -----------------------

def test_unrelated_hooks_substring_outside_plugin_root_is_ignored(tmp_path):
    """.git/hooks/pre-commit のような無関係な "/hooks/" を entry point と誤認しない。"""
    manifest = {
        "name": "p", "version": "1.0.0", "description": "d",
        "hooks": {"SessionStart": [{"matcher": "startup", "hooks": [
            {"type": "command", "command": "/repo/.git/hooks/pre-commit"},
        ]}]},
    }
    plugin_dir = _plugin(
        tmp_path,
        hook_files={"guard-a.py": ENTRY_POINT},
        declared=["guard-a.py"],
        manifest=manifest,
    )

    assert MOD.collect(plugin_dir)["registered_hooks"] == []


# --- import 専用判定はデコード不能ファイルでも例外を出さない ------------------

def test_undecodable_hook_file_does_not_crash_and_is_treated_as_entry_point(tmp_path):
    plugin_dir = _plugin(
        tmp_path,
        hook_files={"guard-a.py": ENTRY_POINT},
        declared=["guard-a.py"],
        registered=["guard-a.py"],
    )
    (plugin_dir / "hooks" / "guard_b.py").write_bytes(b"\xff\xfe\x00broken")

    errs = _errs(plugin_dir)

    assert any("(HK-003)" in e and "guard_b.py" in e for e in errs), errs


# --- 再現手順の回帰 (repo 全体検査が非 0 終了する) ---------------------------

def test_repo_wide_check_exits_non_zero_on_undeclared_registration(
        tmp_path, monkeypatch, capsys):
    """issue の再現手順 (未宣言 hook を登録 → 検査が exit 0 のまま) の逆を固定する。"""
    _plugin(
        tmp_path,
        hook_files={"guard-a.py": ENTRY_POINT},
        declared=[],
        registered=["guard-a.py"],
    )
    monkeypatch.setattr(MOD, "ROOT", tmp_path)
    monkeypatch.setattr(MOD, "PLUGINS_DIR", tmp_path / "plugins")
    monkeypatch.setattr(MOD, "MARKETPLACE_JSON", tmp_path / "absent-marketplace.json")
    monkeypatch.setattr(MOD, "BUNDLES_JSON", tmp_path / "absent-bundles.json")

    assert MOD.main([]) == 1
    assert "(HK-001)" in capsys.readouterr().err
