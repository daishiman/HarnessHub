"""validate-required-gates.py (HarnessHub-ic7w) の台帳↔実態突合を固定する。

必須ゲート台帳は「宣言」であり、宣言だけなら嘘を書ける。本 test は嘘の形ごとに
検出されることを押さえる。

(a) 実在しない job / step を必須と宣言できないこと
(b) pull_request 起動・paths filter・check context は実 workflow から導出し、台帳へ複製しないこと
    (paths filter 付き job を required 化すると、対象外 PR が永久 pending になる)
(c) 実 workflow の job が台帳から漏れないこと (必須か否かを誰も決めていないゲート)
(d) protection を敷かない方針なら、代替の強制手段・限界・敷く条件が記録されていること
(e) verification-gate-ledger.json の gate が配線先の宣言を必ず持ち、tier 切替を宣言した
    step には切替値の受け渡し (＄GITHUB_ENV への export と continue-on-error 参照) があること
"""
from __future__ import annotations

import copy
import json
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "scripts/validate-required-gates.py"

WORKFLOW = """
name: fake-governance
on:
  pull_request:
    branches: [main]
jobs:
  guard:
    runs-on: ubuntu-latest
    steps:
      - name: apply verification tier
        run: |
          echo "HH_GATE_CONTRACT_VERIFICATION=$HH_GATE_CONTRACT_VERIFICATION" >> "$GITHUB_ENV"
      - name: validate plugin completeness
        id: gate_contract_verification
        run: python3 scripts/validate-plugin-completeness.py
        continue-on-error: ${{ env.HH_GATE_CONTRACT_VERIFICATION == 'advisory' }}
"""

FILTERED_WORKFLOW = """
name: fake-scoped
on:
  pull_request:
    paths: ["apps/**"]
jobs:
  scoped:
    runs-on: ubuntu-latest
    name: scoped gate
    steps:
      - run: echo hi
"""

GATE_LEDGER = {
    "schema_version": "1.0",
    "gates": [
        {
            "id": "contract-verification",
            "title": "契約検証",
            "always_blocking": False,
            "min_tier": "standard",
            "below_tier": "advisory",
            "rerun_command": "python3 scripts/validate-plugin-completeness.py",
        },
        {
            "id": "live-trial",
            "title": "live-trial",
            "always_blocking": False,
            "min_tier": "critical",
            "below_tier": "deferred",
            "rerun_command": "python3 plan-live-trials.py",
        },
    ],
}

LEDGER = {
    "schema_version": "1.0",
    "protection_policy": {
        "mode": "no-branch-protection",
        "decision": "protection を敷かない",
        "reason": ["赤いゲートで全 PR が止まるため"],
        "observation": {"command": "gh api ...", "result": "404 Branch not protected"},
        "alternative_enforcement": [
            {"mechanism": ".githooks/pre-push", "command": "bash scripts/run-ci-checks.sh"}
        ],
        "residual_risk": ["PUSH_SKIP_CI=1 で回避できる"],
        "exit_criteria": ["required 宣言が安定して緑になったら敷く"],
    },
    "checks": [
        {
            "workflow": ".github/workflows/fake.yml",
            "job": "guard",
            "enforcement": "required",
            "registered_in_branch_protection": False,
            "unregistered_reason": "方針として未登録",
        },
        {
            "workflow": ".github/workflows/scoped.yml",
            "job": "scoped",
            "enforcement": "advisory",
            "registered_in_branch_protection": False,
            "unregistered_reason": "paths filter があるため required 化できない",
        },
    ],
    "verification_gate_sites": [
        {
            "gate_id": "contract-verification",
            "wiring_state": "wired",
            "site": {
                "workflow": ".github/workflows/fake.yml",
                "job": "guard",
                "step_id": "gate_contract_verification",
                "step_name": "validate plugin completeness",
            },
            "tier_switch": True,
            "env_var": "HH_GATE_CONTRACT_VERIFICATION",
            "note": "min_tier=standard",
        },
        {
            "gate_id": "live-trial",
            "wiring_state": "unwired",
            "note": "CI step としては未配線",
        },
    ],
}


@pytest.fixture()
def repo(tmp_path: Path) -> Path:
    (tmp_path / ".github/workflows").mkdir(parents=True)
    (tmp_path / ".github/workflows/fake.yml").write_text(WORKFLOW, encoding="utf-8")
    (tmp_path / ".github/workflows/scoped.yml").write_text(FILTERED_WORKFLOW, encoding="utf-8")
    (tmp_path / "scripts").mkdir()
    write(tmp_path, "scripts/verification-gate-ledger.json", GATE_LEDGER)
    write(tmp_path, "scripts/required-check-ledger.json", LEDGER)
    return tmp_path


def write(root: Path, relative: str, payload: dict) -> None:
    (root / relative).write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def run(root: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(SCRIPT), "--repo-root", str(root)],
        capture_output=True, text=True,
    )


def mutate(root: Path, mutation) -> subprocess.CompletedProcess[str]:
    ledger = copy.deepcopy(LEDGER)
    mutation(ledger)
    write(root, "scripts/required-check-ledger.json", ledger)
    return run(root)


def test_正しい台帳は通り未登録ゲートを列挙する(repo: Path) -> None:
    result = run(repo)
    assert result.returncode == 0, result.stderr
    assert "未登録 (required 宣言): guard" in result.stdout
    assert "INCOMPLETE: branch protection 未適用" in result.stdout


def test_workflow_一覧を台帳へ二重記録すると落ちる(repo: Path) -> None:
    def mutation(ledger: dict) -> None:
        ledger["covered_workflows"] = [".github/workflows/fake.yml"]

    result = mutate(repo, mutation)
    assert result.returncode == 1
    assert "workflow" in result.stderr and "複製しない" in result.stderr


def test_実在しない_job_を宣言すると落ちる(repo: Path) -> None:
    def mutation(ledger: dict) -> None:
        ledger["checks"][0]["job"] = "ghost"

    result = mutate(repo, mutation)
    assert result.returncode == 1
    assert "job が実在しない" in result.stderr


def test_context_を台帳へ二重記録すると落ちる(repo: Path) -> None:
    def mutation(ledger: dict) -> None:
        ledger["checks"][1]["context"] = "scoped"

    result = mutate(repo, mutation)
    assert result.returncode == 1
    assert "実 workflow から導出できるキー" in result.stderr


def test_paths_filter_付き_job_を_required_と宣言すると落ちる(repo: Path) -> None:
    def mutation(ledger: dict) -> None:
        ledger["checks"][1]["enforcement"] = "required"

    result = mutate(repo, mutation)
    assert result.returncode == 1
    assert "永久 pending" in result.stderr


def test_path_filtered_を台帳へ二重記録すると落ちる(repo: Path) -> None:
    def mutation(ledger: dict) -> None:
        ledger["checks"][1]["path_filtered"] = False

    result = mutate(repo, mutation)
    assert result.returncode == 1
    assert "実 workflow から導出できるキー" in result.stderr


def test_台帳から_job_が漏れると落ちる(repo: Path) -> None:
    def mutation(ledger: dict) -> None:
        ledger["checks"].pop()

    result = mutate(repo, mutation)
    assert result.returncode == 1
    assert "台帳に無い job" in result.stderr


def test_未登録なのに理由が空なら落ちる(repo: Path) -> None:
    def mutation(ledger: dict) -> None:
        ledger["checks"][0]["unregistered_reason"] = "  "

    result = mutate(repo, mutation)
    assert result.returncode == 1
    assert "unregistered_reason が空" in result.stderr


def test_protection_を敷かない方針で代替手段が無いと落ちる(repo: Path) -> None:
    def mutation(ledger: dict) -> None:
        ledger["protection_policy"]["alternative_enforcement"] = []

    result = mutate(repo, mutation)
    assert result.returncode == 1
    assert "alternative_enforcement が空" in result.stderr


def test_未保護方針と登録済み宣言の矛盾を検出する(repo: Path) -> None:
    def mutation(ledger: dict) -> None:
        ledger["checks"][0]["registered_in_branch_protection"] = True

    result = mutate(repo, mutation)
    assert result.returncode == 1
    assert "矛盾する" in result.stderr


def test_gate_の配線先宣言が欠けると落ちる(repo: Path) -> None:
    def mutation(ledger: dict) -> None:
        ledger["verification_gate_sites"].pop()

    result = mutate(repo, mutation)
    assert result.returncode == 1
    assert "verification_gate_sites に無い" in result.stderr


def test_配線先の_step_id_が実在しないと落ちる(repo: Path) -> None:
    def mutation(ledger: dict) -> None:
        ledger["verification_gate_sites"][0]["site"]["step_id"] = "gate_ghost"

    result = mutate(repo, mutation)
    assert result.returncode == 1
    assert "step が実在しない" in result.stderr


def test_切替値を_GITHUB_ENV_へ渡さない配線は落ちる(repo: Path) -> None:
    workflow = WORKFLOW.replace(
        '          echo "HH_GATE_CONTRACT_VERIFICATION=$HH_GATE_CONTRACT_VERIFICATION" >> "$GITHUB_ENV"',
        "          echo skipped-export",
    )
    (repo / ".github/workflows/fake.yml").write_text(workflow, encoding="utf-8")
    result = run(repo)
    assert result.returncode == 1
    assert "$GITHUB_ENV へ書き出す step が job に無い" in result.stderr


def test_continue_on_error_が切替値を参照しない配線は落ちる(repo: Path) -> None:
    workflow = WORKFLOW.replace(
        "        continue-on-error: ${{ env.HH_GATE_CONTRACT_VERIFICATION == 'advisory' }}",
        "        continue-on-error: false",
    )
    (repo / ".github/workflows/fake.yml").write_text(workflow, encoding="utf-8")
    result = run(repo)
    assert result.returncode == 1
    assert "advisory 降格が配線されていない" in result.stderr


def test_未配線_gate_に配線済み用キーを混在させると落ちる(repo: Path) -> None:
    def mutation(ledger: dict) -> None:
        ledger["verification_gate_sites"][1]["tier_switch"] = True

    result = mutate(repo, mutation)
    assert result.returncode == 1
    assert "配線済み用キー" in result.stderr


def test_wiring_state_を省略すると落ちる(repo: Path) -> None:
    def mutation(ledger: dict) -> None:
        ledger["verification_gate_sites"][1].pop("wiring_state")

    result = mutate(repo, mutation)
    assert result.returncode == 1
    assert "wiring_state" in result.stderr


def test_実リポジトリの台帳が実_workflow_と整合している() -> None:
    """本番の台帳そのものを検査する (fixture が緑でも実台帳が腐れば意味が無い)。"""
    result = subprocess.run([sys.executable, str(SCRIPT)], capture_output=True, text=True)
    assert result.returncode == 0, result.stdout + result.stderr
