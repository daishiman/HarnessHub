# /// script
# name: test-aggregate-completeness
# purpose: assign-system-spec-completeness-evaluator の集約器 (レポート形状検証 + fail-closed 集約 + coverage gate) の受入テスト
# inputs:
#   - pytest 実行 (argv なし)
# outputs:
#   - pytest 結果
# contexts: [C]
# network: false
# write-scope: none
# dependencies: []
# ///
"""aggregate-completeness.py の受入テスト。

- aggregate_verdict: 全観点 PASS→PASS / 1 観点 FAIL→FAIL / INDETERMINATE→FAIL / 観点欠落→FAIL / high→FAIL
- validate_report: golden PASS レポートの形状 + 総合判定整合、各種違反検出
- validate_attribution: 独立 auditor 帰属が実 fork 台帳へ接地しているかの fail-closed 検証
- load_fork_ledger: PostToolUse hook が書く台帳 JSONL の集計 (欠損・破損に対する挙動)
- run_coverage_gate: validate-coverage-matrix.py 連携 (完全マトリクス exit0 / 未収集残存 exit1)
- schema: 評価レポートスキーマが有効 JSON で全 6 観点 + audit_delegations を持つ
"""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import pytest

SKILL_DIR = Path(__file__).resolve().parents[1]
PLUGIN_ROOT = SKILL_DIR.parents[1]


def _load():
    path = SKILL_DIR / "scripts" / "aggregate-completeness.py"
    spec = importlib.util.spec_from_file_location("aggregate_completeness", path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


MOD = _load()


# ---------- fixtures ----------

def _golden_aspects(verdicts=None):
    verdicts = verdicts or {}
    out = {}
    for aid, spec in MOD.ASPECTS.items():
        out[aid] = {
            "verdict": verdicts.get(aid, "PASS"),
            "auditor": spec["auditor"],
            "component": spec["component"],
            "summary": f"{spec['label']}: 監査 PASS",
            "evidence": ["exit=0"],
        }
    return out


def _golden_delegations(verdicts=None):
    """必須 receipt (C07 primary / C06 sub_input / C08 primary) を観点 verdict と整合させて組む。"""
    verdicts = verdicts or {}
    out = []
    for req in MOD.required_delegations():
        out.append({
            "aspect": req["aspect"],
            "role": req["role"],
            "auditor": req["auditor"],
            "component": req["component"],
            "dispatch": {"tool": "Task", "subagent_type": req["auditor"]},
            "verdict": verdicts.get(req["aspect"], "PASS"),
            "evidence": [f"{req['auditor']}: 独立 context で監査"],
        })
    return out


def _golden_ledger(auditors=None):
    """hook が書いた台帳の集計結果を模す。auditors=None なら必須 auditor 全件が fork 済み。"""
    if auditors is None:
        auditors = [req["auditor"] for req in MOD.required_delegations()]
    return {
        "path": "eval-log/system-spec-harness/audit-fork-ledger.jsonl",
        "exists": True,
        "dispatched": {name: 1 for name in auditors},
        "malformed": 0,
    }


def _golden_report(verdict="PASS", verdicts=None, findings=None, gaps=None, delegations=None):
    return {
        "evaluator": {
            "name": MOD.EVALUATOR_NAME,
            "version": "0.1.0",
            "context": "fork",
        },
        "verdict": verdict,
        "aspects": _golden_aspects(verdicts),
        "audit_delegations": _golden_delegations(verdicts) if delegations is None else delegations,
        "gate_results": [
            {"id": "G-matrix", "name": "validate-coverage-matrix", "exit_code": 0}
        ],
        "findings": findings
        if findings is not None
        else [{"severity": "info", "bucket": "matrix_coverage", "observation": "全観点 PASS"}],
        "gaps": gaps if gaps is not None else [],
    }


def _write_ledger(path: Path, auditors=None, extra_lines=()):
    """PostToolUse hook が書く台帳 JSONL を実ファイルとして組む。"""
    if auditors is None:
        auditors = [req["auditor"] for req in MOD.required_delegations()]
    lines = [
        json.dumps({
            "schema_version": "1.0",
            "ts": "2026-07-21T22:00:00Z",
            "session_id": "sess-1",
            "tool_name": "Task",
            "subagent_type": name,
            "prompt_sha256": "0" * 64,
            "cwd": "/tmp/project",
        }, ensure_ascii=False)
        for name in auditors
    ]
    lines.extend(extra_lines)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _write_matrix(path: Path, complete: bool = True):
    cats = [
        "database", "auth", "ui-ux", "security",
        "infrastructure", "backend", "frontend", "maintenance-ops",
    ]
    platforms = ["web", "mobile", "tablet", "desktop-windows", "desktop-linux", "desktop-macos"]
    matrix = {}
    for c in cats:
        matrix[c] = {p: {"state": "確定", "qa_ref": "qa-1"} for p in platforms}
    if not complete:
        matrix["database"]["web"] = {"state": "未収集"}
    data = {
        "categories": [{"id": c, "label": c} for c in cats],
        "platforms": platforms,
        "matrix": matrix,
        "qa_log": [{"id": "qa-1"}],
        "approval_log": [],
    }
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")


# ---------- aggregate_verdict ----------

def test_all_pass_no_high_is_pass():
    assert MOD.aggregate_verdict({a: "PASS" for a in MOD.ASPECTS}, 0) == "PASS"


def test_single_fail_is_fail():
    v = {a: "PASS" for a in MOD.ASPECTS}
    v["doc_freshness"] = "FAIL"
    assert MOD.aggregate_verdict(v, 0) == "FAIL"


def test_indeterminate_is_fail_closed():
    v = {a: "PASS" for a in MOD.ASPECTS}
    v["matrix_coverage"] = "INDETERMINATE"
    assert MOD.aggregate_verdict(v, 0) == "FAIL"


def test_missing_aspect_is_fail():
    v = {"matrix_coverage": "PASS", "doc_freshness": "PASS"}  # design_knowledge_reflection 欠落
    assert MOD.aggregate_verdict(v, 0) == "FAIL"


def test_extra_aspect_is_fail():
    v = {a: "PASS" for a in MOD.ASPECTS}
    v["bogus"] = "PASS"
    assert MOD.aggregate_verdict(v, 0) == "FAIL"


def test_high_finding_forces_fail_even_if_all_pass():
    assert MOD.aggregate_verdict({a: "PASS" for a in MOD.ASPECTS}, 1) == "FAIL"


def test_unknown_verdict_value_is_fail():
    v = {a: "PASS" for a in MOD.ASPECTS}
    v["doc_freshness"] = "MAYBE"
    assert MOD.aggregate_verdict(v, 0) == "FAIL"


# ---------- validate_report ----------

def test_golden_pass_report_is_valid():
    assert MOD.validate_report(_golden_report(), _golden_ledger()) == []


def test_golden_fail_report_with_gaps_is_valid():
    report = _golden_report(
        verdict="FAIL",
        verdicts={"doc_freshness": "FAIL"},
        findings=[{
            "severity": "high",
            "bucket": "doc_freshness",
            "observation": "非公式 host",
            "suggested_fix": "doc-fetch へ差し戻す",
        }],
        gaps=["doc_freshness: 非公式 host を公式へ差し替え"],
    )
    assert MOD.validate_report(report, _golden_ledger()) == []


def test_inconsistent_verdict_detected():
    # aspects は全 PASS・high 0 なのに verdict=FAIL → 再導出 PASS と不一致
    report = _golden_report(verdict="FAIL", gaps=["dummy"])
    violations = MOD.validate_report(report, _golden_ledger())
    assert any("再導出" in v for v in violations)


def test_fail_verdict_without_gaps_detected():
    report = _golden_report(
        verdict="FAIL",
        verdicts={"matrix_coverage": "FAIL"},
        findings=[{"severity": "high", "bucket": "matrix_coverage", "observation": "未収集残存"}],
        gaps=[],
    )
    violations = MOD.validate_report(report, _golden_ledger())
    assert any("gaps" in v for v in violations)


def test_missing_aspect_in_report_detected():
    report = _golden_report()
    del report["aspects"]["design_knowledge_reflection"]
    violations = MOD.validate_report(report, _golden_ledger())
    assert any("観点欠落" in v for v in violations)


def test_wrong_auditor_mapping_detected():
    report = _golden_report()
    report["aspects"]["matrix_coverage"]["auditor"] = "system-spec-hearing-auditor"
    violations = MOD.validate_report(report, _golden_ledger())
    assert any("auditor" in v for v in violations)


def test_design_knowledge_not_bound_to_hearing_auditor():
    # F4/M-3: C06 (hearing-auditor) は system-spec/*.md を読まずヒアリング品質のみを監査するため、
    # design_knowledge_reflection へ束縛しない (虚偽対応の撤去)。C05 R1-score が自前評価する。
    dk = MOD.ASPECTS["design_knowledge_reflection"]
    assert dk["auditor"] != "system-spec-hearing-auditor"
    assert dk["auditor"] == "assign-system-spec-completeness-evaluator"
    assert dk["component"] == "C05"
    # matrix_coverage は C07 primary のまま (C06 は sub-input で machine 層の primary auditor ではない)。
    assert MOD.ASPECTS["matrix_coverage"]["auditor"] == "system-spec-matrix-auditor"
    # design_knowledge を hearing-auditor へ束縛した虚偽レポートは machine 層で違反検出される。
    report = _golden_report()
    report["aspects"]["design_knowledge_reflection"]["auditor"] = "system-spec-hearing-auditor"
    assert any("auditor" in v for v in MOD.validate_report(report, _golden_ledger()))


def test_empty_findings_detected():
    report = _golden_report(findings=[])
    violations = MOD.validate_report(report, _golden_ledger())
    assert any("findings" in v for v in violations)


def test_bad_context_detected():
    report = _golden_report()
    report["evaluator"]["context"] = "main"
    violations = MOD.validate_report(report, _golden_ledger())
    assert any("context" in v for v in violations)


def test_non_dict_report_detected():
    assert MOD.validate_report(["not", "a", "dict"]) == ["report: オブジェクトでない"]


# ---------- validate_attribution (帰属の実 fork 証跡接地) ----------
#
# 本ブロックが固定するのは issue「completeness-report の auditor 帰属が実 fork 証跡に接地せず、
# 独立監査を経ない自己申告が機械層を通過する」の回帰ガード。
# aspects[].auditor は評価者自身が書く文字列なので、それだけでは独立監査の実在を示さない。

def test_required_delegations_covers_independent_auditors_only():
    req = {(r["aspect"], r["role"]): r for r in MOD.required_delegations()}
    # C07 primary / C06 sub_input / C08 primary の 3 件だけが必須。
    assert set(req) == {
        ("matrix_coverage", "primary"),
        ("matrix_coverage", "sub_input"),
        ("doc_freshness", "primary"),
    }
    assert req[("matrix_coverage", "primary")]["auditor"] == "system-spec-matrix-auditor"
    assert req[("matrix_coverage", "sub_input")]["auditor"] == "system-spec-hearing-auditor"
    assert req[("doc_freshness", "primary")]["auditor"] == "system-spec-doc-freshness-auditor"
    # C05 自前評価の観点は独立 auditor を持たないので receipt を要求しない。
    assert not any(a in {"foundation_trace", "decision_guidance", "design_knowledge_reflection",
                         "prompt_quality"} for a, _ in req)


def test_self_reported_attribution_without_delegations_is_rejected():
    """核心の回帰: 独立監査を 1 件も fork せず auditor 名だけ書いたレポートは通らない。"""
    report = _golden_report(delegations=[])
    violations = MOD.validate_attribution(report, _golden_ledger())
    assert any("fork receipt が無い" in v for v in violations)
    # 総合 verdict の再導出が整合していても、帰属未接地でゲートは通らない。
    assert MOD.validate_report(report, _golden_ledger()) != []


def test_missing_audit_delegations_field_is_rejected():
    report = _golden_report()
    del report["audit_delegations"]
    violations = MOD.validate_attribution(report, _golden_ledger())
    assert any("audit_delegations" in v for v in violations)


def test_delegation_without_fork_ledger_is_fail_closed():
    """台帳が無い実行 (hook 未配線・fork 省略) は裏取り 0 件として緑にしない。"""
    violations = MOD.validate_attribution(_golden_report(), MOD.empty_ledger())
    assert violations, "fork 台帳が空でも帰属が通過した (fail-closed 違反)"


def test_delegation_missing_from_ledger_is_rejected():
    """C08 だけ fork を省略したケース: 台帳に無い auditor の receipt は裏取りできない。"""
    ledger = _golden_ledger(auditors=["system-spec-matrix-auditor", "system-spec-hearing-auditor"])
    violations = MOD.validate_attribution(_golden_report(), ledger)
    assert any("doc_freshness" in v for v in violations)


def test_delegation_on_self_evaluated_aspect_is_false_independence_claim():
    delegations = _golden_delegations() + [{
        "aspect": "design_knowledge_reflection",
        "role": "primary",
        "auditor": "system-spec-hearing-auditor",
        "component": "C06",
        "dispatch": {"tool": "Task", "subagent_type": "system-spec-hearing-auditor"},
        "verdict": "PASS",
        "evidence": ["でっちあげ"],
    }]
    violations = MOD.validate_attribution(_golden_report(delegations=delegations), _golden_ledger())
    assert any("虚偽の独立性主張" in v for v in violations)


def test_delegation_with_nonexistent_agent_is_rejected():
    delegations = _golden_delegations()
    delegations[0]["auditor"] = "system-spec-imaginary-auditor"
    delegations[0]["dispatch"]["subagent_type"] = "system-spec-imaginary-auditor"
    ledger = _golden_ledger(auditors=["system-spec-imaginary-auditor",
                                      "system-spec-hearing-auditor",
                                      "system-spec-doc-freshness-auditor"])
    violations = MOD.validate_attribution(_golden_report(delegations=delegations), ledger)
    assert any("agent 定義" in v for v in violations)


def test_primary_delegation_verdict_must_match_aspect_verdict():
    """監査判定の忠実転記: auditor が FAIL を返したのに観点を PASS にする経路を塞ぐ。"""
    report = _golden_report()
    for d in report["audit_delegations"]:
        if d["aspect"] == "doc_freshness" and d["role"] == "primary":
            d["verdict"] = "FAIL"
    violations = MOD.validate_attribution(report, _golden_ledger())
    assert any("忠実に転記" in v for v in violations)


def test_dispatch_must_be_task_tool():
    report = _golden_report()
    report["audit_delegations"][0]["dispatch"]["tool"] = "Bash"
    violations = MOD.validate_attribution(report, _golden_ledger())
    assert any("Task" in v for v in violations)


def test_delegation_requires_non_empty_evidence():
    report = _golden_report()
    report["audit_delegations"][0]["evidence"] = []
    violations = MOD.validate_attribution(report, _golden_ledger())
    assert any("evidence" in v for v in violations)


def test_duplicate_delegation_is_rejected():
    delegations = _golden_delegations()
    report = _golden_report(delegations=delegations + [delegations[0]])
    violations = MOD.validate_attribution(report, _golden_ledger())
    assert any("重複" in v for v in violations)


def test_ledger_corroborates_accepts_refork():
    """多重度は照合しない: INDETERMINATE 後の再 fork で台帳が 2 件でも正当な裏取りとして通す。"""
    d = _golden_delegations()[0]
    ledger = _golden_ledger()
    ledger["dispatched"][d["auditor"]] = 3
    ok, reason = MOD.ledger_corroborates(d, ledger)
    assert ok, reason


def test_ledger_corroborates_reason_distinguishes_recovery_paths():
    """復旧手順が異なる 3 者 (台帳不在 / 宣言不備 / fork 省略) を reason で切り分ける。"""
    d = _golden_delegations()[0]
    ok, missing_ledger = MOD.ledger_corroborates(d, MOD.empty_ledger())
    assert not ok and "台帳が存在しない" in missing_ledger

    no_dispatch = dict(d, dispatch={})
    ok, reason = MOD.ledger_corroborates(no_dispatch, _golden_ledger())
    assert not ok and "subagent_type が無く" in reason

    ok, reason = MOD.ledger_corroborates(d, _golden_ledger(auditors=[]))
    assert not ok and "完了記録が無い" in reason


# ---------- load_fork_ledger (hook 台帳の集計) ----------

def test_load_fork_ledger_counts_dispatches(tmp_path):
    path = tmp_path / "audit-fork-ledger.jsonl"
    _write_ledger(path)
    ledger = MOD.load_fork_ledger(path)
    assert ledger["exists"] is True
    assert ledger["dispatched"]["system-spec-matrix-auditor"] == 1
    assert ledger["malformed"] == 0


def test_load_fork_ledger_missing_file_is_empty(tmp_path):
    ledger = MOD.load_fork_ledger(tmp_path / "nope.jsonl")
    assert ledger["exists"] is False
    assert ledger["dispatched"] == {}


def test_load_fork_ledger_none_is_empty():
    assert MOD.load_fork_ledger(None) == MOD.empty_ledger()


def test_load_fork_ledger_tolerates_broken_lines(tmp_path):
    """台帳は追記専用で部分破損しうる。健全な行の証跡は活かし、壊れた行は数えて捨てる。"""
    path = tmp_path / "audit-fork-ledger.jsonl"
    _write_ledger(path, extra_lines=["{壊れた", json.dumps({"tool_name": "Bash"})])
    ledger = MOD.load_fork_ledger(path)
    assert ledger["malformed"] == 2
    assert len(ledger["dispatched"]) == 3


def test_agent_definition_exists_rejects_path_traversal():
    assert MOD.agent_definition_exists("system-spec-matrix-auditor") is True
    assert MOD.agent_definition_exists("../agents/system-spec-matrix-auditor") is False
    assert MOD.agent_definition_exists("") is False
    assert MOD.agent_definition_exists(None) is False


# ---------- hook 側との契約 (証跡 writer と consumer の突合) ----------

def _load_hook():
    path = PLUGIN_ROOT / "hooks" / "record-audit-fork.py"
    spec = importlib.util.spec_from_file_location("record_audit_fork", path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_ledger_path_contract_matches_hook_writer():
    """consumer の既定台帳位置が hook writer の書込先と一致していること (経路のズレ = 恒久 FAIL)。"""
    hook = _load_hook()
    assert hook.LEDGER_RELPATH == MOD.LEDGER_RELPATH
    assert hook.LEDGER_ENV == MOD.LEDGER_ENV


def test_hook_records_every_required_auditor():
    """必須 receipt の auditor が全て hook の記録対象レジストリに入っていること。"""
    hook = _load_hook()
    recorded = hook.audit_agents(PLUGIN_ROOT)
    for req in MOD.required_delegations():
        assert req["auditor"] in recorded, f"{req['auditor']} の fork が台帳に残らない"


def test_required_auditors_have_agent_definitions():
    for req in MOD.required_delegations():
        assert (PLUGIN_ROOT / "agents" / f"{req['auditor']}.md").is_file(), req["auditor"]


# ---------- run_coverage_gate (validate-coverage-matrix.py 連携) ----------

def test_coverage_gate_pass_on_complete_matrix(tmp_path):
    m = tmp_path / "spec-state.json"
    _write_matrix(m, complete=True)
    result = MOD.run_coverage_gate(m, require_complete=True)
    assert result["exit_code"] == 0
    assert result["name"] == "validate-coverage-matrix"


def test_coverage_gate_fail_on_incomplete_matrix(tmp_path):
    m = tmp_path / "spec-state.json"
    _write_matrix(m, complete=False)
    result = MOD.run_coverage_gate(m, require_complete=True)
    assert result["exit_code"] == 1


# ---------- run_knowledge_graph_gate (validate-knowledge-graph.py 独立再実行) ----------

def test_knowledge_graph_gate_pass_on_shipped_assets():
    # 評価者が出荷 3 カタログを validate-knowledge-graph.py 4 profile で独立再実行 (F-SYS-01)
    result = MOD.run_knowledge_graph_gate()
    assert result["id"] == "G-knowledge-graph"
    assert result["exit_code"] == 0, f"出荷資産が知識グラフゲートを通らない: {result['subgates']}"
    profiles = {sg["profile"] for sg in result["subgates"]}
    assert profiles == {"knowledge", "doctrine", "required-info", "cross"}
    assert result["conditions"] == ["design_knowledge_reflection", "matrix_coverage"]


def test_main_knowledge_graph_gate(capsys):
    rc = MOD.main(["--knowledge-graph"])
    assert rc == 0
    out = json.loads(capsys.readouterr().out)
    assert out["id"] == "G-knowledge-graph"


# ---------- schema ----------

def _schema():
    return json.loads(
        (SKILL_DIR / "schemas" / "completeness-findings.schema.json").read_text(encoding="utf-8")
    )


def test_schema_valid_json_and_covers_three_aspects():
    schema = _schema()
    aspects_required = schema["properties"]["aspects"]["required"]
    assert set(aspects_required) == set(MOD.ASPECTS)
    assert schema["properties"]["verdict"]["enum"] == ["PASS", "FAIL"]


def test_schema_requires_audit_delegations():
    schema = _schema()
    assert "audit_delegations" in schema["required"]
    d = schema["definitions"]["audit_delegation"]
    assert set(d["required"]) == {"aspect", "role", "auditor", "component", "dispatch", "verdict", "evidence"}
    assert set(d["properties"]["role"]["enum"]) == MOD.DELEGATION_ROLES
    assert set(d["properties"]["aspect"]["enum"]) == set(MOD.ASPECTS)
    assert d["properties"]["dispatch"]["properties"]["tool"]["const"] == "Task"


def test_rubric_aspect_to_auditor_matches_module():
    rubric = json.loads(
        (SKILL_DIR / "references" / "scoring-rubric.json").read_text(encoding="utf-8")
    )
    for aid, spec in MOD.ASPECTS.items():
        assert rubric["aspect_to_auditor"][aid] == spec["auditor"]


def test_rubric_attribution_matches_required_delegations():
    rubric = json.loads(
        (SKILL_DIR / "references" / "scoring-rubric.json").read_text(encoding="utf-8")
    )
    declared = {(r["aspect"], r["role"], r["auditor"], r["component"])
                for r in rubric["attribution"]["required_receipts"]}
    actual = {(r["aspect"], r["role"], r["auditor"], r["component"])
              for r in MOD.required_delegations()}
    assert declared == actual
    assert rubric["attribution"]["policy"] == "fail-closed"


# ---------- main() ----------

def test_main_requires_a_flag():
    with pytest.raises(SystemExit):
        MOD.main([])


def test_main_report_ok(tmp_path):
    rp = tmp_path / "report.json"
    rp.write_text(json.dumps(_golden_report(), ensure_ascii=False), encoding="utf-8")
    lp = tmp_path / "audit-fork-ledger.jsonl"
    _write_ledger(lp)
    assert MOD.main(["--report", str(rp), "--fork-ledger", str(lp)]) == 0


def test_main_report_violation(tmp_path):
    rp = tmp_path / "report.json"
    rp.write_text(json.dumps(_golden_report(verdict="FAIL", gaps=["x"]), ensure_ascii=False), encoding="utf-8")
    lp = tmp_path / "audit-fork-ledger.jsonl"
    _write_ledger(lp)
    assert MOD.main(["--report", str(rp), "--fork-ledger", str(lp)]) == 1


def test_main_report_without_ledger_is_fail_closed(tmp_path):
    """E2E: 形状も総合判定も整合した PASS レポートでも、fork 台帳が無ければ exit 1。"""
    rp = tmp_path / "report.json"
    rp.write_text(json.dumps(_golden_report(), ensure_ascii=False), encoding="utf-8")
    assert MOD.main(["--report", str(rp), "--fork-ledger", str(tmp_path / "nope.jsonl")]) == 1


def test_main_report_missing_file(tmp_path):
    assert MOD.main(["--report", str(tmp_path / "nope.json")]) == 2


def test_main_matrix_gate(tmp_path):
    m = tmp_path / "spec-state.json"
    _write_matrix(m, complete=True)
    assert MOD.main(["--matrix", str(m), "--require-complete"]) == 0
