"""validate-plugin-completeness.py の hooks entry point 契約を分離する内部モジュール。

宣言 (package-contract)・登録 (manifest / hooks.json)・実体 (hooks/ 配下) の
3 者一致を、plugin 完全性の CLI 本体から独立して扱う。CLI ではないため shebang は
置かず、起動点判定で import 専用 support module と混同しない。
"""

from __future__ import annotations

import json
import pathlib
import shlex


HOOK_SUFFIXES = frozenset({".py", ".sh"})


def load_package_contract(plugin_dir: pathlib.Path) -> tuple[dict | None, str | None]:
    """Harness-only package metadata sidecar を fail-closed で読む。"""
    path = plugin_dir / "references" / "package-contract.json"
    if not path.exists():
        return None, None
    try:
        contract = json.loads(path.read_text())
        if not isinstance(contract, dict):
            raise ValueError("top level must be an object")
        return contract, None
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        return None, f"{path}: {exc}"


def harness_metadata(manifest: dict, contract: dict | None) -> dict:
    """sidecar-first で harness 固有の配布メタデータを正規化する。"""
    distribution = contract.get("distribution", {}) if isinstance(contract, dict) else {}
    if not isinstance(distribution, dict):
        distribution = {}
    return {
        "distributable": distribution.get(
            "distributable", manifest.get("distributable", True)
        ),
        "bundle_targets": distribution.get(
            "bundle_targets", manifest.get("bundle_targets") or manifest.get("bundles") or []
        ),
        "category": distribution.get("category", manifest.get("category")),
        "tags": distribution.get(
            "tags", manifest.get("tags") or manifest.get("keywords") or []
        ),
    }


def _hook_file_from_token(token: str) -> str | None:
    """command token から plugin-relative ``hooks/`` のファイル名を返す。"""
    if "/hooks/" in token:
        prefix, rest = token.split("/hooks/", 1)
        # プラグイン自身の hooks/ だけを対象にする。CLAUDE_PLUGIN_ROOT 展開を
        # 経由しない "/hooks/" 部分文字列 (.git/hooks/pre-commit 等) は無関係だが、
        # "./hooks/foo.py" のように非該当プレフィックスでも下の相対記法チェックへ
        # 続ける必要があるため、ここでは None を確定させない。
        if prefix.rstrip("}").endswith("CLAUDE_PLUGIN_ROOT"):
            return rest
    if token.startswith("./hooks/"):
        return token.removeprefix("./hooks/")
    if token.startswith("hooks/"):
        return token.removeprefix("hooks/")
    return None


def hook_files_in_event_map(event_map, *, require_plugin_root: bool = False) -> set[str]:
    """hook イベントマップの command が起動する ``hooks/`` 配下ファイル名を集める。

    突合すべき「実際の entry point」は hooks/ のファイル一覧ではなく、command が
    起動するファイルである。責務分割で生まれた import 専用 support module を
    ファイル一覧で代理すると未宣言違反として誤検出されるため、command を正とする。

    ``require_plugin_root`` は manifest 宣言の実在検査用で、
    ``$CLAUDE_PLUGIN_ROOT`` を伴う token だけを対象にする。登録側は
    ``hooks/foo.py`` と ``./hooks/foo.py`` の相対記法も収集する。
    """
    files: set[str] = set()
    if not isinstance(event_map, dict):
        return files
    for entries in event_map.values():
        if not isinstance(entries, list):
            continue
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            for hook in entry.get("hooks", []) or []:
                if not isinstance(hook, dict):
                    continue
                cmd = str(hook.get("command") or "")
                try:
                    tokens = shlex.split(cmd)
                except ValueError:
                    tokens = cmd.split()
                for token in tokens:
                    if require_plugin_root and "CLAUDE_PLUGIN_ROOT" not in token:
                        continue
                    file_name = _hook_file_from_token(token)
                    if file_name:
                        files.add(file_name)
    return files


def registered_hook_files(
    plugin_dir: pathlib.Path, manifest: dict | None
) -> tuple[set[str], str | None]:
    """manifest inline と hooks/hooks.json の登録を和集合で返す。

    hooks.json の構文エラーは黙って握りつぶさず error として返す。呼び出し側が
    握りつぶすと、実際は登録済みの hook が HK-002 (未登録) 扱いで誤検出される。
    """
    files = hook_files_in_event_map((manifest or {}).get("hooks"))
    hooks_json = plugin_dir / "hooks" / "hooks.json"
    if hooks_json.is_file():
        try:
            document = json.loads(hooks_json.read_text())
        except (OSError, ValueError, json.JSONDecodeError) as exc:
            return files, f"{hooks_json}: {exc}"
        if isinstance(document, dict):
            files |= hook_files_in_event_map(document.get("hooks"))
    return files, None


def is_import_only_support_module(path: pathlib.Path) -> bool:
    """hooks/ の未宣言ファイルが import 専用 support module かを判定する。

    stem が isidentifier() でない (kebab-case 等) 場合は import 文で読み込めない
    ため、常に entry point 命名として扱う (support module 扱いにしない)。
    """
    if path.suffix != ".py" or not path.stem.isidentifier():
        return False
    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return False
    if text.startswith("#!"):
        return False
    return not any(line.startswith("if __name__") for line in text.splitlines())


def validate_hook_entry_point_parity(
    plugin_name: str, data: dict, declared: set[str]
) -> list[str]:
    """hooks の宣言・登録・実体の 3 者一致を検査する (HK-001..003)。"""
    errs: list[str] = []
    registered = {pathlib.Path(name).stem for name in data.get("registered_hooks", [])}

    undeclared = registered - declared
    if undeclared:
        errs.append(
            f"{plugin_name}: hook registration has undeclared entry points: "
            f"{sorted(undeclared)} (HK-001)"
        )

    if data.get("hook_registration_present"):
        unregistered = declared - registered
        if unregistered:
            errs.append(
                f"{plugin_name}: package-contract declares hooks not registered: "
                f"{sorted(unregistered)} (HK-002)"
            )

    plugin_dir = data.get("plugin_dir")
    if plugin_dir is not None:
        for name in data.get("hooks", []):
            stem = pathlib.Path(name).stem
            if stem in declared or stem in registered:
                continue
            if not is_import_only_support_module(plugin_dir / "hooks" / name):
                errs.append(
                    f"{plugin_name}: hooks/{name} is neither a declared entry point "
                    f"nor an import-only support module (HK-003)"
                )
    return errs
