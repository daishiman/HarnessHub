"""validate-plugin-package.py テスト群の共有 fixture (500 行上限による分割の共通層)。

被験 script のロードと plugin fixture 構築ヘルパをここに集約し、分割した 3 ファイル
(pure 関数/PKG-002〜005・PKG-006〜014・run_checks/main) が同じ実装を複製しないようにする。

実 repo の plugins は一切書き換えず、全 fixture は tmp_path 配下に構築する。
"""
import importlib.util
import json
from pathlib import Path

SCRIPT = (
    Path(__file__).resolve().parents[2]
    / "plugins" / "harness-creator" / "skills" / "assign-plugin-package-evaluator"
    / "scripts" / "validate-plugin-package.py"
)


def load_uut(module_name: str):
    """被験 script を module 名を変えてロードする (ファイル間で sys.modules を汚さない)。"""
    spec = importlib.util.spec_from_file_location(module_name, SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _plugin(base: Path, name: str = "demo") -> Path:
    """tmp_path/<name> を plugin ルートとして返す (.claude-plugin は呼び出し側で作成)。"""
    d = base / name
    d.mkdir(parents=True, exist_ok=True)
    return d


def _write_plugin_json(plugin_dir: Path, data: dict | None) -> None:
    cp = plugin_dir / ".claude-plugin"
    cp.mkdir(parents=True, exist_ok=True)
    if data is None:
        # 壊れた JSON を書く
        (cp / "plugin.json").write_text("{not json", encoding="utf-8")
    else:
        (cp / "plugin.json").write_text(json.dumps(data), encoding="utf-8")


def _write_package_contract(plugin_dir: Path, data: dict | None = None) -> None:
    """references/package-contract.json を書く (PKG-002 の contract 側必須ファイル)。"""
    refs = plugin_dir / "references"
    refs.mkdir(parents=True, exist_ok=True)
    if data is None:
        data = {"package_mode": "plugin", "entry_points": {}}
    (refs / "package-contract.json").write_text(json.dumps(data), encoding="utf-8")


def _write_skill(plugin_dir: Path, name: str, frontmatter: str | None,
                 body: str = "本文") -> Path:
    sk = plugin_dir / "skills" / name
    sk.mkdir(parents=True, exist_ok=True)
    md = sk / "SKILL.md"
    if frontmatter is None:
        md.write_text(body, encoding="utf-8")
    else:
        md.write_text(f"---\n{frontmatter}\n---\n{body}\n", encoding="utf-8")
    return md


def _full_required_fm() -> str:
    return (
        "name: demo-skill\n"
        "description: a demo\n"
        "kind: run\n"
        "responsibility_refs:\n  - r1\n"
        "schema_refs:\n  - s1\n"
        "manifest: m1"
    )
