"""Machine checks for the Hub route-surface information-design closure."""

from __future__ import annotations

import re
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
APP_ROOT = REPO_ROOT / "apps/hub/src/app"
INVENTORY = REPO_ROOT / "docs/screen-inventory.md"
SHEET_GLOB = "docs/features/*/information-design/*.md"

BEGIN_MARKER = "<!-- ROUTE_SURFACES_BEGIN -->"
END_MARKER = "<!-- ROUTE_SURFACES_END -->"
PROFILE_RE = re.compile(
    r"^Surface: `(?P<surface>[^`]+)` / route: `(?P<route>[^`]+)`。",
    re.MULTILINE,
)

ALLOWED_DENSITIES = {"comfortable", "balanced", "compact"}
ALLOWED_PATTERNS = {
    "table",
    "card-collection",
    "form",
    "wizard",
    "content",
    "detail",
    "board",
    "stage-selector+card-collection",
    "chart+table",
    "chart+card-collection",
    "definition-list+form",
    "settings-sections",
    "timeline-stepper+form",
    "grid+list",
}
ALLOWED_STICKY_POLICIES = {
    "public-header",
    "shell+screen",
    "shell+screen+filter",
    "shell+screen+table",
    "shell+screen+filter+table",
    "shell+screen+stepper",
}


def _without_code_ticks(value: str) -> str:
    value = value.strip()
    if value.startswith("`") and value.endswith("`"):
        return value[1:-1]
    return value


def _inventory_rows() -> list[dict[str, str]]:
    text = INVENTORY.read_text(encoding="utf-8")
    assert text.count(BEGIN_MARKER) == 1
    assert text.count(END_MARKER) == 1
    table = text.split(BEGIN_MARKER, 1)[1].split(END_MARKER, 1)[0]
    lines = [line for line in table.splitlines() if line.startswith("|")]
    assert len(lines) >= 3, "route surface table is missing or empty"

    headers = [cell.strip() for cell in lines[0].strip("|").split("|")]
    rows: list[dict[str, str]] = []
    for line in lines[2:]:
        cells = [_without_code_ticks(cell) for cell in line.strip("|").split("|")]
        assert len(cells) == len(headers), f"malformed inventory row: {line}"
        rows.append(dict(zip(headers, cells, strict=True)))
    return rows


def _implemented_routes() -> list[str]:
    routes: list[str] = []
    for page in APP_ROOT.rglob("page.tsx"):
        relative_parent = page.relative_to(APP_ROOT).parent
        segments = [
            segment
            for segment in relative_parent.parts
            if not (segment.startswith("(") and segment.endswith(")"))
        ]
        routes.append("/" + "/".join(segments) if segments else "/")
    return routes


def _repo_path(relative_path: str) -> Path:
    assert not relative_path.startswith("/"), relative_path
    return REPO_ROOT / relative_path


def test_current_inventory_is_a_bijection_with_implemented_routes() -> None:
    current = [row for row in _inventory_rows() if row["State"] == "current"]
    inventory_routes = [row["Route"] for row in current]
    surface_ids = [row["Surface ID"] for row in current]
    implemented_routes = _implemented_routes()

    assert len(inventory_routes) == len(set(inventory_routes)), "duplicate current route"
    assert len(surface_ids) == len(set(surface_ids)), "duplicate current surface ID"
    assert len(implemented_routes) == len(set(implemented_routes)), "duplicate page route"
    assert set(inventory_routes) == set(implemented_routes)
    assert len(current) == 26


def test_surface_profiles_have_complete_controlled_fields() -> None:
    rows = _inventory_rows()
    required = {
        "State",
        "Surface ID",
        "Route",
        "Current role / capability",
        "Task mode",
        "Density",
        "Wide",
        "Middle",
        "Narrow",
        "Sticky policy",
        "Information-design sheet",
        "Test evidence",
        "Decision ref",
    }

    for row in rows:
        assert set(row) == required
        assert all(row[field] for field in required), row["Surface ID"]
        assert row["State"] in {"current", "planned"}
        assert row["Density"] in ALLOWED_DENSITIES
        assert row["Wide"] in ALLOWED_PATTERNS
        assert row["Middle"] in ALLOWED_PATTERNS
        assert row["Narrow"] in ALLOWED_PATTERNS
        assert row["Sticky policy"] in ALLOWED_STICKY_POLICIES
        if row["State"] == "planned":
            assert row["Decision ref"].startswith("HarnessHub-")


def test_current_surfaces_reach_existing_sheet_and_test_evidence() -> None:
    current = [row for row in _inventory_rows() if row["State"] == "current"]
    for row in current:
        sheet = _repo_path(row["Information-design sheet"])
        evidence = _repo_path(row["Test evidence"])
        assert sheet.is_file(), f"missing sheet for {row['Surface ID']}: {sheet}"
        assert evidence.is_file(), f"missing evidence for {row['Surface ID']}: {evidence}"

        profiles = PROFILE_RE.findall(sheet.read_text(encoding="utf-8"))
        assert profiles == [(row["Surface ID"], row["Route"])], (
            f"sheet reverse reference mismatch for {row['Surface ID']}: {profiles}"
        )


def test_information_design_sheets_map_once_to_current_surfaces() -> None:
    current = [row for row in _inventory_rows() if row["State"] == "current"]
    inventory_by_sheet = {
        row["Information-design sheet"]: (row["Surface ID"], row["Route"])
        for row in current
    }
    sheets = sorted(REPO_ROOT.glob(SHEET_GLOB))
    relative_sheets = {sheet.relative_to(REPO_ROOT).as_posix() for sheet in sheets}

    assert relative_sheets == set(inventory_by_sheet)
    for sheet in sheets:
        relative = sheet.relative_to(REPO_ROOT).as_posix()
        profiles = PROFILE_RE.findall(sheet.read_text(encoding="utf-8"))
        assert profiles == [inventory_by_sheet[relative]], relative


def test_frontend_guide_does_not_reference_retired_ssot_files() -> None:
    guide = (REPO_ROOT / "docs/frontend-ui-foundation-spec.md").read_text(
        encoding="utf-8"
    )
    retired = {
        "frontend-information-design-guide.md",
        "harness-hub-information-design-addendum.md",
        "frontend-responsive-mobile-spec.md",
    }
    assert not retired.intersection(guide.split())
    assert all(name not in guide for name in retired)
