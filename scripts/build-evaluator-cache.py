#!/usr/bin/env python3
"""build-evaluator-cache.py - evaluator 結果を入力 digest で cache し、再実行を避ける。

正本は system-spec/dev-workflow.md の確定内容 (qa-214【2. evaluator 結果の cache】)。要旨:

- `eval-log/verification-tier/cache/<cache-key>.json` に結果を保存する。
- `cache_key` は次の 3 要素の sha256:
    (1) 評価対象の実体 digest (対象 file 群の内容 sha256 を path 昇順で連結。mtime や path 単体は使わない)
    (2) evaluator の識別子と version (rubric 改訂で cache が自動失効するため)
    (3) 評価に効く設定値 (tier・閾値・有効化した検査 id 集合)
- cache hit を採用した場合も `checks[].disposition` は `executed` とし、`cache_hit: true` と
  `cache_key` を併記する。
- cache miss と cache 破損 (schema 不適合・digest 不一致) は区別し、破損時は cache を使わず
  再実行する (fail-open で古い PASS を再利用しない)。

設計上の要点:

- `lookup` は判定を JSON の `status` (hit / miss / corrupt) で返し、exit code では返さない。
  破損は「cache を使わず再実行する」であって run の失敗ではないため、呼出側が status で
  分岐する。exit code に混ぜると「破損 = 失敗」と誤って扱われ、fail-open か過剰 fail の
  どちらかへ倒れる。
- `lookup` は埋め込み済みの `check_entry` を返す。呼出側が独自に checks[] を組み立てると
  `disposition: "cached"` のような非仕様値が生まれ、「実行した」と「cache を使った」の
  区別が台帳から失われる。組立を本 script に閉じることでその drift を構造的に防ぐ。
- 同一 key へ異なる result を store しようとした場合は fail-closed で拒否する。同じ入力に
  同じ evaluator を当てて結果が変わるなら、それは cache の問題ではなく evaluator の
  非決定性であり、黙って上書きすると以後どちらが正なのか追えなくなる。

配線状況 (2026-08-09 時点):

- 本 script は evaluator 実行系からまだ呼ばれていない。呼出元は tests のみで、実運用の
  cache hit は 1 件も発生しない。「cache 機構がある」ことと「cache が効いている」ことは
  別であり、docstring が前者だけを述べると後者と読み違えられるため明示する。
- 配線先は assign-*-evaluator 系の起動点 (completeness-evaluator / skill-design-evaluator)。
  そこで `--op lookup` の status で分岐し、hit なら返却された `check_entry` をそのまま
  checks[] へ載せ、miss/corrupt なら実行後に `--op store` する。追跡は HarnessHub-6nf1。

Usage:
  python3 scripts/build-evaluator-cache.py --op key \
      --target-path plugins/foo --evaluator-id assign-skill-design-evaluator \
      --evaluator-version 1.2.0 --setting tier=mvp --setting checks=a,b

  python3 scripts/build-evaluator-cache.py --op lookup --check-id design-eval ...
  python3 scripts/build-evaluator-cache.py --op store --result-file verdict.json ...

Exit codes:
  0 = 正常 (lookup の hit/miss/corrupt を含む) / 1 = 使い方・入力エラー / 2 = fail-closed 拒否
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

SCHEMA_VERSION = "1.0"
DEFAULT_CACHE_DIR = "eval-log/verification-tier/cache"
STATUS_HIT = "hit"
STATUS_MISS = "miss"
STATUS_CORRUPT = "corrupt"

# cache entry の必須キー。欠けていれば schema 不適合 = 破損として扱う。
_REQUIRED_ENTRY_KEYS = ("schema_version", "cache_key", "components", "result")


def source_digest() -> str:
    return hashlib.sha256(Path(__file__).read_bytes()).hexdigest()


def _iter_files(target: Path) -> list[Path]:
    if target.is_dir():
        return sorted(p for p in target.rglob("*") if p.is_file())
    return [target]


def target_digest(paths: list[str], repo_root: Path) -> tuple[str, list[str]]:
    """対象 file 群の内容 sha256 を path 昇順で連結し、その sha256 を返す。

    連結行に path を含める。仕様が禁じるのは「path 単体を digest 入力にする」ことであり、
    内容と併記する分には制約を満たしつつ rename を検出できる (内容が同じ file を別名へ
    移しただけの変更が cache hit として素通りするのを防ぐ)。
    """
    resolved: dict[str, Path] = {}
    for raw in paths:
        target = Path(raw)
        if not target.is_absolute():
            target = repo_root / target
        if not target.exists():
            raise FileNotFoundError(f"評価対象が存在しない: {raw}")
        for path in _iter_files(target):
            rel = path.resolve().relative_to(repo_root.resolve()).as_posix()
            resolved[rel] = path

    lines = []
    for rel in sorted(resolved):
        content = hashlib.sha256(resolved[rel].read_bytes()).hexdigest()
        lines.append(f"{content}  {rel}")
    manifest = "\n".join(lines)
    return hashlib.sha256(manifest.encode("utf-8")).hexdigest(), sorted(resolved)


def parse_settings(pairs: list[str]) -> dict[str, str]:
    settings: dict[str, str] = {}
    for pair in pairs:
        if "=" not in pair:
            raise ValueError(f"--setting は key=value 形式で指定する: {pair!r}")
        key, value = pair.split("=", 1)
        key = key.strip()
        if not key:
            raise ValueError(f"--setting の key が空: {pair!r}")
        settings[key] = value.strip()
    return settings


def build_components(args, repo_root: Path) -> dict:
    digest, files = target_digest(args.target_path, repo_root)
    return {
        "target": {"digest": digest, "files": files},
        "evaluator": {"id": args.evaluator_id, "version": args.evaluator_version},
        "settings": parse_settings(args.setting),
    }


def cache_key_of(components: dict) -> str:
    """3 要素だけを決定論的に畳み込む。

    files 一覧は target.digest の材料であり、key へ二重に混ぜない (同じ入力が異なる key を
    生むと cache が永久に miss し続ける)。
    """
    canonical = json.dumps(
        {
            "target_digest": components["target"]["digest"],
            "evaluator": components["evaluator"],
            "settings": components["settings"],
        },
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def entry_path(cache_dir: Path, key: str) -> Path:
    return cache_dir / f"{key}.json"


def load_entry(path: Path, expected_key: str) -> tuple[str, dict | None, str | None]:
    """cache entry を読み、(status, entry, corruption_reason) を返す。"""
    if not path.exists():
        return STATUS_MISS, None, None
    try:
        entry = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        return STATUS_CORRUPT, None, f"JSON として読めない: {exc}"
    if not isinstance(entry, dict):
        return STATUS_CORRUPT, None, "cache entry が object でない"
    missing = [k for k in _REQUIRED_ENTRY_KEYS if k not in entry]
    if missing:
        return STATUS_CORRUPT, None, f"必須キー欠落: {', '.join(missing)}"
    if entry["schema_version"] != SCHEMA_VERSION:
        return STATUS_CORRUPT, None, (
            f"schema_version 不一致 (entry={entry['schema_version']} / 期待={SCHEMA_VERSION})"
        )
    if entry["cache_key"] != expected_key:
        return STATUS_CORRUPT, None, "cache_key 不一致 (file 名と中身が食い違う)"
    try:
        recomputed = cache_key_of(entry["components"])
    except (KeyError, TypeError) as exc:
        return STATUS_CORRUPT, None, f"components から key を再計算できない: {exc}"
    if recomputed != expected_key:
        return STATUS_CORRUPT, None, "components digest 不一致 (保存後に改変された可能性)"
    return STATUS_HIT, entry, None


def check_entry_for(check_id: str, key: str, status: str, reason: str | None) -> dict:
    """tier-decision.json の checks[] へそのまま入れる 1 要素を組み立てる。

    hit / miss いずれも disposition は executed。cache hit は「実行を省いた」のではなく
    「同一入力の実行結果を再利用した」であり、deferred (後で必ず実行する) でも
    skipped (この tier では恒久的に実行しない) でもない。
    """
    entry = {
        "id": check_id,
        "disposition": "executed",
        "cache_hit": status == STATUS_HIT,
        "cache_key": key,
    }
    if status == STATUS_HIT:
        entry["reason"] = "同一入力の cache 済み結果を再利用した"
    elif status == STATUS_CORRUPT:
        entry["reason"] = f"cache 破損のため再実行が必要: {reason}"
        entry["cache_status"] = STATUS_CORRUPT
    else:
        entry["reason"] = "cache miss のため実行が必要"
        entry["cache_status"] = STATUS_MISS
    return entry


def op_key(args, components: dict, key: str) -> int:
    print(json.dumps({"cache_key": key, "components": components}, ensure_ascii=False, indent=2))
    return 0


def op_lookup(args, components: dict, key: str, cache_dir: Path) -> int:
    status, entry, reason = load_entry(entry_path(cache_dir, key), key)
    payload = {
        "status": status,
        "cache_key": key,
        "cache_path": entry_path(cache_dir, key).as_posix(),
        "result": entry["result"] if entry else None,
        "corruption_reason": reason,
        "check_entry": check_entry_for(args.check_id or args.evaluator_id, key, status, reason),
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


def op_store(args, components: dict, key: str, cache_dir: Path) -> int:
    if not args.result_file:
        print("ERROR: --op store には --result-file が必要", file=sys.stderr)
        return 1
    result = json.loads(Path(args.result_file).read_text(encoding="utf-8"))

    path = entry_path(cache_dir, key)
    status, existing, reason = load_entry(path, key)
    if status == STATUS_HIT and existing["result"] != result:
        # 同じ入力・同じ evaluator で結果が変わるのは evaluator の非決定性。上書きすると
        # どちらが正だったのか後から追えなくなるため、cache 側では受け付けない。
        print(
            "ERROR: 同一 cache_key に異なる結果を保存しようとした (evaluator が非決定的である疑い)。\n"
            f"  cache_key: {key}\n  既存: {path}",
            file=sys.stderr,
        )
        return 2

    entry = {
        "schema_version": SCHEMA_VERSION,
        "cache_key": key,
        "components": components,
        "stored_at": args.stored_at or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "writer": {"path": "scripts/build-evaluator-cache.py", "source_digest": source_digest()},
        "result": result,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(entry, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(
        {"stored": True, "cache_key": key, "cache_path": path.as_posix(),
         "replaced_corrupt": status == STATUS_CORRUPT, "corruption_reason": reason},
        ensure_ascii=False, indent=2,
    ))
    return 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="evaluator 結果を入力 digest で cache する")
    parser.add_argument("--op", choices=["key", "lookup", "store"], required=True)
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--cache-dir", help=f"既定: <repo-root>/{DEFAULT_CACHE_DIR}")
    parser.add_argument("--target-path", action="append", default=[],
                        help="評価対象の file または directory (repo 相対)。複数指定可")
    parser.add_argument("--evaluator-id", required=True)
    parser.add_argument("--evaluator-version", required=True)
    parser.add_argument("--setting", action="append", default=[],
                        help="評価に効く設定値 key=value (tier / 閾値 / 有効化した検査 id 集合)")
    parser.add_argument("--check-id", help="checks[] へ書く検査 id (既定: --evaluator-id)")
    parser.add_argument("--result-file", help="--op store で保存する evaluator 結果 JSON")
    parser.add_argument("--stored-at", help="保存時刻の固定 (テスト用)")
    args = parser.parse_args(argv)

    if not args.target_path:
        print("ERROR: --target-path が 1 つ以上必要", file=sys.stderr)
        return 1

    repo_root = Path(args.repo_root).resolve()
    cache_dir = Path(args.cache_dir) if args.cache_dir else repo_root / DEFAULT_CACHE_DIR

    try:
        components = build_components(args, repo_root)
    except (FileNotFoundError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    key = cache_key_of(components)

    if args.op == "key":
        return op_key(args, components, key)
    if args.op == "lookup":
        return op_lookup(args, components, key, cache_dir)
    return op_store(args, components, key, cache_dir)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
