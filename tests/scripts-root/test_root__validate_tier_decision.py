"""validate-tier-decision.py (qa-214【1】【2】【3】) の記録検査を固定する。

背景 (HarnessHub-xcl3): tier 判定は「決めた」だけでは検証できない。記録が後から読めない
形だと、省略した検査があったのか、そもそも判定していないのかが事後に区別できない。
本 test は次の 3 点を押さえる。

(a) 判定根拠の実在: tier_selector が absent の run を記録として通さない (【3 of qa-212】)
(b) 語彙の閉列挙: disposition が executed / deferred / skipped 以外に増えない (【1】)
(c) 延期の受け皿: deferred や降格があるのに issue が空の記録を通さない (【1】【5】)
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "scripts/validate-tier-decision.py"

VALID = {
    "schema_version": "1.0",
    "run_id": "run-20260809-a",
    "decided_at": "2026-08-09T00:00:00Z",
    "target": "HarnessHub-xcl3",
    "tier": "mvp",
    "matched_rules": ["MV-01"],
    "inputs": {
        "changed_paths": ["scripts/select-verification-tier.py"],
        "changed_file_count": 1,
        "changed_line_count": 12,
        "affected_packages": [],
        "affected_package_count": 0,
    },
    "checks": [
        {"id": "secret-scan", "disposition": "executed"},
        {"id": "live-trial", "disposition": "deferred", "reason": "mvp では起動しない"},
    ],
    "deferred_issue_refs": ["HarnessHub-xcl3"],
    "tier_selector": {
        "path": "scripts/select-verification-tier.py",
        "source_digest": "0" * 64,
    },
}


def write(tmp_path: Path, decision: dict, name: str = "tier-decision.json") -> Path:
    path = tmp_path / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(decision, ensure_ascii=False), encoding="utf-8")
    return path


def check(tmp_path: Path, decision: dict) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(SCRIPT), "--decision", str(write(tmp_path, decision))],
        capture_output=True, text=True,
    )


def mutated(**overrides) -> dict:
    decision = json.loads(json.dumps(VALID))
    decision.update(overrides)
    return decision


def test_valid_decision_passes(tmp_path: Path):
    result = check(tmp_path, VALID)
    assert result.returncode == 0, result.stdout + result.stderr


@pytest.mark.parametrize(
    "field", ["run_id", "decided_at", "target", "tier", "matched_rules", "inputs", "checks"]
)
def test_missing_required_field_is_a_violation(tmp_path: Path, field: str):
    decision = json.loads(json.dumps(VALID))
    decision.pop(field)
    result = check(tmp_path, decision)
    assert result.returncode == 1
    assert f"必須フィールド {field} が無い" in result.stdout


# ── (a) 判定根拠の実在 ─────────────────────────────────────────────────────
def test_absent_tier_selector_is_rejected(tmp_path: Path):
    """selector 未実装期の名残である 'absent' をそのまま通すと、判定根拠の無い run が緑になる。"""
    result = check(tmp_path, mutated(tier_selector="absent"))
    assert result.returncode == 1
    assert "absent" in result.stdout


@pytest.mark.parametrize("field", ["path", "source_digest"])
def test_tier_selector_needs_path_and_digest(tmp_path: Path, field: str):
    decision = json.loads(json.dumps(VALID))
    decision["tier_selector"].pop(field)
    result = check(tmp_path, decision)
    assert result.returncode == 1
    assert f"tier_selector.{field}" in result.stdout


def test_unknown_tier_is_rejected(tmp_path: Path):
    result = check(tmp_path, mutated(tier="urgent"))
    assert result.returncode == 1
    assert "閉列挙外" in result.stdout


# ── (b) 語彙の閉列挙 ───────────────────────────────────────────────────────
def test_unknown_disposition_is_rejected(tmp_path: Path):
    """`cached` のような非仕様値が入ると、実行と省略の区別が台帳から失われる。"""
    decision = json.loads(json.dumps(VALID))
    decision["checks"][0]["disposition"] = "cached"
    result = check(tmp_path, decision)
    assert result.returncode == 1
    assert "disposition が閉列挙外" in result.stdout


def test_cache_hit_must_be_executed(tmp_path: Path):
    """cache hit は「省いた」ではなく「同一入力の結果を再利用した」(【2】)。"""
    decision = json.loads(json.dumps(VALID))
    decision["checks"][1].update({"cache_hit": True, "cache_key": "a" * 64})
    result = check(tmp_path, decision)
    assert result.returncode == 1
    assert "cache_hit なのに disposition" in result.stdout


def test_cache_hit_without_key_is_rejected(tmp_path: Path):
    decision = json.loads(json.dumps(VALID))
    decision["checks"][0]["cache_hit"] = True
    result = check(tmp_path, decision)
    assert result.returncode == 1
    assert "cache_key が無い" in result.stdout


def test_cache_hit_with_key_passes(tmp_path: Path):
    decision = json.loads(json.dumps(VALID))
    decision["checks"][0].update({"cache_hit": True, "cache_key": "b" * 64})
    assert check(tmp_path, decision).returncode == 0


def test_skipped_is_allowed_without_issue(tmp_path: Path):
    """skipped は「この tier では恒久的に実行しない」であり、追跡義務を負うのは deferred だけ。"""
    decision = json.loads(json.dumps(VALID))
    decision["checks"] = [{"id": "live-trial", "disposition": "skipped"}]
    decision["deferred_issue_refs"] = []
    assert check(tmp_path, decision).returncode == 0


# ── (c) 延期の受け皿 ───────────────────────────────────────────────────────
def test_deferred_without_issue_refs_is_rejected(tmp_path: Path):
    result = check(tmp_path, mutated(deferred_issue_refs=[]))
    assert result.returncode == 1
    assert "deferred_issue_refs が空" in result.stdout


def test_downgrade_needs_reason_and_refs(tmp_path: Path):
    result = check(tmp_path, mutated(downgrade={"from": "critical", "to": "mvp"}))
    assert result.returncode == 1
    assert "downgrade があるのに reason が空" in result.stdout
    assert "downgrade があるのに deferred_issue_refs が空" in result.stdout


def test_recorded_downgrade_passes(tmp_path: Path):
    decision = mutated(downgrade={
        "from": "critical", "to": "mvp",
        "reason": "公開面に触れないため",
        "deferred_issue_refs": ["HarnessHub-xcl3"],
    })
    assert check(tmp_path, decision).returncode == 0


# ── 入出力の扱い ───────────────────────────────────────────────────────────
def test_unreadable_decision_is_a_violation(tmp_path: Path):
    path = tmp_path / "tier-decision.json"
    path.write_text("{ broken", encoding="utf-8")
    result = subprocess.run(
        [sys.executable, str(SCRIPT), "--decision", str(path)], capture_output=True, text=True
    )
    assert result.returncode == 1
    assert "読めない" in result.stdout


def test_scan_finds_nested_decisions(tmp_path: Path):
    write(tmp_path / "run-a", VALID)
    write(tmp_path / "run-b", mutated(tier_selector="absent"))
    result = subprocess.run(
        [sys.executable, str(SCRIPT), "--scan", str(tmp_path)], capture_output=True, text=True
    )
    assert result.returncode == 1
    assert "検査 2 件 / 違反 1 件" in result.stderr


def test_empty_scan_states_that_it_found_nothing(tmp_path: Path):
    """0 件を「全部通った」と読ませないための帰属表示。"""
    result = subprocess.run(
        [sys.executable, str(SCRIPT), "--scan", str(tmp_path)], capture_output=True, text=True
    )
    assert result.returncode == 0
    assert "検査 0 件" in result.stdout
    assert "記録が無い" in result.stdout


def test_requires_an_input_source():
    result = subprocess.run([sys.executable, str(SCRIPT)], capture_output=True, text=True)
    assert result.returncode == 2
    assert "--decision" in result.stderr


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-v"]))
