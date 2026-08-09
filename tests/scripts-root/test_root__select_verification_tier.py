"""select-verification-tier.py (qa-214【1】【2】) の決定論と fail-closed を固定する。

背景 (HarnessHub-6fct): 確定仕様は tier 降格の可否判定をこの script に委ねているのに
script 自体が repository に存在せず、tier 判定の根拠が不在だった。実装が入った以上、
次の 3 点が壊れれば仕様は再び骨抜きになるので機械で押さえる。

(a) 決定論: 同じ path 集合なら順序・重複・"./" 前置に依らず同じ tier を返す
(b) 引き上げの自動性: critical 規則に 1 つでも触れれば tier は critical へ上がる
(c) 引き下げの記録義務: --reason / --deferred-issue が欠けた降格は exit 2 で拒否される
"""
from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "scripts/select-verification-tier.py"


def _load():
    spec = importlib.util.spec_from_file_location("select_verification_tier", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


svt = _load()


def run(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run([sys.executable, str(SCRIPT), *args], capture_output=True, text=True)


def tier_of(*paths: str) -> str:
    return svt.evaluate(svt.normalize(paths))["computed_tier"]


# ── (a) 決定論 ─────────────────────────────────────────────────────────────
@pytest.mark.parametrize(
    "paths,expected",
    [
        (["plugins/foo/scripts/bar.py"], "mvp"),
        (["system-spec/dev-workflow.md", "docs/x.md"], "mvp"),
        (["apps/web/src/page.tsx"], "standard"),
        (["packages/core/index.ts"], "standard"),
        (["tenants/acme/config.json"], "standard"),
        ([".claude-plugin/marketplace.json"], "critical"),
        (["plugins/dev-graph/.claude-plugin/plugin.json"], "critical"),
        ([".github/workflows/ci.yml"], "critical"),
        (["installers/setup.sh"], "critical"),
        (["apps/web/src/auth/session.ts"], "critical"),
        (["db/migrations/003_add.sql"], "critical"),
        (["apps/api/src/delete-account.ts"], "critical"),
        ([], "mvp"),
    ],
)
def test_tier_rules(paths, expected):
    assert tier_of(*paths) == expected


def test_order_and_duplication_do_not_change_result():
    """順序・重複・'./' 前置で判定が揺れれば「同じ差分に常に同じ tier」が破れる。"""
    a = svt.evaluate(svt.normalize(["apps/web/a.ts", ".github/workflows/ci.yml"]))
    b = svt.evaluate(svt.normalize(["./.github/workflows/ci.yml", "apps/web/a.ts", "apps/web/a.ts"]))
    assert a == b


def test_dotfile_prefix_is_preserved():
    """正規化で先頭 '.' を削ると .github/ や .claude-plugin/ の critical 規則が丸ごと死ぬ。"""
    assert svt.normalize(["./.github/workflows/ci.yml"]) == [".github/workflows/ci.yml"]


# ── (b) 引き上げの自動性 ───────────────────────────────────────────────────
def test_highest_matching_tier_wins():
    result = svt.evaluate(svt.normalize(["plugins/x/y.py", "apps/web/a.ts", ".github/workflows/ci.yml"]))
    assert result["computed_tier"] == "critical"
    # 該当した規則は全て根拠として残る (上位に潰されて消えない)
    assert {m["rule_id"] for m in result["rule_matches"]} == {"CR-02", "ST-01"}


# ── (c) 引き下げの記録義務 (fail-closed) ───────────────────────────────────
@pytest.mark.parametrize(
    "extra",
    [
        [],
        ["--reason", "理由だけある"],
        ["--deferred-issue", "HarnessHub-x1"],
        ["--reason", "   ", "--deferred-issue", "HarnessHub-x1"],
    ],
)
def test_undocumented_downgrade_is_rejected(extra):
    result = run("--changed-path", "apps/web/a.ts", "--downgrade-to", "mvp", *extra)
    assert result.returncode == 2, result.stdout + result.stderr
    assert "無記録の引き下げは拒否" in result.stderr


def test_documented_downgrade_is_accepted_and_recorded():
    result = run(
        "--changed-path", "apps/web/a.ts",
        "--downgrade-to", "mvp",
        "--reason", "UI 文言のみの変更で runtime 経路に影響しない",
        "--deferred-issue", "HarnessHub-x1",
    )
    assert result.returncode == 0, result.stdout + result.stderr
    decision = json.loads(result.stdout)
    assert decision["computed_tier"] == "standard"
    assert decision["effective_tier"] == "mvp"
    assert decision["downgrade"]["deferred_issue_refs"] == ["HarnessHub-x1"]


def test_downgrade_flag_cannot_be_used_to_escalate():
    """flag での引き上げを許すと、記録義務のある降格と自動昇格が同じ経路に混ざる。"""
    result = run("--changed-path", "plugins/x/y.py", "--downgrade-to", "critical",
                 "--reason", "r", "--deferred-issue", "HarnessHub-x1")
    assert result.returncode == 2, result.stdout + result.stderr
    assert "引き下げでない" in result.stderr


# ── tier_selector / append-only ────────────────────────────────────────────
def test_decision_records_selector_identity_not_absent():
    """tier_selector: 'absent' を出さないための path + digest 記録 (dev-workflow.md【3】)。"""
    result = run("--changed-path", "plugins/x/y.py")
    assert result.returncode == 0, result.stderr
    selector = json.loads(result.stdout)["tier_selector"]
    assert selector["path"] == "scripts/select-verification-tier.py"
    assert selector["source_digest"] == svt.source_digest()
    assert selector["rules_digest"] == svt.rules_digest()


def test_out_is_append_only(tmp_path: Path):
    out = tmp_path / "tier-decision.json"
    first = run("--changed-path", "plugins/x/y.py", "--out", str(out))
    assert first.returncode == 0, first.stderr
    assert json.loads(out.read_text(encoding="utf-8"))["effective_tier"] == "mvp"

    second = run("--changed-path", "apps/web/a.ts", "--out", str(out))
    assert second.returncode == 2, second.stdout
    assert "append-only" in second.stderr
    # 既存判定が上書きされていない
    assert json.loads(out.read_text(encoding="utf-8"))["effective_tier"] == "mvp"


def test_requires_an_input_source():
    result = run()
    assert result.returncode == 1
    assert "--changed-path" in result.stderr


# ── (d) dev-workflow.md【1】が名指しする記録フィールド ─────────────────────
def _decision(*args: str) -> dict:
    result = run("--changed-path", "plugins/x/y.py", "--run-id", "run-1",
                 "--target", "HarnessHub-xcl3", "--decided-at", "2026-08-09T00:00:00Z", *args)
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)


def test_spec_named_fields_are_present():
    """【1】は tier / matched_rules / decided_at / target / inputs / checks を必須と定める。"""
    decision = _decision()
    for field in ("tier", "matched_rules", "decided_at", "target", "inputs", "checks"):
        assert field in decision, field
    assert decision["tier"] == decision["effective_tier"]
    assert decision["decided_at"] == "2026-08-09T00:00:00Z"
    assert decision["target"] == "HarnessHub-xcl3"


def test_inputs_carry_scale_of_change():
    inputs = _decision()["inputs"]
    assert inputs["changed_file_count"] == 1
    assert inputs["affected_packages"] == ["plugins/x"]
    assert inputs["affected_package_count"] == 1
    # --from-git を使っていない run では行数を推定で埋めず null を残す
    assert inputs["changed_line_count"] is None


def test_affected_packages_counts_two_segments():
    assert svt.affected_packages(["plugins/a/x.py", "plugins/a/y.py", "apps/web/z.ts"]) == [
        "apps/web", "plugins/a"
    ]
    assert svt.affected_packages(["scripts/foo.py", "README.md"]) == []


def _plan(tmp_path: Path, tier: str, *extra: str) -> Path:
    out = tmp_path / f"plan-{tier}.json"
    result = subprocess.run(
        [sys.executable, str(REPO_ROOT / "scripts/build-verification-plan.py"),
         "--tier", tier, "--out", str(out), *extra],
        capture_output=True, text=True,
    )
    assert result.returncode == 0, result.stderr
    return out


def test_checks_file_is_merged_with_its_deferred_refs(tmp_path: Path):
    plan = _plan(tmp_path, "mvp", "--deferred-issue", "HarnessHub-xcl3")
    decision = _decision("--checks-file", str(plan))
    assert [c["id"] for c in decision["checks"]]
    assert "HarnessHub-xcl3" in decision["deferred_issue_refs"]
    assert any(c["disposition"] == "deferred" for c in decision["checks"])


def test_checks_file_from_another_tier_is_rejected(tmp_path: Path):
    """別 tier 向けの blocking 集合を、この tier の記録として残させない。"""
    plan = _plan(tmp_path, "critical")
    result = run("--changed-path", "plugins/x/y.py", "--checks-file", str(plan))
    assert result.returncode == 2
    assert "食い違う" in result.stderr


def test_deferred_checks_without_refs_are_rejected(tmp_path: Path):
    """plan が受け皿付きでも、その refs を落とした checks を持ち込めば拒否される。"""
    plan = _plan(tmp_path, "mvp", "--deferred-issue", "HarnessHub-xcl3")
    payload = json.loads(plan.read_text(encoding="utf-8"))
    payload["deferred_issue_refs"] = []
    stripped = tmp_path / "plan-stripped.json"
    stripped.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

    result = run("--changed-path", "plugins/x/y.py", "--checks-file", str(stripped))
    assert result.returncode == 2
    assert "deferred_issue_refs が空" in result.stderr


def test_decision_passes_the_record_validator(tmp_path: Path):
    """selector の出力が validate-tier-decision.py をそのまま通ること (2 script の語彙一致)。"""
    plan = _plan(tmp_path, "mvp", "--deferred-issue", "HarnessHub-xcl3")
    out = tmp_path / "tier-decision.json"
    emitted = run("--changed-path", "plugins/x/y.py", "--run-id", "run-1",
                  "--target", "HarnessHub-xcl3", "--checks-file", str(plan), "--out", str(out))
    assert emitted.returncode == 0, emitted.stderr

    validated = subprocess.run(
        [sys.executable, str(REPO_ROOT / "scripts/validate-tier-decision.py"), "--decision", str(out)],
        capture_output=True, text=True,
    )
    assert validated.returncode == 0, validated.stdout + validated.stderr


# ── (e) 空 diff の fail-closed と --derive-checks ──────────────────────────
def test_empty_change_set_is_rejected_instead_of_defaulting_to_mvp():
    """入力が取れなかった run を、最も検査を削る mvp として記録させない。

    base ref の指定違いで三点 diff が空集合になる経路と「tooling だけの変更だった」を
    同じ mvp へ潰すと、最も根拠の薄い判定が最も軽い検査を正当化してしまう。
    """
    result = run("--changed-paths-file", "/dev/null")
    assert result.returncode == 2
    assert "変更 path 集合が空" in result.stderr


def test_derive_checks_matches_the_plan_built_separately(tmp_path: Path):
    """台帳の読み方が 2 箇所に分かれていないこと (写経していれば片方だけズレる)。"""
    plan = _plan(tmp_path, "mvp", "--deferred-issue", "HarnessHub-xcl3")
    from_plan = _decision("--checks-file", str(plan))
    derived = _decision("--derive-checks", "--deferred-issue", "HarnessHub-xcl3")

    def shape(decision: dict) -> list[tuple]:
        return [(c["id"], c["disposition"], c["blocking"]) for c in decision["checks"]]

    assert shape(derived) == shape(from_plan)


def test_derive_checks_drops_the_backlog_ref_when_nothing_is_deferred():
    """延期 0 件の run に受け皿 id を書かない (延期の有無を台帳上で判別可能に保つ)。"""
    decision = _decision("--derive-checks", "--deferred-issue", "HarnessHub-sy31",
                         "--changed-path", ".claude-plugin/marketplace.json")
    assert decision["tier"] == "critical"
    assert not any(c["disposition"] == "deferred" for c in decision["checks"])
    assert decision["deferred_issue_refs"] == []


def _git(repo: Path, *args: str) -> None:
    result = subprocess.run(["git", *args], cwd=repo, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr


def test_from_git_sees_uncommitted_and_untracked_changes(tmp_path: Path):
    """三点 diff だけを見ると、手元の未 commit / 未追跡変更が判定入力から丸ごと落ちる。

    落ちた結果は「変更が無かった」ではなく「見落とした」であり、そのまま最も軽い
    tier を正当化してしまう。分岐点への二点 diff + untracked 合流でこの経路を閉じる。
    """
    _git(tmp_path, "init", "-q", "-b", "main")
    _git(tmp_path, "config", "user.email", "t@example.invalid")
    _git(tmp_path, "config", "user.name", "t")
    (tmp_path / "README.md").write_text("x\n", encoding="utf-8")
    _git(tmp_path, "add", "-A")
    _git(tmp_path, "commit", "-qm", "base")

    # commit しない変更 (tier を critical へ上げる規則に当たる path) を置く
    (tmp_path / "db" / "migrations").mkdir(parents=True)
    (tmp_path / "db" / "migrations" / "001_add.sql").write_text("select 1;\n", encoding="utf-8")

    result = run("--from-git", "main", "--repo-root", str(tmp_path))
    assert result.returncode == 0, result.stderr
    decision = json.loads(result.stdout)
    assert "db/migrations/001_add.sql" in decision["inputs"]["changed_paths"]
    assert decision["tier"] == "critical"


def test_derive_checks_run_passes_the_record_validator(tmp_path: Path):
    """CI が実際に使う単一呼び出し形が、記録検査をそのまま通ること。"""
    out = tmp_path / "tier-decision.json"
    emitted = run("--changed-path", "plugins/x/y.py", "--derive-checks",
                  "--deferred-issue", "HarnessHub-sy31", "--run-id", "run-1",
                  "--target", "HarnessHub-xcl3", "--out", str(out))
    assert emitted.returncode == 0, emitted.stderr

    validated = subprocess.run(
        [sys.executable, str(REPO_ROOT / "scripts/validate-tier-decision.py"), "--decision", str(out)],
        capture_output=True, text=True,
    )
    assert validated.returncode == 0, validated.stdout + validated.stderr


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-v"]))
