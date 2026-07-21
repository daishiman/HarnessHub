"""C14 (run-dev-graph-decompose) の live-trial scenario 形状。

対象 scenario: ``decompose-macro-positive-r3``
(eval-log/dev-graph/run-dev-graph-decompose/criteria-test/scenario-verdict.json の OUT1)

復元した scenario 契約:
  被験 skill は自然文の want を feature/architecture/機能間 depends_on へ *新規に* 分解する。
  したがって fixture は「dev-graph 初期化済み・かつ分解対象がまだ何も無い repo」であればよい。
  20260721T143217 trial の transcript に残る tool_result がこれを直接裏づける:
  fixture 直下は architecture/ docs/ eval-log/ features/ issues/ specs/ system-spec/ tasks/、
  ``.dev-graph/state/graph.json`` は ``{"schema_version":"1.0.0","nodes":[],"edges":[]}``、
  ``architecture/`` ``features/`` ``tasks/`` はいずれも空ディレクトリだった。
  これらは base fixture (build_live_trial_fixture.py) が既に用意する骨格に含まれる。

追加 artifact が不要だと判断した根拠:
  - exact-13 package は不要。SKILL.md の macro flow 4-5 (ready feature → run-system-dev-plan
    → register-package) は本 scenario の args が ``--dry-run`` であり、生成 feature が全て
    draft preview に留まるため到達しない。OUT1 の observed も task_count=0 / all_draft=True /
    register-package 呼出しなしを記録している。package fixture を置くと scenario が
    OUT6/OUT7 (verify_by: test の別 criterion) の領域へ滑る。
  - 分解元の architecture root node は不要。旧 fixture の architecture/ は空で、trial は
    arch-todo-api を *新規生成* した。既存 architecture node を先に置くと
    「architecture を複製しない」(R2-plan の責務境界) の検査対象が別物になる。
  - ``.dev-graph/templates/`` は不要。旧 fixture には 21 件あったが、template contract は
    validate-graph-schema.py / upsert-node.py が PLUGIN_ROOT 側から解決する
    (``PLUGIN_ROOT / "templates" / "template-contract.json"``)。旧 fixture のそれは
    init 実行の残骸であり scenario 契約ではない。

置くもの:
  scenario の入力である自然文の want を repo 直下の 1 file として固定する
  (C02 の ``<repo>/mixed-artifacts.json`` と同じく、scenario 入力は fixture 直下に置く慣習)。
  過去 trial では want が task.md の args 文字列にしか存在せず、trial を再実行するたびに
  文言が揺れうる = scenario が再現しない。fixture 側へ正本を置き、args はこの file を
  参照する形にすることで入力を closure と同じ digest に固定できる。

置かないもの (意図的):
  期待される分解結果 — 生成 node の graph_node_id、node 数、依存辺の向き。
  fixture に正解を書くと被験 skill はそれを転記するだけで PASS でき、live-trial が
  マクロ分解能力を観測しなくなる (Goodhart)。本 file が持つのは入力と実行条件だけ。
"""
from __future__ import annotations

from pathlib import Path

SHAPE = "decompose"

# scenario 契約の参照キー。task.md 生成側がこの値で fixture と scenario を対応づける。
SCENARIO_ID = "decompose-macro-positive-r3"
# 被験 skill へ渡す want の正本 (repository-relative)。
INPUT_FILE = "decompose-macro-want.md"

# want 本文は 20260721T143217 trial の args を正本として写す。
# 「TODO は認証に依存」はドメイン上の前提条件であり、生成すべき depends_on 辺の
# 指示ではない点に注意 (辺の生成は被験 skill の判断領域として残す)。
WANT_DOCUMENT = """# live-trial scenario input: decompose-macro-positive-r3

本 file は live-trial scenario `decompose-macro-positive-r3`
(skill: `dev-graph:run-dev-graph-decompose`) の入力の正本。
被験 skill へ渡す `<want>` は下記「want」節の本文とする。

## want

認証付き TODO API を architecture、認証 feature、TODO feature へマクロ分解する。
TODO は認証に依存する。全 node は tracker_binding=none とする。

## 実行条件

- `--dry-run` で実行する。local graph・Beads・GitHub・Projects への write は 0 件に保つ。
  file を書いてから消す形での回避も禁止 (書いた時点で write 0 件を満たさない)。
- マクロ層 (feature / architecture / 機能間 depends_on) だけを扱う。
  1 feature = P01..P13 の 13 タスク仕様書への細分解は system-dev-planner の責務であり、
  本 scenario では行わない。
- feature を通常の C02 add として直登録せず、C14 のマクロ分解経路を通す。

## この file に意図的に書いていないもの

生成されるべき node の graph_node_id・node 数・依存辺の一覧は書かない。
fixture 側に期待結果を置くと、被験 skill がそれを転記するだけで判定を通過でき、
live-trial がマクロ分解能力を観測しなくなるため。
"""


def build(out: Path) -> None:
    """base fixture 生成済みの out へ、C14 scenario 固有の artifact を追加する。

    base が作る骨格 (config / 空の graph 以外の content root / eval-log / git identity) は
    そのまま使い、scenario 入力である want document だけを足す。時刻・乱数・生成先 path に
    依存する値は埋め込まないため、同一 out に対して常に同一バイト列を書く。
    """
    (out / INPUT_FILE).write_text(WANT_DOCUMENT, encoding="utf-8")
