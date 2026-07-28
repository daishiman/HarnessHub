"""Canonical Markdown body resolution and rendering for C02 node upserts."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from _common import ContractError, contained


TEMPLATE_BY_KIND = {
    "issue": "issue.md",
    "task": "task.md",
    "specification": "specification.md",
    "architecture": "architecture.md",
    "document": "document.md",
    "feature": "feature.md",
}
BODY_SOURCE_FROM_FILE = "from_file"
BODY_SOURCE_FROM_INPUT = "from_input"
BODY_SOURCE_PRESERVED = "preserved"
BODY_SOURCE_TEMPLATE = "template"
BODY_SOURCE_REGENERATED = "regenerated"


def _body_from_artifact(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        raise ContractError(f"existing artifact has no frontmatter: {path}")
    marker = text.find("\n---\n", 4)
    if marker < 0:
        raise ContractError(f"existing artifact frontmatter is not terminated: {path}")
    return text[marker + 5 :].lstrip("\n")


def _existing_body(artifact: Path, *, tolerate_broken: bool) -> str | None:
    """Return the body of an existing artifact, or None if it does not exist."""
    if not artifact.is_file():
        return None
    try:
        return _body_from_artifact(artifact)
    except ContractError:
        if tolerate_broken:
            return None
        raise


def _template_body(kind: str, plugin_root: Path) -> str:
    return (plugin_root / "templates" / TEMPLATE_BY_KIND[kind]).read_text(
        encoding="utf-8"
    )


def _body_file_text(body_file: str, root: Path) -> str:
    source = Path(body_file)
    source = source if source.is_absolute() else root / source
    return contained(source, root, must_exist=True).read_text(encoding="utf-8")


def resolve_body(
    payload: dict[str, Any],
    body_file: str | None,
    root: Path,
    artifact: Path,
    kind: str,
    *,
    regenerate: bool,
    plugin_root: Path,
) -> tuple[str, str, int | None]:
    """Resolve body, body provenance, and replaced line count."""
    artifact_exists = artifact.is_file()
    preserved = _existing_body(artifact, tolerate_broken=regenerate)

    if body_file:
        value = _body_file_text(body_file, root)
        origin = BODY_SOURCE_FROM_FILE
    elif "body" in payload:
        value = payload["body"]
        if not isinstance(value, str):
            raise ContractError("input body must be a string")
        origin = BODY_SOURCE_FROM_INPUT
    elif regenerate:
        value = _template_body(kind, plugin_root)
        origin = BODY_SOURCE_REGENERATED if artifact_exists else BODY_SOURCE_TEMPLATE
    elif preserved is not None:
        value = preserved
        origin = BODY_SOURCE_PRESERVED
    else:
        value = _template_body(kind, plugin_root)
        origin = BODY_SOURCE_TEMPLATE

    if value.lstrip().startswith("---"):
        raise ContractError(
            "body must not contain YAML frontmatter; upsert-node owns frontmatter"
        )
    normalized = value.rstrip() + "\n"
    replaced_lines = None
    if preserved is not None:
        before = preserved.rstrip() + "\n"
        if before != normalized:
            replaced_lines = len(before.splitlines())
    return normalized, origin, replaced_lines


def artifact_bytes(
    node: dict[str, Any],
    body: str,
    schema: dict[str, Any],
) -> bytes:
    properties = schema.get("properties") if isinstance(schema, dict) else None
    order = list(properties) if isinstance(properties, dict) else list(node)
    keys = [key for key in order if key in node] + sorted(set(node) - set(order))
    lines = ["---"]
    lines.extend(
        f"{key}: "
        f"{json.dumps(node[key], ensure_ascii=False, sort_keys=True, separators=(',', ':'))}"
        for key in keys
    )
    lines.extend(["---", "", body.rstrip(), ""])
    return "\n".join(lines).encode("utf-8")
