"""plugin の hooks entry point 契約 (実 repo に対する不変条件テスト)。

package-contract.json の entry_points.hooks が「実際に Claude Code へ登録されている
hook」と一致することを、hooks/hooks.json・ディスク上のファイル・宣言の 3 者突合で検証する。
検査対象は scripts/validate-plugin-completeness.py ではなく repo そのものの状態のため、
同スクリプトの機能テスト (test_root__validate_plugin_completeness*.py) から分離してある。

hook 本体が 500 行上限で分割されると import 専用の support module が hooks/ に現れる。
「hooks/ の .py 一覧 = entry point」という代理指標はこれを未宣言違反として誤検出するため、
本ファイルは hooks.json の登録内容を正とし、残りが本当に import 専用かまで検査する。
"""
import json
from pathlib import Path

import pytest

from _plugin_completeness_fixtures import ROOT
def _registered_hook_stems(plugin_dir: Path) -> set[str]:
    """hooks/hooks.json が Claude Code へ entry point として登録している hook の stem。

    package-contract の宣言と突合すべき「実際の entry point」は、hooks/ に存在する
    ファイル一覧ではなく hooks.json の command が起動するファイルである。hook 本体が
    500 行制限で分割されると import 専用の support module が hooks/ に現れるため、
    ファイル一覧を entry point の代理指標として使うと未宣言として誤検出される。
    """
    hooks_json = plugin_dir / "hooks" / "hooks.json"
    if not hooks_json.is_file():
        return set()
    document = json.loads(hooks_json.read_text(encoding="utf-8"))
    stems: set[str] = set()
    for entries in (document.get("hooks") or {}).values():
        for entry in entries:
            for hook in entry.get("hooks", []):
                command = str(hook.get("command") or "")
                for token in command.replace('"', " ").split():
                    if "/hooks/" in token:
                        stems.add(Path(token.split("/hooks/", 1)[1]).stem)
    return stems


def _support_module_candidates(plugin_dir: Path, declared: set[str],
                               registered: set[str]) -> list[Path]:
    """hooks/ にあるが entry point として宣言も登録もされていないファイル。"""
    return sorted(
        path for path in plugin_dir.glob("hooks/*")
        if path.suffix in {".py", ".sh"}
        and path.stem not in declared
        and path.stem not in registered
    )


def _is_import_only_support_module(path: Path) -> bool:
    """hooks/ 配下の未宣言ファイルを support module として許容してよいか判定する。

    True を返すと「hook ではない import 専用モジュール」として許容し、False を返すと
    「宣言し忘れた entry point」としてテストを落とす。

    判定は命名だけに頼らず「単体起動の入口を持たない」ことまで要求する。命名規則は
    合意事項にすぎず、`support_module.py` と名付けた実 hook を宣言し忘れる抜けを塞げない。
    """
    # .sh は import できないため、hooks/ にある限り必ず entry point とみなす。
    if path.suffix != ".py":
        return False
    # entry point は kebab-case で、Python の import 文では読めない。逆に import 可能な
    # 名前 (snake_case) であることは support module の必要条件である。
    if not path.stem.isidentifier():
        return False
    text = path.read_text(encoding="utf-8")
    # shebang と `if __name__ == "__main__"` はどちらも単体起動を意図した痕跡。
    # どちらか一方でもあれば、宣言し忘れた entry point として扱う。
    if text.startswith("#!"):
        return False
    if any(line.startswith("if __name__") for line in text.splitlines()):
        return False
    return True


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
    declared_hooks = set(declared.pop("hooks"))
    assert declared == actual

    # hooks: 「hooks/ の .py 一覧」ではなく「hooks.json が起動する entry point」と突合する。
    registered_hooks = _registered_hook_stems(plugin_dir)
    on_disk_hooks = {
        path.stem for path in plugin_dir.glob("hooks/*") if path.suffix in {".py", ".sh"}
    }
    assert registered_hooks, "hooks.json must register at least one hook entry point"
    # 登録済み entry point の宣言漏れを許さない (本テストの主目的)。
    assert registered_hooks <= declared_hooks, (
        f"hooks.json registers undeclared entry points: "
        f"{sorted(registered_hooks - declared_hooks)}"
    )
    # 宣言した entry point は実体を伴い、かつ実際に登録されていること。
    assert declared_hooks <= on_disk_hooks, (
        f"package-contract declares hooks not on disk: "
        f"{sorted(declared_hooks - on_disk_hooks)}"
    )
    assert declared_hooks == registered_hooks, (
        f"declared hooks are not registered in hooks.json: "
        f"{sorted(declared_hooks - registered_hooks)}"
    )
    # 残りは import 専用 support module のはず。entry point の宣言漏れと区別する。
    for path in _support_module_candidates(plugin_dir, declared_hooks, registered_hooks):
        assert _is_import_only_support_module(path), (
            f"hooks/{path.name} is neither a declared entry point nor an "
            f"import-only support module"
        )

    for dependency in contract["depends_on"]:
        assert (ROOT / "plugins" / dependency).is_dir()


# --- hook entry point / support module の判別 (unit) -------------------------

def _hooks_plugin(base: Path, hooks: dict[str, str], registered=()) -> Path:
    """hooks/ にファイルを持つ最小 plugin ツリーを組み立てる。"""
    plugin_dir = base / "p"
    (plugin_dir / "hooks").mkdir(parents=True)
    for name, text in hooks.items():
        (plugin_dir / "hooks" / name).write_text(text, encoding="utf-8")
    if registered:
        document = {"hooks": {"PreToolUse": [{"hooks": [
            {"type": "command",
             "command": f'python3 "${{CLAUDE_PLUGIN_ROOT}}/hooks/{name}" --repo-root "."'}
            for name in registered
        ]}]}}
        (plugin_dir / "hooks" / "hooks.json").write_text(
            json.dumps(document), encoding="utf-8")
    return plugin_dir


def test_registered_hook_stems_reads_commands_not_directory_listing(tmp_path):
    plugin_dir = _hooks_plugin(
        tmp_path,
        {"guard-a.py": "#!/usr/bin/env python3\n", "helper_b.py": "X = 1\n"},
        registered=("guard-a.py",),
    )
    # hooks/ には 2 ファイルあるが、entry point は hooks.json が起動する 1 件だけ。
    assert _registered_hook_stems(plugin_dir) == {"guard-a"}


def test_registered_hook_stems_without_hooks_json_is_empty(tmp_path):
    plugin_dir = _hooks_plugin(tmp_path, {"guard-a.py": "#!/usr/bin/env python3\n"})
    assert _registered_hook_stems(plugin_dir) == set()


def test_support_module_candidates_excludes_declared_and_registered(tmp_path):
    plugin_dir = _hooks_plugin(
        tmp_path,
        {"guard-a.py": "#!\n", "guard-b.py": "#!\n", "helper_c.py": "X = 1\n"},
        registered=("guard-a.py",),
    )
    candidates = _support_module_candidates(
        plugin_dir, declared={"guard-b"}, registered={"guard-a"})
    assert [path.name for path in candidates] == ["helper_c.py"]


def test_import_only_support_module_accepts_importable_module(tmp_path):
    path = tmp_path / "guard_graph_commands.py"
    path.write_text('"""helper."""\nimport re\n\nX = re.compile("a")\n', encoding="utf-8")
    assert _is_import_only_support_module(path) is True


@pytest.mark.parametrize("name, text", [
    # kebab-case は import 不能なので entry point 命名。
    ("guard-graph-schema.py", '"""hook."""\nX = 1\n'),
    # shebang は単体起動の意図。
    ("guard_helper.py", "#!/usr/bin/env python3\nX = 1\n"),
    # __main__ ブロックを持つなら単体起動できる = entry point。
    ("guard_helper.py", 'X = 1\nif __name__ == "__main__":\n    raise SystemExit(0)\n'),
    # .sh は import できないため必ず entry point。
    ("guard_helper.sh", "echo hi\n"),
])
def test_import_only_support_module_rejects_entry_point_shapes(tmp_path, name, text):
    path = tmp_path / name
    path.write_text(text, encoding="utf-8")
    assert _is_import_only_support_module(path) is False
