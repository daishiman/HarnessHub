"""scripts/lint-workflow-step-guard.py の genuine で網羅的な機能テスト。

HarnessHub-5u5k の再発防止。GitHub Actions は step-level `if` を step の `env` 適用より
前に評価するため、`if: ${{ env.X != '' }}` + 同 step の `env: X: ${{ secrets.X }}` は
恒久的に false となり、secret を投入しても当該 step が一度も実行されない (常時 skip の
fail-open)。悪性 (step 自身の env のみ / どこにも無い / steps.if の secrets 参照) を検出し、
良性 (job-level env 経由 / workflow-level env / 先行 step の $GITHUB_ENV) を PASS させる。

カバー:
- MUST_DETECT: step-level env のみ / 未定義 / steps.if の secrets context 参照
- MUST_PASS: job-level env / workflow-level env / $GITHUB_ENV / job と step の両方に定義
- ゲート実効性: 修正形は token 有無で run/skip が切り替わり、defect 形は token を入れても skip
- 実リポジトリ契約: CLI が exit 0 / governance-check.yml の Notion 3 step の run/skip 実測
- 注入した defect workflow を CLI が exit 1 で落とすこと
- 実行環境契約: PyYAML の install が CI で本 lint より前に配線され、local 入口 2 経路
  (make lint / run-ci-checks.sh) からも同一実装が呼ばれること

network: false, keychain: なし, 実ファイル書換: なし (tmp_path のみ)。
"""
import importlib.util
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "lint-workflow-step-guard.py"
REAL_WORKFLOW = ROOT / ".github" / "workflows" / "governance-check.yml"
SYNC_NOTION_SCHEMA = ROOT / "scripts" / "sync-notion-schema.py"
LINT_NOTION_RELATIONS = ROOT / "scripts" / "lint-notion-relations.py"

SPEC = importlib.util.spec_from_file_location("lint_wsg_uut", SCRIPT)
MOD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MOD)


def _scopes(workflow=(), job=(), github=(), step=()):
    return {
        "workflow_env": set(workflow),
        "job_env": set(job),
        "github_env": set(github),
        "step_env": set(step),
    }


def _write(tmp_path, name, text):
    path = tmp_path / name
    path.write_text(text, encoding="utf-8")
    return path


def _notion_command_env(tmp_path):
    """workflow と同じ token/config/DB ID を与え、curl だけを決定論的な偽 API にする。"""
    config = _write(
        tmp_path,
        "notion-config.json",
        json.dumps({"databases": {}, "schema_dir": "doc/notion-schema"}),
    )
    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()
    fake_curl = _write(
        fake_bin,
        "curl",
        """#!/usr/bin/env python3
import json
import os
import sys

url = next(arg for arg in sys.argv if arg.startswith("https://"))
database_id = url.split("/databases/", 1)[1].split("/", 1)[0]
response = json.loads(os.environ["FAKE_NOTION_RESPONSES"])[database_id]
print(json.dumps(response))
print("__HTTP__200")
""",
    )
    fake_curl.chmod(0o755)

    env = os.environ.copy()
    env.update(
        {
            "NOTION_CONFIG_PATH": str(config),
            "NOTION_TOKEN": "dummy-token",
            "INTAKE_ALLOW_ENV_TOKEN": "1",
            "NOTION_DB_SKILL_LIST": "11111111111111111111111111111111",
            "INTAKE_NOTION_DATABASE_ID": "22222222222222222222222222222222",
            "NOTION_DB_IMPROVEMENT_REQUEST": "33333333333333333333333333333333",
            "PATH": f"{fake_bin}{os.pathsep}{env['PATH']}",
        }
    )
    return env


# ── classify_env_reference: MUST_PASS (解決可能な定義元) ─────────────────────
def test_classify_ok_when_defined_at_job_level():
    assert MOD.classify_env_reference("TOKEN", _scopes(job=["TOKEN"]))[0] == "ok"


def test_classify_ok_when_defined_at_workflow_level():
    assert MOD.classify_env_reference("TOKEN", _scopes(workflow=["TOKEN"]))[0] == "ok"


def test_classify_ok_when_written_by_previous_step_github_env():
    assert MOD.classify_env_reference("TOKEN", _scopes(github=["TOKEN"]))[0] == "ok"


def test_classify_ok_when_defined_at_both_job_and_step_level():
    # 正しく直された形。secret 本体を step env に残すのは正当なので誤検出してはいけない。
    severity, _ = MOD.classify_env_reference("TOKEN", _scopes(job=["TOKEN"], step=["TOKEN"]))
    assert severity == "ok"


# ── classify_env_reference: MUST_DETECT (常に false になる参照) ──────────────
def test_classify_violation_when_only_step_level_env():
    severity, detail = MOD.classify_env_reference("TOKEN", _scopes(step=["TOKEN"]))
    assert severity == "violation"
    # 原因 (評価順) と直し方 (job-level の真偽値) が両方伝わること。
    assert "同じ step" in detail and "job-level env" in detail


def test_classify_violation_when_defined_nowhere():
    severity, detail = MOD.classify_env_reference("TOKEN", _scopes())
    assert severity == "violation"
    assert "定義が無い" in detail


def test_classify_violation_messages_differ_by_cause():
    # 症状 (常に false) は同じでも直し方が違うので、メッセージを取り違えてはいけない。
    only_step = MOD.classify_env_reference("TOKEN", _scopes(step=["TOKEN"]))[1]
    nowhere = MOD.classify_env_reference("TOKEN", _scopes())[1]
    assert only_step != nowhere


# ── unwrap_expression / collect_github_env_writes ───────────────────────────
def test_unwrap_expression_handles_both_forms():
    assert MOD.unwrap_expression("${{ env.A == 'x' }}") == "env.A == 'x'"
    assert MOD.unwrap_expression("env.A == 'x'") == "env.A == 'x'"


def test_collect_github_env_writes_extracts_names():
    script = 'echo "FLAG=1" >> "$GITHUB_ENV"\necho "OTHER=2" >> $GITHUB_ENV\n'
    assert MOD.collect_github_env_writes(script) == {"FLAG", "OTHER"}


def test_collect_github_env_writes_ignores_plain_echo():
    # $GITHUB_ENV へ書いていない echo は後続 step から見えない。
    assert MOD.collect_github_env_writes('echo "FLAG=1"\n') == set()


# ── lint_workflow: fixture 単位の検出/非検出 ────────────────────────────────
def test_lint_detects_broken_fixture(tmp_path):
    path = _write(tmp_path, "broken.yml", MOD.BROKEN_FIXTURE)
    violations = MOD.lint_workflow(path)
    assert len(violations) == 1 and "MY_TOKEN" in violations[0]


def test_lint_passes_fixed_fixture(tmp_path):
    assert MOD.lint_workflow(_write(tmp_path, "fixed.yml", MOD.FIXED_FIXTURE)) == []


def test_lint_detects_secrets_context_in_step_if(tmp_path):
    path = _write(tmp_path, "s.yml", MOD.SECRETS_IN_IF_FIXTURE)
    violations = MOD.lint_workflow(path)
    assert len(violations) == 1 and "secrets context は利用できない" in violations[0]


def test_lint_detects_bracket_notation_for_step_env_and_secrets(tmp_path):
    step_env = MOD.BROKEN_FIXTURE.replace("env.MY_TOKEN", "env['MY_TOKEN']")
    secret = MOD.SECRETS_IN_IF_FIXTURE.replace("secrets.MY_TOKEN", "secrets['MY_TOKEN']")
    assert "MY_TOKEN" in MOD.lint_workflow(_write(tmp_path, "step-env.yml", step_env))[0]
    assert "secrets context" in MOD.lint_workflow(_write(tmp_path, "secret.yml", secret))[0]


def test_lint_passes_github_env_fixture(tmp_path):
    assert MOD.lint_workflow(_write(tmp_path, "g.yml", MOD.GITHUB_ENV_FIXTURE)) == []


def test_lint_detects_forward_reference_to_later_github_env(tmp_path):
    # $GITHUB_ENV への書き出しは「その step より後」からしか見えない。順序を無視すると
    # 定義前に参照している step を緑にしてしまう。
    text = """
name: forward-ref
on: [push]
jobs:
  guard:
    runs-on: ubuntu-latest
    steps:
      - name: gated step
        if: env.LATE_FLAG == 'yes'
        run: echo run
      - name: export flag
        run: echo "LATE_FLAG=yes" >> "$GITHUB_ENV"
"""
    violations = MOD.lint_workflow(_write(tmp_path, "f.yml", text))
    assert len(violations) == 1 and "LATE_FLAG" in violations[0]


# ── eval_expression ─────────────────────────────────────────────────────────
def test_eval_expression_equality_and_inequality():
    ctx = {"env": {"FLAG": "true"}, "secrets": {}, "vars": {}}
    assert MOD.eval_expression("env.FLAG == 'true'", ctx) is True
    assert MOD.eval_expression("env.FLAG != 'true'", ctx) is False


def test_eval_expression_missing_name_is_empty_string():
    ctx = {"env": {}, "secrets": {}, "vars": {}}
    assert MOD.eval_expression("env.MISSING != ''", ctx) is False


def test_eval_expression_returns_none_for_unsupported_syntax():
    ctx = {"env": {}, "secrets": {}, "vars": {}}
    assert MOD.eval_expression("success() && env.A", ctx) is None


# ── ゲート実効性 (fixture) ──────────────────────────────────────────────────
def test_fixed_fixture_runs_with_token_and_skips_without(tmp_path):
    path = _write(tmp_path, "fixed.yml", MOD.FIXED_FIXTURE)
    with_token = MOD.simulate_workflow(path, {"MY_TOKEN": "dummy"}, {})
    without_token = MOD.simulate_workflow(path, {}, {})
    assert [run for _, _, run in with_token] == [True]
    assert [run for _, _, run in without_token] == [False]


def test_simulation_preserves_direct_variable_value(tmp_path):
    fixture = """
name: variable
on: [push]
jobs:
  guard:
    runs-on: ubuntu-latest
    env:
      DB_ID: ${{ vars.DB_ID }}
    steps:
      - name: gated step
        if: env.DB_ID == 'database-123'
        run: echo run
"""
    path = _write(tmp_path, "variable.yml", fixture)
    assert MOD.simulate_workflow(path, {}, {"DB_ID": "database-123"})[0][2] is True
    assert MOD.simulate_workflow(path, {}, {})[0][2] is False


def test_broken_fixture_stays_skipped_even_with_token(tmp_path):
    # defect の再現。これが True になったらシミュレータが誤って step env を混ぜている。
    path = _write(tmp_path, "broken.yml", MOD.BROKEN_FIXTURE)
    assert [run for _, _, run in MOD.simulate_workflow(path, {"MY_TOKEN": "dummy"}, {})] == [False]


# ── 実リポジトリ契約 ────────────────────────────────────────────────────────
def _real_notion_steps(secrets):
    results = MOD.simulate_workflow(REAL_WORKFLOW, secrets, {})
    return [(label, run) for _, label, run in results if "notion" in label.lower()]


def test_real_workflow_notion_steps_run_when_token_configured():
    steps = _real_notion_steps({"NOTION_TOKEN": "dummy"})
    assert len(steps) == 3, steps  # config 準備 + schema drift + relation invariants
    assert all(run is True for _, run in steps), steps


def test_real_workflow_notion_steps_skip_when_token_absent():
    steps = _real_notion_steps({})
    assert len(steps) == 3, steps
    assert all(run is False for _, run in steps), steps


def test_real_workflow_has_no_undecidable_notion_gate():
    # 判定不能 (None) が混ざると「実測した」と言えなくなる。
    assert all(run is not None for _, run in _real_notion_steps({"NOTION_TOKEN": "dummy"}))


def test_prepare_notion_config_requires_all_database_ids_when_token_is_present(tmp_path):
    workflow = MOD.yaml.safe_load(REAL_WORKFLOW.read_text(encoding="utf-8"))
    prepare = next(
        step
        for step in workflow["jobs"]["change-category-guard"]["steps"]
        if str(step.get("name", "")).startswith("prepare notion config")
    )
    env = _notion_command_env(tmp_path)
    env.update(
        {
            "RUNNER_TEMP": str(tmp_path),
            "GITHUB_ENV": str(tmp_path / "github-env"),
        }
    )

    complete = subprocess.run(
        ["bash", "-euo", "pipefail", "-c", prepare["run"]],
        env=env,
        text=True,
        capture_output=True,
    )
    assert complete.returncode == 0, (
        f"stdout={complete.stdout}\nstderr={complete.stderr}"
    )
    assert json.loads((tmp_path / "notion-config.json").read_text())["databases"] == {}
    assert "NOTION_CONFIG_PATH=" in (tmp_path / "github-env").read_text()

    missing_env = dict(env)
    missing_env.pop("NOTION_DB_IMPROVEMENT_REQUEST")
    missing = subprocess.run(
        ["bash", "-euo", "pipefail", "-c", prepare["run"]],
        env=missing_env,
        text=True,
        capture_output=True,
    )
    assert missing.returncode == 1
    assert "NOTION_DB_IMPROVEMENT_REQUEST must be set" in missing.stdout


def test_real_notion_commands_execute_with_token_and_database_ids(tmp_path):
    """run/skip の模擬だけでなく、workflow が呼ぶ 2 コマンドを実プロセスで通す。"""
    env = _notion_command_env(tmp_path)
    database_ids = {
        "skill-list": env["NOTION_DB_SKILL_LIST"],
        "hearing-sheet": env["INTAKE_NOTION_DATABASE_ID"],
        "improvement-request": env["NOTION_DB_IMPROVEMENT_REQUEST"],
    }
    schema_responses = {}
    for key, database_id in database_ids.items():
        schema = json.loads(
            (ROOT / "doc" / "notion-schema" / f"{key}.schema.json").read_text(encoding="utf-8")
        )
        schema_responses[database_id] = {
            "properties": {
                name: {"type": spec["type"]}
                for name, spec in schema["managed_properties"].items()
            }
        }

    sync_env = dict(env)
    sync_env["FAKE_NOTION_RESPONSES"] = json.dumps(schema_responses)
    sync = subprocess.run(
        [sys.executable, str(SYNC_NOTION_SCHEMA), "--check"],
        cwd=ROOT,
        env=sync_env,
        text=True,
        capture_output=True,
    )
    assert sync.returncode == 0, f"stdout={sync.stdout}\nstderr={sync.stderr}"
    assert all(f"[OK] {key}: no drift" in sync.stdout for key in database_ids)

    relation_env = dict(env)
    relation_env["FAKE_NOTION_RESPONSES"] = json.dumps(
        {
            database_id: {"results": [], "has_more": False}
            for database_id in database_ids.values()
        }
    )
    relations = subprocess.run(
        [sys.executable, str(LINT_NOTION_RELATIONS)],
        cwd=ROOT,
        env=relation_env,
        text=True,
        capture_output=True,
    )
    assert relations.returncode == 0, (
        f"stdout={relations.stdout}\nstderr={relations.stderr}"
    )
    assert "[OK] all relation invariants satisfied" in relations.stdout


def test_cli_self_test_exit_zero():
    res = subprocess.run([sys.executable, str(SCRIPT), "--self-test"],
                         text=True, capture_output=True)
    assert res.returncode == 0, f"stdout={res.stdout}\nstderr={res.stderr}"


def test_cli_real_repo_exit_zero():
    res = subprocess.run([sys.executable, str(SCRIPT)], text=True, capture_output=True)
    assert res.returncode == 0, f"stdout={res.stdout}\nstderr={res.stderr}"


def test_cli_detects_injected_violation(tmp_path):
    _write(tmp_path, "injected.yml", MOD.BROKEN_FIXTURE)
    res = subprocess.run([sys.executable, str(SCRIPT), "--workflows-dir", str(tmp_path)],
                         text=True, capture_output=True)
    assert res.returncode == 1
    assert "VIOLATION" in res.stdout


def test_cli_simulate_reports_run_and_skip(tmp_path):
    _write(tmp_path, "fixed.yml", MOD.FIXED_FIXTURE)
    base = [sys.executable, str(SCRIPT), "--workflows-dir", str(tmp_path),
            "--simulate", "--workflow", "fixed.yml"]
    with_token = subprocess.run(base + ["--secret", "MY_TOKEN=dummy"],
                                text=True, capture_output=True)
    without_token = subprocess.run(base, text=True, capture_output=True)
    assert "RUN " in with_token.stdout and with_token.returncode == 0
    assert "SKIP" in without_token.stdout and without_token.returncode == 0


# ── 実行環境契約 ──────────────────────────────────────────────────────────
# 本 lint は PyYAML を要求する。開発機には入っているが CI runner の stdlib には無い。
# この差が「local は緑・CI だけ赤」を生む (本 PR で実際に発生させた)。ゲートの中身
# ではなく、ゲートが走る前提条件そのものを機械で固定する。
def _guard_job_steps():
    workflow = MOD.yaml.safe_load(REAL_WORKFLOW.read_text(encoding="utf-8"))
    return workflow["jobs"]["change-category-guard"]["steps"]


def _step_indexes(steps, needle):
    return [i for i, step in enumerate(steps) if needle in str(step.get("run", ""))]


def test_step_guard_really_needs_pyyaml(tmp_path):
    """install step の必要性そのものを固定する。

    PyYAML を解決不能にすると本 lint は exit 2 で落ちる。ここが 0 になったら
    (= 依存が消えたら) install step の存在理由も消えるので、両方を同時に見直す。
    """
    (tmp_path / "yaml.py").write_text('raise ImportError("blocked by test")\n', encoding="utf-8")
    env = dict(os.environ)
    env["PYTHONPATH"] = str(tmp_path) + os.pathsep + env.get("PYTHONPATH", "")
    res = subprocess.run([sys.executable, str(SCRIPT), "--self-test"],
                         cwd=ROOT, env=env, text=True, capture_output=True)
    assert res.returncode == 2, f"stdout={res.stdout}\nstderr={res.stderr}"
    assert "PyYAML" in res.stderr


def test_dependency_install_precedes_the_step_guard():
    steps = _guard_job_steps()
    install = _step_indexes(steps, "requirements-dev.txt")
    guard = _step_indexes(steps, "lint-workflow-step-guard.py")
    assert install, "requirements-dev.txt を install する step が change-category-guard に無い"
    assert guard, "step guard を呼ぶ step が change-category-guard に無い"
    assert min(install) < min(guard), (
        f"install={install} guard={guard}: install が後ろだと CI だけ ImportError で落ちる"
    )


def test_dependency_install_is_unconditional():
    # install 側に if を付けると、条件が false のときだけ CI が落ちる不安定なゲートになる。
    steps = _guard_job_steps()
    for index in _step_indexes(steps, "requirements-dev.txt"):
        assert "if" not in steps[index], steps[index].get("name")


def test_install_step_resolves_a_real_spec_from_the_ssot():
    """install の run を実 bash で流し、SSOT から版指定が実際に取り出せることを確認する。

    requirements-dev.txt から PyYAML 行が消えれば grep が空で落ちる (fail-closed)。
    「install step は書いてあるが何も入らない」状態を許さない。
    """
    steps = _guard_job_steps()
    install = steps[_step_indexes(steps, "requirements-dev.txt")[0]]
    grep_line = next(
        line for line in install["run"].splitlines() if line.strip().startswith("spec=")
    )
    resolved = subprocess.run(
        ["bash", "-euo", "pipefail", "-c", f"{grep_line}\nprintf '%s' \"$spec\""],
        cwd=ROOT,
        text=True,
        capture_output=True,
    )
    assert resolved.returncode == 0, resolved.stderr
    assert re.fullmatch(r"(?i)PyYAML\s*[><=!~]+\s*[0-9][^\s]*", resolved.stdout.strip()), (
        resolved.stdout
    )


def test_guard_job_stays_lint_only():
    """本 job に pytest を持ち込まない境界を機械で固定する。

    直下の step 群のコメントは「plugin pytest は kit-ci に一元化する」と宣言しているが、
    これまでは pytest が install されていない偶然に支えられていた。依存 install を
    足した以上、宣言側を検査に格上げしないと境界が静かに消える。
    """
    for step in _guard_job_steps():
        run = str(step.get("run", ""))
        assert not re.search(r"\bpytest\b", run), step.get("name")
        assert "-r requirements-dev.txt" not in run, step.get("name")


def test_local_entrypoints_invoke_the_same_lint():
    """CI にしか無いゲートは着手前に気づけない。local 入口 2 経路の結線を固定する。"""
    for relative in ("Makefile", "scripts/run-ci-checks.sh"):
        text = (ROOT / relative).read_text(encoding="utf-8")
        assert "lint-workflow-step-guard.py --self-test" in text, relative
        assert re.search(r"lint-workflow-step-guard\.py(?!\s+--)", text), relative
