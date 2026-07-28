"""scripts/validate-plugin-completeness.py の登録予防層と CLI の genuine 機能テスト。

test_root__validate_plugin_completeness.py が収集/検証層を担当するのに対し、本ファイルは
書込みを伴う register_missing (--fix のコア)、marketplace エントリ生成の純関数
(_marketplace_entry_block / _insert_marketplace_entry)、main() の全 exit path、および
NEVER_DISTRIBUTE 固有名 denylist の多層防御を担当する (500 行上限による分割)。

main() は PLUGINS_DIR / BUNDLES_JSON / MARKETPLACE_JSON / ROOT を monkeypatch で
tmp_path へ向け in-process 駆動する。subprocess 経路だけは実 repo に対して実行し、
returncode (0 or 1) を許容範囲で検証する。
"""
import json
import subprocess
import sys

from _plugin_completeness_fixtures import (
    ROOT,
    SCRIPT,
    _data,
    _setup_repo,
    load_uut,
)

MOD = load_uut("validate_plugin_completeness_s2_uut")
# --- register_missing: 予防層 (--fix のコア) ---------------------------------

def test_register_missing_appends_marketplace_and_bundle(tmp_path, monkeypatch):
    mj, bj = _setup_repo(
        MOD, tmp_path, monkeypatch,
        plugins={"new": {"name": "new", "version": "0.1.0", "description": "d",
                          "bundle_targets": ["full"]}},
        marketplace={"plugins": []},
        bundles={"bundles": [{"name": "full", "plugins": []}]},
    )
    actions, changed = MOD.register_missing()
    assert changed is True
    assert any("marketplace.json: + new" in a for a in actions)
    assert any("bundles.json[full]: + new" in a for a in actions)
    # 書込後の検査で new に MK/BD 違反が無いこと
    _, errs = MOD.run_check()
    assert not any("new:" in e for e in errs)
    mk = json.loads(mj.read_text())
    assert any(p["name"] == "new" and p["source"] == "./plugins/new" for p in mk["plugins"])
    bd = json.loads(bj.read_text())
    assert "new" in bd["bundles"][0]["plugins"]


def test_register_missing_idempotent(tmp_path, monkeypatch):
    mj, bj = _setup_repo(
        MOD, tmp_path, monkeypatch,
        plugins={"new": {"name": "new", "version": "0.1.0", "description": "d",
                          "bundle_targets": ["full"]}},
        marketplace={"plugins": []},
        bundles={"bundles": [{"name": "full", "plugins": []}]},
    )
    MOD.register_missing()
    actions2, changed2 = MOD.register_missing()  # 2 回目は no-op
    assert changed2 is False
    assert actions2 == []


def test_register_missing_appendonly_preserves_existing_bytes(tmp_path, monkeypatch):
    # 既存エントリ (tags インライン・日本語 description) のバイトが不変であること。
    existing = {
        "plugins": [
            {"name": "old", "source": "./plugins/old",
             "description": "既存の日本語説明", "version": "1.0.0",
             "category": "productivity", "tags": ["a", "b"]},
        ]
    }
    mj, bj = _setup_repo(
        MOD, tmp_path, monkeypatch,
        plugins={
            "old": {"name": "old", "version": "1.0.0", "description": "既存の日本語説明",
                     "bundle_targets": ["full"]},
            "new": {"name": "new", "version": "0.1.0", "description": "新規",
                     "bundle_targets": ["full"]},
        },
        marketplace=existing,
        bundles={"bundles": [{"name": "full", "plugins": ["old"]}]},
    )
    before = mj.read_text()
    MOD.register_missing()
    after = mj.read_text()
    # append-only: plugins[] 閉じ括弧より前の既存バイトは after の接頭辞として温存
    cut = before.rfind("\n  ]")
    assert cut != -1
    assert after.startswith(before[:cut])
    assert '"name": "new"' in after
    # 'old' は二重登録されない
    names = [p["name"] for p in json.loads(after)["plugins"]]
    assert names.count("old") == 1


def test_register_missing_unknown_bundle_reports_and_residual_fail(tmp_path, monkeypatch):
    # bundle_targets が存在しない bundle を指す → 自動作成せず警告。BD-001 が残違反。
    _setup_repo(
        MOD, tmp_path, monkeypatch,
        plugins={"new": {"name": "new", "version": "0.1.0", "description": "d",
                          "bundle_targets": ["nonexistent"]}},
        marketplace={"plugins": []},
        bundles={"bundles": [{"name": "full", "plugins": []}]},
    )
    actions, _ = MOD.register_missing()
    assert any("bundle 'nonexistent'" in a and "登録不可" in a for a in actions)
    _, errs = MOD.run_check()
    assert any("(BD-001" in e for e in errs)  # bundle 登録は残違反


def test_register_missing_default_note_when_no_category_tags(tmp_path, monkeypatch):
    _setup_repo(
        MOD, tmp_path, monkeypatch,
        plugins={"new": {"name": "new", "version": "0.1.0", "description": "d",
                          "bundle_targets": ["full"]}},  # category/tags なし
        marketplace={"plugins": []},
        bundles={"bundles": [{"name": "full", "plugins": []}]},
    )
    actions, _ = MOD.register_missing()
    assert any("PR で要確認" in a for a in actions)


def test_register_missing_skips_distributable_false(tmp_path, monkeypatch):
    # distributable:false の plugin は bundle_targets を宣言していても
    # marketplace/bundle へ自動登録されない (--fix が逆ガードを踏まない証明)。
    mj, bj = _setup_repo(
        MOD, tmp_path, monkeypatch,
        plugins={"internal": {"name": "internal", "version": "0.1.0", "description": "d",
                              "distributable": False, "bundle_targets": ["full"]}},
        marketplace={"plugins": []},
        bundles={"bundles": [{"name": "full", "plugins": []}]},
    )
    actions, changed = MOD.register_missing()
    assert changed is False
    assert actions == []
    mk = json.loads(mj.read_text())
    assert all(p["name"] != "internal" for p in mk["plugins"])
    bd = json.loads(bj.read_text())
    assert "internal" not in bd["bundles"][0]["plugins"]


def test_register_missing_skips_sidecar_non_distributable(tmp_path, monkeypatch):
    # 公式 manifest に harness-only key が無くても sidecar の非配布契約を守る。
    mj, bj = _setup_repo(
        MOD, tmp_path, monkeypatch,
        plugins={"internal": {"name": "internal", "version": "0.1.0", "description": "d"}},
        marketplace={"plugins": []},
        bundles={"bundles": [{"name": "full", "plugins": []}]},
    )
    plugin_dir = MOD.PLUGINS_DIR / "internal"
    (plugin_dir / "references").mkdir()
    (plugin_dir / "references" / "package-contract.json").write_text(json.dumps({
        "package_mode": "bundle",
        "plugin_name": "internal",
        "entry_points": {"skills": ["run-a"]},
        "distribution": {"distributable": False, "bundle_targets": ["full"]},
        "pkg_checks": {},
    }), encoding="utf-8")

    actions, changed = MOD.register_missing()

    assert (actions, changed) == ([], False)
    assert json.loads(mj.read_text())["plugins"] == []
    assert json.loads(bj.read_text())["bundles"][0]["plugins"] == []


# --- _marketplace_entry_block / _insert_marketplace_entry (unit) -------------

def test_marketplace_entry_block_inline_tags_and_japanese():
    block = MOD._marketplace_entry_block(
        "ng", {"description": "日本語の説明", "version": "0.1.0",
               "category": "productivity", "tags": ["x", "y"]})
    assert '"tags": ["x", "y"]' in block       # インライン
    assert "日本語の説明" in block               # ensure_ascii=False
    assert '"source": "./plugins/ng"' in block
    assert block.startswith("    {")            # indent 4


def test_insert_marketplace_entry_is_append_only():
    text = '{\n  "plugins": [\n    {\n      "name": "a"\n    }\n  ]\n}\n'
    block = '    {\n      "name": "b"\n    }'
    out, ok = MOD._insert_marketplace_entry(text, block)
    assert ok is True
    # 既存 'a' エントリまでのバイトは不変
    idx = text.index('"name": "a"')
    assert out[:idx] == text[:idx]
    assert '"name": "b"' in out
    assert json.loads(out)["plugins"] == [{"name": "a"}, {"name": "b"}]


def test_insert_marketplace_entry_marker_absent_returns_false():
    out, ok = MOD._insert_marketplace_entry("not json with marker", "blk")
    assert ok is False


# --- main(): in-process 駆動 -------------------------------------------------

def test_main_plugins_dir_missing_returns_2(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(MOD, "PLUGINS_DIR", tmp_path / "absent")
    assert MOD.main([]) == 2
    assert "not found" in capsys.readouterr().err


def test_main_all_complete_returns_0(tmp_path, monkeypatch, capsys):
    mj, bj = _setup_repo(
        MOD, tmp_path, monkeypatch,
        plugins={"good": {"name": "good", "version": "1", "description": "d"}},
        marketplace={"plugins": [{"name": "good", "source": "./plugins/good"}]},
        bundles={"bundles": [{"plugins": ["good"]}]},
    )
    rc = MOD.main([])
    out = capsys.readouterr().out
    assert rc == 0
    assert "OK: 1 plugin(s) complete" in out
    assert "good: skills=1" in out


def test_main_violation_returns_1(tmp_path, monkeypatch, capsys):
    # bundle 未登録 + marketplace 未登録 + version/description 欠如 -> VIOLATION
    _setup_repo(
        MOD, tmp_path, monkeypatch,
        plugins={"bad": {"name": "bad"}},
        marketplace={"plugins": []},
        bundles={"bundles": []},
    )
    rc = MOD.main([])
    captured = capsys.readouterr()
    assert rc == 1
    assert "VIOLATION" in captured.err
    assert "summary: VIOLATION=" in captured.err


def test_main_skips_dotdir_entries(tmp_path, monkeypatch, capsys):
    mj, bj = _setup_repo(
        MOD, tmp_path, monkeypatch,
        plugins={"good": {"name": "good", "version": "1", "description": "d"}},
        marketplace={"plugins": [{"name": "good", "source": "./plugins/good"}]},
        bundles={"bundles": [{"plugins": ["good"]}]},
    )
    (MOD.PLUGINS_DIR / ".hidden").mkdir()  # dot-dir は無視
    rc = MOD.main([])
    out = capsys.readouterr().out
    assert rc == 0
    assert ".hidden" not in out
    assert "OK: 1 plugin(s)" in out


def test_main_fix_registers_and_self_revalidates_exit0(tmp_path, monkeypatch, capsys):
    _setup_repo(
        MOD, tmp_path, monkeypatch,
        plugins={"new": {"name": "new", "version": "0.1.0", "description": "d",
                          "bundle_targets": ["full"]}},
        marketplace={"plugins": []},
        bundles={"bundles": [{"name": "full", "plugins": []}]},
    )
    rc = MOD.main(["--fix"])
    out = capsys.readouterr().out
    assert rc == 0                       # 書込後の自己再検証で exit 0
    assert "--fix OK" in out
    assert "+ new" in out


def test_main_fix_residual_violation_returns_1(tmp_path, monkeypatch, capsys):
    # bundle_targets が存在しない bundle → --fix 後も BD-001 残違反で exit 1
    _setup_repo(
        MOD, tmp_path, monkeypatch,
        plugins={"new": {"name": "new", "version": "0.1.0", "description": "d",
                          "bundle_targets": ["nonexistent"]}},
        marketplace={"plugins": []},
        bundles={"bundles": [{"name": "full", "plugins": []}]},
    )
    rc = MOD.main(["--fix"])
    err = capsys.readouterr().err
    assert rc == 1
    assert "残違反あり" in err


def test_main_fix_noop_when_all_registered(tmp_path, monkeypatch, capsys):
    _setup_repo(
        MOD, tmp_path, monkeypatch,
        plugins={"good": {"name": "good", "version": "1", "description": "d",
                           "bundle_targets": ["full"]}},
        marketplace={"plugins": [{"name": "good", "source": "./plugins/good"}]},
        bundles={"bundles": [{"name": "full", "plugins": ["good"]}]},
    )
    rc = MOD.main(["--fix"])
    out = capsys.readouterr().out
    assert rc == 0
    assert "no-op" in out


# --- subprocess: 実 repo に対して実行 (returncode は 0 or 1 を許容) ----------

def test_subprocess_runs_on_real_repo():
    proc = subprocess.run(
        [sys.executable, str(SCRIPT)],
        capture_output=True, text=True,
    )
    # 実 repo の状態に依存するため returncode は 0(完全) or 1(違反) を許容。
    # いずれにせよ summary 区切り "---" を必ず stdout に出す。
    assert proc.returncode in (0, 1)
    assert "---" in proc.stdout


def test_real_internal_creator_plugins_are_not_distributed():
    marketplace = MOD.load_marketplace_entries()
    bundle_members = MOD.load_bundle_members()
    for name in ("harness-creator", "prompt-creator"):
        manifest_path = ROOT / "plugins" / name / ".claude-plugin" / "plugin.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        assert manifest["distributable"] is False
        assert name not in marketplace
        assert name not in bundle_members


# --- NEVER_DISTRIBUTE: 固有名 denylist (フラグ漂流時の fail-closed 多層防御) -----

def test_never_distribute_contains_creator_plugins():
    # 恒久非配布の固有名が denylist に焼き込まれていること。
    assert "harness-creator" in MOD.NEVER_DISTRIBUTE
    assert "prompt-creator" in MOD.NEVER_DISTRIBUTE


def test_never_distribute_members_exist_on_disk():
    # denylist の各固有名が plugins/ 直下に実在すること。plugin 改名で旧名が denylist に
    # 残ると新名 plugin が denylist 外の通常 plugin として素通りし、二重ロックが無音失効
    # する — 存在しない名前の残置自体を FAIL にして改名時の更新漏れを fail-closed 化する。
    for name in MOD.NEVER_DISTRIBUTE:
        assert (ROOT / "plugins" / name).is_dir(), (
            f"NEVER_DISTRIBUTE の {name!r} が plugins/ に存在しない: "
            "plugin 改名時は denylist を同一 commit で更新すること"
        )


def test_never_distribute_true_flag_drift_emits_violation():
    # NEVER_DISTRIBUTE plugin が distributable:true へ漂流したら、フラグ駆動の逆ガードが
    # 無効化されても固有名検査が NEVER-DISTRIBUTE 違反を出す (fail-closed)。
    data = _data(
        {"name": "harness-creator", "version": "1", "description": "d",
         "distributable": True},
        skills=["run-a"],
    )
    errs = MOD.validate("harness-creator", data, set(), {})
    assert any("(NEVER-DISTRIBUTE)" in e for e in errs)


def test_never_distribute_missing_flag_emits_violation():
    # distributable キー欠落 (= 未宣言 True 扱い) でも NEVER-DISTRIBUTE 違反になる。
    data = _data(
        {"name": "prompt-creator", "version": "1", "description": "d"},
        skills=["run-a"],
    )
    errs = MOD.validate("prompt-creator", data, set(), {})
    assert any("(NEVER-DISTRIBUTE)" in e for e in errs)


def test_never_distribute_false_flag_no_violation():
    # 正常系: distributable:false を明示宣言していれば NEVER-DISTRIBUTE 違反は出ない。
    data = _data(
        {"name": "harness-creator", "version": "1", "description": "d",
         "distributable": False},
        skills=["run-a"],
    )
    errs = MOD.validate("harness-creator", data, set(), {})
    assert not any("(NEVER-DISTRIBUTE)" in e for e in errs)


def test_fix_does_not_register_never_distribute_on_flag_drift(tmp_path, monkeypatch, capsys):
    # NEVER_DISTRIBUTE plugin が distributable:true へ漂流していても、--fix は
    # marketplace.json へ自動登録せず、固有名検査の残違反で returncode 1 を返す。
    mj, bj = _setup_repo(
        MOD, tmp_path, monkeypatch,
        plugins={"harness-creator": {"name": "harness-creator", "version": "0.1.0",
                                   "description": "d", "distributable": True,
                                   "bundle_targets": ["full"]}},
        marketplace={"plugins": []},
        bundles={"bundles": [{"name": "full", "plugins": []}]},
    )
    rc = MOD.main(["--fix"])
    err = capsys.readouterr().err
    assert rc == 1
    assert any("(NEVER-DISTRIBUTE)" in line for line in err.splitlines())
    # marketplace/bundle へは自動登録されていない (--fix が固有名を skip)
    mk = json.loads(mj.read_text())
    assert all(p["name"] != "harness-creator" for p in mk["plugins"])
    bd = json.loads(bj.read_text())
    assert "harness-creator" not in bd["bundles"][0]["plugins"]
