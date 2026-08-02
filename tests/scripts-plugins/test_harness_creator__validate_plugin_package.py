"""validate-plugin-package.py の純関数と PKG-002〜005 の genuine 機能テスト。

now_iso / make_finding / parse_frontmatter / load_plugin_json / get_package_mode と、
plugin.json 必須キー (PKG-002)・skill/agent 名前衝突 (PKG-003)・SKILL.md frontmatter
(PKG-004)・subagent_refs 整合 (PKG-005) を担当する。

PKG-006〜014 は test_harness_creator__validate_plugin_package_s2.py、run_checks と main
は test_harness_creator__validate_plugin_package_cli.py が担当する (500 行上限による分割)。
共有 fixture は _validate_plugin_package_fixtures.py に集約している。

実 repo の plugins は一切書き換えず、全 fixture は tmp_path 配下に構築する。
"""
import os

from _validate_plugin_package_fixtures import (
    _full_required_fm,
    _plugin,
    _write_package_contract,
    _write_plugin_json,
    _write_skill,
    load_uut,
)

MOD = load_uut("validate_plugin_package_uut")


# ============================================================================
# now_iso / make_finding (純関数)
# ============================================================================

def test_now_iso_format():
    s = MOD.now_iso()
    # 2026-06-24T01:02:03Z 形式
    assert s.endswith("Z")
    assert "T" in s
    assert len(s) == 20


def test_make_finding_id_and_fields():
    f = MOD.make_finding("PKG-004", 7, "loc/x", "evi", severity="P1",
                         suggested_fix="fix it", auto_fixable=True)
    assert f["id"] == "F-PKG004-007"
    assert f["pkg_id"] == "PKG-004"
    assert f["severity"] == "P1"
    assert f["location"] == "loc/x"
    assert f["evidence"] == "evi"
    assert f["suggested_fix"] == "fix it"
    assert f["auto_fixable"] is True


def test_make_finding_defaults():
    f = MOD.make_finding("PKG-002", 1, "l", "e")
    assert f["severity"] == "P0"
    assert f["auto_fixable"] is False
    assert f["suggested_fix"] == ""


# ============================================================================
# parse_frontmatter
# ============================================================================

def test_parse_frontmatter_scalar_and_list():
    text = "---\nname: foo\nkind: run\nrefs:\n  - a\n  - b\n---\nbody"
    fm = MOD.parse_frontmatter(text)
    assert fm["name"] == "foo"
    assert fm["kind"] == "run"
    assert fm["refs"] == ["a", "b"]


def test_parse_frontmatter_no_opening_fence_returns_none():
    assert MOD.parse_frontmatter("no frontmatter here") is None


def test_parse_frontmatter_unterminated_returns_none():
    assert MOD.parse_frontmatter("---\nname: foo\nno closing fence") is None


def test_parse_frontmatter_dangling_list_item_ignored():
    # current_key が無い状態の "- x" は無視される
    text = "---\n- orphan\nname: foo\n---\nb"
    fm = MOD.parse_frontmatter(text)
    assert fm == {"name": "foo"}


# ============================================================================
# load_plugin_json / get_package_mode
# ============================================================================

def test_load_plugin_json_ok(tmp_path):
    p = _plugin(tmp_path)
    _write_plugin_json(p, {"name": "x", "package_mode": "plugin"})
    data = MOD.load_plugin_json(p)
    assert data["name"] == "x"


def test_load_plugin_json_missing_returns_none(tmp_path):
    p = _plugin(tmp_path)
    assert MOD.load_plugin_json(p) is None


def test_load_plugin_json_broken_returns_none(tmp_path):
    p = _plugin(tmp_path)
    _write_plugin_json(p, None)
    assert MOD.load_plugin_json(p) is None


def test_get_package_mode_default_skill_only(tmp_path):
    p = _plugin(tmp_path)
    assert MOD.get_package_mode(p) == "skill-only"


def test_get_package_mode_from_json(tmp_path):
    p = _plugin(tmp_path)
    _write_plugin_json(p, {"name": "x", "package_mode": "plugin"})
    assert MOD.get_package_mode(p) == "plugin"


# ============================================================================
# check_pkg_002 : plugin.json 必須キー
# ============================================================================

def test_pkg_002_missing_plugin_json(tmp_path):
    p = _plugin(tmp_path)
    fs = MOD.check_pkg_002(p)
    assert len(fs) == 1
    assert "plugin.json が存在しない" in fs[0]["evidence"]


def test_pkg_002_all_keys_present_no_findings(tmp_path):
    p = _plugin(tmp_path)
    _write_plugin_json(p, {k: "v" for k in MOD.PLUGIN_JSON_REQUIRED})
    _write_package_contract(p, {k: "v" for k in MOD.PACKAGE_CONTRACT_REQUIRED})
    assert MOD.check_pkg_002(p) == []


def test_pkg_002_missing_some_keys(tmp_path):
    p = _plugin(tmp_path)
    _write_plugin_json(p, {"name": "x", "version": "1"})
    _write_package_contract(p, {})
    fs = MOD.check_pkg_002(p)
    evid = {f["evidence"] for f in fs}
    # plugin.json 側 description / contract 側 package_mode + entry_points が欠落
    assert any("package_mode" in e for e in evid)
    assert any("entry_points" in e for e in evid)
    assert any("description" in e for e in evid)
    assert len(fs) == 3


def test_pkg_002_missing_package_contract(tmp_path):
    p = _plugin(tmp_path)
    _write_plugin_json(p, {k: "v" for k in MOD.PLUGIN_JSON_REQUIRED})
    fs = MOD.check_pkg_002(p)
    assert len(fs) == 1
    assert "package-contract.json" in fs[0]["evidence"]


def test_pkg_002_accepts_scoped_dependencies_within_allow_list(tmp_path):
    p = _plugin(tmp_path)
    _write_plugin_json(p, {k: "v" for k in MOD.PLUGIN_JSON_REQUIRED})
    _write_package_contract(p, {
        "package_mode": "bundle",
        "entry_points": {"skills": ["run-a", "run-b"]},
        "depends_on": ["dependency-a"],
        "skill_dependencies": {"run-a": ["dependency-a"], "run-b": []},
    })
    assert MOD.check_pkg_002(p) == []


def test_pkg_002_rejects_invalid_scoped_dependency_projection(tmp_path):
    p = _plugin(tmp_path)
    _write_plugin_json(p, {k: "v" for k in MOD.PLUGIN_JSON_REQUIRED})
    _write_package_contract(p, {
        "package_mode": "bundle",
        "entry_points": {"skills": ["run-a"]},
        "depends_on": ["dependency-a"],
        "skill_dependencies": {
            "run-missing": ["dependency-a"],
            "run-a": ["dependency-b", "dependency-b"],
        },
    })
    evidence = [item["evidence"] for item in MOD.check_pkg_002(p)]
    assert any("entry_points.skills 未宣言" in item for item in evidence)
    assert any("重複" in item for item in evidence)
    assert any("depends_on 外" in item for item in evidence)


# ============================================================================
# check_pkg_003 : skill/agent 名前衝突 (実体 vs symlink)
# ============================================================================

def test_pkg_003_no_collision(tmp_path):
    p = _plugin(tmp_path, "demo")
    _write_plugin_json(p, {"name": "demo"})
    _write_skill(p, "uniq-skill", _full_required_fm())
    assert MOD.check_pkg_003(p) == []


def test_pkg_003_skill_name_collision(tmp_path):
    a = _plugin(tmp_path, "demo")
    b = _plugin(tmp_path, "other")
    _write_plugin_json(a, {"name": "demo"})
    _write_plugin_json(b, {"name": "other"})
    _write_skill(a, "shared", _full_required_fm())
    _write_skill(b, "shared", _full_required_fm())
    fs = MOD.check_pkg_003(a)
    assert len(fs) == 1
    assert "shared" in fs[0]["evidence"]
    assert "衝突" in fs[0]["evidence"]


def test_pkg_003_symlink_not_owner(tmp_path):
    a = _plugin(tmp_path, "demo")
    b = _plugin(tmp_path, "other")
    _write_plugin_json(a, {"name": "demo"})
    _write_plugin_json(b, {"name": "other"})
    real = _write_skill(a, "shared", _full_required_fm())
    # b は a の skill ディレクトリへの symlink (共有配備) -> 所有者カウント対象外
    (b / "skills").mkdir(parents=True, exist_ok=True)
    os.symlink(real.parent, b / "skills" / "shared")
    # demo (実体所有) のみ owner -> 衝突なし
    assert MOD.check_pkg_003(a) == []


def test_pkg_003_identical_feedback_copy_is_source_owned(tmp_path):
    """Distributable feedback copies share the canonical namespace owner."""
    source_plugin = _plugin(tmp_path, "harness-creator")
    copied_plugin = _plugin(tmp_path, "publisher")
    _write_plugin_json(source_plugin, {"name": "harness-creator"})
    _write_plugin_json(copied_plugin, {"name": "publisher"})
    source = _write_skill(source_plugin, "run-skill-feedback", _full_required_fm())
    copied = _write_skill(copied_plugin, "run-skill-feedback", _full_required_fm())
    (source.parent / "workflow-manifest.json").write_text('{"version": 1}\n', encoding="utf-8")
    (copied.parent / "workflow-manifest.json").write_text('{"version": 1}\n', encoding="utf-8")

    assert MOD.check_pkg_003(source_plugin) == []
    assert MOD.check_pkg_003(copied_plugin) == []

    (copied.parent / "workflow-manifest.json").write_text('{"version": 2}\n', encoding="utf-8")
    findings = MOD.check_pkg_003(copied_plugin)
    assert len(findings) == 1
    assert "run-skill-feedback" in findings[0]["evidence"]


def test_pkg_003_agent_name_collision(tmp_path):
    a = _plugin(tmp_path, "demo")
    b = _plugin(tmp_path, "other")
    _write_plugin_json(a, {"name": "demo"})
    _write_plugin_json(b, {"name": "other"})
    for plug in (a, b):
        (plug / "agents").mkdir(parents=True, exist_ok=True)
        (plug / "agents" / "judge.md").write_text("agent", encoding="utf-8")
    fs = MOD.check_pkg_003(a)
    assert len(fs) == 1
    assert "agent" in fs[0]["evidence"]
    assert "judge" in fs[0]["evidence"]


def test_pkg_003_agent_symlink_not_owner(tmp_path):
    a = _plugin(tmp_path, "demo")
    b = _plugin(tmp_path, "other")
    _write_plugin_json(a, {"name": "demo"})
    _write_plugin_json(b, {"name": "other"})
    (a / "agents").mkdir(parents=True)
    real_agent = a / "agents" / "judge.md"
    real_agent.write_text("agent", encoding="utf-8")
    (b / "agents").mkdir(parents=True)
    # b は a の agent ファイルへの symlink -> 所有者カウント対象外 (line 132-133)
    os.symlink(real_agent, b / "agents" / "judge.md")
    assert MOD.check_pkg_003(a) == []


def test_pkg_003_ignores_dirs_without_manifest(tmp_path):
    # plugins_root に .claude-plugin を持たないディレクトリがあると continue (line 121-122)
    a = _plugin(tmp_path, "demo")
    _write_plugin_json(a, {"name": "demo"})
    _write_skill(a, "uniq", _full_required_fm())
    # マニフェスト無しディレクトリ + 通常ファイルを兄弟に配置
    (tmp_path / "nomanifest").mkdir()
    (tmp_path / "nomanifest" / "skills").mkdir()
    (tmp_path / "loose.txt").write_text("x", encoding="utf-8")
    assert MOD.check_pkg_003(a) == []


# ============================================================================
# check_pkg_004 : SKILL.md frontmatter 必須/推奨キー
# ============================================================================

def test_pkg_004_no_skills_dir(tmp_path):
    p = _plugin(tmp_path)
    assert MOD.check_pkg_004(p) == []


def test_pkg_004_full_frontmatter_clean(tmp_path):
    p = _plugin(tmp_path)
    _write_skill(p, "sk", _full_required_fm())
    assert MOD.check_pkg_004(p) == []


def test_pkg_004_reasoned_manifest_exemption_is_mechanical_alternative(tmp_path):
    p = _plugin(tmp_path)
    fm = (
        "name: demo-skill\n"
        "description: a demo\n"
        "kind: run\n"
        "responsibility_refs: [prompts/R1.md]\n"
        "schema_refs: [schemas/output.schema.json]\n"
        "completeness_exempt:\n"
        "  - \"manifest: inline goal loop is the runtime SSOT\""
    )
    _write_skill(p, "sk", fm)
    assert MOD.check_pkg_004(p) == []


def test_pkg_004_empty_values_and_unreasoned_exemption_fail(tmp_path):
    p = _plugin(tmp_path)
    fm = (
        "name: demo-skill\n"
        "description: a demo\n"
        "kind: run\n"
        "responsibility_refs: []\n"
        "schema_refs: \"\"\n"
        "manifest: \"\"\n"
        "completeness_exempt:\n"
        "  - \"manifest:\""
    )
    _write_skill(p, "sk", fm)
    fs = MOD.check_pkg_004(p)
    evid = {f["evidence"] for f in fs}
    assert any("responsibility_refs" in e for e in evid)
    assert any("schema_refs" in e for e in evid)
    assert any("manifest" in e for e in evid)


def test_pkg_004_no_frontmatter(tmp_path):
    p = _plugin(tmp_path)
    _write_skill(p, "sk", None)
    fs = MOD.check_pkg_004(p)
    assert len(fs) == 1
    assert "frontmatter が解析できない" in fs[0]["evidence"]


def test_pkg_004_missing_required_and_recommended(tmp_path):
    p = _plugin(tmp_path)
    # name のみ -> description/kind が必須欠落、推奨 3 つも欠落
    _write_skill(p, "sk", "name: only")
    fs = MOD.check_pkg_004(p)
    evid = [f["evidence"] for f in fs]
    assert any("必須キー欠落: description" in e for e in evid)
    assert any("必須キー欠落: kind" in e for e in evid)
    # 推奨キーは P1
    p1 = [f for f in fs if f["severity"] == "P1"]
    assert len(p1) == 3


# ============================================================================
# check_pkg_005 : subagent_refs 宣言と実体の整合
# ============================================================================

def test_pkg_005_no_agents_dir(tmp_path):
    p = _plugin(tmp_path)
    _write_skill(p, "sk", _full_required_fm())
    assert MOD.check_pkg_005(p) == []


def test_pkg_005_declared_agent_missing(tmp_path):
    p = _plugin(tmp_path)
    (p / "agents").mkdir(parents=True)
    (p / "agents" / "present.md").write_text("a", encoding="utf-8")
    fm = _full_required_fm() + "\nsubagent_refs:\n  - present\n  - ghost"
    _write_skill(p, "sk", fm)
    fs = MOD.check_pkg_005(p)
    assert len(fs) == 1
    assert "ghost" in fs[0]["evidence"]


def test_pkg_005_all_declared_present(tmp_path):
    p = _plugin(tmp_path)
    (p / "agents").mkdir(parents=True)
    (p / "agents" / "judge.md").write_text("a", encoding="utf-8")
    fm = _full_required_fm() + "\nsubagent_refs:\n  - judge"
    _write_skill(p, "sk", fm)
    assert MOD.check_pkg_005(p) == []
