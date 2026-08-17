"""全スクリプトの import smoke テスト (ハーネス仕様: scripts 機械的カバレッジ底上げ)。

各スクリプトを importlib で読み込み、module-body(import/定数/関数定義/argparse 構築の一部)が
例外なくロードできることを検証する。`__name__ != "__main__"` のため main() は実行されない(副作用なし)。
import 自体が失敗するスクリプトは「壊れている」という本物の検出。standalone import できない既知の
スクリプト(repo-root を sys.path 前提にした相対 import 等)は SKIP_REASON に理由付きで除外する。
"""
import importlib.util
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

# standalone import が本質的に不可能なスクリプト(理由付き honest skip)。
# import 時に file 読込/argparse 実行等の副作用を持つ = module-level 実行の設計 smell。
# follow-up: main ガード化して import-safe にすれば smoke 対象へ復帰できる。
SKIP_REASON: dict[str, str] = {
    "plugins/skill-intake/scripts/_jsonschema_compat.py": "import 時に互換 shim を実行し standalone import 不可",
    "plugins/skill-intake/skills/run-intake-interview/scripts/validate-interview-json.py": "import 時に file 読込の副作用あり",
    "plugins/skill-intake/skills/run-intake-visualize/scripts/verify-visuals.py": "import 時に file 読込の副作用あり",
}


def _script_files() -> list[Path]:
    files: list[Path] = []
    sd = ROOT / "scripts"
    if sd.is_dir():
        files += [f for f in sd.glob("*.py") if not f.is_symlink() and f.name != "sitecustomize.py"]
    for f in (ROOT / "plugins").rglob("scripts/*.py"):
        if not f.is_symlink() and "__pycache__" not in f.parts:
            files.append(f)
    return sorted(files)


_SCRIPTS = _script_files()


def _import_roots(script: Path) -> list[Path]:
    """本番 entrypoint が sys.path へ入れているのと同じディレクトリ集合を返す。

    skills/<skill>/scripts/ 配下のモジュールは、同階層 (state_transition_common) と
    owning plugin の scripts/ (foundation_provenance) の両方から素の名前で import する。
    apply-spec-transition.py は SCRIPT_DIR と SUPPORT_SCRIPTS の両方を sys.path へ入れて
    いるので本番では解決するが、ここが片方しか入れていないと smoke だけが落ちる。
    """
    roots = [script.parent, ROOT / "scripts"]
    parts = script.relative_to(ROOT).parts
    if parts[0] == "plugins" and len(parts) > 2:
        roots.insert(1, ROOT / "plugins" / parts[1] / "scripts")
    return [root for root in dict.fromkeys(roots) if root.is_dir()]


@pytest.mark.parametrize("script", _SCRIPTS, ids=[str(f.relative_to(ROOT)) for f in _SCRIPTS])
def test_script_imports_without_error(script):
    rel = str(script.relative_to(ROOT))
    if rel in SKIP_REASON:
        pytest.skip(SKIP_REASON[rel])
    roots = _import_roots(script)
    for root in reversed(roots):
        sys.path.insert(0, str(root))
    # 対象が推移的に持ち込んだモジュールを毎回捨てる。残すと後続テストの import が
    # 「先に誰かが読んでくれていたから通った」状態になり、単体実行と CI で結果が割れる
    # (実際 state_transition_foundation.py がこの経路で順序依存の flake になっていた)。
    modules_before = set(sys.modules)
    mod_name = "smoke_" + rel.replace("/", "_").replace("-", "_").removesuffix(".py")
    spec = importlib.util.spec_from_file_location(mod_name, script)
    assert spec and spec.loader, f"cannot load spec for {rel}"
    mod = importlib.util.module_from_spec(spec)
    # @dataclass + `from __future__ import annotations` を持つスクリプトは、dataclasses._is_type が
    # sys.modules[cls.__module__].__dict__ を引くため、exec 前にモジュールを登録しておく
    # (未登録だと Python 3.11 で AttributeError: 'NoneType' object has no attribute '__dict__')。
    sys.modules[mod_name] = mod
    try:
        spec.loader.exec_module(mod)  # __main__ ガードにより main() は走らない
    finally:
        for name in set(sys.modules) - modules_before:
            sys.modules.pop(name, None)
        for _ in roots:
            sys.path.pop(0)


def test_smoke_covers_scripts():
    """少なくとも 30 本以上のスクリプトを smoke 対象にしている(計測の網羅性自体を固定)。"""
    assert len(_SCRIPTS) >= 30


def test_skill_scripts_can_see_their_owning_plugin_scripts_dir():
    """skills/<skill>/scripts/ の対象には owning plugin の scripts/ を必ず通す。

    ここが欠けると素の `import foundation_provenance` が単体実行でだけ失敗し、
    フルスイートでは先行テストの sys.modules 残留で通ってしまう。CI の赤が再現不能に
    なって無関係な PR へ誤帰属するため、順序ではなく sys.path で保証する。
    """
    script = (
        ROOT
        / "plugins/system-spec-harness/skills/run-system-spec-elicit/scripts"
        / "state_transition_foundation.py"
    )
    assert script.is_file(), "回帰の見張り対象が移動している。パスを更新すること"
    roots = _import_roots(script)
    assert script.parent in roots
    assert ROOT / "plugins/system-spec-harness/scripts" in roots
    assert ROOT / "scripts" in roots


def test_import_roots_are_scoped_to_the_owning_plugin():
    """他 plugin の scripts/ は混ぜない(素の import が偶然解決するのを防ぐ)。"""
    script = (
        ROOT
        / "plugins/system-spec-harness/skills/run-system-spec-elicit/scripts"
        / "state_transition_foundation.py"
    )
    roots = _import_roots(script)
    others = [root for root in roots if root.is_relative_to(ROOT / "plugins")]
    assert all(root.is_relative_to(ROOT / "plugins/system-spec-harness") for root in others)
