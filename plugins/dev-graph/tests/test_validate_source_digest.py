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


def test_c04_requirements_anchors_digest_gate_to_this_script() -> None:
    """C04 の readiness 照合が散文 checklist ではなく本 script の exit code へ係留されている。

    2026-07-21 live-trial r13 で、C04 が confirmation/evaluation/readiness だけを比較し
    source_digest 照合を全周回で省略、registered_mismatch 4件のまま handoff を emit する
    fail-open を検出した回帰テスト。
    """
    skill = (
        Path(__file__).resolve().parents[1]
        / "skills" / "run-dev-graph-requirements" / "SKILL.md"
    )
    text = skill.read_text(encoding="utf-8")
    _opening, frontmatter, body = text.split("---", 2)

    assert "../../scripts/validate-source-digest.py" in frontmatter, (
        "validate-source-digest.py must be a declared script_ref of C04"
    )
    assert "validate-source-digest.py" in body, (
        "SKILL body must invoke the digest gate, not describe it only in prose"
    )
    checklist = [line for line in body.splitlines() if line.startswith("- [ ]")]
    assert any(
        "validate-source-digest.py" in line and "exit 0" in line for line in checklist
    ), "完了チェックリストに script の exit 0 を条件とする項目が必要"


def test_c04_digest_gate_reaches_the_responsibility_prompt() -> None:
    """gate が SKILL.md だけでなく責務プロンプトまで届いている (片肺修正の防止)。

    SKILL.md は未達 responsibility を prompts/<R-id>.md 経由で Agent へ fork する。
    prompt 側が散文述語のままだと、分離 context の agent は script を実行する指示を
    持たず、r13 の fail-open がそのまま再現する。姉妹 skill run-dev-graph-system-spec は
    同種の gate を prompts/R3-import.md まで伝播済みで、これが前例。
    """
    prompt = (
        Path(__file__).resolve().parents[1]
        / "skills" / "run-dev-graph-requirements" / "prompts" / "R2b-readiness.md"
    )
    text = prompt.read_text(encoding="utf-8")
    assert "validate-source-digest" in text, (
        "責務プロンプトの使用資産に digest gate が必要"
    )
    checklist = [line for line in text.splitlines() if line.startswith("- [ ]")]
    assert any(
        "validate-source-digest.py" in line and "exit 0" in line for line in checklist
    ), "prompt の完了チェックリスト (停止条件) に script の exit 0 が必要"
