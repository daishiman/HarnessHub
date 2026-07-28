"""scripts/validate-plugin-completeness.py テスト群の共有 fixture ビルダ。

同スクリプトのテストは 500 行上限のため 3 ファイルへ分割してある
(収集/検証・登録予防層/CLI・実 repo の hooks entry point 契約)。擬似 plugin ツリーの
構築ヘルパはどのファイルでも同じ意味で使うため、複製して drift させずここへ集約する
(tests/criteria/_criteria_helpers.py と同じ位置づけ)。

``__init__.py`` を置かないことで pytest の prepend import mode が
``tests/scripts-root`` を sys.path へ入れるため、各 test file は
``from _plugin_completeness_fixtures import ...`` で参照できる。
"""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "validate-plugin-completeness.py"


def load_uut(module_name: str):
    """検査対象スクリプトを独立 module として読み込む。

    テストは module 属性 (ROOT/PLUGINS_DIR/MARKETPLACE_JSON/BUNDLES_JSON) を
    monkeypatch で差し替えるため、test file ごとに別名で読み込んで patch が
    ファイル間へ漏れないようにする。
    """
    spec = importlib.util.spec_from_file_location(module_name, SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _make_plugin(base: Path, name: str, manifest: dict | None = None,
                 *, skills=(), agents=(), commands=(), hooks=(),
                 scripts=(), config=()) -> Path:
    d = base / name
    d.mkdir(parents=True)
    for s in skills:
        sd = d / "skills" / s
        sd.mkdir(parents=True)
        (sd / "SKILL.md").write_text(f"---\nname: {s}\n---\nbody\n", encoding="utf-8")
    for a in agents:
        (d / "agents").mkdir(exist_ok=True)
        (d / "agents" / a).write_text("agent", encoding="utf-8")
    for c in commands:
        (d / "commands").mkdir(exist_ok=True)
        (d / "commands" / c).write_text("cmd", encoding="utf-8")
    for h in hooks:
        (d / "hooks").mkdir(exist_ok=True)
        (d / "hooks" / h).write_text("#!/bin/sh\n", encoding="utf-8")
    for sc in scripts:
        sd = d / "scripts"
        sd.mkdir(exist_ok=True)
        (sd / sc).write_text("# py\n", encoding="utf-8")
    for cf in config:
        (d / "config").mkdir(exist_ok=True)
        (d / "config" / cf).write_text("{}", encoding="utf-8")
    if manifest is not None:
        md = d / ".claude-plugin"
        md.mkdir(parents=True)
        (md / "plugin.json").write_text(json.dumps(manifest), encoding="utf-8")
    return d


def _mk(*names) -> dict[str, str]:
    """marketplace_entries dict {name: ./plugins/name} を作る簡易ヘルパ。"""
    return {n: f"./plugins/{n}" for n in names}


def _data(manifest, **assets):
    """collect() 相当の asset dict を組み立てる (validate() への直接入力)。"""
    base = {"skills": [], "agents": [], "commands": [],
            "hooks": [], "scripts": [], "config": []}
    base.update(assets)
    base["manifest"] = manifest
    return base


def _setup_repo(mod, tmp_path, monkeypatch, *, plugins, marketplace, bundles):
    """tmp に plugins/ marketplace.json bundles.json を構築し globals を向ける。

    ``mod`` は各 test file が load_uut() で読み込んだ検査対象 module。module 別名で
    読み込むため、patch 先を呼び出し側から受け取る。
    """
    pdir = tmp_path / "plugins"
    pdir.mkdir(exist_ok=True)
    for name, manifest in plugins.items():
        _make_plugin(pdir, name, manifest=manifest, skills=["run-a"])
    mj = tmp_path / ".claude-plugin" / "marketplace.json"
    mj.parent.mkdir(parents=True, exist_ok=True)
    mj.write_text(json.dumps(marketplace, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    bj = tmp_path / ".claude-plugin" / "bundles.json"
    bj.write_text(json.dumps(bundles, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    monkeypatch.setattr(mod, "ROOT", tmp_path)
    monkeypatch.setattr(mod, "PLUGINS_DIR", pdir)
    monkeypatch.setattr(mod, "MARKETPLACE_JSON", mj)
    monkeypatch.setattr(mod, "BUNDLES_JSON", bj)
    return mj, bj
