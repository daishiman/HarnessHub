"""validate-feature-context.py が plan と同じ契約を作成時に前倒しで効かせること。

このゲートの価値は「契約を 2 度書かないこと」に尽きる。契約を写経した瞬間に、
作成時は緑なのに plan で落ちる (あるいはその逆) という乖離が生まれる。実際リポジトリでは
tests/test_card_feature_contracts.py が 11 キー、plan ゲートが 9 キーを要求しており、
3 feature が「テスト緑・plan 不能」のまま滞留していた。その再発を止めるのがここの主眼。
"""

from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/validate-feature-context.py"
PLAN_GATE = ROOT / "plugins/system-dev-planner/scripts/resolve-project-context.py"
CONTEXT_WRITER = ROOT / "scripts/build-feature-context.py"


def _load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


validate_feature_context = _load("validate_feature_context_script", SCRIPT)


VALID_CONTEXT: dict[str, Any] = {
    "graph_node_id": "feat-x",
    "artifact_kind": "feature",
    "purpose": "目的",
    "goal": "到達状態",
    "scope_in": ["含む"],
    "scope_out": ["含まない"],
    "acceptance": ["受入"],
    "architecture_refs": ["architecture/frontend.md"],
    "updated_at": "2026-01-01T00:00:00Z",
}


def _repo(tmp_path: Path, contexts: dict[str, dict[str, Any]]) -> Path:
    """plan ゲートと writer を実物ごと持ち込んだ最小リポジトリを作る。

    契約を fixture 側で模造しないのが重要。模造すると本番の契約が変わっても
    テストだけが元の契約を守り続けてしまう。
    """
    (tmp_path / "features").mkdir()
    (tmp_path / "architecture").mkdir()
    (tmp_path / "architecture/frontend.md").write_text("# frontend\n", encoding="utf-8")
    (tmp_path / "scripts").mkdir()
    (tmp_path / "scripts/build-feature-context.py").write_text(
        CONTEXT_WRITER.read_text(encoding="utf-8"), encoding="utf-8"
    )
    gate_dir = tmp_path / "plugins/system-dev-planner/scripts"
    gate_dir.mkdir(parents=True)
    (gate_dir / "resolve-project-context.py").write_text(
        PLAN_GATE.read_text(encoding="utf-8"), encoding="utf-8"
    )
    (tmp_path / ".dev-graph/state").mkdir(parents=True)
    (tmp_path / ".dev-graph/state/graph.json").write_text(json.dumps({"nodes": []}), encoding="utf-8")
    for feature_id, context in contexts.items():
        (tmp_path / f"features/{feature_id}.context.json").write_text(
            json.dumps(context, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
    return tmp_path


def _run(repo: Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(SCRIPT), "--repo-root", str(repo), *args],
        capture_output=True, text=True, check=False,
    )


def test_a_conforming_context_passes(tmp_path):
    repo = _repo(tmp_path, {"feat-x": VALID_CONTEXT})
    result = _run(repo)
    assert result.returncode == 0, result.stdout + result.stderr
    assert "checked 1 feature" in result.stdout


@pytest.mark.parametrize(
    "mutate, expected",
    [
        (lambda c: c.pop("goal"), "missing"),
        (lambda c: c.update(depends_on=["feat-y"]), "extra"),
        (lambda c: c.update(artifact_kind="task"), "artifact_kind"),
        (lambda c: c.update(graph_node_id="feat-other"), "feature id 不一致"),
        (lambda c: c.update(scope_in=[]), "scope_in"),
        (lambda c: c.update(purpose="   "), "purpose"),
        (lambda c: c.update(updated_at="2026-01-01"), "updated_at"),
        (lambda c: c.update(architecture_refs=["architecture/missing.md"]), "存在しない"),
        (lambda c: c.update(architecture_refs=["arch-frontend"]), "存在しない"),
    ],
    ids=[
        "必須キー欠落", "余剰キー", "artifact_kind 誤り", "id 不一致", "空リスト",
        "空白のみの文字列", "timezone 無し", "実在しない参照", "node id 表記の参照",
    ],
)
def test_each_contract_violation_is_rejected(tmp_path, mutate, expected):
    context = json.loads(json.dumps(VALID_CONTEXT))
    mutate(context)
    repo = _repo(tmp_path, {"feat-x": context})
    result = _run(repo)
    assert result.returncode == 1, result.stdout + result.stderr
    assert expected in result.stdout


def test_the_checked_count_is_always_printed(tmp_path):
    """0 件検査の緑は「契約を満たした」ではなく「何も見ていない」。件数無しの緑を作らない。"""
    repo = _repo(tmp_path, {"feat-x": VALID_CONTEXT, "feat-y": {**VALID_CONTEXT, "graph_node_id": "feat-y"}})
    result = _run(repo)
    assert result.returncode == 0
    assert "checked 2 feature" in result.stdout


def test_no_features_at_all_is_an_error_not_a_pass(tmp_path):
    repo = _repo(tmp_path, {})
    result = _run(repo)
    assert result.returncode == 2
    assert "1 件も無い" in result.stderr


def test_a_missing_plan_gate_fails_instead_of_passing_silently(tmp_path):
    """契約の出所が消えたら緑にしない。検査不能と適合は別物。"""
    repo = _repo(tmp_path, {"feat-x": VALID_CONTEXT})
    (repo / "plugins/system-dev-planner/scripts/resolve-project-context.py").unlink()
    result = _run(repo)
    assert result.returncode == 2
    assert "plan gate" in result.stderr


def test_frozen_features_are_skipped_but_counted(tmp_path):
    """凍結除外は「見なかった」ことなので、件数を必ず出して黙って減らさない。"""
    broken = {**VALID_CONTEXT, "graph_node_id": "feat-frozen", "implementation_status": {}}
    repo = _repo(tmp_path, {"feat-frozen": broken})
    # digest 束縛の痕跡を置くと凍結扱いになる。
    (repo / ".dev-graph/plans").mkdir(parents=True)
    (repo / ".dev-graph/plans/pkg.json").write_text(
        json.dumps({"source": "features/feat-frozen.context.json"}), encoding="utf-8"
    )
    assert _run(repo).returncode == 1
    skipped = _run(repo, "--skip-frozen")
    assert skipped.returncode == 0, skipped.stdout + skipped.stderr
    assert "frozen skipped: 1" in skipped.stdout
    assert "checked 0 feature" in skipped.stdout


def test_a_missing_context_writer_fails_instead_of_looking_like_a_violation(tmp_path):
    """凍結判定の実装が消えたら exit 2。

    ここが素の traceback だと終了コードが 1 になり「契約違反が見つかった」と区別できない。
    検査不能を違反として報告すると、直す場所 (データ vs 検査側) を取り違える。
    """
    repo = _repo(tmp_path, {"feat-x": VALID_CONTEXT})
    (repo / "scripts/build-feature-context.py").unlink()
    result = _run(repo, "--skip-frozen")
    assert result.returncode == 2, result.stdout + result.stderr
    assert "context writer" in result.stderr


def test_an_unexpected_checker_error_is_not_reported_as_a_data_violation(tmp_path):
    """plan ゲート側が壊れたときに「その feature が悪い」と言わない。"""
    repo = _repo(tmp_path, {"feat-x": VALID_CONTEXT})
    gate = repo / "plugins/system-dev-planner/scripts/resolve-project-context.py"
    source = gate.read_text(encoding="utf-8").replace(
        'def validate_feature_context(repo_root: Path, feature_id: str, rel: str) -> dict:',
        'def validate_feature_context(repo_root: Path, feature_id: str, rel: str) -> dict:\n'
        '    raise RuntimeError("checker is broken")',
        1,
    )
    gate.write_text(source, encoding="utf-8")
    result = _run(repo)
    assert result.returncode == 2, result.stdout + result.stderr
    assert "想定外の例外" in result.stderr


def test_the_contract_is_not_reimplemented_in_this_script():
    """契約を写経していないことを構造で固定する。

    フィールド名を script 側に列挙し始めた瞬間に plan ゲートと乖離しうるので、
    「plan ゲートの関数を呼んでいる」ことと「フィールド名を持たない」ことを両方見る。
    """
    source = SCRIPT.read_text(encoding="utf-8")
    assert "validate_feature_context" in source
    # 契約キーの一覧は「plan ゲートが通す context のキー集合」から導く。定数を切り出して
    # import する案は取れない (plan ゲートは dev-graph 3 skill の挙動面で、触ると live-trial
    # 証跡が失効する)。VALID_CONTEXT がゲートを通ることは他テストが担保している。
    for field in VALID_CONTEXT:
        assert f'"{field}"' not in source, (
            f"{field} を script 側で列挙している。契約は plan ゲートの "
            "validate_feature_context() だけが持つこと"
        )


def test_the_repository_conforms_in_the_ci_scope():
    """CI が実際に流す形 (--skip-frozen) で、リポジトリに未説明の違反が無いこと。"""
    result = subprocess.run(
        [sys.executable, str(SCRIPT), "--repo-root", str(ROOT), "--skip-frozen"],
        capture_output=True, text=True, check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert "checked 0 feature" not in result.stdout, "凍結除外で全件が消えると緑が無意味になる"
