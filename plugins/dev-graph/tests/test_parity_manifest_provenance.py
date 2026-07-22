"""C28 parity manifest の由来必須化と C16 stale 検出の回帰テスト。

守る不変条件は 3 つ。
1. parity manifest は「いつ・どの graph から作った snapshot か」を必ず持ち、
   snapshot 生成後に graph が動いていれば schedule が停止する (silent な stale 推薦の禁止)。
2. ready 候補が manifest に載らなかった理由は対処 owner が分かる粒度で分離され、
   C28 で落ちた候補が C16 の report からも消えない (silent drop の禁止)。
3. 停止からの回復手順である「manifest の再生成」が決定論 script として存在し、
   その出力が C28 の由来検査と C16 の digest 突合をそのまま通る (手書き manifest の禁止)。
"""

from __future__ import annotations

import importlib.util
import io
import json
import sys
from pathlib import Path

import pytest

PLUGIN = Path(__file__).resolve().parents[1]
SCRIPTS = PLUGIN / "scripts"
sys.path.insert(0, str(SCRIPTS))


def load(filename: str, name: str):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / filename)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def call_main(module, monkeypatch, capsys, *argv):
    monkeypatch.setattr(sys, "argv", [str(module.__file__), *map(str, argv)])
    monkeypatch.setattr(sys, "stdin", io.StringIO("{}"))
    code = module.main()
    output = capsys.readouterr().out.strip()
    return code, json.loads(output) if output else None


PROVENANCE = {"generated_at": "2026-07-21T00:00:00Z", "source_graph_digest": "sha256:" + "d" * 64}


def bridge_with_issues(monkeypatch, issues: list[dict]):
    module = load("bd-bridge.py", "c28_parity_provenance")
    monkeypatch.setattr(
        module, "preflight",
        lambda root, expected=None: {"version": "1.1.0", "workspace_identity": {"workspace_id": "bdw_fixture"}},
    )
    by_id = {row["id"]: row for row in issues}

    def fake_bd(args, cwd, check=True):
        if args[0] == "ready":
            return issues
        if args[0] == "show":
            return by_id[args[1]]
        raise AssertionError(args)

    monkeypatch.setattr(module, "bd", fake_bd)
    return module


def test_c28_ready_rejects_parity_manifest_without_provenance(tmp_path, monkeypatch, capsys):
    module = bridge_with_issues(monkeypatch, [])
    manifest = tmp_path / "parity.json"

    manifest.write_text(json.dumps({"nodes": []}), encoding="utf-8")
    with pytest.raises(module.ContractError, match="generated_at"):
        call_main(module, monkeypatch, capsys, "--op", "ready", "--repo-root", tmp_path, "--parity-manifest", manifest)

    manifest.write_text(json.dumps({"generated_at": "2026-07-21", "nodes": []}), encoding="utf-8")
    with pytest.raises(module.ContractError, match="RFC3339"):
        call_main(module, monkeypatch, capsys, "--op", "ready", "--repo-root", tmp_path, "--parity-manifest", manifest)

    manifest.write_text(json.dumps({**PROVENANCE, "source_graph_digest": "deadbeef", "nodes": []}), encoding="utf-8")
    with pytest.raises(module.ContractError, match="source_graph_digest"):
        call_main(module, monkeypatch, capsys, "--op", "ready", "--repo-root", tmp_path, "--parity-manifest", manifest)


def test_c28_ready_separates_unmapped_reasons_and_echoes_provenance(tmp_path, monkeypatch, capsys):
    issues = [
        {"id": "B-mapped", "status": "open", "dependencies": [], "external_ref": "dev-graph:node-a"},
        {"id": "B-drift", "status": "open", "dependencies": [], "external_ref": "dev-graph:node-b"},
        {"id": "B-native", "status": "open", "dependencies": [], "description": "hand written issue"},
    ]
    module = bridge_with_issues(monkeypatch, issues)
    manifest = tmp_path / "parity.json"
    manifest.write_text(json.dumps({
        **PROVENANCE,
        "nodes": [{
            "graph_node_id": "node-a", "bd_issue_id": "B-mapped",
            "graph_status": "active", "depends_on": [],
        }],
    }), encoding="utf-8")

    code, receipt = call_main(
        module, monkeypatch, capsys,
        "--op", "ready", "--repo-root", tmp_path, "--parity-manifest", manifest,
    )
    assert code == 0
    assert [row["bd_issue_id"] for row in receipt["ready_set"]] == ["B-mapped"]
    reasons = {row["bd_issue_id"]: row["reason"] for row in receipt["unmapped"]}
    # graph 管理下 (external_ref あり) の取りこぼしと、graph 管理外の bd 課題を混ぜない。
    assert reasons == {"B-drift": "parity_manifest_missing", "B-native": "external_ref_absent"}
    assert receipt["unmapped_summary"] == {"external_ref_absent": 1, "parity_manifest_missing": 1}
    assert receipt["parity_provenance"] == PROVENANCE


def schedule_workspace(tmp_path: Path, ready_payload: dict) -> tuple[Path, Path, Path]:
    graph = tmp_path / "graph.json"
    graph.write_text(json.dumps({"nodes": [{
        "graph_node_id": "beads-node", "artifact_kind": "task", "status": "active",
        "confirmation_status": "confirmed", "evaluation_status": "pass",
        "implementation_readiness": {"status": "complete"}, "depends_on": [],
        "tracker_binding": "beads", "resource_scope": ["a"],
    }]}), encoding="utf-8")
    ready = tmp_path / "ready.json"
    ready.write_text(json.dumps(ready_payload), encoding="utf-8")
    leases = tmp_path / "leases.json"
    leases.write_text(json.dumps({"leases": []}), encoding="utf-8")
    return graph, ready, leases


def test_c16_schedule_stops_on_missing_or_stale_parity_provenance(tmp_path, monkeypatch, capsys):
    schedule = load("schedule-graph.py", "c16_parity_provenance")
    entry = {
        "external_ref": "beads-node", "edge_parity": {"confirmed": True},
        "graph_status": "active", "graph_depends_on": [],
    }

    graph, ready, leases = schedule_workspace(tmp_path, {"ready_set": [entry]})
    with pytest.raises(schedule.ContractError, match="parity_provenance"):
        call_main(schedule, monkeypatch, capsys, "--graph", graph, "--ready-json", ready, "--leases", leases)

    ready.write_text(json.dumps({
        "parity_provenance": PROVENANCE, "ready_set": [entry],
    }), encoding="utf-8")
    with pytest.raises(schedule.ContractError, match="stale"):
        call_main(schedule, monkeypatch, capsys, "--graph", graph, "--ready-json", ready, "--leases", leases)


def test_c16_schedule_accepts_fresh_snapshot_and_surfaces_tracker_drift(tmp_path, monkeypatch, capsys):
    schedule = load("schedule-graph.py", "c16_parity_carry")
    graph, ready, leases = schedule_workspace(tmp_path, {})
    provenance = {
        "generated_at": "2026-07-21T00:00:00Z",
        "source_graph_digest": schedule._canonical_digest(json.loads(graph.read_text())),
    }
    ready.write_text(json.dumps({
        "parity_provenance": provenance,
        "ready_set": [{
            "external_ref": "beads-node", "edge_parity": {"confirmed": True},
            "graph_status": "active", "graph_depends_on": [],
        }],
        "unmapped": [{"bd_issue_id": "B-native", "external_ref": None, "reason": "external_ref_absent"}],
        "conflicts": [{"bd_issue_id": "B-conflict", "graph_node_id": "node-x", "reason": "Beads parity conflict"}],
    }), encoding="utf-8")

    code, plan = call_main(
        schedule, monkeypatch, capsys, "--graph", graph, "--ready-json", ready, "--leases", leases,
    )
    assert code == 0 and plan["ready_set"]["tasks"] == ["beads-node"]
    assert plan["parity_provenance"] == provenance
    # C28 で落ちた候補は判定に使わないが、schedule report から消してはならない。
    carried = {row["bd_issue_id"]: row for row in plan["unmapped"] if row.get("source") == "bd-bridge"}
    assert set(carried) == {"B-native", "B-conflict"}
    assert carried["B-native"]["reason"] == "external_ref_absent"
    assert carried["B-conflict"]["reason"] == "Beads parity conflict"


def _graph_node(node_id: str, issue_id: str, **overrides) -> dict:
    node = {
        "graph_node_id": node_id, "artifact_kind": "task", "status": "active",
        "confirmation_status": "confirmed", "evaluation_status": "pass",
        "implementation_readiness": {"status": "complete"}, "depends_on": [],
        "tracker_binding": "beads", "resource_scope": [node_id],
        "beads_linkage": {"bd_issue_id": issue_id, "sync_state": "linked"},
    }
    node.update(overrides)
    return node


def test_builder_output_satisfies_c28_provenance_and_c16_digest(tmp_path, monkeypatch, capsys):
    """再生成器の出力が、そのまま C28 の由来検査と C16 の stale 突合を通る。

    ここが切れると「回復手順を実行しても停止が解けない」= 運用者に出口が無い状態になる。
    """
    builder = load("build-parity-manifest.py", "build_parity_manifest_roundtrip")
    bridge = load("bd-bridge.py", "c28_for_builder_roundtrip")
    schedule = load("schedule-graph.py", "c16_for_builder_roundtrip")

    graph_path = tmp_path / ".dev-graph" / "state" / "graph.json"
    graph_path.parent.mkdir(parents=True)
    graph = {"graph_revision": 3, "nodes": [
        # depends_on は graph の並びのまま写す必要がある。sorted すると C16 の
        # `graph_depends_on == depends_on` 等価比較が順序差だけで落ちる。
        _graph_node("node-b", "B-2", depends_on=["node-a", "node-0"]),
        _graph_node("node-a", "B-1"),
        _graph_node("node-0", "B-0"),
        {"graph_node_id": "arch-x", "tracker_binding": "none", "status": "active", "depends_on": []},
    ]}
    graph_path.write_text(json.dumps(graph), encoding="utf-8")
    out = tmp_path / "parity.json"

    code, receipt = call_main(
        builder, monkeypatch, capsys, "--repo-root", tmp_path, "--out", out,
        "--generated-at", "2026-07-22T00:00:00Z",
    )
    assert code == 0 and receipt["node_count"] == 3
    manifest = json.loads(out.read_text(encoding="utf-8"))

    # binding=beads 以外は載せない / graph_node_id 昇順 / depends_on は graph の順序のまま。
    assert [row["graph_node_id"] for row in manifest["nodes"]] == ["node-0", "node-a", "node-b"]
    assert manifest["nodes"][2]["depends_on"] == ["node-a", "node-0"]
    assert bridge._manifest_provenance(manifest) == {
        "generated_at": "2026-07-22T00:00:00Z",
        "source_graph_digest": manifest["source_graph_digest"],
    }
    assert manifest["source_graph_digest"] == schedule._canonical_digest(graph)


def test_builder_stops_on_beads_node_without_linkage(tmp_path, monkeypatch, capsys):
    """binding=beads なのに linkage が無い **非 draft** node は graph 側の欠陥。黙って落とさない。

    ここで除外すると、その node は C28 で `parity_manifest_missing` (= graph 管理下の
    取りこぼし) に化け、原因が manifest 生成から遠い場所で初めて露見する。draft のみの例外は
    test_builder_skips_unprojected_draft_node が固定する。
    """
    builder = load("build-parity-manifest.py", "build_parity_manifest_linkage")
    graph_path = tmp_path / "graph.json"
    graph_path.write_text(json.dumps({"nodes": [
        # _graph_node の既定 status は active なので、これは非 draft の linkage 欠落 = 欠陥。
        _graph_node("node-a", "B-1"), _graph_node("node-b", "B-2", beads_linkage=None),
    ]}), encoding="utf-8")

    with pytest.raises(builder.ContractError, match="beads_linkage.bd_issue_id"):
        call_main(builder, monkeypatch, capsys, "--repo-root", tmp_path,
                  "--graph", graph_path, "--out", tmp_path / "parity.json")
    assert not (tmp_path / "parity.json").exists()


def test_builder_skips_unprojected_draft_node(tmp_path, monkeypatch, capsys):
    """status=draft の未投影 beads node (linkage=null) は欠陥ではなく snapshot 対象外として除外する。

    起票直後の draft は sync 前で linkage が無いのが正当な状態。ここを fatal にすると、main
    取り込みで未 sync の draft issue node が 1 つでも入った瞬間に manifest 再生成が不能になり、
    schedule の stale 回復手順そのものが動かなくなる (実際に origin/main の起票 node 5 件で発生)。
    draft は除外し、それ以外での linkage 欠落は停止のまま (対の non-draft テストが担保)。
    """
    builder = load("build-parity-manifest.py", "build_parity_manifest_draft_skip")
    graph_path = tmp_path / "graph.json"
    graph_path.write_text(json.dumps({"nodes": [
        _graph_node("node-a", "B-1"),
        _graph_node("node-draft", "unused", status="draft", beads_linkage=None),
    ]}), encoding="utf-8")
    out = tmp_path / "parity.json"

    code, receipt = call_main(builder, monkeypatch, capsys, "--repo-root", tmp_path,
                              "--graph", graph_path, "--out", out,
                              "--generated-at", "2026-07-22T00:00:00Z")
    # draft は除外され node-a だけが載る。receipt も 1 件で、fail-closed せず正常終了する。
    assert code == 0 and receipt["node_count"] == 1
    manifest = json.loads(out.read_text(encoding="utf-8"))
    assert [row["graph_node_id"] for row in manifest["nodes"]] == ["node-a"]


def test_builder_check_reports_drift_without_writing(tmp_path, monkeypatch, capsys):
    """--check は既存 manifest を書き換えない。digest だけ現在値へ合わせる回避を作らないため。"""
    builder = load("build-parity-manifest.py", "build_parity_manifest_check")
    graph_path = tmp_path / "graph.json"
    graph_path.write_text(json.dumps({"nodes": [_graph_node("node-a", "B-1")]}), encoding="utf-8")
    out = tmp_path / "parity.json"
    call_main(builder, monkeypatch, capsys, "--repo-root", tmp_path,
              "--graph", graph_path, "--out", out, "--generated-at", "2026-07-22T00:00:00Z")
    fresh = out.read_bytes()

    code, receipt = call_main(builder, monkeypatch, capsys, "--repo-root", tmp_path,
                              "--graph", graph_path, "--out", out, "--check")
    assert code == 0 and receipt["drift"] == []

    graph_path.write_text(json.dumps({"nodes": [
        _graph_node("node-a", "B-1"), _graph_node("node-c", "B-3"),
    ]}), encoding="utf-8")
    code, receipt = call_main(builder, monkeypatch, capsys, "--repo-root", tmp_path,
                              "--graph", graph_path, "--out", out, "--check")
    assert code == 1 and receipt["drift"] == ["nodes", "source_graph_digest"]
    assert out.read_bytes() == fresh


@pytest.mark.parametrize("relative_path", [
    "eval-log/run-dev-graph-schedule-parity-manifest.json",
    ".dev-graph/plans/feature-package-feat-publish-pipeline/parity-manifest.json",
])
def test_repository_parity_manifests_carry_provenance(relative_path: str):
    """repository に commit 済みの manifest が由来を持つ (= 再生成済みである)。

    内容が現 graph と一致するかは graph が動くたびに変わるので C16 と `--check` の役目。
    ここで固定するのは「由来欠落の manifest を repository へ戻さない」ことだけ。
    """
    builder = load("build-parity-manifest.py", "build_parity_manifest_repo_state")
    manifest = json.loads((PLUGIN.parents[1] / relative_path).read_text(encoding="utf-8"))
    bridge = load("bd-bridge.py", "c28_for_repo_manifests")

    provenance = bridge._manifest_provenance(manifest)
    assert builder.RFC3339_UTC.fullmatch(provenance["generated_at"])
    assert manifest["nodes"] and all(
        set(row) == {"graph_node_id", "bd_issue_id", "graph_status", "depends_on"}
        for row in manifest["nodes"]
    )
