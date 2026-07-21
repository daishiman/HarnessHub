"""live-trial scenario ごとの fixture 形状モジュール群。

背景 (j24 の根本原因の一般化):
  ``build_live_trial_fixture.py`` は「graph を読むだけ」の scenario (C18 status /
  C15 schedule) に足りる 1 形状しか作れなかった。C02 node の 5 種 artifact 一括投入や
  C03 sync の adapter fixture のように、scenario 固有の入力を要する skill の fixture は
  過去 trial のたびに手で用意され、``eval-log/dev-graph/live-trial-fixtures/`` (.gitignore
  対象) にしか存在しなかった。worktree を破棄すると生成手順ごと消え、closure digest が
  動いた瞬間に証跡を再取得できなくなる。

  本 package は「scenario ごとの fixture 生成手順」を commit 可能な単位へ分解する。
  1 module = 1 scenario 形状とし、共通の repo 骨格は build_live_trial_fixture.py に委ねる。

契約:
  各 module は ``SHAPE`` (str) と ``build(out: Path) -> None`` を公開する。
  ``build`` は base fixture 生成済みの ``out`` を受け取り、scenario 固有の artifact だけを
  追加する。決定論性のため、時刻・乱数・生成先 path に依存する値を埋め込んではならない
  (path 依存が必要な repository_id は base 側が導出する)。
"""
from __future__ import annotations

import importlib
from pathlib import Path
from typing import Callable, Protocol


class Shape(Protocol):
    SHAPE: str

    def build(self, out: Path) -> None: ...


# scenario_id と shape 名の対応は build_live_trial_shape.py の CLI help と
# plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json が正本。
SHAPE_MODULES: dict[str, str] = {
    "node": "shape_node",
    "sync": "shape_sync",
    "requirements": "shape_requirements",
    "render": "shape_render",
    "decompose": "shape_decompose",
    "schedule": "shape_schedule",
    "system-spec": "shape_system_spec",
}


def load(shape: str) -> Callable[[Path], None]:
    """shape 名から build 関数を解決する。未知の名前は fail-closed。"""
    if shape not in SHAPE_MODULES:
        raise KeyError(f"unknown shape: {shape} (known: {sorted(SHAPE_MODULES)})")
    module = importlib.import_module(f"{__name__}.{SHAPE_MODULES[shape]}")
    return module.build
