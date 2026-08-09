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


def _conditional_trigger(kind: str, node: dict[str, Any] | None) -> str | None:
    """Identify which conditional_required_sections family a node belongs to.

    system-dev-planner の task は origin_kind でしか見分けられない: frontmatter の
    template_id/template_version は全世代で同一 ("task"/"1.0.0") のままで、生成元
    テンプレートの世代 (HarnessHub-yzv0 実測: 20 feature 中 17 が軽量3見出し、
    3 がフル19見出し。phase_ref は世代と相関しない) を区別する情報を持たない。
    """
    if not node:
        return None
    origin_kind = (node.get("source_lineage") or {}).get("origin_kind")
    if origin_kind == "system-spec-harness" and kind in {
        "specification",
        "architecture",
    }:
        return "system_spec_harness"
    if kind != "task":
        return None
    if origin_kind == "system-dev-planner":
        return "system_development"
    return None


def _required_section_variants(
    kind: str,
    node: dict[str, Any] | None,
    artifact_contract: dict[str, Any],
) -> list[list[str]]:
    base = artifact_contract.get("required_sections") or []
    base_variant = [base] if isinstance(base, list) else []
    conditional = artifact_contract.get("conditional_required_sections") or {}
    trigger = _conditional_trigger(kind, node)
    if trigger is None or not isinstance(conditional, dict):
        return base_variant
    variants = [
        sections
        for name, sections in conditional.items()
        if isinstance(sections, list) and (name == trigger or name.startswith(f"{trigger}_"))
    ]
    return variants or base_variant


def missing_required_headings(
    artifact: Path,
    kind: str,
    template_contract: dict[str, Any],
    node: dict[str, Any] | None = None,
) -> list[str]:
    """List required sections whose heading is entirely absent from the body.

    Distinct from placeholder_sections: that function only inspects headings
    that already exist. A required heading that was never written (e.g. a
    template revision adds a section an older artifact predates) is invisible
    to placeholder_sections because it never enters `sections`/`direct_invalid`.

    ``node`` を渡すと、conditional_required_sections に登録された代替 section 集合
    (例: system-dev-planner の複数テンプレート世代) のうち、実体と最も一致する
    variant で判定する。1 つでも完全一致すれば missing なしとして扱う (fail-closed
    ではなく既知の正当な世代差を許容する側へ倒す)。
    """
    artifact_contract = (template_contract.get("artifacts") or {}).get(kind) or {}
    variants = _required_section_variants(kind, node, artifact_contract)
    if not variants:
        return []
    present = set(markdown_sections_of(artifact))
    best: list[str] | None = None
    for required in variants:
        missing = sorted(section for section in required if section not in present)
        if not missing:
            return []
        if best is None or len(missing) < len(best):
            best = missing
    return best or []


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
