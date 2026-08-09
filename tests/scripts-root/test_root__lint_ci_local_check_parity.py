"""HarnessHub-ml57: CI → local check parity の回帰テスト。"""
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "lint-ci-local-check-parity.py"
SPEC = importlib.util.spec_from_file_location("lint_ci_local_check_parity", SCRIPT)
assert SPEC and SPEC.loader
MOD = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MOD
SPEC.loader.exec_module(MOD)


def _repo(tmp_path: Path, *, ci_run: str, local_run: str, entries: list[dict] | None = None) -> Path:
    workflows = tmp_path / ".github" / "workflows"
    scripts = tmp_path / "scripts"
    workflows.mkdir(parents=True)
    scripts.mkdir()
    (workflows / "ci.yml").write_text(
        "name: ci\n"
        "on: [push]\n"
        "jobs:\n"
        "  verify:\n"
        "    runs-on: ubuntu-latest\n"
        "    steps:\n"
        "      - name: verify\n"
        "        run: |\n"
        + "".join(f"          {line}\n" for line in ci_run.splitlines()),
        encoding="utf-8",
    )
    (scripts / "run-ci-checks.sh").write_text(local_run, encoding="utf-8")
    (scripts / "ci-local-check-allowlist.json").write_text(
        json.dumps({"schema_version": 1, "entries": entries or []}),
        encoding="utf-8",
    )
    return tmp_path


def test_argument_normalization_keeps_semantics_but_ignores_flag_order():
    left = MOD.normalize_args(["--all", "--threshold", "80", "--gate-new"])
    right = MOD.normalize_args(["--gate-new", "--threshold=80", "--all"])
    assert left == right
    assert left != MOD.normalize_args(["--all", "--threshold", "90", "--gate-new"])
    assert MOD.normalize_args([]) != MOD.normalize_args(["--check"])


def test_missing_ci_invocation_is_fail_closed_and_argument_sensitive(tmp_path: Path):
    root = _repo(
        tmp_path,
        ci_run="python3 scripts/check.py --check",
        local_run='run "check" python3 scripts/check.py\n',
    )
    result = MOD.audit(root)
    assert result.errors
    assert any("CI-only (blocking): scripts/check.py --check" in error for error in result.errors)


def test_exact_reasoned_allowlist_covers_intentional_local_omission(tmp_path: Path):
    root = _repo(
        tmp_path,
        ci_run="python3 scripts/update-cache.py --write",
        local_run='run "other" python3 scripts/other.py\n',
        entries=[
            {
                "script": "scripts/update-cache.py",
                "args": ["--write"],
                "reason": "scheduled CI owns the generated cache and writes the working tree",
            }
        ],
    )
    result = MOD.audit(root)
    assert result.errors == []
    assert {item.display() for item in result.allowlisted} == {
        "scripts/update-cache.py --write"
    }


@pytest.mark.parametrize(
    ("entries", "expected"),
    [
        (
            [{"script": "scripts/check.py", "args": [], "reason": ""}],
            "reason は空にできない",
        ),
        (
            [
                {
                    "script": "scripts/gone.py",
                    "args": [],
                    "reason": "this command no longer exists",
                }
            ],
            "stale allowlist",
        ),
    ],
)
def test_allowlist_is_exact_reasoned_and_self_cleaning(
    tmp_path: Path, entries: list[dict], expected: str
):
    root = _repo(
        tmp_path,
        ci_run="python3 scripts/check.py",
        local_run='run "check" python3 scripts/check.py\n',
        entries=entries,
    )
    assert any(expected in error for error in MOD.audit(root).errors)


def test_nonblocking_ci_call_still_requires_an_explicit_reason(tmp_path: Path):
    root = _repo(
        tmp_path,
        ci_run="python3 scripts/smoke.py || true",
        local_run='run "other" python3 scripts/other.py\n',
    )
    result = MOD.audit(root)
    assert any("CI-only (non-blocking): scripts/smoke.py" in error for error in result.errors)


def test_plugin_working_directory_does_not_masquerade_as_repo_root_script(tmp_path: Path):
    root = _repo(
        tmp_path,
        ci_run="python3 scripts/root-check.py",
        local_run='run "root" python3 scripts/root-check.py\n',
    )
    workflow = root / ".github" / "workflows" / "plugin.yml"
    workflow.write_text(
        "name: plugin\n"
        "on: [push]\n"
        "jobs:\n"
        "  verify:\n"
        "    runs-on: ubuntu-latest\n"
        "    defaults:\n"
        "      run:\n"
        "        working-directory: plugins/example\n"
        "    steps:\n"
        "      - run: python3 scripts/plugin-check.py --check\n",
        encoding="utf-8",
    )
    result = MOD.audit(root)
    assert result.errors == []
    assert all(item.script != "scripts/plugin-check.py" for item in result.ci_blocking)


def test_command_substitution_is_not_a_silent_escape_hatch(tmp_path: Path):
    """``VAR=$(python3 scripts/x.py ...)`` を抽出漏れにしない (fail-open の封鎖)。

    剥がさないと shlex は ``VAR=$(python3`` を 1 トークンにするため、python3 の一致検査を
    すり抜け、CI にしか無い検査が「CI-only 0 件」として通ってしまう。
    """
    root = _repo(
        tmp_path,
        ci_run="TIER=$(python3 scripts/pick.py --from-git origin/main)",
        local_run='run "other" python3 scripts/other.py\n',
    )
    result = MOD.audit(root)
    assert any(
        "CI-only (blocking): scripts/pick.py --from-git=origin/main" in error
        for error in result.errors
    ), result.errors


def test_unparseable_python_invocation_fails_loudly(tmp_path: Path):
    """解析器が知らない書き方は 0 件で握り潰さず、解析不能として落とす。"""
    root = _repo(
        tmp_path,
        ci_run='eval "python3 scripts/hidden.py --check"',
        local_run='run "other" python3 scripts/other.py\n',
    )
    result = MOD.audit(root)
    assert any("解析できない" in error for error in result.errors), result.errors


def test_current_repository_has_ci_local_parity_and_all_three_entrypoints():
    result = MOD.audit(ROOT)
    assert result.errors == []
    for relative in (
        ".github/workflows/governance-check.yml",
        "Makefile",
        "scripts/run-ci-checks.sh",
    ):
        text = (ROOT / relative).read_text(encoding="utf-8")
        assert "lint-ci-local-check-parity.py" in text, relative
