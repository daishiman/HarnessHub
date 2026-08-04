"""plugin の hooks entry point 契約 (実 repo に対する不変条件テスト)。

package-contract.json の entry_points.hooks が「実際に Claude Code へ登録されている
hook」と一致することを、hooks/hooks.json・ディスク上のファイル・宣言の 3 者突合で検証する。
検査対象は scripts/validate-plugin-completeness.py ではなく repo そのものの状態のため、
同スクリプトの機能テスト (test_root__validate_plugin_completeness*.py) から分離してある。

判定ロジックは同スクリプト (HK-001..003) が単一 SSOT で、本ファイルはそれを実 repo へ
適用するだけにする。かつて本ファイルが dev-graph 専用に自前実装を持っていたため、
repo 全体の検査だけが宣言漏れを素通りする被覆差が生まれていた (HarnessHub-vf66)。
判定そのものの unit 被覆は test_root__validate_plugin_completeness_hooks_parity.py。
"""
import json
from pathlib import Path

from _plugin_completeness_fixtures import ROOT, load_uut

MOD = load_uut("plugin_hooks_entry_point_contract_uut")


def test_dev_graph_native_manifest_and_sidecar_are_separated():
    plugin_dir = ROOT / "plugins" / "dev-graph"
    manifest = json.loads(
        (plugin_dir / ".claude-plugin" / "plugin.json").read_text(encoding="utf-8")
    )
    contract = json.loads(
        (plugin_dir / "references" / "package-contract.json").read_text(encoding="utf-8")
    )

    assert {"distributable", "entry_points", "depends_on"}.isdisjoint(manifest)
    assert contract["distribution"]["distributable"] is False
    assert contract["depends_on"] == ["system-spec-harness", "system-dev-planner"]
    actual = {
        "skills": sorted(path.parent.name for path in plugin_dir.glob("skills/*/SKILL.md")),
        "agents": sorted(path.stem for path in plugin_dir.glob("agents/*.md")),
        "commands": sorted(path.stem for path in plugin_dir.glob("commands/*.md")),
    }
    declared = {
        kind: sorted(Path(name).stem if kind != "skills" else name for name in names)
        for kind, names in contract["entry_points"].items()
    }
    declared.pop("hooks")
    assert declared == actual

    for dependency in contract["depends_on"]:
        assert (ROOT / "plugins" / dependency).is_dir()


def test_every_plugin_with_hooks_satisfies_entry_point_parity():
    """宣言 = 登録 ⊆ 実体 を hooks を持つ全 plugin へ適用する。

    dev-graph 1 plugin だけを見ていると、他 plugin が hooks.json へ登録しながら
    宣言を怠っても検出できない。実 repo は常に parity を満たしていること。
    """
    violations: list[str] = []
    checked = 0
    for plugin_dir in sorted((ROOT / "plugins").iterdir()):
        if not plugin_dir.is_dir() or plugin_dir.name.startswith("."):
            continue
        if not any(plugin_dir.glob("hooks/*")):
            continue
        contract_path = plugin_dir / "references" / "package-contract.json"
        if not contract_path.is_file():
            continue
        contract = json.loads(contract_path.read_text(encoding="utf-8"))
        declared = {
            Path(name).stem
            for name in (contract.get("entry_points") or {}).get("hooks", [])
        }
        checked += 1
        violations.extend(MOD.validate_hook_entry_point_parity(
            plugin_dir.name, MOD.collect(plugin_dir), declared))

    # 「検査 0 件で緑」を成功と取り違えないよう、被覆そのものを assert する。
    assert checked >= 4, f"expected hooks-bearing plugins to be checked, got {checked}"
    assert violations == []


def test_dev_graph_registers_and_declares_the_same_hooks():
    """dev-graph は support module を含むため、3 者の内訳まで明示的に固定する。"""
    plugin_dir = ROOT / "plugins" / "dev-graph"
    contract = json.loads(
        (plugin_dir / "references" / "package-contract.json").read_text(encoding="utf-8")
    )
    declared = {Path(name).stem for name in contract["entry_points"]["hooks"]}
    data = MOD.collect(plugin_dir)
    registered = {Path(name).stem for name in data["registered_hooks"]}
    on_disk = {Path(name).stem for name in data["hooks"]}

    assert registered, "hooks.json must register at least one hook entry point"
    assert declared == registered
    assert declared <= on_disk
    # 残余 (責務分割で生まれた import 専用 module) は entry point ではないこと。
    for name in on_disk - declared:
        assert MOD.is_import_only_support_module(
            plugin_dir / "hooks" / f"{name}.py"), name
