"""migrate-pipeline-improvement.py (P08 冪等 migration / design §3.5 §4 §8) の検証。

test-plan.md の MG-I* (冪等) / MG-A* (全件性) / MG-N* (非破壊) を実リポジトリ状態に対して確認する。
migration は既に適用済みのため、再実行が差分 0 に収束することを主に検証する。
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "migrate-pipeline-improvement.py"
REPO = Path(__file__).resolve().parents[3]


def _dry_run(repo: Path) -> dict:
    proc = subprocess.run(
        [sys.executable, str(SCRIPT), "--repo-root", str(repo), "--dry-run"],
        capture_output=True, text=True, check=False,
    )
    assert proc.returncode == 0, proc.stderr
    return json.loads(proc.stdout)


def test_mg_i01_idempotent_on_real_repo() -> None:
    # 適用済みの実リポジトリでは dry-run が moved 0 / dispositions 0 に収束する
    receipt = _dry_run(REPO)
    assert receipt["moved_count"] == 0
    assert receipt["dispositions_added"] == 0


def test_mg_a03_core_audit_has_31_rows() -> None:
    receipt = _dry_run(REPO)
    assert receipt["core_handoff_audit_count"] == 31


def test_mg_a04_core_audit_row_shape() -> None:
    receipt = _dry_run(REPO)
    for row in receipt["core_handoff_audit"]:
        assert set(row) >= {"handoff", "finding_id", "target_ref", "disposition", "rationale"}
        assert row["disposition"] in ("applied", "deferred", "rejected")


def test_mg_a02_all_handoffs_have_disposition() -> None:
    # migration 後、fixture 以外の全 handoff item が disposition を持つ
    missing = []
    for path in sorted(REPO.glob("plugin-plans/**/improvement-handoff*.json")):
        rel = str(path.relative_to(REPO))
        if "/fixtures/" in f"/{rel}" or "/finish/" in f"/{rel}":
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        assert data.get("schema_version") == "1.1.0", rel
        for key in ("findings", "improvements", "clusters"):
            for item in data.get(key, []) or []:
                if not isinstance(item, dict):
                    continue
                if "disposition" not in item:
                    missing.append(f"{rel}:{item.get('id')}")
    assert not missing, missing
