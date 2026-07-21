"""package-contract.json の entry_points 宣言に対する repo 全域の回帰テスト。

HarnessHub-btn (2026-07-21): mf-kessai-invoice-check / slide-report-generator は
references/package-contract.json を持ちながら entry_points を宣言していなかった。
plan-live-trials.py の _entry_skills() は sidecar だけを SSOT として読むため、
両 plugin は ValueError で計画不能になり、配下 skill が live-trial の検証対象から
「静かに」外れていた (plugin.json 側の entry_points は参照されない)。

この失敗は「壊れていることが分かる」形では現れず、単に対象が消える。よって
状態を見る検査 (= 本ファイル) で fail-closed に固定する。

検証する不変条件:
  - sidecar を持つ全 plugin で _entry_skills() が例外を出さない (btn の直接の再現)
  - plugin_name が配置ディレクトリ名と一致する
  - 宣言された skill は SKILL.md が実在する (幽霊宣言の禁止)
  - plugin が所有する実体 skill が宣言から漏れていない (被覆欠落の禁止)

import 経路: dash 入り script のため importlib.util.spec_from_file_location
(test_plugin_lint_coverage.py のパターンに倣う)。
"""
import importlib.util
import json
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
PLAN_SCRIPT = (
    ROOT / "plugins" / "harness-creator" / "skills" / "run-skill-live-trial"
    / "scripts" / "plan-live-trials.py"
)
SPEC = importlib.util.spec_from_file_location("plan_live_trials", PLAN_SCRIPT)
PLAN = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PLAN)

# entry_points.skills の被覆を要求しない plugin と、その理由。
# 空文字の理由は許容しない (stale な例外を理由ごと腐らせないため)。
UNDER_DECLARED_ALLOWLIST: dict[str, str] = {
    "harness-creator": (
        "HarnessHub-zrn で追跡。実体 30 skill に対し宣言 1 件で、"
        "被覆是正には live-trial 予算方針の決定が要るため別課題へ分離する。"
    ),
}


def _contract_dirs() -> list[Path]:
    return sorted(
        path.parents[1]
        for path in ROOT.glob("plugins/*/references/package-contract.json")
    )


def _contract(plugin_dir: Path) -> dict:
    path = plugin_dir / "references" / "package-contract.json"
    return json.loads(path.read_text(encoding="utf-8"))


def _owned_skills(plugin_dir: Path) -> set[str]:
    """plugin が所有する実体 skill 名。

    skills/<name> が symlink のものは他 plugin (harness-creator) の共有実体を
    指すだけで所有物ではないため除外する。所有者側で宣言されるべきもの。
    """
    return {
        path.parent.name
        for path in plugin_dir.glob("skills/*/SKILL.md")
        if not (plugin_dir / "skills" / path.parent.name).is_symlink()
    }


@pytest.mark.parametrize("plugin_dir", _contract_dirs(), ids=lambda p: p.name)
def test_entry_skills_resolves(plugin_dir: Path):
    """plan-live-trials が entry_points を解決できる (btn の直接再現)。

    _entry_skills() が例外を出さないこと自体が btn の直接再現。空宣言は
    所有実体 skill が 0 件 (skills/ が全て他 plugin への symlink) の場合に限り
    正当とする。skill-governance-automation のように自前 skill を持たない plugin に
    実体 skill を強制はしないが、所有物があるのに空なら被覆欠落として fail させる。
    """
    skills = PLAN._entry_skills(plugin_dir)
    if not skills:
        owned = _owned_skills(plugin_dir)
        assert not owned, (
            f"{plugin_dir.name}: entry_points.skills が空だが所有実体 skill が "
            f"存在する (live-trial 対象から静かに外れる): {sorted(owned)}"
        )



@pytest.mark.parametrize("plugin_dir", _contract_dirs(), ids=lambda p: p.name)
def test_plugin_name_matches_directory(plugin_dir: Path):
    contract = _contract(plugin_dir)
    assert contract.get("plugin_name") == plugin_dir.name, (
        f"{plugin_dir.name}: package-contract.plugin_name が配置ディレクトリ名と不一致"
    )


@pytest.mark.parametrize("plugin_dir", _contract_dirs(), ids=lambda p: p.name)
def test_declared_skills_exist_on_disk(plugin_dir: Path):
    for skill in PLAN._entry_skills(plugin_dir):
        assert (plugin_dir / "skills" / skill / "SKILL.md").is_file(), (
            f"{plugin_dir.name}: 宣言された skill '{skill}' の SKILL.md が無い"
        )


@pytest.mark.parametrize("plugin_dir", _contract_dirs(), ids=lambda p: p.name)
def test_owned_skills_are_declared(plugin_dir: Path):
    """所有する実体 skill が entry_points から漏れていない (被覆欠落の禁止)。"""
    owned = _owned_skills(plugin_dir)
    declared = set(PLAN._entry_skills(plugin_dir))
    reason = UNDER_DECLARED_ALLOWLIST.get(plugin_dir.name)
    missing = sorted(owned - declared)
    if missing and reason:
        # 黙って return せず skip にする: 例外を「効いている」状態でレポートに残す。
        pytest.skip(f"{plugin_dir.name}: entry_points 未宣言を許容中 — {reason}")
    assert not missing, (
        f"{plugin_dir.name}: 所有 skill が entry_points.skills 未宣言で "
        f"live-trial 対象から外れる: {missing}"
    )
    # declared - owned (symlink 共有 skill の宣言) は禁じない。所有者以外が宣言しても
    # 実在性は test_declared_skills_exist_on_disk が担保し、本検査の関心は漏れの側。


def test_allowlist_entries_are_still_needed():
    """allowlist が stale 化 (是正済みなのに例外が残る) していないか検査する。"""
    for name, reason in UNDER_DECLARED_ALLOWLIST.items():
        plugin_dir = ROOT / "plugins" / name
        assert plugin_dir.is_dir(), f"allowlist の '{name}' は存在しない plugin"
        assert reason.strip(), f"allowlist の '{name}' に理由が無い"
        missing = _owned_skills(plugin_dir) - set(PLAN._entry_skills(plugin_dir))
        assert missing, (
            f"allowlist の '{name}' は宣言漏れが解消済み。"
            "UNDER_DECLARED_ALLOWLIST から削除すること"
        )
