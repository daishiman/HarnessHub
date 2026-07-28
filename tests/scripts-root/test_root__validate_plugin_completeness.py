"""scripts/validate-plugin-completeness.py の収集/検証層の genuine 機能テスト。

純関数 (load_bundle_members / load_marketplace_entries / collect / validate) を
tmp_path 上に構築した擬似 plugin ツリーで実入力により呼び、実出力を assert する。
marketplace 検査 (MK-001/002/003) と distributable:false 逆ガード (MK-004/BD-002)
までを本ファイルが担当する。

登録の予防層 (register_missing / --fix) と main()/CLI は
test_root__validate_plugin_completeness_s2.py、実 repo の hooks entry point 契約は
test_root__plugin_hooks_entry_point_contract.py が担当する (500 行上限による分割)。
擬似 plugin ツリーの構築ヘルパは _plugin_completeness_fixtures.py で共有する。
network/keychain/Notion 等の外部 I/O は一切なし (純粋なファイル検査スクリプト)。
"""
import json

from _plugin_completeness_fixtures import _data, _make_plugin, _mk, load_uut

MOD = load_uut("validate_plugin_completeness_uut")
# --- load_bundle_members -----------------------------------------------------

def test_load_bundle_members_missing_file_returns_empty(tmp_path, monkeypatch):
    monkeypatch.setattr(MOD, "BUNDLES_JSON", tmp_path / "absent.json")
    assert MOD.load_bundle_members() == set()


def test_load_bundle_members_collects_all_plugins(tmp_path, monkeypatch):
    bj = tmp_path / "bundles.json"
    bj.write_text(json.dumps({
        "bundles": [
            {"name": "core", "plugins": ["harness-creator", "skill-intake"]},
            {"name": "extra", "plugins": ["skill-intake", "another"]},
        ]
    }), encoding="utf-8")
    monkeypatch.setattr(MOD, "BUNDLES_JSON", bj)
    assert MOD.load_bundle_members() == {"harness-creator", "skill-intake", "another"}


def test_load_bundle_members_empty_bundles_key(tmp_path, monkeypatch):
    bj = tmp_path / "bundles.json"
    bj.write_text(json.dumps({"bundles": []}), encoding="utf-8")
    monkeypatch.setattr(MOD, "BUNDLES_JSON", bj)
    assert MOD.load_bundle_members() == set()


# --- load_marketplace_entries ------------------------------------------------

def test_load_marketplace_entries_missing_file_returns_empty(tmp_path, monkeypatch):
    monkeypatch.setattr(MOD, "MARKETPLACE_JSON", tmp_path / "absent.json")
    assert MOD.load_marketplace_entries() == {}


def test_load_marketplace_entries_maps_name_to_source(tmp_path, monkeypatch):
    mj = tmp_path / "marketplace.json"
    mj.write_text(json.dumps({"plugins": [
        {"name": "a", "source": "./plugins/a"},
        {"name": "b", "source": "./plugins/b"},
    ]}), encoding="utf-8")
    monkeypatch.setattr(MOD, "MARKETPLACE_JSON", mj)
    assert MOD.load_marketplace_entries() == {"a": "./plugins/a", "b": "./plugins/b"}


# --- collect -----------------------------------------------------------------

def test_collect_enumerates_all_asset_kinds(tmp_path):
    d = _make_plugin(
        tmp_path, "p1",
        manifest={"name": "p1", "version": "1.0.0", "description": "d"},
        skills=["run-a", "run-b"],
        agents=["x.md"],
        commands=["c.md"],
        hooks=["h.sh", "g.py"],
        scripts=["tool.py"],
        config=["conf.json"],
    )
    out = MOD.collect(d)
    assert out["skills"] == ["run-a", "run-b"]
    assert out["agents"] == ["x.md"]
    assert out["commands"] == ["c.md"]
    assert out["hooks"] == ["g.py", "h.sh"]  # sorted
    assert out["scripts"] == ["tool.py"]
    assert out["config"] == ["conf.json"]
    assert out["manifest"]["name"] == "p1"


def test_collect_hooks_filter_only_sh_and_py(tmp_path):
    d = _make_plugin(tmp_path, "p2", manifest={"name": "p2"}, hooks=["a.sh", "b.py"])
    # 非 .sh/.py のファイルを hooks/ に追加 -> 列挙されない
    (d / "hooks" / "readme.txt").write_text("x", encoding="utf-8")
    out = MOD.collect(d)
    assert out["hooks"] == ["a.sh", "b.py"]


def test_collect_manifest_none_when_absent(tmp_path):
    d = _make_plugin(tmp_path, "p3", manifest=None, skills=["run-a"])
    out = MOD.collect(d)
    assert out["manifest"] is None


def test_collect_resolves_plugin_relative_hook_config(tmp_path):
    d = _make_plugin(
        tmp_path,
        "p4",
        manifest={
            "name": "p4",
            "version": "1.0.0",
            "description": "plugin relative hook config",
            "hooks": "./hooks/hooks.json",
        },
        hooks=["guard.py"],
    )
    (d / "hooks" / "hooks.json").write_text(json.dumps({
        "hooks": {
            "PreToolUse": [{
                "hooks": [{
                    "command": "python3 $CLAUDE_PLUGIN_ROOT/hooks/guard.py"
                }]
            }]
        }
    }), encoding="utf-8")

    out = MOD.collect(d)

    assert isinstance(out["manifest"]["hooks"], dict)
    assert out["manifest_hook_error"] is None
    errs = MOD.validate("p4", out, {"p4"}, _mk("p4"))
    assert not any("declares hooks not on disk" in err for err in errs)


def test_collect_reports_invalid_plugin_relative_hook_config(tmp_path):
    d = _make_plugin(
        tmp_path,
        "p5",
        manifest={
            "name": "p5",
            "version": "1.0.0",
            "description": "missing hook config",
            "hooks": "./hooks/missing.json",
        },
        skills=["run-a"],
    )

    out = MOD.collect(d)
    errs = MOD.validate("p5", out, set(), {})

    assert any("manifest hook reference invalid" in err for err in errs)


def test_collect_loads_harness_package_contract_sidecar(tmp_path):
    d = _make_plugin(
        tmp_path,
        "sidecar",
        manifest={"name": "sidecar", "version": "1.0.0", "description": "d"},
        skills=["run-a"],
    )
    (d / "references").mkdir()
    contract = {
        "package_mode": "bundle",
        "plugin_name": "sidecar",
        "entry_points": {"skills": ["run-a"]},
        "distribution": {"distributable": False},
        "pkg_checks": {},
    }
    (d / "references" / "package-contract.json").write_text(
        json.dumps(contract), encoding="utf-8"
    )

    out = MOD.collect(d)

    assert out["package_contract"] == contract
    assert out["package_contract_error"] is None


# --- validate ----------------------------------------------------------------

def test_validate_happy_path_no_errors(tmp_path, monkeypatch):
    # MK-002 は ROOT/source の実在を見るため、ROOT を tmp に向け実体を用意する。
    monkeypatch.setattr(MOD, "ROOT", tmp_path)
    (tmp_path / "plugins" / "p").mkdir(parents=True)
    data = _data(
        {"name": "p", "version": "1.0", "description": "d"},
        skills=["run-a"],
    )
    errs = MOD.validate("p", data, {"p"}, _mk("p"))
    assert errs == []


def test_validate_missing_manifest():
    data = _data(None, skills=["run-a"])
    errs = MOD.validate("p", data, {"p"}, _mk("p"))
    assert errs == ["p: .claude-plugin/plugin.json missing"]


def test_validate_missing_required_fields():
    data = _data({"name": "p"}, skills=["run-a"])  # version/description 欠如
    errs = MOD.validate("p", data, {"p"}, _mk("p"))
    assert any("missing 'version'" in e for e in errs)
    assert any("missing 'description'" in e for e in errs)


def test_validate_name_mismatch():
    data = _data(
        {"name": "wrong", "version": "1", "description": "d"},
        skills=["run-a"],
    )
    errs = MOD.validate("p", data, {"p"}, _mk("p"))
    assert any("!= directory name" in e for e in errs)


def test_validate_declared_hook_not_on_disk():
    manifest = {
        "name": "p", "version": "1", "description": "d",
        "hooks": {
            "PreToolUse": [
                {"hooks": [{"command": "python3 $CLAUDE_PLUGIN_ROOT/hooks/guard.py"}]}
            ]
        },
    }
    data = _data(manifest, skills=["run-a"], hooks=[])  # guard.py がディスクに無い
    errs = MOD.validate("p", data, {"p"}, _mk("p"))
    assert any("declares hooks not on disk" in e and "guard.py" in e for e in errs)


def test_validate_declared_hook_present_on_disk_ok(tmp_path, monkeypatch):
    monkeypatch.setattr(MOD, "ROOT", tmp_path)
    (tmp_path / "plugins" / "p").mkdir(parents=True)
    manifest = {
        "name": "p", "version": "1", "description": "d",
        "hooks": {
            "Stop": [
                {"hooks": [{"command": "$CLAUDE_PLUGIN_ROOT/hooks/stop.sh"}]}
            ]
        },
    }
    data = _data(manifest, skills=["run-a"], hooks=["stop.sh"])
    errs = MOD.validate("p", data, {"p"}, _mk("p"))
    assert errs == []


def test_validate_empty_distribution():
    data = _data({"name": "p", "version": "1", "description": "d"})  # 全 asset 空
    errs = MOD.validate("p", data, {"p"}, _mk("p"))
    assert any("no assets" in e for e in errs)


def test_validate_not_in_bundle():
    data = _data(
        {"name": "p", "version": "1", "description": "d"},
        skills=["run-a"],
    )
    errs = MOD.validate("p", data, set(), _mk("p"))  # bundle メンバーでない
    assert any("not registered in any" in e for e in errs)


def test_validate_malformed_hook_command_falls_back_to_split():
    # shlex.split が ValueError を投げる不正コマンド (未閉じクォート) -> cmd.split() fallback
    manifest = {
        "name": "p", "version": "1", "description": "d",
        "hooks": {
            "PreToolUse": [
                {"hooks": [{"command": 'echo "unterminated $CLAUDE_PLUGIN_ROOT/hooks/h.py'}]}
            ]
        },
    }
    data = _data(manifest, skills=["run-a"], hooks=[])
    errs = MOD.validate("p", data, {"p"}, _mk("p"))
    # fallback split でも h.py が抽出され missing として検出される
    assert any("h.py" in e for e in errs)


# --- validate: marketplace 検査 (MK-001/002/003) -----------------------------

def test_validate_mk001_not_in_marketplace():
    data = _data(
        {"name": "p", "version": "1", "description": "d"},
        skills=["run-a"],
    )
    errs = MOD.validate("p", data, {"p"}, {})  # marketplace 未登録
    assert any("(MK-001)" in e for e in errs)


def test_validate_mk002_source_not_existing_dir():
    data = _data(
        {"name": "p", "version": "1", "description": "d"},
        skills=["run-a"],
    )
    # name は登録されているが source が実在しない (実 ROOT 下に ./plugins/p なし)
    errs = MOD.validate("p", data, {"p"}, {"p": "./plugins/p"})
    assert any("(MK-002)" in e for e in errs)


def test_validate_mk003_source_basename_mismatch(tmp_path, monkeypatch):
    monkeypatch.setattr(MOD, "ROOT", tmp_path)
    # source が別ディレクトリを指す取り違え。basename 'other' != 'p'。
    (tmp_path / "plugins" / "other").mkdir(parents=True)
    data = _data(
        {"name": "p", "version": "1", "description": "d"},
        skills=["run-a"],
    )
    errs = MOD.validate("p", data, {"p"}, {"p": "./plugins/other"})
    assert any("(MK-003)" in e for e in errs)
    # basename 取り違えは独立検査であり、name フィールド一致とは別物
    assert not any("(MK-002)" in e for e in errs)  # other は実在するので MK-002 は出ない


# --- validate: distributable:false 逆ガード (MK-004/BD-002) -------------------

def test_validate_distributable_false_no_registration_required():
    # distributable:false (社内専用) は marketplace/bundle 未登録でも
    # 順方向の登録漏れ検査 (MK-001/BD-001) を一切出さない。
    data = _data(
        {"name": "p", "version": "1", "description": "d", "distributable": False},
        skills=["run-a"],
    )
    errs = MOD.validate("p", data, set(), {})  # bundle / marketplace ともに未登録
    assert not any("(MK-001)" in e for e in errs)
    assert not any("(BD-001" in e for e in errs)
    assert errs == []


def test_validate_distributable_false_registered_emits_mk004_bd002():
    # 非配布宣言なのに登録が残存 → 逆ガード MK-004 / BD-002 を出す。
    data = _data(
        {"name": "p", "version": "1", "description": "d", "distributable": False},
        skills=["run-a"],
    )
    errs = MOD.validate("p", data, {"p"}, _mk("p"))  # bundle / marketplace 両方に残存
    assert any("(MK-004)" in e for e in errs)
    assert any("(BD-002)" in e for e in errs)
    # 逆ガード中は順方向の登録漏れ検査は適用されない
    assert not any("(MK-001)" in e for e in errs)
    assert not any("(BD-001" in e for e in errs)


def test_validate_uses_sidecar_distribution_and_entry_points():
    # Native manifest は公式 schema のキーだけで、harness 契約は sidecar が正本。
    data = _data(
        {"name": "p", "version": "1", "description": "d"},
        skills=["run-a"], agents=["audit.md"], commands=["go.md"], hooks=["guard.py"],
    )
    data["package_contract"] = {
        "plugin_name": "p",
        "entry_points": {
            "skills": ["run-a"],
            "agents": ["audit"],
            "commands": ["go"],
            "hooks": ["guard"],
        },
        "distribution": {"distributable": False},
    }

    assert MOD.validate("p", data, set(), {}) == []


def test_validate_sidecar_declared_entry_point_must_exist():
    data = _data(
        {"name": "p", "version": "1", "description": "d"},
        skills=["run-a"],
    )
    data["package_contract"] = {
        "plugin_name": "p",
        "entry_points": {"skills": ["run-a", "run-missing"]},
        "distribution": {"distributable": False},
    }

    errs = MOD.validate("p", data, set(), {})

    assert any("declares skills not on disk" in err and "run-missing" in err for err in errs)
