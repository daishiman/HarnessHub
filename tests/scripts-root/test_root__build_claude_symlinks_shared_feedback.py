"""Shared bundled-feedback behavior for build-claude-symlinks.py.

The generic symlink-builder tests remain in their historical file.  These
feedback-copy regressions are isolated so both test files stay under 500 lines.
"""
import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "build-claude-symlinks.py"
SPEC = importlib.util.spec_from_file_location("build_claude_symlinks_feedback_uut", SCRIPT)
MOD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MOD)


def _skill(plugins: Path, plugin: str, name: str) -> Path:
    skill_dir = plugins / plugin / "skills" / name
    skill_dir.mkdir(parents=True)
    (skill_dir / "SKILL.md").write_text("---\n---\n# Skill\n", encoding="utf-8")
    return skill_dir


def test_identical_feedback_copies_collapse_to_canonical(tmp_path):
    """Marketplace-safe feedback copies share one global Claude shortcut."""
    plugins = tmp_path / "plugins"
    canonical = _skill(plugins, "harness-creator", "run-skill-feedback")
    copied = _skill(plugins, "publisher", "run-skill-feedback")
    body = "---\nname: run-skill-feedback\n---\n# shared\n"
    (canonical / "SKILL.md").write_text(body, encoding="utf-8")
    (copied / "SKILL.md").write_text(body, encoding="utf-8")

    entries, conflicts = MOD.desired_entries(plugins, tmp_path / ".claude", ["skills"])

    assert conflicts == set()
    assert [entry["src"] for entry in entries] == [canonical]


def test_divergent_feedback_copy_remains_conflict(tmp_path):
    """A copied feedback skill may not silently diverge from its SSOT."""
    plugins = tmp_path / "plugins"
    _skill(plugins, "harness-creator", "run-skill-feedback")
    copied = _skill(plugins, "publisher", "run-skill-feedback")
    (copied / "SKILL.md").write_text(
        "---\nname: run-skill-feedback\n---\n# divergent\n", encoding="utf-8"
    )

    _entries, conflicts = MOD.desired_entries(plugins, tmp_path / ".claude", ["skills"])

    assert copied in conflicts
