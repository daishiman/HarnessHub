from __future__ import annotations

import json

import pytest

from test_register_package import PLUGIN, RP, task_node


def _node_schema() -> dict:
    return json.loads(
        (PLUGIN / "schemas" / "graph-node.schema.json").read_text(
            encoding="utf-8"
        )
    )


@pytest.mark.parametrize("tracker_mode", ["beads", "none"])
@pytest.mark.parametrize(
    "policy",
    ["linked_pr_merged_all", "linked_pr_merged_any"],
)
def test_local_only_binding_leaves_completion_policy_reachable(
    tracker_mode: str,
    policy: str,
) -> None:
    nodes = [task_node(index) for index in range(13)]
    nodes[0]["completion_evidence"]["policy"] = policy
    intents = {node["graph_node_id"]: "auto" for node in nodes}

    resolved = RP._resolved_nodes(
        nodes,
        intents,
        tracker_mode,
        _node_schema(),
    )

    assert resolved[0]["tracker_binding"] == tracker_mode
    assert resolved[0]["github_publication"]["mode"] == "local_only"
    assert resolved[0]["completion_evidence"]["policy"] == "manual"


def test_github_binding_keeps_pr_linked_completion_policy() -> None:
    nodes = [task_node(index) for index in range(13)]
    intents = {node["graph_node_id"]: "auto" for node in nodes}

    resolved = RP._resolved_nodes(
        nodes,
        intents,
        "github",
        _node_schema(),
    )

    assert resolved[0]["github_publication"]["mode"] == "issue"
    assert resolved[0]["completion_evidence"]["policy"] == "linked_pr_merged_all"
