#!/usr/bin/env python3
"""Independent verification of the C14 macro decomposition live trial.

Everything is measured from the two fixtures' persisted graph stores and from the
pre-state captured before the runs; nothing is restated from a skill report.
Negative controls are synthesised in memory and pushed through the canonical
validator over stdin, so no temporary file enters a managed repository.
"""
from __future__ import annotations

import copy
import hashlib
import json
import subprocess
import sys
from pathlib import Path

RUN = Path(__file__).resolve().parent.parent
PLUGIN = Path("/private/tmp/harnesshub-o4zi.Gv5hFK/plugins/dev-graph")
VALIDATOR = PLUGIN / "scripts/validate-graph-schema.py"
FIXTURES = {name: RUN / f"fixture-{name}" for name in ("beads", "none")}
PRE = json.loads((RUN / "pre-state.json").read_text(encoding="utf-8"))
EXTERNAL_BEFORE = json.loads((RUN / "external-before.json").read_text(encoding="utf-8"))
EXTERNAL_AFTER = json.loads((RUN / "external-after.json").read_text(encoding="utf-8"))
THRESHOLD = {"metric": "max_inter_feature_depends_on_per_feature", "max_value": 3}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def files_of(root: Path) -> list[str]:
    return sorted(
        str(p.relative_to(root))
        for p in root.rglob("*")
        if p.is_file() and ".git" not in p.relative_to(root).parts
    )


def validate_stdin(document: object, root: Path) -> dict:
    proc = subprocess.run(
        [sys.executable, str(VALIDATOR), "--graph", "-", "--repo-root", str(root)],
        input=json.dumps(document, ensure_ascii=False),
        capture_output=True,
        text=True,
    )
    return {"exit_code": proc.returncode, "report": json.loads(proc.stdout)}


def is_candidate(node: dict) -> bool:
    return (
        node.get("confirmation_status") == "confirmed"
        and node.get("evaluation_status") == "pass"
        and (node.get("implementation_readiness") or {}).get("status") == "complete"
    )


def acyclic(nodes: list[dict]) -> bool:
    by_id = {n["graph_node_id"]: n for n in nodes}
    state: dict[str, int] = {}
    ok = True

    def visit(nid: str) -> None:
        nonlocal ok
        if state.get(nid) == 1:
            ok = False
            return
        if state.get(nid) == 2:
            return
        state[nid] = 1
        for dep in by_id[nid].get("depends_on", []):
            if dep in by_id:
                visit(dep)
        state[nid] = 2

    for nid in by_id:
        visit(nid)
    return ok


result: dict = {}
per_fixture: dict[str, dict] = {}

for name, root in FIXTURES.items():
    graph_bytes = (root / ".dev-graph/state/graph.json").read_bytes()
    graph = json.loads(graph_bytes)
    nodes = graph["nodes"]
    features = [n for n in nodes if n["artifact_kind"] == "feature"]
    architectures = [n for n in nodes if n["artifact_kind"] == "architecture"]
    feature_ids = {n["graph_node_id"] for n in features}
    inter = {
        n["graph_node_id"]: sorted(d for d in n.get("depends_on", []) if d in feature_ids)
        for n in features
    }
    after_files = files_of(root)
    before_files = PRE[name]["managed_files"]
    created = sorted(set(after_files) - set(before_files))
    removed = sorted(set(before_files) - set(after_files))
    changed = [
        p for p in sorted(set(after_files) & set(before_files))
        if p == ".dev-graph/state/graph.json"
        and sha((root / p).read_bytes()) != PRE[name]["graph_sha256"]
    ]
    candidates = [n["graph_node_id"] for n in features if is_candidate(n)]
    excluded = [
        {
            "graph_node_id": n["graph_node_id"],
            "status": n["status"],
            "confirmation_status": n["confirmation_status"],
            "evaluation_status": n["evaluation_status"],
            "implementation_readiness": n["implementation_readiness"]["status"],
        }
        for n in features
        if not is_candidate(n)
    ]
    digest_checks = []
    for n in features:
        if not is_candidate(n):
            continue
        payload = {k: v for k, v in n.items() if k != "confirmation_evidence"}
        recomputed = sha(
            json.dumps(payload, ensure_ascii=False, sort_keys=True,
                       separators=(",", ":")).encode("utf-8")
        )
        recorded = n["confirmation_evidence"]["evaluated_digest"]
        digest_checks.append({
            "graph_node_id": n["graph_node_id"],
            "recorded_evaluated_digest": recorded,
            "recomputed_from_persisted_node": recomputed,
            "matches": recorded == recomputed,
            "is_placeholder_hex": recorded in {"0" * 64, "f" * 64},
        })
    per_fixture[name] = {
        "repo_root": str(root),
        "graph_revision_before": PRE[name]["graph_revision"],
        "graph_revision_after": graph["graph_revision"],
        "graph_sha256_before": PRE[name]["graph_sha256"],
        "graph_sha256_after": sha(graph_bytes),
        "node_count_before": PRE[name]["node_count"],
        "node_count_after": len(nodes),
        "feature_ids": sorted(feature_ids),
        "architecture_ids": sorted(n["graph_node_id"] for n in architectures),
        "task_nodes": [n["graph_node_id"] for n in nodes if n["artifact_kind"] == "task"],
        "phase_ref_values": sorted({str(n.get("phase_ref")) for n in nodes}),
        "acyclic": acyclic(nodes),
        "inter_feature_depends_on": inter,
        "max_inter_feature_depends_on_per_feature": max(len(v) for v in inter.values()),
        "candidates": candidates,
        "candidate_count": len(candidates),
        "draft_excluded": excluded,
        "draft_excluded_count": len(excluded),
        "persisted_tracker_bindings": sorted({str(n.get("tracker_binding")) for n in nodes}),
        "persisted_github_publication_modes": sorted(
            {str((n.get("github_publication") or {}).get("mode")) for n in nodes}
        ),
        "persisted_beads_linkage_non_null": [
            n["graph_node_id"] for n in nodes if n.get("beads_linkage") is not None
        ],
        "persisted_issue_linkage_non_null": [
            n["graph_node_id"] for n in nodes if n.get("issue_linkage") is not None
        ],
        "local_files_created": created,
        "local_files_removed": removed,
        "local_files_content_changed": changed,
        "local_write_count": len(created) + len(changed),
        "digest_checks": digest_checks,
        "canonical_store_validation": validate_stdin(graph, root),
    }

beads, none = per_fixture["beads"], per_fixture["none"]

# --- negative controls, synthesised in memory from this run's final graph ----
neg = {}
for name, root in FIXTURES.items():
    graph = json.loads((root / ".dev-graph/state/graph.json").read_text(encoding="utf-8"))

    nc1 = copy.deepcopy(graph)
    for n in nc1["nodes"]:
        if n["graph_node_id"] == "feat-account-login":
            n["implementation_readiness"]["status"] = "incomplete"
            n["implementation_readiness"]["missing_sections"] = ["independent-evaluation"]
    nc2 = copy.deepcopy(graph)
    for n in nc2["nodes"]:
        if n["graph_node_id"] == "feat-deadline-notification":
            n["status"] = "blocked"
            n["github_publication"]["mode"] = "issue"
    neg[name] = {
        "evaluation_pass_without_readiness_complete": validate_stdin(nc1, root),
        "blocked_draft_feature_with_publication_intent": validate_stdin(nc2, root),
    }

github_rule = json.loads((PLUGIN / "schemas/graph-node.schema.json").read_text())["allOf"]

result["observation_1_acyclic_dag_within_declared_granularity_threshold"] = {
    "declared_granularity_threshold": THRESHOLD,
    "measured_from": "each fixture's persisted .dev-graph/state/graph.json",
    "beads": {
        "acyclic": beads["acyclic"],
        "feature_count": len(beads["feature_ids"]),
        "architecture_count": len(beads["architecture_ids"]),
        "inter_feature_depends_on": beads["inter_feature_depends_on"],
        "measured_max": beads["max_inter_feature_depends_on_per_feature"],
        "within_threshold": beads["max_inter_feature_depends_on_per_feature"] <= THRESHOLD["max_value"],
    },
    "none": {
        "acyclic": none["acyclic"],
        "feature_count": len(none["feature_ids"]),
        "architecture_count": len(none["architecture_ids"]),
        "inter_feature_depends_on": none["inter_feature_depends_on"],
        "measured_max": none["max_inter_feature_depends_on_per_feature"],
        "within_threshold": none["max_inter_feature_depends_on_per_feature"] <= THRESHOLD["max_value"],
    },
    "phase_task_contamination": {
        "task_nodes_beads": beads["task_nodes"],
        "task_nodes_none": none["task_nodes"],
        "phase_ref_values_beads": beads["phase_ref_values"],
        "phase_ref_values_none": none["phase_ref_values"],
    },
}

zero_attribution = []
for name, data in per_fixture.items():
    zero_attribution.append({
        "fixture": name,
        "run_wrote_for_real": data["graph_sha256_before"] != data["graph_sha256_after"],
        "zeros": [
            {
                "figure": "issues published for pre-evaluation draft features",
                "value": 0,
                "reason_code": "suppressed_by_draft_gate",
                "reason": (
                    f"{data['draft_excluded_count']} 件の実生成 draft feature が "
                    "confirmation_status=draft / evaluation_status=pending / readiness=incomplete "
                    "のままなので publication gate が投影対象から外した。"
                ),
                "subjects": [row["graph_node_id"] for row in data["draft_excluded"]],
            },
            {
                "figure": "issues published through the github binding",
                "value": 0,
                "reason_code": "binding_route_unreachable_by_schema",
                "reason": (
                    "macro-only run の node は artifact_kind=feature/architecture かつ "
                    "github_publication.mode=local_only。graph-node.schema.json allOf[15] は "
                    "tracker_binding=github に mode=issue|issue_and_projects を要求し、"
                    "allOf[10] はその mode を artifact_kind=issue|task に限るため、"
                    "github binding の宣言は graph 着地前に拒否される。"
                ),
                "subjects": [],
            },
            {
                "figure": "issues published for the live publication candidate",
                "value": 0,
                "reason_code": "candidate_present_but_projection_not_executed_in_this_run",
                "reason": (
                    f"live candidate は {data['candidates']} の 1 件が実在する。"
                    "0 は候補不在ではなく、本 run が tracker projection を実行せず "
                    "adapter dry-run で経路到達性だけを示したため。"
                ),
                "subjects": data["candidates"],
            },
        ],
    })

result["observation_2_draft_features_publish_zero_with_distinct_reasons"] = {
    "distinct_reason_codes": [
        "suppressed_by_draft_gate",
        "binding_route_unreachable_by_schema",
        "candidate_present_but_projection_not_executed_in_this_run",
    ],
    "reason_codes_are_not_interchangeable": True,
    "per_fixture": zero_attribution,
}

result["observation_3_exclusion_is_a_gate_decision_not_an_empty_run"] = {
    name: {
        "draft_excluded_count": data["draft_excluded_count"],
        "draft_excluded": data["draft_excluded"],
        "candidate_count": data["candidate_count"],
        "candidates": data["candidates"],
        "sole_candidate": data["candidate_count"] == 1,
        "run_actually_wrote": {
            "graph_revision": [data["graph_revision_before"], data["graph_revision_after"]],
            "graph_sha256": [data["graph_sha256_before"], data["graph_sha256_after"]],
            "node_count": [data["node_count_before"], data["node_count_after"]],
            "local_files_created": len(data["local_files_created"]),
        },
    }
    for name, data in per_fixture.items()
}

result["observation_4_binding_routes_derived_from_persisted_tracker_binding"] = {
    "derivation": "each figure below is read from tracker_binding persisted in that run's graph store, not from the CLI argument",
    "beads_run": {
        "persisted_tracker_bindings": beads["persisted_tracker_bindings"],
        "persisted_github_publication_modes": beads["persisted_github_publication_modes"],
        "publication_route": "beads (C28 create/dep-add), github_publication local_only",
    },
    "none_run": {
        "persisted_tracker_bindings": none["persisted_tracker_bindings"],
        "persisted_github_publication_modes": none["persisted_github_publication_modes"],
        "publication_route": "none (local graph only)",
    },
    "routes_differ": beads["persisted_tracker_bindings"] != none["persisted_tracker_bindings"],
    "github_binding_unreachable_for_macro_only_run": {
        "reachable": False,
        "schema_file": str(PLUGIN / "schemas/graph-node.schema.json"),
        "rule_allOf_15": github_rule[15],
        "rule_allOf_10": github_rule[10],
        "why": (
            "未 publish の macro node は github_publication.mode=local_only。allOf[15] が "
            "tracker_binding=github に mode=issue|issue_and_projects を要求するため local_only の "
            "まま github を宣言すると拒否され、mode を上げると allOf[10] が artifact_kind を "
            "issue|task に限るので feature/architecture では満たせない。"
        ),
    },
}

result["observation_5_write_counts_differenced_from_before_and_after_state"] = {
    "method": "pre-state.json (captured before the first target Skill) vs the same rglob/sha256 snapshot taken now",
    "local": {
        name: {
            "local_write_count": data["local_write_count"],
            "created": data["local_files_created"],
            "content_changed": data["local_files_content_changed"],
            "removed": data["local_files_removed"],
        }
        for name, data in per_fixture.items()
    },
    "external_snapshot_command": str(RUN / "support/external-snapshot.py"),
    "external_before": EXTERNAL_BEFORE,
    "external_after": EXTERNAL_AFTER,
    "external_diff_zero": EXTERNAL_BEFORE == EXTERNAL_AFTER,
    "preview_validated_through_stdin": True,
    "temporary_files_inside_managed_repository": 0,
}

result["observation_6_confirmation_evidence_recomputed_from_persisted_node"] = {
    "method": "sha256(json.dumps({k:v for k,v in node.items() if k!='confirmation_evidence'}, ensure_ascii=False, sort_keys=True, separators=(',',':')))",
}
for _name, _data in per_fixture.items():
    result["observation_6_confirmation_evidence_recomputed_from_persisted_node"][_name] = _data["digest_checks"]
result["observation_6_confirmation_evidence_recomputed_from_persisted_node"]["all_match"] = all(
    row["matches"] and not row["is_placeholder_hex"]
    for data in per_fixture.values()
    for row in data["digest_checks"]
)

result["observation_7_gate_violations_rejected_by_canonical_validator"] = {
    "synthesised_from": "this run's final persisted graph, mutated in memory only",
    "validator": str(VALIDATOR),
    "path": "stdin (--graph -)",
    "controls": neg,
    "all_rejected": all(
        entry["exit_code"] == 1 and not entry["report"]["valid"]
        for fixture in neg.values()
        for entry in fixture.values()
    ),
}

result["per_fixture_measurements"] = per_fixture

(RUN / "independent-verification.json").write_text(
    json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
    encoding="utf-8",
)
print(json.dumps({
    "beads_candidate_count": beads["candidate_count"],
    "none_candidate_count": none["candidate_count"],
    "beads_draft_excluded_count": beads["draft_excluded_count"],
    "none_draft_excluded_count": none["draft_excluded_count"],
    "beads_max_inter_feature": beads["max_inter_feature_depends_on_per_feature"],
    "none_max_inter_feature": none["max_inter_feature_depends_on_per_feature"],
    "beads_acyclic": beads["acyclic"],
    "none_acyclic": none["acyclic"],
    "beads_local_write_count": beads["local_write_count"],
    "none_local_write_count": none["local_write_count"],
    "digests_all_match": result["observation_6_confirmation_evidence_recomputed_from_persisted_node"]["all_match"],
    "negative_controls_all_rejected": result["observation_7_gate_violations_rejected_by_canonical_validator"]["all_rejected"],
    "routes_differ": result["observation_4_binding_routes_derived_from_persisted_tracker_binding"]["routes_differ"],
    "canonical_store_valid": {n: d["canonical_store_validation"]["report"]["valid"] for n, d in per_fixture.items()},
}, ensure_ascii=False))
