"""build-feature-context.py が graph を正本に sidecar を収束させ、危険な上書きを止めること。"""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
from typing import Any

import pytest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/build-feature-context.py"


def _load_module():
    spec = importlib.util.spec_from_file_location("build_feature_context", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


build_feature_context = _load_module()


def _repo(
    tmp_path: Path,
    *,
    context: dict[str, Any],
    node: dict[str, Any],
    extra_nodes: list[dict[str, Any]] | None = None,
) -> Path:
    (tmp_path / "features").mkdir()
    (tmp_path / ".dev-graph/state").mkdir(parents=True)
    (tmp_path / "features/feat-x.context.json").write_text(
        json.dumps(context, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (tmp_path / ".dev-graph/state/graph.json").write_text(
        json.dumps({"nodes": [node, *(extra_nodes or [])]}, ensure_ascii=False), encoding="utf-8"
    )
    return tmp_path


# architecture_refs の突合に必要な参照先。file_path が path <-> node id の正本。
REF_NODES = [
    {
        "graph_node_id": "arch-frontend",
        "artifact_kind": "architecture",
        "file_path": "architecture/frontend.md",
    },
    {
        "graph_node_id": "arch-security",
        "artifact_kind": "architecture",
        "file_path": "architecture/security.md",
    },
    {
        "graph_node_id": "spec-requirements",
        "artifact_kind": "spec",
        "file_path": "specs/requirements.md",
    },
]


BASE_CONTEXT = {"graph_node_id": "feat-x", "purpose": "old", "updated_at": "2026-01-01T00:00:00Z"}
BASE_NODE = {
    "graph_node_id": "feat-x",
    "purpose": "new",
    "updated_at": "2026-02-02T00:00:00Z",
    "artifact_kind": "feature",
}


def test_check_reports_drift_and_exits_nonzero(tmp_path: Path, capsys) -> None:
    repo = _repo(tmp_path, context=dict(BASE_CONTEXT), node=dict(BASE_NODE))
    code = build_feature_context.main(["--repo-root", str(repo), "--check", "--feature", "feat-x"])
    assert code == 1
    captured = capsys.readouterr()
    assert "purpose drifted" in captured.out
    assert "updated_at drifted" in captured.out
    # 直し方が出ないと、CI ログを読んだ人が手で照合するしかなくなる。
    assert "--write" in captured.err


def test_check_does_not_modify_the_sidecar(tmp_path: Path) -> None:
    repo = _repo(tmp_path, context=dict(BASE_CONTEXT), node=dict(BASE_NODE))
    before = (repo / "features/feat-x.context.json").read_bytes()
    build_feature_context.main(["--repo-root", str(repo), "--check", "--feature", "feat-x"])
    assert (repo / "features/feat-x.context.json").read_bytes() == before


def test_write_converges_and_is_idempotent(tmp_path: Path) -> None:
    repo = _repo(tmp_path, context=dict(BASE_CONTEXT), node=dict(BASE_NODE))
    assert build_feature_context.main(["--repo-root", str(repo), "--write", "--feature", "feat-x"]) == 0
    written = json.loads((repo / "features/feat-x.context.json").read_text(encoding="utf-8"))
    assert written["purpose"] == "new"
    assert written["updated_at"] == "2026-02-02T00:00:00Z"
    # 2 回目が差分 0 に収束しないと、CI の check と write が永久にすれ違う。
    assert build_feature_context.main(["--repo-root", str(repo), "--check", "--feature", "feat-x"]) == 0
    snapshot = (repo / "features/feat-x.context.json").read_bytes()
    build_feature_context.main(["--repo-root", str(repo), "--write", "--feature", "feat-x"])
    assert (repo / "features/feat-x.context.json").read_bytes() == snapshot


def test_write_keeps_sidecar_only_keys(tmp_path: Path) -> None:
    context = dict(BASE_CONTEXT) | {"implementation_status": "done"}
    repo = _repo(tmp_path, context=context, node=dict(BASE_NODE))
    build_feature_context.main(["--repo-root", str(repo), "--write", "--feature", "feat-x"])
    written = json.loads((repo / "features/feat-x.context.json").read_text(encoding="utf-8"))
    # graph に対応フィールドが無いキーは sidecar 固有の情報。落とすと意味が消える。
    assert written["implementation_status"] == "done"
    # graph 側にしか無いキーを勝手に増やさない (キー集合は sidecar が正本)。
    assert "artifact_kind" not in written


def test_write_refuses_a_feature_bound_to_plan_digests(tmp_path: Path, capsys) -> None:
    repo = _repo(tmp_path, context=dict(BASE_CONTEXT), node=dict(BASE_NODE))
    bound = repo / "eval-log/plan"
    bound.mkdir(parents=True)
    (bound / "goal-spec.json").write_text(
        json.dumps({"lineage": ["features/feat-x.context.json"]}), encoding="utf-8"
    )
    code = build_feature_context.main(["--repo-root", str(repo), "--write", "--feature", "feat-x"])
    assert code == 3
    assert "plan digest に束縛済み" in capsys.readouterr().err
    # 拒否した以上、1 バイトも書いていないこと。
    assert json.loads((repo / "features/feat-x.context.json").read_text())["purpose"] == "old"


def test_allow_digest_bound_opens_the_gate_explicitly(tmp_path: Path) -> None:
    repo = _repo(tmp_path, context=dict(BASE_CONTEXT), node=dict(BASE_NODE))
    bound = repo / "eval-log/plan"
    bound.mkdir(parents=True)
    (bound / "goal-spec.json").write_text(
        json.dumps({"lineage": ["features/feat-x.context.json"]}), encoding="utf-8"
    )
    code = build_feature_context.main(
        ["--repo-root", str(repo), "--write", "--feature", "feat-x", "--allow-digest-bound"]
    )
    assert code == 0
    assert json.loads((repo / "features/feat-x.context.json").read_text())["purpose"] == "new"


def test_missing_graph_node_is_an_error_not_a_silent_pass(tmp_path: Path) -> None:
    repo = _repo(tmp_path, context=dict(BASE_CONTEXT), node=dict(BASE_NODE) | {"graph_node_id": "feat-y"})
    assert build_feature_context.main(["--repo-root", str(repo), "--check", "--feature", "feat-x"]) == 2


def test_all_and_feature_are_mutually_exclusive(tmp_path: Path) -> None:
    repo = _repo(tmp_path, context=dict(BASE_CONTEXT), node=dict(BASE_NODE))
    with pytest.raises(SystemExit):
        build_feature_context.main(["--repo-root", str(repo), "--check", "--all", "--feature", "feat-x"])


def test_skip_frozen_excludes_digest_bound_features_and_says_so(tmp_path: Path, capsys) -> None:
    repo = _repo(tmp_path, context=dict(BASE_CONTEXT), node=dict(BASE_NODE))
    bound = repo / "eval-log/plan"
    bound.mkdir(parents=True)
    (bound / "goal-spec.json").write_text(
        json.dumps({"lineage": ["features/feat-x.context.json"]}), encoding="utf-8"
    )
    code = build_feature_context.main(
        ["--repo-root", str(repo), "--check", "--all", "--skip-frozen"]
    )
    assert code == 0
    # 0 件検査で緑になるのが一番危ない失敗なので、検査数と除外数が必ず出ること。
    assert "checked 0 feature (frozen skipped: 1)" in capsys.readouterr().out


def test_architecture_refs_compare_by_node_identity_not_by_string(tmp_path: Path) -> None:
    """パス表記と node id 表記は同じ参照。文字列一致で比較すると全件が偽の drift になる。"""
    repo = _repo(
        tmp_path,
        context={
            "graph_node_id": "feat-x",
            "architecture_refs": ["architecture/frontend.md", "architecture/security.md"],
        },
        node={
            "graph_node_id": "feat-x",
            "architecture_refs": ["arch-frontend", "arch-security"],
        },
        extra_nodes=REF_NODES,
    )
    code = build_feature_context.main(["--repo-root", str(repo), "--check", "--feature", "feat-x"])
    assert code == 0


def test_non_architecture_refs_in_the_sidecar_are_not_drift(tmp_path: Path) -> None:
    """graph の architecture_refs は architecture 種別しか持たない。spec/docs 参照は context 固有。"""
    repo = _repo(
        tmp_path,
        context={
            "graph_node_id": "feat-x",
            "architecture_refs": ["architecture/frontend.md", "specs/requirements.md"],
        },
        node={"graph_node_id": "feat-x", "architecture_refs": ["arch-frontend"]},
        extra_nodes=REF_NODES,
    )
    code = build_feature_context.main(["--repo-root", str(repo), "--check", "--feature", "feat-x"])
    assert code == 0


def test_a_missing_architecture_ref_is_still_reported(tmp_path: Path, capsys) -> None:
    """語彙差を吸収しても、本物の欠落は落ちること (吸収がゲートの空洞化にならない)。"""
    repo = _repo(
        tmp_path,
        context={"graph_node_id": "feat-x", "architecture_refs": ["architecture/frontend.md"]},
        node={"graph_node_id": "feat-x", "architecture_refs": ["arch-frontend", "arch-security"]},
        extra_nodes=REF_NODES,
    )
    code = build_feature_context.main(["--repo-root", str(repo), "--check", "--feature", "feat-x"])
    assert code == 1
    assert "architecture_refs drifted" in capsys.readouterr().out


def test_write_repairs_architecture_refs_without_dropping_other_refs(tmp_path: Path) -> None:
    """graph の値をそのまま代入すると context 固有の spec 参照が消える。書式も既存に合わせる。"""
    repo = _repo(
        tmp_path,
        context={
            "graph_node_id": "feat-x",
            "architecture_refs": ["architecture/frontend.md", "specs/requirements.md"],
        },
        node={"graph_node_id": "feat-x", "architecture_refs": ["arch-frontend", "arch-security"]},
        extra_nodes=REF_NODES,
    )
    assert build_feature_context.main(
        ["--repo-root", str(repo), "--write", "--feature", "feat-x"]
    ) == 0
    written = json.loads((repo / "features/feat-x.context.json").read_text(encoding="utf-8"))
    assert written["architecture_refs"] == [
        "architecture/frontend.md",
        "architecture/security.md",
        "specs/requirements.md",
    ]
    assert build_feature_context.main(
        ["--repo-root", str(repo), "--check", "--feature", "feat-x"]
    ) == 0


def test_an_unresolvable_architecture_path_is_not_swallowed(tmp_path: Path, capsys) -> None:
    """architecture/ を指すのに解決できない参照は typo。補助参照へ混ぜると黙って緑になる。"""
    repo = _repo(
        tmp_path,
        context={
            "graph_node_id": "feat-x",
            "architecture_refs": ["architecture/frontend.md", "architecture/typo.md"],
        },
        node={"graph_node_id": "feat-x", "architecture_refs": ["arch-frontend"]},
        extra_nodes=REF_NODES,
    )
    code = build_feature_context.main(["--repo-root", str(repo), "--check", "--feature", "feat-x"])
    assert code == 1
    assert "architecture/typo.md" in capsys.readouterr().out


def test_write_does_not_delete_an_unresolvable_reference(tmp_path: Path) -> None:
    """直せない参照を黙って消すと、typo が「修復済み」に化けて検出不能になる。"""
    repo = _repo(
        tmp_path,
        context={
            "graph_node_id": "feat-x",
            "architecture_refs": ["architecture/typo.md"],
        },
        node={"graph_node_id": "feat-x", "architecture_refs": ["arch-frontend"]},
        extra_nodes=REF_NODES,
    )
    assert build_feature_context.main(
        ["--repo-root", str(repo), "--write", "--feature", "feat-x"]
    ) == 0
    written = json.loads((repo / "features/feat-x.context.json").read_text(encoding="utf-8"))
    assert "architecture/typo.md" in written["architecture_refs"]
    assert "architecture/frontend.md" in written["architecture_refs"]
    # 直せない参照が残っている限り check は鳴り続ける
    assert build_feature_context.main(
        ["--repo-root", str(repo), "--check", "--feature", "feat-x"]
    ) == 1


def test_the_repository_has_no_unexplained_drift_in_the_ci_scope(capsys) -> None:
    """CI が実際に流す引数形が実リポジトリで緑であること (検査 0 件で緑にならないことも見る)。"""
    code = build_feature_context.main(
        ["--repo-root", str(ROOT), "--check", "--all", "--skip-frozen"]
    )
    out = capsys.readouterr().out
    assert code == 0, out
    assert "checked 0 feature" not in out


def test_card_features_are_in_sync_in_this_repository() -> None:
    """CI が守る対象そのものを、実リポジトリの現物で確認する。"""
    code = build_feature_context.main(
        [
            "--repo-root",
            str(ROOT),
            "--check",
            "--feature",
            "feat-card-list-shell",
            "--feature",
            "feat-card-block-authoring",
            "--feature",
            "feat-card-mutation-safety",
        ]
    )
    assert code == 0
