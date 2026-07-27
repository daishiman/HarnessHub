#!/usr/bin/env python3
# /// script
# name: build-graph-store
# purpose: Create the canonical empty graph store through one validated, atomic, non-destructive writer.
# inputs: ["argv: --repo-root PATH [--dry-run]"]
# outputs: ["stdout: JSON initialization receipt"]
# requires-python = ">=3.10"
# dependencies: ["validate-graph-schema.py", "node_transaction.py", "_common.py"]
# contexts: [A, C, E]
# network: false
# write-scope: the caller repository .dev-graph/state/graph.json only
# ///
"""Bootstrap ``.dev-graph/state/graph.json`` without bypassing the C10 guard.

The node writer intentionally requires an existing graph.  Initialization therefore
needs a smaller writer whose only legal transition is "missing -> canonical empty
store".  Existing valid stores are preserved byte-for-byte; malformed or foreign
stores fail closed instead of being repaired implicitly.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import sys
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from _common import ContractError, atomic_json, contained, dump, load_json  # noqa: E402
from node_transaction import graph_operation_lock  # noqa: E402

CONFIG_RELATIVE = Path(".dev-graph") / "config.json"
GRAPH_RELATIVE = Path(".dev-graph") / "state" / "graph.json"
CANONICAL_GRAPH_KEYS = frozenset(
    {"schema_version", "repository_id", "graph_revision", "nodes"}
)

_spec = importlib.util.spec_from_file_location(
    "_dev_graph_store_validator",
    HERE / "validate-graph-schema.py",
)
assert _spec and _spec.loader
_validator = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_validator)


def _digest(document: dict[str, Any]) -> str:
    encoded = json.dumps(
        document,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return "sha256:" + hashlib.sha256(encoded).hexdigest()


def _repository_id(root: Path) -> str:
    config_path = contained(root / CONFIG_RELATIVE, root, must_exist=True)
    config = load_json(config_path)
    if not isinstance(config, dict):
        raise ContractError(f"repo config must be an object: {config_path}")
    repository_id = config.get("repository_id")
    if not isinstance(repository_id, str) or not repository_id:
        raise ContractError("repo config omits repository_id")
    configured_graph = (config.get("local_state") or {}).get("graph")
    if configured_graph != GRAPH_RELATIVE.as_posix():
        raise ContractError(
            "repo config local_state.graph must name the canonical "
            f"{GRAPH_RELATIVE.as_posix()}"
        )
    return repository_id


def _canonical_empty(repository_id: str) -> dict[str, Any]:
    return {
        "schema_version": "1.0.0",
        "repository_id": repository_id,
        "graph_revision": 0,
        "nodes": [],
    }


def _validate_existing(
    document: Any,
    *,
    root: Path,
    repository_id: str,
) -> list[str]:
    violations: list[str] = []
    if not isinstance(document, dict):
        return ["graph store must be an object"]
    if set(document) != CANONICAL_GRAPH_KEYS:
        violations.append(
            "graph store keys must be exactly "
            + ", ".join(sorted(CANONICAL_GRAPH_KEYS))
        )
    if document.get("schema_version") != "1.0.0":
        violations.append("schema_version must be 1.0.0")
    if document.get("repository_id") != repository_id:
        violations.append("repository_id must match repo config")
    revision = document.get("graph_revision")
    if not isinstance(revision, int) or isinstance(revision, bool) or revision < 0:
        violations.append("graph_revision must be a non-negative integer")
    nodes = document.get("nodes")
    if not isinstance(nodes, list) or not all(isinstance(node, dict) for node in nodes):
        violations.append("nodes must be an array of objects")
    elif not violations:
        violations.extend(
            json.dumps(item, ensure_ascii=False, sort_keys=True)
            for item in _validator.validate(nodes, repo_root=root)
        )
    return violations


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    root = Path(args.repo_root).expanduser().resolve(strict=True)
    repository_id = _repository_id(root)
    graph_path = contained(root / GRAPH_RELATIVE, root, must_exist=False)
    graph_path.parent.mkdir(parents=True, exist_ok=True)

    with graph_operation_lock(graph_path, exclusive=True):
        if graph_path.exists():
            existing = load_json(graph_path)
            violations = _validate_existing(
                existing,
                root=root,
                repository_id=repository_id,
            )
            if violations:
                dump(
                    {
                        "graph": str(graph_path),
                        "action": "rejected_existing",
                        "changed": False,
                        "valid": False,
                        "violations": violations,
                    }
                )
                return 1
            document = existing
            action = "preserved_existing"
            changed = False
        else:
            document = _canonical_empty(repository_id)
            action = "would_create" if args.dry_run else "created"
            changed = not args.dry_run
            if not args.dry_run:
                atomic_json(graph_path, document)

    dump(
        {
            "graph": str(graph_path),
            "repository_id": repository_id,
            "action": action,
            "changed": changed,
            "dry_run": args.dry_run,
            "valid": True,
            "violations": [],
            "graph_revision": document["graph_revision"],
            "digest": _digest(document),
        }
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ContractError, OSError, json.JSONDecodeError) as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(2)
