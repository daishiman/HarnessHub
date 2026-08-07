#!/usr/bin/env python3
# /// script
# name: build-knowledge-order
# version: 0.1.0
# purpose: knowledge-catalog の depends_on DAG から、C03 が消費する file ごとの安定した前提先優先 rank を決定論的に組み立てる。catalog を変更せず、ネットワークや出力書込みを行わない。
# inputs:
#   - catalog_path: knowledge-catalog.json の Path
# outputs:
#   - file -> zero-based topological rank
#   - raises: KnowledgeOrderError (入力形式、未知参照、循環)
# contexts: [E]
# network: false
# write-scope: none
# dependencies: []
# requires-python: ">=3.9"
# ///
"""Knowledge-catalog の precedence DAG を C03 が決定論的に消費する補助関数。"""
from __future__ import annotations

import heapq
import json
from pathlib import Path


class KnowledgeOrderError(ValueError):
    """knowledge-catalog が C14 の順序契約を満たさないときに送出する。"""


def topological_file_order(catalog_path: Path) -> dict[str, int]:
    """``depends_on`` を前提先優先で安定ソートした ``file -> rank`` を返す。

    ``A depends_on B`` は B を A より先に消費する。ready node の
    ``knowledge_id`` 昇順は ``validate-knowledge-graph.py --profile knowledge
    --order`` と同じ決定規則であり、C03 が C14 の正本 DAG を直接消費する。
    """
    try:
        raw = json.loads(catalog_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise KnowledgeOrderError(f"knowledge catalog を読めない: {catalog_path}") from exc

    entries = raw.get("entries") if isinstance(raw, dict) else None
    if not isinstance(entries, list):
        raise KnowledgeOrderError("knowledge catalog の entries が配列でない")

    files: dict[str, str] = {}
    depends_on: dict[str, list[str]] = {}
    for entry in entries:
        if not isinstance(entry, dict):
            raise KnowledgeOrderError("knowledge catalog entry が object でない")
        knowledge_id, filename = entry.get("knowledge_id"), entry.get("file")
        deps = entry.get("depends_on", [])
        if not isinstance(knowledge_id, str) or not knowledge_id:
            raise KnowledgeOrderError("knowledge_id が空または文字列でない")
        if not isinstance(filename, str) or not filename:
            raise KnowledgeOrderError(f"{knowledge_id}: file が空または文字列でない")
        if not isinstance(deps, list) or not all(isinstance(dep, str) for dep in deps):
            raise KnowledgeOrderError(f"{knowledge_id}: depends_on が文字列配列でない")
        if knowledge_id in files or filename in files.values():
            raise KnowledgeOrderError(f"knowledge_id または file が重複: {knowledge_id}/{filename}")
        files[knowledge_id] = filename
        depends_on[knowledge_id] = deps

    unknown = sorted(
        f"{knowledge_id}->{dependency}"
        for knowledge_id, dependencies in depends_on.items()
        for dependency in dependencies
        if dependency not in files
    )
    if unknown:
        raise KnowledgeOrderError(f"depends_on の参照先が無い: {', '.join(unknown)}")

    indegree = {knowledge_id: len(dependencies) for knowledge_id, dependencies in depends_on.items()}
    dependents = {knowledge_id: [] for knowledge_id in files}
    for knowledge_id, dependencies in depends_on.items():
        for dependency in dependencies:
            dependents[dependency].append(knowledge_id)

    ready = [knowledge_id for knowledge_id, degree in indegree.items() if degree == 0]
    heapq.heapify(ready)
    ordered: list[str] = []
    while ready:
        knowledge_id = heapq.heappop(ready)
        ordered.append(knowledge_id)
        for dependent in sorted(dependents[knowledge_id]):
            indegree[dependent] -= 1
            if indegree[dependent] == 0:
                heapq.heappush(ready, dependent)

    if len(ordered) != len(files):
        raise KnowledgeOrderError("depends_on に循環がある")
    return {files[knowledge_id]: rank for rank, knowledge_id in enumerate(ordered)}
