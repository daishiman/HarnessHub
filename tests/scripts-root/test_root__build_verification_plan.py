"""build-verification-plan.py (qa-214【3】【4】【5】/ qa-209【3】) の導出規則を固定する。

背景 (HarnessHub-xcl3): tier 別の blocking 集合は確定仕様なのに、どの検査がどの tier で
必須かが CI の step 側へ散っていて読み取れず、tier を下げても重い検査が走り続けていた。
台帳 + 導出器が入った以上、次の 3 点が壊れると「tier を下げたのに速くならない」か、
その逆に「下げたら黙って被覆が消える」のどちらかへ倒れるので機械で押さえる。

(a) 常時 fail-closed の 3 ゲートが tier に依らず blocking であること (【3】)
(b) tier を下げたとき、重い検査が blocking から外れて advisory / deferred へ落ちること (【4】)
(c) 受け皿の無い deferred を成立させないこと (【5】)
"""
from __future__ import annotations

import json
import shlex
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "scripts/build-verification-plan.py"
LEDGER = REPO_ROOT / "scripts/verification-gate-ledger.json"

ALWAYS_BLOCKING = {"secret-scan", "data-loss-guard", "build-typecheck"}
CRITICAL_ONLY = {"completeness-evaluator", "independent-audit-fork", "live-trial"}


def run(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run([sys.executable, str(SCRIPT), *args], capture_output=True, text=True)


def plan(tier: str, *extra: str) -> dict:
    result = run("--tier", tier, *extra)
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)


def mvp() -> dict:
    return plan("mvp", "--deferred-issue", "HarnessHub-xcl3")


# ── (a) 常時 fail-closed の 3 ゲート ───────────────────────────────────────
@pytest.mark.parametrize("tier", ["mvp", "standard", "critical"])
def test_always_blocking_gates_survive_every_tier(tier: str):
    """漏洩・作業消失・壊れたものの出荷は、どの tier でも短縮対象にしない (【3】)。"""
    payload = plan(tier, "--deferred-issue", "HarnessHub-xcl3")
    assert ALWAYS_BLOCKING <= set(payload["blocking_ids"])


def test_always_blocking_gates_are_never_deferred():
    for tier in ("mvp", "standard", "critical"):
        payload = plan(tier, "--deferred-issue", "HarnessHub-xcl3")
        assert not (ALWAYS_BLOCKING & set(payload["deferred_ids"]))


# ── (b) tier による blocking 集合の縮退 ────────────────────────────────────
def test_mvp_drops_critical_only_checks_from_blocking():
    payload = mvp()
    assert not (CRITICAL_ONLY & set(payload["blocking_ids"]))
    assert CRITICAL_ONLY == set(payload["deferred_ids"])


def test_mvp_keeps_focused_test_blocking():
    """mvp でも変更箇所そのものの回帰は blocking に残す (【4】)。"""
    assert "focused-test" in mvp()["blocking_ids"]


def test_standard_blocks_package_and_contract_checks():
    payload = plan("standard", "--deferred-issue", "HarnessHub-xcl3")
    assert {"package-test", "contract-verification"} <= set(payload["blocking_ids"])
    assert CRITICAL_ONLY == set(payload["deferred_ids"])


def test_critical_blocks_every_gate():
    payload = plan("critical")
    ledger = json.loads(LEDGER.read_text(encoding="utf-8"))
    assert set(payload["blocking_ids"]) == {g["id"] for g in ledger["gates"]}
    assert payload["deferred_ids"] == []


def test_advisory_checks_are_still_executed():
    """blocking から外れた検査を無効化しない。実行はして run を止めないだけ (【4】)。"""
    payload = mvp()
    advisory = [c for c in payload["checks"] if c["id"] in set(payload["advisory_ids"])]
    assert advisory, payload["advisory_ids"]
    for check in advisory:
        assert check["disposition"] == "executed"
        assert check["blocking"] is False


def test_deferred_and_skipped_are_not_collapsed():
    """deferred を skipped へ丸めると「省略した」と「落ちた」が事後に区別できない (【1】)。"""
    dispositions = {c["disposition"] for c in mvp()["checks"]}
    assert dispositions <= {"executed", "deferred"}
    assert "deferred" in dispositions


def test_monotonic_blocking_set_across_tiers():
    """tier を上げて blocking が減ることは無い (上位 tier は下位の被覆を含む)。"""
    m = set(plan("mvp", "--deferred-issue", "X")["blocking_ids"])
    s = set(plan("standard", "--deferred-issue", "X")["blocking_ids"])
    c = set(plan("critical")["blocking_ids"])
    assert m <= s <= c


# ── (c) 受け皿の無い延期を成立させない ─────────────────────────────────────
def test_deferred_without_issue_is_rejected():
    result = run("--tier", "mvp")
    assert result.returncode == 2
    assert "受け皿の無い延期は拒否する" in result.stderr
    for gate in CRITICAL_ONLY:
        assert gate in result.stderr


def test_critical_needs_no_deferred_issue():
    """critical は deferred が 0 件なので受け皿を要求されない。"""
    assert run("--tier", "critical").returncode == 0


# ── 台帳と入力の検証 ───────────────────────────────────────────────────────
def test_every_gate_carries_a_rerun_command():
    """blocking から外れた検査を後から回す手段が台帳に無いと、延期が回収不能になる。"""
    for gate in json.loads(LEDGER.read_text(encoding="utf-8"))["gates"]:
        assert gate["rerun_command"].strip()
        assert gate["reason"].strip()


def _package_scripts() -> dict[str, set[str]]:
    """repo 内 package.json の {package 名: script 名集合} を集める。"""
    table: dict[str, set[str]] = {}
    for path in REPO_ROOT.rglob("package.json"):
        if "node_modules" in path.parts:
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        name = data.get("name")
        if isinstance(name, str):
            table[name] = set((data.get("scripts") or {}).keys())
    return table


def _referents(command: str) -> list[tuple[str, str]]:
    """rerun_command から (種別, 参照先) を取り出す。解析できない形は ("unknown", 断片)。"""
    out: list[tuple[str, str]] = []
    for segment in command.split("&&"):
        tokens = shlex.split(segment.strip())
        if not tokens:
            continue
        head = tokens[0]
        if head in {"python", "python3"}:
            if len(tokens) >= 3 and tokens[1] == "-m":
                # `-m pytest <path>` は module ではなく検査対象 path の実在が本質。
                out.append(("module", tokens[2]))
                for token in tokens[3:]:
                    if not token.startswith("-"):
                        out.append(("path", token))
                        break
            elif len(tokens) >= 2:
                out.append(("path", tokens[1]))
            else:
                out.append(("unknown", segment.strip()))
        elif head == "pnpm":
            package = None
            script = None
            index = 1
            while index < len(tokens):
                token = tokens[index]
                if token == "--filter" and index + 1 < len(tokens):
                    package = tokens[index + 1]
                    index += 1
                elif token in {"run", "-r", "--recursive"} and index + 1 < len(tokens):
                    script = tokens[index + 1]
                    index += 1
                index += 1
            if script is None:
                out.append(("unknown", segment.strip()))
            else:
                out.append(("pnpm", f"{package or '*'}:{script}"))
        elif head == "make" and len(tokens) >= 2:
            out.append(("make", tokens[1]))
        else:
            out.append(("unknown", segment.strip()))
    return out


def test_rerun_commands_point_at_something_that_exists():
    """rerun_command が実在しない script / pnpm script / make target を指していないこと。

    非空文字列だけを見ていた時期に、gate の title と別の検査を指す rerun_command が
    4 件同時に成立していた。台帳が名目上の被覆を主張しながら実体を持たない状態は、
    「検査した」と「検査した気になっていた」を事後に区別できなくする。
    """
    packages = _package_scripts()
    makefile = REPO_ROOT / "Makefile"
    make_targets = set()
    if makefile.is_file():
        make_targets = {
            line.split(":", 1)[0].strip()
            for line in makefile.read_text(encoding="utf-8").splitlines()
            if ":" in line and not line.startswith(("\t", " ", "#"))
        }

    problems: list[str] = []
    for gate in json.loads(LEDGER.read_text(encoding="utf-8"))["gates"]:
        for kind, referent in _referents(gate["rerun_command"]):
            if kind == "unknown":
                problems.append(f"{gate['id']}: 解析できない rerun_command 断片: {referent}")
            elif kind == "path":
                if not (REPO_ROOT / referent).exists():
                    problems.append(f"{gate['id']}: 参照先が実在しない: {referent}")
            elif kind == "module":
                if referent not in {"pytest", "unittest"}:
                    problems.append(f"{gate['id']}: 未知の -m module: {referent}")
            elif kind == "pnpm":
                package, _, script = referent.partition(":")
                if package == "*":
                    if not any(script in scripts for scripts in packages.values()):
                        problems.append(f"{gate['id']}: どの package にも script {script!r} が無い")
                elif package not in packages:
                    problems.append(f"{gate['id']}: package が実在しない: {package}")
                elif script not in packages[package]:
                    problems.append(f"{gate['id']}: {package} に script {script!r} が無い")
            elif kind == "make":
                if make_targets and referent not in make_targets:
                    problems.append(f"{gate['id']}: make target が実在しない: {referent}")

    assert not problems, "\n".join(problems)


@pytest.mark.parametrize(
    "mutate,expected",
    [
        (lambda d: d["gates"][0].update({"min_tier": "urgent"}), "min_tier が不正"),
        (lambda d: d["gates"][0].update({"below_tier": "ignore"}), "below_tier が不正"),
        (lambda d: d["gates"].append(dict(d["gates"][0])), "重複"),
        (lambda d: d["gates"][0].pop("rerun_command"), "必須キー"),
        (lambda d: d.update({"gates": []}), "gates が無い"),
    ],
)
def test_broken_ledger_is_rejected(tmp_path: Path, mutate, expected: str):
    data = json.loads(LEDGER.read_text(encoding="utf-8"))
    mutate(data)
    ledger = tmp_path / "ledger.json"
    ledger.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

    result = run("--tier", "critical", "--ledger", str(ledger))
    assert result.returncode == 1
    assert expected in result.stderr


def test_tier_decision_input_supplies_the_tier(tmp_path: Path):
    decision = tmp_path / "tier-decision.json"
    decision.write_text(json.dumps({"effective_tier": "critical"}), encoding="utf-8")
    result = run("--tier-decision", str(decision))
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)["tier"] == "critical"


def test_tier_decision_mismatch_is_rejected(tmp_path: Path):
    decision = tmp_path / "tier-decision.json"
    decision.write_text(json.dumps({"effective_tier": "critical"}), encoding="utf-8")
    result = run("--tier", "mvp", "--tier-decision", str(decision))
    assert result.returncode == 1
    assert "食い違う" in result.stderr


def test_requires_an_input_source():
    result = run()
    assert result.returncode == 1
    assert "--tier" in result.stderr


def test_out_is_append_only(tmp_path: Path):
    out = tmp_path / "plan.json"
    assert run("--tier", "critical", "--out", str(out)).returncode == 0
    assert json.loads(out.read_text(encoding="utf-8"))["tier"] == "critical"

    second = run("--tier", "mvp", "--deferred-issue", "X", "--out", str(out))
    assert second.returncode == 2
    assert "append-only" in second.stderr
    assert json.loads(out.read_text(encoding="utf-8"))["tier"] == "critical"


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-v"]))
