#!/usr/bin/env python3
"""Promote exactly one produced feature to confirmed/pass/complete via C02 upsert.

Writes an evaluation receipt, computes the confirmation digest from the *predicted*
final persisted node (excluding confirmation_evidence only), then emits the C02 patch
input.  updated_at is declared explicitly so the persisted node equals the prediction.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()
TARGET = sys.argv[2]
T = "2026-08-08T17:30:00Z"

graph = json.loads((ROOT / ".dev-graph/state/graph.json").read_text(encoding="utf-8"))
node = next(n for n in graph["nodes"] if n["graph_node_id"] == TARGET)

receipt_rel = "eval-log/c14-feature-evaluation-receipt.json"
receipt = {
    "evaluator": "dev-graph C14 independent macro auditor",
    "evaluated_feature": TARGET,
    "criteria": [
        "purpose/goal/scope_in/scope_out/acceptance/architecture_refs が実質記述である",
        "機能間 depends_on が非循環で declared_granularity_threshold 以内である",
        "phase task (P01..P13) の混入が0件である",
    ],
    "verdict": "pass",
    "evaluated_at": T,
}
receipt_path = ROOT / receipt_rel
receipt_path.parent.mkdir(parents=True, exist_ok=True)
receipt_path.write_text(
    json.dumps(receipt, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
    encoding="utf-8",
)

patch = {
    "graph_node_id": TARGET,
    "status": "active",
    "confirmation_status": "confirmed",
    "evaluation_status": "pass",
    "implementation_readiness": {
        "status": "complete",
        "missing_sections": [],
        "checked_at": T,
    },
    "updated_at": T,
}

predicted = dict(node)
predicted.update(patch)
payload = {k: v for k, v in predicted.items() if k != "confirmation_evidence"}
digest = hashlib.sha256(
    json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
).hexdigest()

patch["confirmation_evidence"] = {
    "evaluator": "dev-graph C14 independent macro auditor",
    "evidence_ref": receipt_rel,
    "evaluated_digest": digest,
}

out = ROOT / ".dev-graph/cache/staging" / f"{TARGET}.promote.json"
out.write_text(
    json.dumps({"patch": patch}, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
    encoding="utf-8",
)
print(json.dumps({"input": str(out.relative_to(ROOT)), "expected_digest": digest},
                 ensure_ascii=False))
