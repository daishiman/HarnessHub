"""validate-source-digest.py (R3-import の digest 流用検出ゲート) の検証。"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "validate-source-digest.py"


def build_repo(tmp_path: Path, nodes: list[dict], files: dict[str, str]) -> Path:
    root = tmp_path / "repo"
    (root / ".dev-graph" / "state").mkdir(parents=True)
    (root / ".dev-graph" / "state" / "graph.json").write_text(
        json.dumps({"schema_version": "1", "nodes": nodes}), encoding="utf-8"
    )
    for rel, content in files.items():
        target = root / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
    return root


def node(node_id: str, source_path: str | None, digest: str | None) -> dict:
    sl = {}
    if source_path is not None:
        sl["source_path"] = source_path
    if digest is not None:
        sl["source_digest"] = digest
    return {"graph_node_id": node_id, "source_lineage": sl}


def sha(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def run(root: Path, registered: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(SCRIPT), "--repo-root", str(root), "--registered", registered],
        capture_output=True, text=True, check=False,
    )


def test_matching_per_path_digest_passes(tmp_path: Path) -> None:
    root = build_repo(
        tmp_path,
        [node("N1", "spec/a.md", sha("AAA")), node("N2", "spec/b.md", sha("BBB"))],
        {"spec/a.md": "AAA", "spec/b.md": "BBB"},
    )
    proc = run(root, "N1,N2")
    assert proc.returncode == 0, proc.stdout + proc.stderr
    assert json.loads(proc.stdout)["checked"] == 2


def test_reused_digest_fails_closed(tmp_path: Path) -> None:
    # N2 が N1 (a.md) の digest を流用 → b.md の実 sha と不一致 → fail
    root = build_repo(
        tmp_path,
        [node("N1", "spec/a.md", sha("AAA")), node("N2", "spec/b.md", sha("AAA"))],
        {"spec/a.md": "AAA", "spec/b.md": "BBB"},
    )
    proc = run(root, "N1,N2")
    assert proc.returncode == 2
    mism = json.loads(proc.stdout)["registered_mismatch"]
    assert mism[0]["graph_node_id"] == "N2"


def test_missing_source_file_fails_closed(tmp_path: Path) -> None:
    root = build_repo(tmp_path, [node("N1", "spec/gone.md", sha("X"))], {})
    proc = run(root, "N1")
    assert proc.returncode == 2


def test_unregistered_node_is_not_checked(tmp_path: Path) -> None:
    # OLD は digest 不一致だが registered 外なので無視
    root = build_repo(
        tmp_path,
        [node("OLD", "spec/a.md", "deadbeef"), node("N1", "spec/b.md", sha("BBB"))],
        {"spec/a.md": "AAA", "spec/b.md": "BBB"},
    )
    proc = run(root, "N1")
    assert proc.returncode == 0
    assert json.loads(proc.stdout)["checked"] == 1


def test_progress_supplies_registered(tmp_path: Path) -> None:
    root = build_repo(tmp_path, [node("N1", "spec/b.md", "deadbeef")], {"spec/b.md": "BBB"})
    progress = root / "progress.json"
    progress.write_text(json.dumps({"registered_this_run": ["N1"]}), encoding="utf-8")
    proc = subprocess.run(
        [sys.executable, str(SCRIPT), "--repo-root", str(root), "--progress", str(progress)],
        capture_output=True, text=True, check=False,
    )
    assert proc.returncode == 2  # progress 由来 registered の digest 不一致で fail
