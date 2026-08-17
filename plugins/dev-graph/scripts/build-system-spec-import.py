#!/usr/bin/env python3
# /// script
# name: build-system-spec-import
# purpose: Build schema-valid C02 input and source-derived Markdown bodies from confirmed system-spec artifacts.
# inputs: ["argv: --repo-root PATH --out-dir PATH [--contract PATH]"]
# outputs: ["out-dir: architecture.node.json, specification.node.json, architecture.body.md, specification.body.md"]
# requires-python = ">=3.11"
# network: false
# write-scope: caller-repo/.dev-graph/tmp only
# ///
"""Build, but never write, C02 imports from a structural import contract.

The contract names the stable system-spec interface and graph-node shape only.
The Markdown body is always read from the confirmed caller-repository artifact
named by each node's ``source_artifact``; product prose in a contract is
rejected.  Source lineage remains bound to the source bytes while local links
are rebased to preserve their targets at the node destination.  The caller
remains responsible for invoking C02 ``upsert-node.py``.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit, urlunsplit


SCRIPT_ROOT = Path(__file__).resolve().parents[1]
HARNESS_MANIFEST = SCRIPT_ROOT.parent / "system-spec-harness" / ".claude-plugin" / "plugin.json"
DEFAULT_CONTRACT = SCRIPT_ROOT / "references" / "system-spec-import-contract.json"
INLINE_LINK_RE = re.compile(
    r"(?P<prefix>!?\[[^\]\n]*\]\()"
    r"(?P<destination><[^>\n]+>|[^\s)\n]+)"
    r"(?P<suffix>(?:\s+(?:\"[^\"]*\"|'[^']*'|\([^)]*\)))?\))"
)
REFERENCE_LINK_RE = re.compile(
    r"^(?P<prefix>\s{0,3}\[[^\]]+\]:\s*)"
    r"(?P<destination><[^>\n]+>|\S+)"
    r"(?P<suffix>.*)$"
)
URI_SCHEME_RE = re.compile(r"^[A-Za-z][A-Za-z0-9+.-]*:")

def utc_now() -> str:
    """Return the actual import time in the graph's canonical UTC form."""
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"cannot read JSON {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise ValueError(f"JSON object required: {path}")
    return value


def require_string(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value:
        raise ValueError(f"contract requires non-empty string: {label}")
    return value


def require_list(value: Any, label: str) -> list[str]:
    if not isinstance(value, list) or not all(isinstance(item, str) and item for item in value):
        raise ValueError(f"contract requires string list: {label}")
    return value


def require_file(root: Path, relative: str) -> Path:
    path = (root / relative).resolve()
    try:
        path.relative_to(root)
    except ValueError as exc:
        raise ValueError(f"artifact path escapes repo root: {relative}") from exc
    if not path.is_file():
        raise ValueError(f"confirmed artifact is missing: {relative}")
    return path


def _rebase_destination(
    raw: str, *, source_file: Path, destination_file: Path, repo_root: Path
) -> str:
    """Preserve a local link's target while moving its containing Markdown."""
    wrapped = raw.startswith("<") and raw.endswith(">")
    value = raw[1:-1] if wrapped else raw
    if not value or value.startswith(("#", "/", "//")) or URI_SCHEME_RE.match(value):
        return raw
    parsed = urlsplit(value)
    if not parsed.path:
        return raw
    target = (source_file.parent / parsed.path).resolve()
    try:
        target.relative_to(repo_root)
    except ValueError as exc:
        raise ValueError(
            f"source Markdown link escapes repo root: {source_file}: {value}"
        ) from exc
    if not target.exists():
        raise ValueError(f"source Markdown link target is missing: {source_file}: {value}")
    relative = Path(os.path.relpath(target, start=destination_file.parent)).as_posix()
    rebased = urlunsplit(("", "", relative, parsed.query, parsed.fragment))
    return f"<{rebased}>" if wrapped else rebased


def _rewrite_non_code_span(
    span: str, *, source_file: Path, destination_file: Path, repo_root: Path
) -> str:
    def replace_inline(match: re.Match[str]) -> str:
        destination = _rebase_destination(
            match.group("destination"),
            source_file=source_file,
            destination_file=destination_file,
            repo_root=repo_root,
        )
        return f'{match.group("prefix")}{destination}{match.group("suffix")}'

    rewritten = INLINE_LINK_RE.sub(replace_inline, span)
    definition = REFERENCE_LINK_RE.match(rewritten)
    if not definition:
        return rewritten
    destination = _rebase_destination(
        definition.group("destination"),
        source_file=source_file,
        destination_file=destination_file,
        repo_root=repo_root,
    )
    return f'{definition.group("prefix")}{destination}{definition.group("suffix")}'


def rebase_markdown_links(
    text: str, *, source_file: Path, destination_file: Path, repo_root: Path
) -> str:
    """Rebase local Markdown links, leaving fenced/inline code and URIs intact."""
    output: list[str] = []
    fence_char: str | None = None
    fence_width = 0
    for line in text.splitlines(keepends=True):
        stripped = line.lstrip()
        fence = re.match(r"(`{3,}|~{3,})", stripped)
        if fence:
            marker = fence.group(1)
            if fence_char is None:
                fence_char, fence_width = marker[0], len(marker)
            elif marker[0] == fence_char and len(marker) >= fence_width:
                fence_char, fence_width = None, 0
            output.append(line)
            continue
        if fence_char is not None:
            output.append(line)
            continue

        pieces = re.split(r"(`+)", line)
        in_code = False
        code_width = 0
        for index, piece in enumerate(pieces):
            if piece.startswith("`") and set(piece) == {"`"}:
                width = len(piece)
                if not in_code:
                    in_code, code_width = True, width
                elif width == code_width:
                    in_code, code_width = False, 0
                continue
            if not in_code:
                pieces[index] = _rewrite_non_code_span(
                    piece,
                    source_file=source_file,
                    destination_file=destination_file,
                    repo_root=repo_root,
                )
        output.append("".join(pieces))
    return "".join(output)


def markdown_body(
    path: Path, *, destination_file: Path, repo_root: Path
) -> str:
    """Return substantive Markdown with destination-safe local links.

    C02 owns the destination frontmatter, so copying source frontmatter into
    ``--body-file`` would create a nested envelope.  Source prose is preserved;
    local links are rebased so they keep pointing at the same repository files
    after the body moves to the contract's destination path.  Source lineage
    continues to hash the untouched source artifact bytes.
    """
    text = path.read_text(encoding="utf-8")
    if text.startswith("---\n"):
        marker = text.find("\n---\n", 4)
        if marker < 0:
            raise ValueError(f"source Markdown frontmatter is not terminated: {path}")
        text = text[marker + 5 :].lstrip("\n")
    if not text.strip() or not any(line.startswith("#") for line in text.splitlines()):
        raise ValueError(f"source Markdown body must be substantive and headed: {path}")
    return rebase_markdown_links(
        text.rstrip() + "\n",
        source_file=path,
        destination_file=destination_file,
        repo_root=repo_root,
    )


def node_from_contract(
    *, node: dict[str, Any], source_path: str, source_digest: str,
    evidence_path: str, evidence_digest: str, version: str, imported_at: str,
) -> dict[str, Any]:
    kind = require_string(node.get("artifact_kind"), "node.artifact_kind")
    node_id = require_string(node.get("graph_node_id"), "node.graph_node_id")
    file_path = require_string(node.get("file_path"), "node.file_path")
    title = require_string(node.get("title"), "node.title")
    subtypes = require_list(node.get("artifact_subtypes"), "node.artifact_subtypes")
    architecture_refs = require_list(node.get("architecture_refs"), "node.architecture_refs")
    purpose = require_string(node.get("purpose"), "node.purpose")
    goal = require_string(node.get("goal"), "node.goal")
    scope_in = require_list(node.get("scope_in"), "node.scope_in")
    acceptance = require_list(node.get("acceptance"), "node.acceptance")
    classification_reason = require_string(node.get("classification_reason"), "node.classification_reason")
    return {
        "graph_node_id": node_id,
        "artifact_kind": kind,
        "artifact_subtypes": subtypes,
        "title": title,
        "project_id": "system-spec-import",
        "domain": "system-spec",
        "status": "active",
        "owners": ["system-spec-harness"],
        "tags": ["system-spec", "source-lineage", "imported"],
        "priority": None,
        "start_date": None,
        "target_date": None,
        "iteration": None,
        "created_at": imported_at,
        "updated_at": imported_at,
        "depends_on": [],
        "related_nodes": [],
        "resource_scope": [source_path, evidence_path],
        "purpose": purpose,
        "goal": goal,
        "scope_in": scope_in,
        "scope_out": ["confirmed artifacts are not rewritten by this adapter"],
        "acceptance": acceptance,
        "architecture_refs": architecture_refs,
        "parent_feature": None,
        "feature_package_id": None,
        "phase_ref": None,
        "file_path": file_path,
        "template_id": kind,
        "template_version": "1.0.0",
        "confirmation_status": "confirmed",
        "evaluation_status": "pass",
        "confirmation_evidence": {
            "evaluator": "system-spec-harness/assign-system-spec-completeness-evaluator",
            "evidence_ref": evidence_path,
            "evaluated_digest": evidence_digest,
        },
        "source_lineage": {
            "origin_kind": "system-spec-harness",
            "source_plugin": "system-spec-harness",
            "source_path": source_path,
            "source_version": version,
            "source_digest": source_digest,
            "imported_at": imported_at,
        },
        "classification_confidence": 1.0,
        "classification_reason": classification_reason,
        "classification_candidates": [{"artifact_kind": kind, "candidate_path": file_path, "confidence": 1.0}],
        "issue_linkage": None,
        "tracker_binding": "none",
        "beads_linkage": None,
        "github_publication": {"mode": "local_only", "project_aliases": [], "labels": [], "milestone": None},
        "github_project_linkages": [],
        "pull_request_linkages": [],
        "execution_contexts": [],
        "completion_evidence": {
            "policy": "manual", "status": "done", "source": "manual",
            "completed_at": imported_at, "reconciled_at": imported_at,
            "evidence_refs": [evidence_path],
        },
        "implementation_readiness": {"status": "complete", "missing_sections": [], "checked_at": imported_at},
    }


def write(path: Path, value: str | dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(value, dict):
        path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    else:
        path.write_text(value.rstrip() + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", required=True, type=Path)
    parser.add_argument("--out-dir", required=True, type=Path)
    parser.add_argument("--contract", type=Path, default=DEFAULT_CONTRACT)
    args = parser.parse_args()
    root = args.repo_root.resolve()
    out = args.out_dir.resolve() if args.out_dir.is_absolute() else (root / args.out_dir).resolve()
    if root not in out.parents and out != root:
        raise SystemExit("--out-dir must be contained by --repo-root")
    contract_path = args.contract.resolve() if args.contract.is_absolute() else (root / args.contract).resolve()
    try:
        contract = load_json(contract_path)
        artifacts = contract.get("artifacts")
        nodes = contract.get("nodes")
        if not isinstance(artifacts, dict) or not isinstance(nodes, dict):
            raise ValueError("contract requires artifacts and nodes objects")
        if "bodies" in contract:
            raise ValueError("contract must not contain bodies; node source_artifact is the body authority")
        artifact_paths = {key: require_string(value, f"artifacts.{key}") for key, value in artifacts.items()}
        artifact_files = {key: require_file(root, path) for key, path in artifact_paths.items()}
        evidence_key = require_string(contract.get("evidence_artifact"), "evidence_artifact")
        evidence_path = artifact_paths[evidence_key]
        report = artifact_files[evidence_key]
        if load_json(report).get("verdict") != "PASS":
            raise ValueError("confirmed evaluator report verdict must be PASS")
        version = str(load_json(HARNESS_MANIFEST).get("version") or "")
        if not version:
            raise ValueError("system-spec-harness manifest omits version")
    except (KeyError, ValueError) as exc:
        raise SystemExit(f"[build-system-spec-import] FAIL: {exc}")

    evidence_digest = sha256(report)
    imported_at = utc_now()
    generated: dict[str, dict[str, Any]] = {}
    body_sources: dict[str, Path] = {}
    try:
        for name, node in nodes.items():
            if not isinstance(node, dict):
                raise ValueError(f"contract node object required: {name}")
            source_key = require_string(node.get("source_artifact"), f"nodes.{name}.source_artifact")
            source_path = artifact_paths[source_key]
            source = artifact_files[source_key]
            body_sources[name] = source
            generated[name] = node_from_contract(
                node=node,
                source_path=source_path,
                source_digest=sha256(source),
                evidence_path=evidence_path,
                evidence_digest=evidence_digest,
                version=version,
                imported_at=imported_at,
            )
        output_order = require_list(contract.get("output_order"), "output_order")
        for name in output_order:
            if name not in generated:
                raise ValueError(f"output_order references unknown node: {name}")
            write(out / f"{name}.node.json", generated[name])
            destination = (root / generated[name]["file_path"]).resolve()
            write(
                out / f"{name}.body.md",
                markdown_body(body_sources[name], destination_file=destination, repo_root=root),
            )
    except (KeyError, ValueError) as exc:
        raise SystemExit(f"[build-system-spec-import] FAIL: {exc}")
    print(json.dumps({"out_dir": str(out), "node_ids": [generated[name]["graph_node_id"] for name in output_order]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
