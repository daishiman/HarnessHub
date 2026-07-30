"""lint-workflow-step-guard の空走査 fail-closed 契約テスト。

HarnessHub-foq6 の受入条件を、既存の包括テストから単一責務で分離する。
workflows dir 不在・YAML 0 件は失敗し、意図的な空走査だけを
`--allow-empty` の明示 opt-in で許可する。
"""

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "lint-workflow-step-guard.py"


def _run(workflows_dir: Path, *extra_args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            sys.executable,
            str(SCRIPT),
            "--workflows-dir",
            str(workflows_dir),
            *extra_args,
        ],
        text=True,
        capture_output=True,
    )


def test_cli_rejects_missing_workflows_dir(tmp_path):
    res = _run(tmp_path / "missing")
    assert res.returncode == 1
    assert "[ERROR] workflows dir not found" in res.stdout


def test_cli_rejects_empty_workflows_dir(tmp_path):
    res = _run(tmp_path)
    assert res.returncode == 1
    assert "[ERROR] no workflow files found" in res.stdout


def test_cli_allows_empty_scan_only_with_explicit_opt_in(tmp_path):
    for workflows_dir in (tmp_path / "missing", tmp_path):
        res = _run(workflows_dir, "--allow-empty")
        assert res.returncode == 0, f"stdout={res.stdout}\nstderr={res.stderr}"
        assert "[SKIP]" in res.stdout and "--allow-empty" in res.stdout


def test_allow_empty_does_not_bypass_real_workflow_violations(tmp_path):
    (tmp_path / "broken.yml").write_text(
        """\
jobs:
  guard:
    runs-on: ubuntu-latest
    steps:
      - if: ${{ env.TOKEN != '' }}
        env:
          TOKEN: ${{ secrets.TOKEN }}
        run: echo guarded
""",
        encoding="utf-8",
    )
    res = _run(tmp_path, "--allow-empty")
    assert res.returncode == 1
    assert "VIOLATION" in res.stdout
