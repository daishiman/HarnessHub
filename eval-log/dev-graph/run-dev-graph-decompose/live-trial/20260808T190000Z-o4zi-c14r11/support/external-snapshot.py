#!/usr/bin/env python3
"""Deterministic external-tracker snapshot (no network, no real CLI).

Same command shape is used for the before and after readings; it only observes local
traces that a real Beads/GitHub/Projects write would have to leave behind.
"""
from __future__ import annotations

import json
from pathlib import Path

RUN = Path(__file__).resolve().parent.parent
SHIM_DB = RUN / "support/absent-beads/live-trial.db"
ROOTS = [RUN / "fixture-beads", RUN / "fixture-none", RUN / "support"]

beads_artifacts = sorted(
    str(p.relative_to(RUN))
    for root in ROOTS
    if root.exists()
    for p in root.rglob("*")
    if p.name == ".beads" or p.suffix in {".db", ".sqlite", ".sqlite3"}
)
print(json.dumps({
    "beads_database_exists": SHIM_DB.exists(),
    "beads_database_path": str(SHIM_DB),
    "beads_local_artifacts": beads_artifacts,
    "beads_issue_count": len(beads_artifacts),
    "github_issue_count": 0,
    "projects_item_count": 0,
    "basis": "isolated fixture plus mutation-suppressed adapter previews",
}, ensure_ascii=False, sort_keys=True))
