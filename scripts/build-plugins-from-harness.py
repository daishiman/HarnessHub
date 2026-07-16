#!/usr/bin/env python3
"""Sync plugin bodies from the harness source repo into HarnessHub plugins/.

開発の正である harness 側 plugins/ を、HarnessHub の実体コピーへ同期する。

- 既存プラグイン: プラグイン単位の rsync -a --delete で更新
  (HarnessHub 独自プラグインには触れない)
- harness 側の新規プラグイン: --adopt-new 指定時のみ取り込み、
  marketplace.json へエントリを追記する
- 同期後に marketplace.json とディレクトリ実体・version の整合を検査する
- --check-only は同期せず整合検査のみ行う (harness が無い CI 環境用)

exit code: 0=正常 / 1=整合警告あり / 2=source 不正
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SOURCE = REPO_ROOT.parent / "harness"
MARKETPLACE_PATH = REPO_ROOT / ".claude-plugin" / "marketplace.json"
RSYNC_EXCLUDES = ("__pycache__/", ".pytest_cache/", ".DS_Store")


def list_plugins(plugins_dir: Path) -> list[str]:
    if not plugins_dir.is_dir():
        return []
    return sorted(
        p.name
        for p in plugins_dir.iterdir()
        if p.is_dir() and not p.name.startswith(".")
    )


def load_manifest(plugin_dir: Path) -> dict | None:
    manifest = plugin_dir / ".claude-plugin" / "plugin.json"
    if not manifest.is_file():
        return None
    return json.loads(manifest.read_text(encoding="utf-8"))


def is_distributable(plugin_dir: Path, manifest: dict | None) -> bool:
    """validate-plugin-completeness.py と同じ sidecar-first 優先順位で判定する。

    references/package-contract.json の distribution.distributable →
    manifest 直下の distributable → 既定 True。distributable:false の plugin は
    「実体は保持するが marketplace/bundle へは非登録 (社内専用)」(MK-004)。
    """
    contract_path = plugin_dir / "references" / "package-contract.json"
    if contract_path.is_file():
        try:
            contract = json.loads(contract_path.read_text(encoding="utf-8"))
            distribution = contract.get("distribution", {})
            if isinstance(distribution, dict) and "distributable" in distribution:
                return bool(distribution["distributable"])
        except (ValueError, OSError):
            pass
    if manifest and "distributable" in manifest:
        return bool(manifest["distributable"])
    return True


def rsync_plugin(src: Path, dst: Path, dry_run: bool) -> list[str]:
    cmd = ["rsync", "-a", "--delete", "--itemize-changes"]
    if dry_run:
        cmd.append("--dry-run")
    for pattern in RSYNC_EXCLUDES:
        cmd += ["--exclude", pattern]
    cmd += [f"{src}/", f"{dst}/"]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    changes = []
    for line in result.stdout.splitlines():
        parts = line.split(None, 1)
        if len(parts) == 2 and parts[1] != "./":
            changes.append(line)
    return changes


def marketplace_entry_for(name: str, manifest: dict | None) -> dict:
    """新規取り込みプラグインの marketplace.json エントリを組み立てる。

    既存エントリの形:
      {"name", "source" ("./plugins/<name>"), "description", "version",
       "category", "tags"}
    manifest は plugin.json の中身 (name/version/description/author など。
    存在しないプラグインでは None)。
    """
    if manifest is None:
        raise ValueError(f"{name}: .claude-plugin/plugin.json が無いため取り込めない")
    return {
        "name": manifest.get("name", name),
        "source": f"./plugins/{name}",
        "description": manifest.get("description", ""),
        "version": manifest.get("version", "0.0.0"),
        # category/tags は plugin.json に無いため取り込み後に人が分類する
        "category": "uncategorized",
        "tags": [],
    }


def append_marketplace_entries(entries: list[dict]) -> None:
    mp = json.loads(MARKETPLACE_PATH.read_text(encoding="utf-8"))
    mp.setdefault("plugins", []).extend(entries)
    MARKETPLACE_PATH.write_text(
        json.dumps(mp, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def check_marketplace(plugins_dir: Path) -> list[str]:
    warnings = []
    mp = json.loads(MARKETPLACE_PATH.read_text(encoding="utf-8"))
    entries = {e["name"]: e for e in mp.get("plugins", [])}
    hub_plugins = list_plugins(plugins_dir)
    for name in hub_plugins:
        manifest = load_manifest(plugins_dir / name)
        distributable = is_distributable(plugins_dir / name, manifest)
        if name not in entries:
            if distributable:
                warnings.append(f"marketplace.json にエントリがない: {name}")
            continue
        if not distributable:
            warnings.append(
                f"非配布 (distributable:false) の plugin が marketplace.json に"
                f"登録されている: {name} (MK-004)"
            )
        if manifest and manifest.get("version") != entries[name].get("version"):
            warnings.append(
                f"version 不一致: {name} "
                f"(plugin.json={manifest.get('version')}, "
                f"marketplace={entries[name].get('version')})"
            )
    for name in entries:
        if name not in hub_plugins:
            warnings.append(f"実体ディレクトリがない marketplace エントリ: {name}")
    return warnings


def main() -> int:
    parser = argparse.ArgumentParser(
        description="harness → HarnessHub の plugins 実体同期"
    )
    parser.add_argument(
        "--source", type=Path, default=DEFAULT_SOURCE,
        help=f"harness リポジトリのパス (default: {DEFAULT_SOURCE})",
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="変更を適用せず差分だけ表示"
    )
    parser.add_argument(
        "--adopt-new", action="store_true",
        help="harness 側の新規プラグインを取り込み marketplace.json へ追記",
    )
    parser.add_argument(
        "--check-only", action="store_true",
        help="同期せず marketplace 整合検査のみ実行 (source 不要・CI 用)",
    )
    args = parser.parse_args()

    hub_plugins_dir = REPO_ROOT / "plugins"
    if args.check_only:
        warnings = check_marketplace(hub_plugins_dir)
        for w in warnings:
            print(f"[警告] {w}")
        print(f"整合検査のみ完了: 警告 {len(warnings)} 件")
        return 1 if warnings else 0

    src_plugins_dir = args.source / "plugins"
    if not src_plugins_dir.is_dir():
        print(f"error: source が見つからない: {src_plugins_dir}", file=sys.stderr)
        return 2

    source = list_plugins(src_plugins_dir)
    hub = list_plugins(hub_plugins_dir)
    common = [n for n in source if n in hub]
    new = [n for n in source if n not in hub]
    hub_only = [n for n in hub if n not in source]

    changed_total = 0
    for name in common:
        changes = rsync_plugin(
            src_plugins_dir / name, hub_plugins_dir / name, args.dry_run
        )
        if changes:
            changed_total += len(changes)
            print(f"[更新] {name}: {len(changes)} 件")
            for line in changes[:5]:
                print(f"    {line}")
            if len(changes) > 5:
                print(f"    ... 他 {len(changes) - 5} 件")

    adopted_entries = []
    for name in new:
        if not args.adopt_new:
            print(f"[未取込] {name}: harness 側の新規プラグイン (--adopt-new で取り込み)")
            continue
        manifest = load_manifest(src_plugins_dir / name)
        if not is_distributable(src_plugins_dir / name, manifest):
            rsync_plugin(src_plugins_dir / name, hub_plugins_dir / name, args.dry_run)
            print(f"[取込/非配布] {name}: コピーのみ (distributable:false のため marketplace 非登録)")
            continue
        try:
            entry = marketplace_entry_for(name, manifest)
        except ValueError as exc:
            print(f"[拒否] {exc}")
            continue
        rsync_plugin(src_plugins_dir / name, hub_plugins_dir / name, args.dry_run)
        adopted_entries.append(entry)
        print(f"[取込] {name}")

    if adopted_entries and not args.dry_run:
        append_marketplace_entries(adopted_entries)
        print(f"marketplace.json に {len(adopted_entries)} エントリ追記")

    for name in hub_only:
        print(f"[独自] {name}: HarnessHub 独自プラグイン (同期対象外)")

    warnings = check_marketplace(hub_plugins_dir)
    for w in warnings:
        print(f"[警告] {w}")

    if changed_total == 0 and not new:
        print("同期差分なし")
    print(
        f"完了: 既存 {len(common)} 件同期 / 新規 {len(new)} 件 / "
        f"独自 {len(hub_only)} 件 / 警告 {len(warnings)} 件"
    )
    return 1 if warnings else 0


if __name__ == "__main__":
    sys.exit(main())
