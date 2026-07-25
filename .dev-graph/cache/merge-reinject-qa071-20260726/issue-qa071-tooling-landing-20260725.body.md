# 概要

`system-spec/spec-state.json` の `qa_log` へ確定登録した QA 要件が、plan 成果物の本文へ降りていなくても promote できてしまう。宣言 (tag) と中身 (goal-spec / task spec) の乖離を C12 決定論ゲートが検出しない。

## 背景と問題

qa-071 は「QA 要件は tag だけの宣言では被覆したと見なさない」という方法論要件である。PR #56 (HarnessHub-p73) はこの要件を `qa_log` へ登録するところまでを landed したが、**登録内容が plan に反映されているかを検査する側**は分離された。分離の理由は closure 失効で、検査を実装する 4 ファイルが `plugins/system-dev-planner` の `scripts/` `agents/` `skills/` 配下にあり、`package-contract.depends_on: system-dev-planner` を持つ dev-graph の 3 skill の live-trial 挙動面 closure に取り込まれるためである。

結果として、`tags: ["...","qa-071"]` と書くだけで qa-071 を満たしたことになり、`purpose` / `goal` / `scope_in` / `scope_out` / `acceptance` のどこにも要件の内容が無く、exact-13 の task spec にも trace が無い plan が promote できる状態が残っていた。これは Goodhart 的な緑化 (測定対象を満たさずに測定値だけ満たす) であり、`qa_log` が運用上の飾りになる。

## 現在の挙動

`plugins/system-dev-planner/scripts/validate-system-plan.py` は package 構造・digest・inventory・DAG・task spec 必須節を検査するが、QA 宣言については何も見ない。`qa-071` を tag に含み goal-spec 本文に一切対応記述が無い staging を用意しても violations 0 で pass する。

## 期待する挙動

qa 参照を宣言する plan について、次の 3 軸すべてが揃わない限り fail-closed で落ちる。

1. **登録突合** — 宣言した qa-NNN が `system-spec/spec-state.json` の `qa_log` に存在する (`qa-ref-unregistered`)。
2. **意味被覆** — 当該 qa 要件の見出し語が goal-spec の `purpose` / `goal` / `scope_in` / `scope_out` / `acceptance` に現れる (`qa-semantic-coverage`)。
3. **task trace** — exact-13 の task spec 全件に qa 参照が trace されている (`qa-task-trace`)。

加えて `tags` が解析不能な形の場合は黙って素通りせず `qa-tags-unparsable` で落ちる。既 promote 済み package は台帳の契約 version で検証し、digest を変えずに pass を維持する。

## 再現手順またはユースケース

1. `qa-071` を tag に含むが goal-spec 本文で言及しない staging generation を作る。
2. `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging <generation>` を実行する。
3. 修正前は violations 0 の pass、修正後は `qa-semantic-coverage` / `qa-task-trace` で fail する。

## 影響と優先度

- 影響範囲: system / process — 確定 QA 要件の実効性そのもの。HarnessHub-8wo (本文伝播) は本検査が無いと強制できない。
- 深刻度: high
- 緊急度: 検査が無いまま plan 世代が増えるほど、後追いで意味被覆を要求したときの遡及コストが増える。

## スコープ

- In: 意味被覆検査の実装、契約 version 1.2.0 の追加、evaluator への観点追加、dev-graph 3 skill の live-trial 再取得、監査ヘルパーの責務分割
- Out: qa-071 本文の feature/task への伝播 (HarnessHub-8wo)、promote 済み package の編集、宣言なし feature への遡及適用、他 script の 500 行分割

## 関連グラフ

- 原因/親ノード: issue-validator-contract-version-20260724
- 関連仕様: なし — 本変更は plugin が自分の生成物に課す内部契約であり、正本は `plugins/system-dev-planner/references/feature-execution-package-contract.md` §2.5
- 関連アーキテクチャ: なし — 同上の理由により `architecture/` に対応ノードを持たない
- 解決タスク: 本 issue で直接実装 (HarnessHub-1y6)

## 受入条件

- [ ] planner pytest が全件 PASS し、4 違反 code それぞれに回帰テストがある
- [ ] 既 promote 済み package が digest 不変で status=pass、最新契約で検証される package も violations 0
- [ ] `lint-live-trial-verdict.py --all` が stale-sha 0 で exit 0、`--check-provenance origin/main` も exit 0
- [ ] 3 skill の `scenario-verdict.json` が現行 closure の run を参照している
- [ ] 変更ファイルが全て 500 行以下

## 検証証跡

- コマンド/テスト: `python3 -m pytest plugins/system-dev-planner/tests -q` / `python3 -m pytest plugins/dev-graph/tests -q` / `python3 scripts/lint-live-trial-verdict.py --all` / `python3 scripts/lint-live-trial-verdict.py --check-provenance origin/main`
- 証跡 path: `eval-log/dev-graph/run-dev-graph-{node,decompose,requirements}/live-trial/<run-id>/verdict.json`、`docs/plugin-contracts/system-dev-planner-qa-semantic-coverage.md`
