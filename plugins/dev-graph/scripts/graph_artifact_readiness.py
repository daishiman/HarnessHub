"""Markdown artifact body checks used by the C11 graph validator."""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from _common import ContractError

HEADING = re.compile(r"^(#{1,6})\s+(.+?)\s*#*\s*$")
ANGLE_PLACEHOLDER = re.compile(r"<[^>\n]+>")


def _markdown_shape(
    path: Path,
) -> tuple[list[str], list[str], list[tuple[int, int, str]]]:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError as exc:
        raise ContractError(f"cannot read artifact {path}: {exc}") from exc
    start = 0
    if lines and lines[0].strip() == "---":
        try:
            start = next(
                index + 1
                for index, line in enumerate(lines[1:], 1)
                if line.strip() == "---"
            )
        except StopIteration as exc:
            raise ContractError(f"artifact frontmatter is not terminated: {path}") from exc

    visible_lines = list(lines)
    headings: list[tuple[int, int, str]] = []
    fence: str | None = None
    for index in range(start, len(lines)):
        marker = lines[index].lstrip()[:3]
        if fence is not None:
            visible_lines[index] = ""
            if marker == fence:
                fence = None
            continue
        if marker in {"```", "~~~"}:
            visible_lines[index] = ""
            fence = marker
            continue
        match = HEADING.match(lines[index])
        if match:
            visible_lines[index] = ""
            headings.append((index, len(match.group(1)), match.group(2).strip()))
    return lines, visible_lines, headings


def markdown_sections_of(
    path: Path, *, include_subsections: bool = False
) -> dict[str, str]:
    """Return ATX heading bodies without frontmatter, fences, or heading text."""
    lines, visible_lines, headings = _markdown_shape(path)
    sections: dict[str, str] = {}
    for offset, (index, level, title) in enumerate(headings):
        boundary = next(
            (
                candidate[0]
                for candidate in headings[offset + 1 :]
                if not include_subsections or candidate[1] <= level
            ),
            len(lines),
        )
        sections[title] = "\n".join(visible_lines[index + 1 : boundary]).strip()
    return sections


def _descendants_of(path: Path) -> dict[str, list[str]]:
    _, _, headings = _markdown_shape(path)
    descendants: dict[str, list[str]] = {}
    for offset, (_, level, title) in enumerate(headings):
        nested: list[str] = []
        for _, candidate_level, candidate_title in headings[offset + 1 :]:
            if candidate_level <= level:
                break
            nested.append(candidate_title)
        descendants[title] = nested
    return descendants


def _template_placeholders(
    kind: str, template_contract: dict[str, Any], template_root: Path
) -> dict[str, set[str]]:
    artifact_contract = (template_contract.get("artifacts") or {}).get(kind) or {}
    template = artifact_contract.get("template")
    if not isinstance(template, str):
        return {}
    sections = markdown_sections_of(template_root / template)
    sentinels = [
        token for token in template_contract.get("placeholder_tokens", []) if token != "<"
    ]
    return {
        section: set(ANGLE_PLACEHOLDER.findall(body))
        | {token for token in sentinels if token in body}
        for section, body in sections.items()
    }


def missing_required_headings(
    artifact: Path,
    kind: str,
    template_contract: dict[str, Any],
) -> list[str]:
    """List required sections whose heading is entirely absent from the body.

    Distinct from placeholder_sections: that function only inspects headings
    that already exist. A required heading that was never written (e.g. a
    template revision adds a section an older artifact predates) is invisible
    to placeholder_sections because it never enters `sections`/`direct_invalid`.
    """
    artifact_contract = (template_contract.get("artifacts") or {}).get(kind) or {}
    required = artifact_contract.get("required_sections") or []
    if not isinstance(required, list):
        return []
    present = set(markdown_sections_of(artifact))
    return sorted(section for section in required if section not in present)


def placeholder_sections(
    artifact: Path,
    kind: str,
    template_contract: dict[str, Any],
    template_root: Path,
) -> list[str]:
    """List present required sections that contain no substantive prose."""
    artifact_contract = (template_contract.get("artifacts") or {}).get(kind) or {}
    required = artifact_contract.get("required_sections") or []
    if not isinstance(required, list):
        return []

    sections = markdown_sections_of(artifact)
    descendants = _descendants_of(artifact)
    markers = _template_placeholders(kind, template_contract, template_root)
    sentinels = [
        token for token in template_contract.get("placeholder_tokens", []) if token != "<"
    ]
    direct_invalid: dict[str, bool] = {}
    for section, body in sections.items():
        scalar = re.sub(r"[\s`*_>#\-\[\]():.]+", "", body)
        sentinel_only = any(scalar.casefold() == token.casefold() for token in sentinels)
        direct_invalid[section] = (
            not body
            or any(marker in body for marker in markers.get(section, set()))
            or sentinel_only
        )

    def substantive(section: str) -> bool:
        if not direct_invalid.get(section, True):
            return True
        if sections.get(section):
            return False
        return any(
            substantive(child)
            for child in descendants.get(section, [])
        )

    return sorted(
        section
        for section in required
        if section in direct_invalid and not substantive(section)
    )
