from __future__ import annotations

import importlib.util
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
SCRIPT = Path(__file__).parent / "fixtures" / "audit_decompose_live_trial.py"
SPEC = importlib.util.spec_from_file_location("audit_decompose_live_trial", SCRIPT)
assert SPEC and SPEC.loader
AUDIT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUDIT)


def test_graph_and_publication_measurements_are_derived_from_preview() -> None:
    features = [
        {
            "graph_node_id": "feature-source",
            "artifact_kind": "feature",
            "depends_on": [],
            "confirmation_status": "draft",
            "evaluation_status": "pending",
            "implementation_readiness": {"status": "incomplete"},
        },
        {
            "graph_node_id": "feature-consumer",
            "artifact_kind": "feature",
            "depends_on": ["feature-source"],
            "confirmation_status": "confirmed",
            "evaluation_status": "pass",
            "implementation_readiness": {"status": "complete"},
            "confirmation_evidence": {
                "evaluator": "live-trial-lifecycle-probe",
                "evidence_ref": "eval-log/macro-preview.json",
                "evaluated_digest": "a" * 64,
            },
        },
    ]
    nodes = [
        {
            "graph_node_id": "architecture-root",
            "artifact_kind": "architecture",
            "depends_on": [],
        },
        *features,
    ]

    graph = AUDIT._graph_measurements(
        nodes,
        {
            "metric": "max_inter_feature_depends_on_per_feature",
            "max_value": 3,
        },
    )
    publication = AUDIT._publication_measurements(features)

    assert graph["acyclic"] is True
    assert graph["measured_max"] == 1
    assert graph["threshold_pass"] is True
    assert graph["task_count"] == 0
    assert {
        binding: result["count"]
        for binding, result in publication["draft_candidates"].items()
    } == {"none": 0, "beads": 0, "github": 0}
    assert {
        binding: result["count"]
        for binding, result in publication["publication_candidates"].items()
    } == {"none": 1, "beads": 1, "github": 1}
    assert publication["lifecycle_probe"]["source"] == "actual-preview-nodes"
    assert publication["lifecycle_probe"]["has_draft_exclusion"] is True
    assert publication["lifecycle_probe"]["has_positive_candidate"] is True


def test_adapter_suppression_requires_real_dry_run_receipt_shape() -> None:
    beads = {"payload": {"op": "create", "dry_run_preview": {"graph_node_id": "feature-source"}}}
    github = {"payload": {"op": "issue-create", "dry_run": True, "mutation_suppressed": True}}
    incomplete = {"payload": {"op": "issue-create", "dry_run": True}}

    assert AUDIT._suppression_from(beads) is True
    assert AUDIT._suppression_from(github) is True
    assert AUDIT._suppression_from(incomplete) is False


def test_helper_identity_is_bound_to_git_index() -> None:
    identity = AUDIT._helper_identity()

    assert identity["path"].endswith("audit_decompose_live_trial.py")
    assert identity["tracked_in_index"] is True
    assert identity["index_matches_worktree"] is True
    assert len(identity["sha256"]) == 64


def test_helper_identity_covers_every_audit_module() -> None:
    """責務分割で provenance の穴を作らない: 監査 module 全部が identity に入る。

    状態層を別ファイルへ出した後に代表 module だけを測ると、状態層を試験中に書き換えても
    provenance_valid が緑のままになる。合成 identity は全 module を含み、どれか 1 本の
    変更で sha256 が動くこと (= pre-state との比較で検出できること) を固定する。
    """
    identity = AUDIT._helper_identity()
    covered = {module["path"] for module in identity["modules"]}

    assert covered == {
        path.relative_to(REPO_ROOT).as_posix() for path in AUDIT.AUDIT_MODULES
    }
    assert all(module["index_matches_worktree"] for module in identity["modules"])

    single = AUDIT.STATE.composite_identity([SCRIPT])
    assert single["sha256"] != identity["sha256"]
