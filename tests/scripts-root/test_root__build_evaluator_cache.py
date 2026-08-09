"""build-evaluator-cache.py (qa-214【2】) の cache key 決定論と破損時 fail-closed を固定する。

背景 (HarnessHub-6nf1): dev-workflow.md【2】は確定仕様なのに実装が無く、evaluator の
再実行が入力同一でも毎回走っていた。実装が入った以上、次の 3 点が壊れれば cache は
「古い PASS を再利用する装置」に化けるので機械で押さえる。

(a) key の決定論と失効: 対象内容・evaluator version・設定値のどれが変わっても key が変わり、
    変わらなければ同じ key になる (mtime や指定順では変わらない)
(b) miss と corrupt の区別: 破損 cache を hit として使わない (fail-open で古い結果を返さない)
(c) 台帳表現の固定: hit でも disposition は executed で、cache_hit / cache_key を併記する
"""
from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
import time
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "scripts/build-evaluator-cache.py"


def _load():
    spec = importlib.util.spec_from_file_location("build_evaluator_cache", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


bec = _load()

BASE_ARGS = ("--evaluator-id", "assign-skill-design-evaluator", "--evaluator-version", "1.2.0")


@pytest.fixture
def workspace(tmp_path: Path) -> Path:
    root = tmp_path / "repo"
    (root / "plugins/foo").mkdir(parents=True)
    (root / "plugins/foo/SKILL.md").write_text("# foo\n", encoding="utf-8")
    (root / "plugins/foo/scripts.py").write_text("print(1)\n", encoding="utf-8")
    return root


def run(root: Path, *args: str, cache_dir: Path | None = None) -> subprocess.CompletedProcess[str]:
    cache = cache_dir or (root / "cache")
    return subprocess.run(
        [sys.executable, str(SCRIPT), "--repo-root", str(root), "--cache-dir", str(cache),
         "--target-path", "plugins/foo", *BASE_ARGS, *args],
        capture_output=True, text=True,
    )


def key_of(root: Path, *args: str) -> str:
    result = run(root, "--op", "key", *args)
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)["cache_key"]


# ── (a) key の決定論と失効 ─────────────────────────────────────────────────
def test_same_input_gives_same_key(workspace: Path):
    assert key_of(workspace) == key_of(workspace)


def test_mtime_change_alone_does_not_change_key(workspace: Path):
    """mtime で key が変わると、内容が同じでも触るたびに miss して cache が無意味になる。"""
    before = key_of(workspace)
    target = workspace / "plugins/foo/SKILL.md"
    os.utime(target, (time.time() + 10_000, time.time() + 10_000))
    assert key_of(workspace) == before


def test_content_change_changes_key(workspace: Path):
    before = key_of(workspace)
    (workspace / "plugins/foo/SKILL.md").write_text("# foo (changed)\n", encoding="utf-8")
    assert key_of(workspace) != before


def test_rename_changes_key(workspace: Path):
    """内容が同じ file を別名へ移しただけの変更が hit で素通りしないこと。"""
    before = key_of(workspace)
    (workspace / "plugins/foo/SKILL.md").rename(workspace / "plugins/foo/GUIDE.md")
    assert key_of(workspace) != before


def test_evaluator_version_change_invalidates_key(workspace: Path):
    """rubric 改訂で cache が自動失効する (dev-workflow.md【2】)。"""
    a = json.loads(run(workspace, "--op", "key").stdout)["cache_key"]
    b = json.loads(subprocess.run(
        [sys.executable, str(SCRIPT), "--repo-root", str(workspace), "--target-path", "plugins/foo",
         "--op", "key", "--evaluator-id", "assign-skill-design-evaluator",
         "--evaluator-version", "1.3.0"],
        capture_output=True, text=True).stdout)["cache_key"]
    assert a != b


def test_settings_change_invalidates_key(workspace: Path):
    assert key_of(workspace, "--setting", "tier=mvp") != key_of(workspace, "--setting", "tier=critical")


def test_setting_order_does_not_change_key(workspace: Path):
    a = key_of(workspace, "--setting", "tier=mvp", "--setting", "threshold=0.8")
    b = key_of(workspace, "--setting", "threshold=0.8", "--setting", "tier=mvp")
    assert a == b


def test_missing_target_is_input_error(workspace: Path):
    result = subprocess.run(
        [sys.executable, str(SCRIPT), "--repo-root", str(workspace), "--op", "key",
         "--target-path", "plugins/absent", *BASE_ARGS],
        capture_output=True, text=True,
    )
    assert result.returncode == 1
    assert "評価対象が存在しない" in result.stderr


# ── (b) miss と corrupt の区別 ─────────────────────────────────────────────
def _store(workspace: Path, verdict: dict) -> str:
    result_file = workspace / "verdict.json"
    result_file.write_text(json.dumps(verdict), encoding="utf-8")
    result = run(workspace, "--op", "store", "--result-file", str(result_file),
                 "--stored-at", "2026-08-09T00:00:00Z")
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)["cache_key"]


def test_lookup_miss_then_hit(workspace: Path):
    first = json.loads(run(workspace, "--op", "lookup").stdout)
    assert first["status"] == "miss"
    assert first["result"] is None

    _store(workspace, {"verdict": "PASS"})

    second = json.loads(run(workspace, "--op", "lookup").stdout)
    assert second["status"] == "hit"
    assert second["result"] == {"verdict": "PASS"}


@pytest.mark.parametrize(
    "mutate",
    [
        lambda text: "{ not json",
        lambda text: json.dumps({"schema_version": "1.0", "cache_key": "x"}),
        lambda text: json.dumps({**json.loads(text), "schema_version": "0.9"}),
        lambda text: json.dumps({**json.loads(text), "cache_key": "deadbeef"}),
    ],
)
def test_corrupt_cache_is_not_served_as_hit(workspace: Path, mutate):
    """破損を hit と区別できないと、古い PASS を再利用する fail-open になる。"""
    key = _store(workspace, {"verdict": "PASS"})
    path = workspace / "cache" / f"{key}.json"
    path.write_text(mutate(path.read_text(encoding="utf-8")), encoding="utf-8")

    payload = json.loads(run(workspace, "--op", "lookup").stdout)
    assert payload["status"] == "corrupt"
    assert payload["result"] is None
    assert payload["corruption_reason"]


def test_tampered_components_are_detected(workspace: Path):
    """保存後に components を書き換えて別入力の結果を横流しする経路を塞ぐ。"""
    key = _store(workspace, {"verdict": "PASS"})
    path = workspace / "cache" / f"{key}.json"
    entry = json.loads(path.read_text(encoding="utf-8"))
    entry["components"]["settings"]["tier"] = "critical"
    path.write_text(json.dumps(entry, ensure_ascii=False), encoding="utf-8")

    payload = json.loads(run(workspace, "--op", "lookup").stdout)
    assert payload["status"] == "corrupt"
    assert "digest 不一致" in payload["corruption_reason"]


def test_lookup_never_fails_the_run(workspace: Path):
    """破損は「cache を使わず再実行」であって run の失敗ではない。"""
    key = _store(workspace, {"verdict": "PASS"})
    (workspace / "cache" / f"{key}.json").write_text("{ broken", encoding="utf-8")
    assert run(workspace, "--op", "lookup").returncode == 0


def test_store_over_corrupt_entry_repairs_it(workspace: Path):
    key = _store(workspace, {"verdict": "PASS"})
    (workspace / "cache" / f"{key}.json").write_text("{ broken", encoding="utf-8")

    result_file = workspace / "verdict.json"
    result_file.write_text(json.dumps({"verdict": "FAIL"}), encoding="utf-8")
    stored = run(workspace, "--op", "store", "--result-file", str(result_file))
    assert stored.returncode == 0, stored.stderr
    assert json.loads(stored.stdout)["replaced_corrupt"] is True
    assert json.loads(run(workspace, "--op", "lookup").stdout)["result"] == {"verdict": "FAIL"}


def test_conflicting_result_for_same_key_is_rejected(workspace: Path):
    """同一入力で結果が変わるのは evaluator の非決定性。黙って上書きしない。"""
    _store(workspace, {"verdict": "PASS"})
    result_file = workspace / "verdict2.json"
    result_file.write_text(json.dumps({"verdict": "FAIL"}), encoding="utf-8")
    result = run(workspace, "--op", "store", "--result-file", str(result_file))
    assert result.returncode == 2, result.stdout
    assert "非決定的" in result.stderr
    # 既存 entry は保たれている
    assert json.loads(run(workspace, "--op", "lookup").stdout)["result"] == {"verdict": "PASS"}


def test_storing_identical_result_is_idempotent(workspace: Path):
    _store(workspace, {"verdict": "PASS"})
    result_file = workspace / "verdict.json"
    again = run(workspace, "--op", "store", "--result-file", str(result_file),
                "--stored-at", "2026-08-09T00:00:00Z")
    assert again.returncode == 0, again.stderr


# ── (c) 台帳表現の固定 ─────────────────────────────────────────────────────
def test_hit_is_recorded_as_executed_with_cache_fields(workspace: Path):
    """cache hit は executed。deferred / skipped へ潰すと「省略」と「実行」が混ざる。"""
    _store(workspace, {"verdict": "PASS"})
    entry = json.loads(run(workspace, "--op", "lookup", "--check-id", "design-eval").stdout)["check_entry"]
    assert entry["id"] == "design-eval"
    assert entry["disposition"] == "executed"
    assert entry["cache_hit"] is True
    assert entry["cache_key"]


def test_miss_check_entry_marks_cache_hit_false(workspace: Path):
    entry = json.loads(run(workspace, "--op", "lookup").stdout)["check_entry"]
    assert entry["disposition"] == "executed"
    assert entry["cache_hit"] is False
    assert entry["cache_status"] == "miss"


def test_corrupt_check_entry_carries_reason(workspace: Path):
    key = _store(workspace, {"verdict": "PASS"})
    (workspace / "cache" / f"{key}.json").write_text("{ broken", encoding="utf-8")
    entry = json.loads(run(workspace, "--op", "lookup").stdout)["check_entry"]
    assert entry["cache_hit"] is False
    assert entry["cache_status"] == "corrupt"
    assert "再実行が必要" in entry["reason"]


def test_default_cache_dir_follows_spec_path():
    assert bec.DEFAULT_CACHE_DIR == "eval-log/verification-tier/cache"


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-v"]))
