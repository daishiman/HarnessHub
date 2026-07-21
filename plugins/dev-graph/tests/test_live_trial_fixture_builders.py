"""live-trial fixture 生成器 (--kind レジストリ) の契約テスト。

固定する契約は 3 つある。

1. **決定論**: 同じ ``--kind`` と同じ ``--out`` からは、何度生成しても同じ内容になる。
   fixture の実体は ``eval-log/dev-graph/live-trial-fixtures/`` (.gitignore 対象) にしか
   残らないため、生成手順だけが正本である。ここが崩れると「前回 trial と同じ条件で
   再実行できない」事故 (j24) が再発する。
2. **C11 適合**: 生成した graph が validate-graph-schema.py を通る。通らない fixture は
   被験 skill の起動ゲートで落ちるので、trial が「不完全な実走」になる。
3. **repository_id の実測**: config の repository_id は生成先の git common dir から
   導出した値でなければならない (C24 resolve-repo-context.py の fail-closed 条件)。
   ハードコードすると起動ゲートを迂回した偽 PASS を生む。

kind の一覧は生成器の ``BUILDERS`` から採るので、新しい kind を登録して本テストを
足し忘れても自動的に検査対象へ入る。
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

import pytest


PLUGIN = Path(__file__).resolve().parents[1]
BUILDER = PLUGIN / "tests" / "fixtures" / "build_live_trial_fixture.py"
VALIDATOR = PLUGIN / "scripts" / "validate-graph-schema.py"


def _load_builder():
    """生成器を module として読む (BUILDERS の登録内容を kind 一覧の正本にするため)。"""
    name = "build_live_trial_fixture"
    cached = sys.modules.get(name)
    if cached is not None:
        return cached
    spec = importlib.util.spec_from_file_location(name, BUILDER)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


BUILDER_MODULE = _load_builder()
KINDS = sorted(BUILDER_MODULE.BUILDERS)
# C01 init の被験対象は「dev-graph 未初期化の repository」なので graph を持たない。
# 検証すべき graph が無いことがこの kind の正しい初期状態であり、C11 の対象外になる。
KINDS_WITHOUT_GRAPH = {"init"}


def _build(kind: str, out: Path) -> dict:
    """生成器を実プロセスとして走らせ、標準出力の receipt を返す。"""
    proc = subprocess.run(
        [sys.executable, str(BUILDER), "--kind", kind, "--out", str(out), "--force"],
        capture_output=True, text=True, check=False,
    )
    assert proc.returncode == 0, f"--kind {kind} failed:\n{proc.stdout}{proc.stderr}"
    return json.loads(proc.stdout)


def _content_manifest(out: Path) -> dict[str, str]:
    """``.git`` を除く全ファイルの sha256。git tree では見えない差分も拾うため。"""
    manifest: dict[str, str] = {}
    for path in sorted(out.rglob("*")):
        if not path.is_file() or ".git" in path.relative_to(out).parts:
            continue
        manifest[str(path.relative_to(out))] = hashlib.sha256(path.read_bytes()).hexdigest()
    return manifest


def _git(out: Path, *args: str) -> str:
    proc = subprocess.run(
        ["git", "-C", str(out), *args], capture_output=True, text=True, check=True
    )
    return proc.stdout.strip()


@pytest.fixture(scope="module")
def built(tmp_path_factory) -> dict[str, Path]:
    """全 kind を 1 度ずつ生成して共有する (requirements は上流 script を実走するため重い)。"""
    root = tmp_path_factory.mktemp("live-trial-fixtures")
    return {kind: (_build(kind, root / kind), root / kind)[1] for kind in KINDS}


@pytest.mark.parametrize("kind", KINDS)
def test_regeneration_is_byte_identical(kind: str, built: dict[str, Path]) -> None:
    """同一 --out への再生成が内容・git tree・commit sha まで一致する。"""
    out = built[kind]
    before_files = _content_manifest(out)
    before_tree = _git(out, "rev-parse", "HEAD^{tree}")
    before_head = _git(out, "rev-parse", "HEAD")

    _build(kind, out)

    assert _content_manifest(out) == before_files
    assert _git(out, "rev-parse", "HEAD^{tree}") == before_tree
    # commit sha まで一致することが「時刻を埋め込んでいない」ことの実証になる。
    assert _git(out, "rev-parse", "HEAD") == before_head


@pytest.mark.parametrize("kind", sorted(set(KINDS) - KINDS_WITHOUT_GRAPH))
def test_graph_passes_c11(kind: str, built: dict[str, Path]) -> None:
    """生成した graph が validate-graph-schema.py (C11) を violation 0 で通る。"""
    out = built[kind]
    proc = subprocess.run(
        [sys.executable, str(VALIDATOR),
         "--graph", str(out / ".dev-graph" / "state" / "graph.json"),
         "--repo-root", str(out)],
        capture_output=True, text=True, check=False,
    )
    assert proc.returncode == 0, f"C11 failed for --kind {kind}:\n{proc.stdout}{proc.stderr}"


@pytest.mark.parametrize("kind", sorted(set(KINDS) - KINDS_WITHOUT_GRAPH))
def test_repository_id_is_measured_from_git_common_dir(kind: str, built: dict[str, Path]) -> None:
    """config の repository_id が生成先の git common dir から導出された実測値である。

    C24 は config 宣言と実測値の不一致で fail-closed するため、ハードコードされた値や
    別 fixture から複写された値が紛れ込むと起動ゲートを通れない。
    """
    out = built[kind]
    common = Path(_git(out, "rev-parse", "--git-common-dir"))
    common = (common if common.is_absolute() else out / common).resolve(strict=True)
    expected = "local:sha256:" + hashlib.sha256(str(common).encode("utf-8")).hexdigest()
    config = json.loads((out / ".dev-graph" / "config.json").read_text(encoding="utf-8"))
    assert config["repository_id"] == expected


def test_init_fixture_is_not_dev_graph_initialized(built: dict[str, Path]) -> None:
    """C01 の被験対象は未初期化 repository である (fixture が初期化を先取りしない)。"""
    out = built["init"]
    assert (out / ".git").is_dir()
    assert _git(out, "rev-parse", "HEAD")
    assert not (out / ".dev-graph").exists()
    # content root を先に作ると「skill が作ったのか最初からあったのか」を区別できない。
    for relative in sorted(set(BUILDER_MODULE.CONTENT_ROOTS.values())):
        assert not (out / relative).exists(), relative


def test_node_fixture_declares_no_artifact_kind(built: dict[str, Path]) -> None:
    """C02 の分類が自明にならないよう、素材バッチが正解 (kind と node id) を持たない。

    fixture 側で ``artifact_kind`` を宣言すると required_observation
    「all five artifacts are routed to canonical kind paths」が試験されなくなる。
    """
    batch = json.loads((built["node"] / "mixed-artifacts.json").read_text(encoding="utf-8"))
    assert len(batch) == 5
    for artifact in batch:
        assert set(artifact) == {"title", "body", "tags"}
    # 分類先の content root も空のままであること (登録結果を先に置いていない)。
    graph = json.loads((built["node"] / ".dev-graph" / "state" / "graph.json").read_text(encoding="utf-8"))
    assert graph["nodes"] == []


def test_status_fixture_exposes_a_dependency_edge(built: dict[str, Path]) -> None:
    """C18 が ready/blocked を区別できる最小構成 (task 2 件 + 前方依存 1 本) である。"""
    graph = json.loads(
        (built["status"] / ".dev-graph" / "state" / "graph.json").read_text(encoding="utf-8")
    )
    by_id = {node["graph_node_id"]: node for node in graph["nodes"]}
    assert set(by_id) == {"LT-TASK-001", "LT-TASK-002"}
    assert by_id["LT-TASK-001"]["depends_on"] == []
    assert by_id["LT-TASK-002"]["depends_on"] == ["LT-TASK-001"]


def test_distinct_output_paths_get_distinct_repository_ids(tmp_path: Path) -> None:
    """repository_id だけは生成先依存で正しい (C24)。他の値は生成先に依存しない。"""
    first = _build("status", tmp_path / "a")
    second = _build("status", tmp_path / "b")
    assert first["repository_id"] != second["repository_id"]
    # path 依存値は repository_id に閉じているので、内容 digest は path をまたいで一致する。
    manifest_a = _content_manifest(tmp_path / "a")
    manifest_b = _content_manifest(tmp_path / "b")
    assert set(manifest_a) == set(manifest_b)
    differing = {key for key in manifest_a if manifest_a[key] != manifest_b[key]}
    assert differing == {".dev-graph/config.json"}
