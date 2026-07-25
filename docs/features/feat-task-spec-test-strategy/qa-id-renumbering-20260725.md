---
status: confirmed
layer: feature-implementation
task: SYS-TASK-SPEC-TEST-STRATEGY-P13
parent_feature: feat-task-spec-test-strategy
feature_package_id: feature-package/feat-task-spec-test-strategy
package_digest: sha256:7d185f453466523edcc7c6071fde7c24001612da367de329c10ba13c82a43bae
consumes: [system-spec/spec-state.json, system-spec/testing-qa.md, system-spec/00-requirements-definition.md]
---

# qa ID 再採番記録 (qa-070..075 → qa-076..081)

- 日付: 2026-07-25
- 対象 feature: `feat-task-spec-test-strategy`
- 契機: `origin/main` を本ブランチへマージした際の `system-spec/spec-state.json` 衝突解決

## 何が起きたか

本ブランチは testing-qa 章の確定質疑を `qa-070`..`qa-075` として採番していた。マージ先の
`main` には、同じ ID 空間に別内容の確定質疑が既に存在した。

| ID | main 側 (2026-07-22 起源・landed 済み) | 本ブランチ側 (2026-07-24 起源) |
| --- | --- | --- |
| `qa-070` | ドキュメント規約 2 件 (kebab-case 接頭辞体系・1 文書 300 行上限の fail-closed CI lint・仕組みとナレッジのオン/オフ分離) | テストレベル 4 種網羅 (単体・結合・境界値・回帰) |
| `qa-071` | dev-graph 方法論 8 要件 (マクロ構造・exact-13・外側ループ・内側ループ・スコープ分離・情報配置・書き戻し・既存保全と更新統制) | カバレッジ 80% 品質ゲートと失敗時改善ループ |

`qa-071` は `spec-state.json` の `qa_log` 上で正面から衝突した。`qa-070` は `qa_log` 配列には
不在だったが、`issues/sys-qa070-implementation-feature-20260722.md`・`features/feat-doc-governance-portability.md`・
`scripts/lint-doc-line-limit.py` などが実体として参照しており、分岐元 `abd46e5` の時点で既に
消費済みの ID だった。本ブランチはこの記録欠落ゆえに空き番と誤認して再利用した。

### 検出が遅れた理由

`plugins/system-spec-harness/scripts/validate-coverage-matrix.py` の `qa_ids` は
`{e.get("id") for e in data.get("qa_log", [])}` と **集合** で組む。ID が重複しても例外にはならず、
静かに 1 件へ潰れて「qa_ref は全て実在する」と緑を返す。機械ゲートが通っても意味は壊れる
典型で、3-way diff を人手で突き合わせるまで表面化しなかった。

## 決定

**後発である本ブランチ側の 6 件を `qa-076`..`qa-081` へ再採番する。**

- `main` 側は既に landed しており、`qa-070` を参照する既存文書・lint・issue が実在する。動かす
  と参照が全て切れる。
- 本ブランチ側は未 landed で、参照元も本ブランチ内に閉じている。付け替え費用が構造的に小さい。
- `qa-070` は明け渡す。`main` 側 `qa-071` の本文が「要件 7 の命名規則/doc 粒度は qa-070 で確定済み」
  と 9 箇所で参照しており、ここに testing-qa の内容が居座ると仕様書として明確な誤りになる。

### 対応表

| 旧 ID | 新 ID | 確定内容 |
| --- | --- | --- |
| `qa-070` | `qa-076` | テストレベル選定 — 単体・結合・境界値・回帰の 4 レベル網羅 |
| `qa-071` | `qa-077` | カバレッジ目標 — 既定 80% の品質ゲートと未達時の改善ループ |
| `qa-072` | `qa-078` | 層別方針 — FE/BE/インフラ各層のテスト種別と behavior ベース保守性 |
| `qa-073` | `qa-079` | 冪等な仕組み化 — テスト戦略のタスク仕様書への再現可能な組込 |
| `qa-074` | `qa-080` | 対象 platform 境界 |
| `qa-075` | `qa-081` | `qa-079` の章反映 + D8 (Testing Library 採用) 接地 |

確定内容 (`question` / `answer` / `status` / 確定日時) は 1 文字も変更していない。振り替えたのは
`id` と、本文中の相互参照だけである。よって確定の巻き戻しは発生しない。

## 適用範囲と凍結範囲

### 振り替えた live 正本 (30 ファイル / 約 480 箇所)

`system-spec/`・`architecture/`・`features/`・`tasks/feat-task-spec-test-strategy/`・
`docs/features/feat-task-spec-test-strategy/`・`plugins/system-dev-planner/`・
`.dev-graph/state/graph.json` の testing-qa 文脈ノード 15 件。

対象の判定は「landed 済み `main` 側に当該 ID が 1 件も現れないファイル」を本ブランチ由来とみなす
基準で行った。`main` 由来と混在する `.dev-graph/state/graph.json` と
`system-spec/completeness-findings.json` の 2 件だけは、ノード ID / 要素の逐語一致で
要素粒度に切り分けている。ファイル単位の一括置換では `main` の `qa-070` を巻き込むため。

### 旧 ID のまま凍結したもの

- `.dev-graph/plans/generations/feature-package-feat-task-spec-test-strategy/7d185f45…/`
- `eval-log/**`
- `.dev-graph/cache/**`

promote 済み世代は content-addressed で、digest が識別子そのものである。中の ID を書き換えると
digest が変わり、`plugins/system-dev-planner/assets/validation-contract-baseline.json` に登録した
契約 version 1.1.0 の免除エントリが解決不能になる (未知 digest は fail-closed で LATEST へ倒れ、
bootstrap 世代が FAIL する)。実行時証跡も同じ理由で当時のまま残す。

**これらを読むときは本表で読み替えること。** 旧 ID は「2026-07-24 時点の testing-qa 採番」を指す。

## digest の貼り直し

再採番で本文が変わった章は 2 つあり、それぞれを指す digest 束縛を更新した。

| 章 | 旧 digest | 新 digest |
| --- | --- | --- |
| `system-spec/testing-qa.md` | `fd302fb5f8f8…` | `39b66cb40e83ad4b7977c1ed0734b1c86bf1b746511d584e8a72282019b1fd7d` |
| `system-spec/00-requirements-definition.md` (D8 の qa 参照) | `2748f15ad0a9…` | `190b5c6131b7c7817919692648e4b4cecd7124a3b038dbaddc7d206c9dfe081b` |

更新先:

- testing-qa: `architecture/harness-hub-testing-qa.md` の `source_lineage.source_digest` と
  `confirmation_evidence.evaluated_digest`、`features/feat-task-spec-test-strategy.md`、
  `docs/features/feat-task-spec-test-strategy/requirements-baseline.md`、
  `.dev-graph/state/graph.json` (`arch-harness-hub-testing-qa` / `feat-task-spec-test-strategy`)
- 00-requirements-definition: `specs/harness-hub-system-specification.md` の同 2 フィールド、
  `.dev-graph/state/graph.json` (`spec-harness-hub-requirements`)

確認は `plugins/dev-graph/scripts/validate-source-digest.py --registered
arch-harness-hub-testing-qa,feat-task-spec-test-strategy,spec-harness-hub-requirements` で
`checked: 3 / registered_mismatch: []` を実測した。

> `specs/harness-hub-system-specification.md` を `source_path` に持つ feature ノード 8 件の
> digest 不一致は、分岐元 `abd46e5` と `origin/main` の双方に既存する drift であり
> (`issues/sys-features-source-digest-drift-20260722.md` で起票済み)、本再採番とは無関係である。

### 評価結論を移送する根拠

`assign-system-spec-completeness-evaluator` が verdict=PASS を出したのは旧 digest の本文に対して
である (`eval-log/system-spec-harness/assign-system-spec-completeness-evaluator/completeness-report-20260724-testing-qa-r2.json`)。
評価者を再実行せずに `evaluated_digest` を新値へ差し替えているのは、新旧の差分が上表の機械置換
だけであることを次の手順で誰でも再現・反証できるためである。

```bash
for f in system-spec/testing-qa.md system-spec/00-requirements-definition.md; do
  git show <旧 commit>:"$f" \
    | sed -E 's/qa-070/qa-076/g; s/qa-071/qa-077/g; s/qa-072/qa-078/g;
              s/qa-073/qa-079/g; s/qa-074/qa-080/g; s/qa-075/qa-081/g' \
    | shasum -a 256
done
# -> 39b66cb40e83ad4b7977c1ed0734b1c86bf1b746511d584e8a72282019b1fd7d  (testing-qa.md)
# -> 190b5c6131b7c7817919692648e4b4cecd7124a3b038dbaddc7d206c9dfe081b  (00-requirements-definition.md)
```

一致すれば、評価対象の意味内容は不変であり PASS の結論はそのまま成り立つ。一致しなければ
ID 以外の改変が混入しているので、評価者の再実行が必要になる。

## 残課題

1. **`main` 側 `qa-070` が `qa_log` に不在** — 実体 (issue・feature・lint) は存在するのに
   `spec-state.json` の `qa_log` に確定エントリが無い。今回の誤採番の根因であり、`main` 側の
   記録欠落として別途 issue 化する。本 PR では `main` の状態をそのまま保全し、修復しない。
2. **`validate-coverage-matrix.py` の ID 重複が無検出** — `qa_ids` の集合化により重複が
   静かに潰れる。`qa_log` の ID 一意性を fail-closed で検査する追加ゲートを別 issue で起票する。
