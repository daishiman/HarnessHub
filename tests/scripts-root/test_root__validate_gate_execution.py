"""validate-gate-execution.py (HarnessHub-xcl3 (3)) の検算を固定する。

blocking 集合を tier で切り替えると、判定が壊れた瞬間に検査が黙って消える経路ができる。
本 test は「検査した」と「検査したことになっていた」を分ける条件を押さえる。

(a) blocking と決めた gate の step が skip されていたら落ちる (被覆の主張だけが残る形)
(b) deferred と決めた gate の step が走っていたら落ちる (記録と実態の乖離)
(c) step の実行記録そのものが無い (id の消失・rename) を成功と読まない
(d) 未配線 gate は「検算対象外だから成功」とせず fail-closed にする
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "scripts/validate-gate-execution.py"
WORKFLOW = ".github/workflows/governance-check.yml"
JOB = "change-category-guard"

LEDGER = {
    "verification_gate_sites": [
        {
            "gate_id": "contract-verification",
            "wiring_state": "wired",
            "site": {"workflow": WORKFLOW, "job": JOB, "step_id": "gate_contract_verification"},
            "tier_switch": True,
            "env_var": "HH_GATE_CONTRACT_VERIFICATION",
        },
        {"gate_id": "live-trial", "wiring_state": "unwired", "note": "配線未完了"},
    ]
}


def decision(disposition: str, blocking: bool) -> dict:
    return {
        "tier": "standard",
        "effective_tier": "standard",
        "checks": [
            {"id": "contract-verification", "disposition": disposition, "blocking": blocking},
            {"id": "live-trial", "disposition": "deferred", "blocking": False},
        ],
        "deferred_issue_refs": ["HarnessHub-sy31"],
    }


def run(tmp_path: Path, payload: dict, outcome: str | None) -> subprocess.CompletedProcess[str]:
    tmp_path.mkdir(parents=True, exist_ok=True)
    decision_path = tmp_path / "tier-decision.json"
    decision_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    ledger_path = tmp_path / "required-check-ledger.json"
    ledger_path.write_text(json.dumps(LEDGER, ensure_ascii=False), encoding="utf-8")
    outcomes_path = tmp_path / "outcomes.json"
    outcomes = {} if outcome is None else {
        "gate_contract_verification": {"outcome": outcome, "conclusion": outcome, "outputs": {}}
    }
    outcomes_path.write_text(json.dumps(outcomes), encoding="utf-8")
    return subprocess.run(
        [
            sys.executable, str(SCRIPT),
            "--decision", str(decision_path),
            "--ledger", str(ledger_path),
            "--workflow", WORKFLOW,
            "--job", JOB,
            "--outcomes-file", str(outcomes_path),
        ],
        capture_output=True, text=True,
    )


def test_blocking_と決めた_gate_が成功していれば通る(tmp_path: Path) -> None:
    payload = decision("executed", True)
    payload["checks"] = [payload["checks"][0]]
    result = run(tmp_path, payload, "success")
    assert result.returncode == 0, result.stderr
    assert "検算 1 件" in result.stdout


def test_blocking_と決めた_gate_が_skip_されていたら落ちる(tmp_path: Path) -> None:
    payload = decision("executed", True)
    payload["checks"] = [payload["checks"][0]]
    result = run(tmp_path, payload, "skipped")
    assert result.returncode == 1
    assert "起動していない" in result.stderr


def test_blocking_と決めた_gate_の失敗を検出する(tmp_path: Path) -> None:
    payload = decision("executed", True)
    payload["checks"] = [payload["checks"][0]]
    result = run(tmp_path, payload, "failure")
    assert result.returncode == 1
    assert "成功していない" in result.stderr


def test_advisory_は失敗しても通るが_skip_なら落ちる(tmp_path: Path) -> None:
    payload = decision("executed", False)
    payload["checks"] = [payload["checks"][0]]
    assert run(tmp_path / "a", payload, "failure").returncode == 0
    result = run(tmp_path / "b", payload, "skipped")
    assert result.returncode == 1
    assert "起動していない" in result.stderr


def test_deferred_と決めた_gate_が走っていたら落ちる(tmp_path: Path) -> None:
    payload = decision("deferred", False)
    payload["checks"] = [payload["checks"][0]]
    result = run(tmp_path, payload, "success")
    assert result.returncode == 1
    assert "起動している" in result.stderr


def test_deferred_で_step_が_skip_なら通る(tmp_path: Path) -> None:
    payload = decision("deferred", False)
    payload["checks"] = [payload["checks"][0]]
    assert run(tmp_path, payload, "skipped").returncode == 0


def test_deferred_なのに受け皿が空なら落ちる(tmp_path: Path) -> None:
    payload = decision("deferred", False)
    payload["checks"] = [payload["checks"][0]]
    payload["deferred_issue_refs"] = []
    result = run(tmp_path, payload, "skipped")
    assert result.returncode == 1
    assert "deferred_issue_refs が空" in result.stderr


def test_step_の実行記録が無ければ落ちる(tmp_path: Path) -> None:
    payload = decision("executed", True)
    payload["checks"] = [payload["checks"][0]]
    result = run(tmp_path, payload, None)
    assert result.returncode == 1
    assert "実行記録が無い" in result.stderr


def test_未配線_gate_は検算対象外を成功扱いせず落ちる(tmp_path: Path) -> None:
    result = run(tmp_path, decision("executed", True), "success")
    assert result.returncode == 1
    assert "未検算 1 件" in result.stdout
    assert "wiring_state=unwired" in result.stderr
    assert "live-trial" in result.stdout


def test_配線済み_gate_が記録に無ければ落ちる(tmp_path: Path) -> None:
    payload = decision("executed", True)
    payload["checks"] = [c for c in payload["checks"] if c["id"] != "contract-verification"]
    result = run(tmp_path, payload, "success")
    assert result.returncode == 1
    assert "台帳は wired だが tier-decision の checks に無い" in result.stderr
