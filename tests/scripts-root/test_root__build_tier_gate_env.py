"""build-tier-gate-env.py (HarnessHub-xcl3 (3)) の切替値導出を固定する。

記録した tier を step の強制力へ翻訳する経路で守るべき点は 2 つある。

(a) skipped と deferred を潰さないこと。前者は「この tier では恒久的に実行しない」、
    後者は「この周回では実行しないが後続で必ず実行する」で、issue 追跡義務を負うのは後者だけ。
    同じ値へ丸めると、切替後に「なぜ走らなかったのか」を事後に区別できなくなる。
(b) 台帳が step へ配線済みと宣言した gate が tier-decision に無い場合は fail-closed。
    既定値で動くと、決めた集合と実際に効いた集合が静かにズレる。
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "scripts/build-tier-gate-env.py"

LEDGER = {
    "verification_gate_sites": [
        {
            "gate_id": "contract-verification",
            "wiring_state": "wired",
            "site": {
                "workflow": ".github/workflows/governance-check.yml",
                "job": "change-category-guard",
                "step_id": "gate_contract_verification",
            },
            "tier_switch": True,
            "env_var": "HH_GATE_CONTRACT_VERIFICATION",
        },
    ]
}


def decision(disposition: str, blocking: bool) -> dict:
    return {
        "tier": "mvp",
        "effective_tier": "mvp",
        "checks": [
            {"id": "contract-verification", "disposition": disposition, "blocking": blocking},
            {"id": "live-trial", "disposition": "deferred", "blocking": False},
        ],
        "deferred_issue_refs": ["HarnessHub-sy31"],
    }


def run(tmp_path: Path, payload: dict, ledger: dict = LEDGER) -> tuple[subprocess.CompletedProcess[str], Path]:
    tmp_path.mkdir(parents=True, exist_ok=True)
    decision_path = tmp_path / "tier-decision.json"
    decision_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    ledger_path = tmp_path / "required-check-ledger.json"
    ledger_path.write_text(json.dumps(ledger, ensure_ascii=False), encoding="utf-8")
    out = tmp_path / "gate-env.sh"
    result = subprocess.run(
        [
            sys.executable, str(SCRIPT),
            "--decision", str(decision_path),
            "--ledger", str(ledger_path),
            "--out", str(out),
        ],
        capture_output=True, text=True,
    )
    return result, out


@pytest.mark.parametrize(
    ("disposition", "blocking", "expected"),
    [
        ("executed", True, "blocking"),
        ("executed", False, "advisory"),
        ("deferred", False, "deferred"),
        ("skipped", False, "skipped"),
    ],
)
def test_disposition_と_blocking_から切替値を導出する(
    tmp_path: Path, disposition: str, blocking: bool, expected: str
) -> None:
    result, out = run(tmp_path, decision(disposition, blocking))
    assert result.returncode == 0, result.stderr
    assert out.read_text(encoding="utf-8").strip() == f"export HH_GATE_CONTRACT_VERIFICATION={expected}"


def test_deferred_と_skipped_を同じ値へ潰さない(tmp_path: Path) -> None:
    _, deferred_out = run(tmp_path / "a", decision("deferred", False))
    _, skipped_out = run(tmp_path / "b", decision("skipped", False))
    assert deferred_out.read_text(encoding="utf-8") != skipped_out.read_text(encoding="utf-8")


def test_配線済み_gate_が記録に無ければ_fail_closed(tmp_path: Path) -> None:
    payload = decision("executed", True)
    payload["checks"] = [c for c in payload["checks"] if c["id"] != "contract-verification"]
    result, _ = run(tmp_path, payload)
    assert result.returncode == 2
    assert "tier-decision の checks に無い" in result.stderr


def test_disposition_が閉列挙外なら落ちる(tmp_path: Path) -> None:
    result, _ = run(tmp_path, decision("maybe", False))
    assert result.returncode == 2
    assert "閉列挙外" in result.stderr


def test_未配線_gate_が一件でもあれば部分的な切替値を出さない(tmp_path: Path) -> None:
    partial = json.loads(json.dumps(LEDGER))
    partial["verification_gate_sites"].append(
        {"gate_id": "live-trial", "wiring_state": "unwired", "note": "配線未完了"}
    )
    result, out = run(tmp_path, decision("executed", True), partial)
    assert result.returncode == 2
    assert "wiring_state=unwired" in result.stderr
    assert not out.exists(), "部分配線の env file を成功成果物として残してはならない"


def test_配線状態が未指定なら_fail_closed(tmp_path: Path) -> None:
    broken = json.loads(json.dumps(LEDGER))
    broken["verification_gate_sites"][0].pop("wiring_state")
    decision_path = tmp_path / "tier-decision.json"
    ledger_path = tmp_path / "required-check-ledger.json"
    out = tmp_path / "gate-env.sh"
    decision_path.write_text(json.dumps(decision("executed", True)), encoding="utf-8")
    ledger_path.write_text(json.dumps(broken), encoding="utf-8")
    result = subprocess.run(
        [sys.executable, str(SCRIPT), "--decision", str(decision_path),
         "--ledger", str(ledger_path), "--out", str(out)],
        capture_output=True, text=True,
    )
    assert result.returncode == 2
    assert "wiring_state" in result.stderr
