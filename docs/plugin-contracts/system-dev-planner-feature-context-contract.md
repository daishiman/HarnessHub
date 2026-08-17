---
status: recorded
layer: plugin-contract-record
task: HarnessHub-b32s
beads: HarnessHub-b32s
dev_graph_node: issue-feature-context-json-exact-set-contract-20260814
judged_at: 2026-08-17T14:10:00Z
reviewer: daishiman
---

# `features/<id>.context.json` の形状契約と作成時検査

対象: `/dev-graph plan --feature-context` の唯一の入力である `features/<id>.context.json` の形状契約を明文化し、**plan を起動しなくても作成時点で検査できる**ようにした変更。sidecar と graph の値そのものを揃える parity ゲートは [`scripts/build-feature-context.py`](../../scripts/build-feature-context.py) が担当しており、本件はその手前の「キー集合と型」を扱う。

## 1. 契約

正本は `plugins/system-dev-planner/scripts/resolve-project-context.py` の関数 `validate_feature_context()`。**この関数だけが契約を持つ。** 検査したい側は自前でキーを列挙せず、この関数を呼んで判定する。

定数として切り出して import する形は取っていない。このファイルは dev-graph の 3 skill (`run-dev-graph-decompose` / `run-dev-graph-node` / `run-dev-graph-requirements`) の**宣言済み挙動面**に含まれており、1 文字でも変更すると `lint-live-trial-verdict` が `stale-sha` で落ち、3 skill の live-trial 再実行が必要になる。契約の単一化は「定数を共有する」ではなく「関数を呼ぶ」で達成する。

`context.json` は以下 **9 キーちょうど**の JSON object でなければならない (過不足いずれも違反)。

| キー | 型 | 追加条件 |
|---|---|---|
| `graph_node_id` | 非空 string | `--feature-id` と一致 |
| `artifact_kind` | 非空 string | `"feature"` 固定 |
| `purpose` | 非空 string | — |
| `goal` | 非空 string | — |
| `scope_in` | 非空 string[] | 各要素が非空 |
| `scope_out` | 非空 string[] | 各要素が非空 |
| `acceptance` | 非空 string[] | 各要素が非空 |
| `architecture_refs` | 非空 string[] | **各要素が repo 内に実在するファイルパス**。containment 検査あり |
| `updated_at` | string | timezone 付き RFC3339 |

### なぜ exact set なのか

余剰キーを許すと「context に書いたのに plan が読まない」設定が静かに増える。実際 `depends_on` / `resource_scope` / `implementation_status` が sidecar に混入していたが、plan はこれらを一切読まない。正本は graph node 側にあり、sidecar の値は重複でしかなかった。exact set は fail-closed でこの重複を拒む。

### `architecture_refs` の語彙

`context.json` は**ファイルパス表記**、`.md` frontmatter と `graph.json` は**node id 表記**を使う。plan ゲートはパスの実在を検査するため、context 側に node id を書くと解決できず落ちる。相互変換の正本は graph node の `file_path` で、正規化は `build-feature-context.py` の `split_architecture_refs()` / `_path_index()` が持つ。

## 2. 作成時検査

```bash
python3 scripts/validate-feature-context.py [--skip-frozen] [--feature <id>] [--json]
```

exit code: `0` 適合 / `1` 契約違反 / `2` 検査不能 (plan ゲート欠落・対象 0 件など)。

設計上の要点は 3 つ。

- **契約を写経しない。** plan ゲートの `validate_feature_context()` を明示パスで import してそのまま呼ぶ。契約が 2 箇所にあると、片方だけ更新されたときに「作成時は緑なのに plan で落ちる」という最悪の乖離になる。`tests/test_validate_feature_context.py::test_the_contract_is_not_reimplemented_in_this_script` が、script 側にフィールド名が現れないことを構造で固定する。
- **検査不能を緑にしない。** plan ゲートが読めない / 対象が 0 件のときは exit 2。契約が消えたことを「違反なし」と報告しない。
- **件数を必ず出す。** `checked N feature (frozen skipped: M)` を常に印字する。0 件検査の緑は「契約を満たした」ではなく「何も見ていない」であり、両者が同じ緑になるのが一番危ない。

### 凍結 (`--skip-frozen`)

`context.json` の sha256 は `goal-spec.json` / `feature-package.json` / `system-build-handoff.json` / `.dev-graph/locks/*.json` の `source_feature_digest` に束縛される。束縛済み feature を書き換えると plan 一式の digest が一斉に stale になるため、CI は `--skip-frozen` で除外して回す。凍結判定は `build-feature-context.py` の `digest_bindings()` を借りており、束縛の定義も 1 つに保つ。

## 3. 本変更で直したこと

導入時の実測で、30 件中 **4 件が plan 不能**のまま滞留していた。

| feature | 違反 | 対処 |
|---|---|---|
| `feat-card-list-shell` | `depends_on` / `resource_scope` 余剰、`architecture_refs` が node id 表記 | 余剰 2 キーを削除、参照をパス表記へ |
| `feat-card-block-authoring` | 同上 | 同上 |
| `feat-card-mutation-safety` | 同上 | 同上 |
| `feat-semantic-emphasis-icons` | `implementation_status` 余剰 | **未修復** (下記) |

削除した `depends_on` / `resource_scope` は graph node の同名フィールドと**完全一致**であることを削除前に検証しており、情報は失われていない。`updated_at` は意図的に据え置いた。これは file の mtime ではなく graph node と同期する parity トークンであり、ここを進めると `build-feature-context.py` の parity ゲートが落ちる。

`feat-semantic-emphasis-icons` の `implementation_status` は **graph node に対応フィールドが無く sidecar だけが持つ情報**で、かつ当該 feature は digest 束縛済み。削ると情報が消え、書き換えると plan digest が stale になる。よって `--skip-frozen` の除外に委ね、plan 一式を作り直す機会に移設する。

### 契約の二重定義だったこと

根本原因は契約が 2 箇所にあったことである。`tests/test_card_feature_contracts.py` は `depends_on` / `resource_scope` を含む **11 キー**を要求し、plan ゲートは **9 キー** exact set を要求していた。card 系 3 feature は前者を満たし後者に違反していたため、**テストは緑のまま plan だけが不能**という状態が検出されずに残った。本変更でテスト側の列挙をやめ、plan ゲートを実際に呼んで「plan できること」を直接確かめる形へ切り替えた。graph 由来の 2 キーは frontmatter と graph の 2 者で突合するよう分離している。

## 4. CI 配線

`.github/workflows/harness-creator-kit-ci.yml` の `verify` job と `scripts/run-ci-checks.sh` の両方へ同一引数で配置する (CI/ローカル parity 契約)。既存の値 parity ゲート (`build-feature-context.py --all --check --skip-frozen`) の直前に置き、キー集合 → 値の順で落ちるようにしている。

## 5. 残件

- `feat-semantic-emphasis-icons` の `implementation_status` 移設 (plan 再生成時)。
- `feat-dev-pipeline-improvement` の `architecture_refs` が `arch-harness-hub-testing-qa` を落としている件 (同じく digest 束縛のため plan 再生成時に `build-feature-context.py --write --feature feat-dev-pipeline-improvement --allow-digest-bound`)。
