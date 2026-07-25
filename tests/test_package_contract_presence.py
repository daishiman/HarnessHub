"""package-contract.json の「全 plugin 被覆 (presence)」に対する fail-closed 回帰テスト。

HarnessHub-dbb (2026-07-21 検出 / 2026-07-24 是正):
  plugins/ 配下の plugin のうち references/package-contract.json (sidecar) を持たない
  ものは、plan-live-trials.py の _entry_skills() にも package-contract schema 検査にも
  一切載らない。sidecar を持つ plugin だけを走査する既存の状態検査
  (test_package_contract_entry_points.py / test_package_contract_schema.py) は、
  「sidecar があるものが正しいか」は見張れても「そもそも sidecar が無い plugin が
  丸ごと母集団から消えている」被覆欠落 (btn/zrn の一段上) は原理的に検出できない。

  この失敗も「壊れている」形では現れず、単に対象が母集団から消える。よって
  真の母集団 = plugins/*/.claude-plugin/plugin.json (plugin 存在の SSOT) を数え、
  各 plugin が sidecar を持つことを状態検査として fail-closed に固定する。

本ファイルが固定する不変条件:
  - 母集団は plugin.json (validate-plugin-packages.discover_plugins と同一 SSOT) から取る
  - 全 plugin が references/package-contract.json を持つ (allowlist に理由付きで
    載る例外を除く)
  - allowlist が stale 化 (sidecar 追加済みなのに例外が残る) していない

allowlist の空文字理由は許容しない (stale な例外を理由ごと腐らせないため)。
実 repo の plugins は一切書き換えない。
"""
import importlib.util
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
PLUGINS_DIR = ROOT / "plugins"

# package 検査ラッパーの plugin 発見 SSOT を import し、母集団定義を一箇所に固定する
# (dash 入り script のため importlib.util.spec_from_file_location を使う)。
_VPP_PATH = ROOT / "scripts" / "validate-plugin-packages.py"
_VPP_SPEC = importlib.util.spec_from_file_location("validate_plugin_packages_presence", _VPP_PATH)
VPP = importlib.util.module_from_spec(_VPP_SPEC)
_VPP_SPEC.loader.exec_module(VPP)


# sidecar 不在を許容する plugin と、その理由。空文字の理由は許容しない。
# 現状は全 plugin が sidecar を持つため空。将来 sidecar を持てない正当な理由が
# 生じた場合のみ、追跡課題への参照を添えてここへ載せる。
ABSENCE_ALLOWLIST: dict[str, str] = {}


def _all_plugin_dirs() -> list[Path]:
    """plugin 存在の SSOT = .claude-plugin/plugin.json を持つディレクトリ (真の母集団)。"""
    return sorted(
        path.parents[1]
        for path in PLUGINS_DIR.glob("*/.claude-plugin/plugin.json")
    )


def _has_contract(plugin_dir: Path) -> bool:
    return (plugin_dir / "references" / "package-contract.json").is_file()


def test_population_is_nonempty():
    """glob が 0 件でも緑になる空振りを防ぐ (母集団が消えたら赤くする)。"""
    assert len(_all_plugin_dirs()) >= 20


def test_population_matches_package_check_ssot():
    """本テストの母集団が package 検査ラッパーの discover_plugins と厳密一致する。

    片方だけが別 glob へずれると「第三の盲点」が生まれる。両者を同一 SSOT へ
    束縛し、発見規則の分岐を fail-closed で禁じる。
    """
    presence_pop = {p.name for p in _all_plugin_dirs()}
    package_check_pop = set(VPP.discover_plugins())
    assert presence_pop == package_check_pop, (
        "presence テストの母集団と validate-plugin-packages.discover_plugins が乖離: "
        f"presence-only={sorted(presence_pop - package_check_pop)} "
        f"package-check-only={sorted(package_check_pop - presence_pop)}"
    )


@pytest.mark.parametrize("plugin_dir", _all_plugin_dirs(), ids=lambda p: p.name)
def test_every_plugin_has_package_contract(plugin_dir: Path):
    """全 plugin が references/package-contract.json を持つ (dbb の被覆欠落を fail-closed 化)。

    sidecar が無い plugin は plan-live-trials.py の対象からも package-contract schema
    検査からも静かに消える。allowlist に理由付きで載っていない限り、欠落は fail とする。
    allowlist に載る場合は return せず skip にして「例外が効いている」ことをレポートへ残す。
    """
    reason = ABSENCE_ALLOWLIST.get(plugin_dir.name)
    # ① sidecar を持つ → 追加検証不要 (pass)
    if _has_contract(plugin_dir):
        return
    # ② sidecar 無し + allowlist に理由あり → skip で「例外が効いている」ことをレポートへ残す。
    #    None (未登録) と "" (理由なし) は両方 ③ へ倒すため strip() で二段ガードする。
    if reason and reason.strip():
        pytest.skip(f"{plugin_dir.name}: sidecar 不在を allowlist で許容中 — {reason}")
    # ③ sidecar 無し + 理由なし → fail。結末 (母集団から静かに消える) を message に明示する。
    assert _has_contract(plugin_dir), (
        f"{plugin_dir.name} は references/package-contract.json を持たない。"
        "sidecar の無い plugin は plan-live-trials.py の live-trial 計画からも "
        "package-contract schema 検査からも母集団ごと静かに消える (HarnessHub-dbb)。"
        "sidecar を追加するか、追跡課題への参照を理由に添えて "
        "ABSENCE_ALLOWLIST へ登録すること。"
    )


def test_absence_allowlist_entries_still_needed():
    """allowlist が stale 化 (sidecar 追加済みなのに例外が残る) していないか検査する。"""
    for name, reason in ABSENCE_ALLOWLIST.items():
        plugin_dir = PLUGINS_DIR / name
        assert plugin_dir.is_dir(), f"allowlist の '{name}' は存在しない plugin"
        assert reason.strip(), f"allowlist の '{name}' に理由が無い"
        assert not _has_contract(plugin_dir), (
            f"allowlist の '{name}' は sidecar を既に持つ。"
            "ABSENCE_ALLOWLIST から削除すること"
        )
