# Feature execution package contract

## 0. 要件レビュー結論

- **真の論点**: 大きなfeatureの設計・順序管理と、そのfeatureを実装する小taskの実行管理が同じノード粒度に混在していたこと。
- **価値性 PASS**: Dev Graphではfeature単位、Beadsではepic→13 childで見られ、次に何を実行するかの認知コストを下げる。
- **実現性 PASS**: 新componentを増やさず、既存schema/template/C02/C11/C14/C26/C28の契約拡張で実現する。
- **整合性 PASS**: feature間edgeとfeature内task edge、feature statusとtask status、macro writerとmicro producerを分離する。
- **運用性 PASS**: exact-set receipt、12/14件negative gate、feature rollup、Beads epic表示、follow-up feature返却でresume/auditできる。
- **強化ループ**: feature scope明確化→13 taskの具体性向上→実行/evidence精度向上→feature acceptance判断精度向上。
- **バランスループ**: 追加作業発見→14件目を禁止→phase Editまたはfeature candidateへ戻す→package肥大化と責務混線を抑制。

## 1. 責務と粒度

system-dev-planner の 1 run は、dev-graph が管理する **1つの feature** だけを実装可能な小タスクへ変換する。runtime output は「13 lifecycle文書 + 可変N task」ではなく、**Phase 1〜13に1件ずつ対応する、ちょうど13個の実行タスク仕様書**である。各ファイルは説明文書ではなく、dev-graph/Beadsへ登録してclaim・実行・完了できるtask nodeそのものとする。

| 層 | 所有者 | 正本 | 行わないこと |
|---|---|---|---|
| マクロ | dev-graph | program goal、feature、architecture、feature間depends_on、feature進捗 | feature内の13 taskを設計しない |
| ミクロ | system-dev-planner | 1 featureの13 phase task specs、feature内task DAG、handoff | featureを新設・分割しない、別feature taskを直接参照しない |
| 実行投影 | dev-graph C02/C28/C12 | task status/linkage/claim/completion receipt | plan内容やfeature scopeを再定義しない |

## 2. 固定出力形状

1 featureにつき次を1 packageとしてatomic promotionする。

- `feature-package.json`: `feature_package_id`、`parent_feature`、feature input digest、13 taskのexact-set。
- `task-specs/phase-01-requirements.md` … `task-specs/phase-13-release-deploy.md`: ちょうど13個。
- `workstream-inventory.json`: 13 task entry。配列順と`phase_ref`はP01…P13のexact order。
- `task-graph.json`: 13 task nodeと機能内depends_on edgeのみ。
- `system-build-handoff.json`、`atomic-promotion-receipt.json`、`dev-graph-registration.json`。後二者はC11所有、all-or-none apply後の`dev-graph-registration-receipt.json`はdev-graph C02所有とし、handoff producerはreceiptを自己発行しない。
- task specの本文にruntime referenceとして`.dev-graph/staging`を保存しない。goal/manifest/validator/evidenceはpackage-relative pathまたはC11が決定的に生成するcanonical published pathを使い、atomic rename後も解決可能にする。
- published packageはsource digestをgeneration IDとするcontent-addressed pathへ配置し、feature別`current` pointerだけを新世代へ進める。再計画では旧package/旧promotion receipt/旧registration receiptをbyte-for-byte不変で残し、新promotion receiptの`supersedes`と新registration receiptの`supersedes_source_digest`で直前世代を結ぶ。

別の「13 lifecycle phase documents」は生成しない。13 task specs自体がlifecycleを実行する。各taskは同じ`feature_package_id`と`parent_feature`を持つ。

### 2.1 登録先 file_path の命名規約 (feature 単位 namespace)

- `graph_node_registration.file_path` は **`tasks/<parent_feature>/<task-id小文字>.md`** とする (例: `tasks/feat-hub-foundation/sys-hub-foundation-p01.md`)。`tasks/` 直下へのフラット配置は禁止。
- 根拠: 複数 feature を並列で分解・登録・実行する際に、`tasks/` 直下の混在を防ぎ、feature 単位でファイル群・resource_scope・worktree の境界を一致させるため。
- 機械検査: validate-system-plan.py (`registration-file-path`) と promote-system-plan.py が `tasks/<parent_feature>/` 接頭辞を強制し、dev-graph 側 register-package.py も `parent_feature` を持つ node へ同一検査を行う (defense in depth)。`parent_feature=null` の fast-path task はこの規約の対象外。
- legacy 例外: 本規約導入 (2026-07-17) 以前に登録済みの `feat-hub-foundation` package 13 件はフラット配置のまま。移行は C02 (run-dev-graph-node update) 経由の follow-up とする。

### 2.2 supersede 済み世代の自己記述性

supersede 済み世代 directory は pointer/receipt を辿らないと旧世代だと分からない。generations layout 導入前の第 1 世代 (`<published>/<package-slug>/`) は名前が最も発見しやすく render 済み成果物も同居するため、読み手が旧世代を正本と誤読しうる。

- supersede 済み世代 directory は現行世代を指す `SUPERSEDED.json` を持つ。payload は current pointer、旧世代の再計算 digest、旧 promotion/registration receipt の実 bytes の SHA-256 から決まる決定論値とし、生成時刻や実行者を含めない。registration receipt の正準名は `dev-graph-registration-receipt.json`、規約導入前の旧世代だけは `registration-receipt.json` を互換入力とし、両方が併存する場合は authority の二重化として拒否する。marker が receipt digest を束縛することで、canonical files の外側にある旧 receipt の改竄も書込みなし検査が fail-closed で拒否する。`--write-markers` は marker 欠落時の create-only 操作であり、既存 marker が不一致なら上書きせず改竄として拒否する。
- marker は canonical digest の対象集合 (`staging-manifest.json` の `files`) の外側にある付帯 file であり、追加しても旧世代の `published_digest` は変わらない。既存 file を書き換えないため byte-for-byte 不変性を損なわない。
- 旧世代を現行世代の内容へ「追随」させる上書き是正は禁止する。旧世代の実バイトは `supersedes.published_digest` の正しさそのものであり、上書きは記録済み receipt を偽にする。乖離の解消は新世代の promotion で行う。
- 機械検査: `scripts/validate-generation-lineage.py` が feature 別 current pointer を走査し、現行世代の canonical digest 再計算・receipt 3 digest 一致・旧世代の byte-for-byte 不変性・marker の内容一致を fail-closed で検証する。`--write-markers` は marker を冪等に再生成する。

### 2.3 promotion 後も解決可能な再実行コマンド

task spec 本文の `Automated commands` は §2 のとおり `.dev-graph/staging` を保存しないが、`--repo-root . --staging .` のような repository root 起点で解決できない形も同じ理由で禁止する。generation id の直書きは再計画のたびに stale になるため使わない。

- validate-system-plan の再実行は世代非依存の `validate-system-plan.py --repo-root <root> --feature-package <feature_package_id>` を正本形式とする。この経路は feature 別 current pointer から現行世代の published package を解決する。
- 2026-07-22 以前に promote 済みの 15 package (計 195 task spec) は本文に `--staging .` を残したまま不変保持する。executor が読む mutable な task projection (`tasks/<parent_feature>/<id>.md` の `## 実行契約`) 側へ `scripts/build-task-projection-rerun.py` が正本形式を冪等配線し、`--check` が未配線を fail-closed で報告する。planner の 1 feature run では `--feature-package <feature_package_id>` で対象の exact 13 だけに scope し、引数省略の 195 件全体モードは repository 移行・監査に限定する。どちらも対象 0 件は exit 2 とする。

## 3. 13 taskの固定写像

| phase_ref | task responsibility |
|---|---|
| P01 | requirements baseline |
| P02 | architecture and workstream design |
| P03 | independent design review |
| P04 | test-first design |
| P05 | implementation |
| P06 | test execution |
| P07 | feature acceptance |
| P08 | refactoring/migration。不要でも`N/A: reason`を成果として実行する |
| P09 | quality/security/operational assurance |
| P10 | independent final review |
| P11 | reproducible evidence |
| P12 | documentation/runbook/handover |
| P13 | release/deploy/close-out。実デプロイ不要でも`N/A: reason`とclose-out receiptを持つ |

P08/P13もnode自体を省略しない。適用外判断を行う小タスクとして残すため、常に13件である。

## 4. 機能内DAG

- baselineはP01→P02→…→P13の前方依存。`task.depends_on`は同じ`parent_feature`かつ同じ`feature_package_id`内だけを参照する。
- 並列化できる場合は直前phaseへの不要なedgeを減らしてよいが、edgeは常に小さいphase_refから大きいphase_refへ向く。循環、後方edge、別feature task参照は禁止する。
- feature間依存はtaskへコピーしない。dev-graphのfeature A→feature Bを正本とし、B packageのP01 ready gateがA feature doneを参照する派生条件だけを持つ。
- P01 ready gateは`selector=parent_feature.depends_on`、`operator=all`、`required_statuses=[done,closed]`の固定形でinventory/handoff/task specに保存する。schedulerはIDのコピーではなくcanonical parent featureの現行edgeを都度読み、未完了upstreamが1件でもあればP01をreadyから除外する。
- 13件未満・14件以上、phase_ref重複/欠落、parent/package不一致はpromotion前にfail-closedする。

## 5. 発見タスクの扱い

実行中に追加作業を見つけても、同一packageへ14件目を追加しない。

- 既存phaseの責務内なら該当task specをEdit更新する。
- 当該featureのacceptance達成に必須だが独立責務なら、dev-graphへfollow-up feature candidateとして返し、マクロ層でscope/dependencyを再判定する。
- 単なる障害・調査メモはBeads child issueにしてよいが、canonical 13-node DAGの一部にはしない。

## 6. Dev Graph・Beadsへの登録

- C02は13 nodeをall-or-none登録し、`expected_count=applied_count=13`、P01..P13 exact-set、共通`parent_feature`/`feature_package_id`をreceiptで証明する。
- 同じ`parent_feature`/`feature_package_id`/P01..P13 node ID exact-setを新しいsource digestで再登録する場合、C02は13 nodeを単一graph revisionでall-or-none置換する。旧receiptは変更せず、新世代receiptへ`operation=superseded`と直前digestを保存する。一部IDだけの一致、member exact-set変更、同一digestでbytes相違は拒否する。
- Beads profileではfeatureをepic、13 phase taskをそのchild issueとして投影する。task dependencyはbd `blocks`へ写像する。
- GitHub profileではfeatureをMilestoneまたはProject feature item、13 taskをIssueとして投影できる。外部表示は完了authorityではなく、feature完了は13 task全doneから機械導出する。

## 7. 完了条件

featureをdoneへroll upできるのは、登録receiptがexact 13を証明し、そのP01..P13全taskがdoneで、feature acceptanceがP07/P10/P11のevidenceから満たされた場合だけ。子task欠落、余分なcanonical task、未完了phase、acceptance evidence欠落ではfail-closedする。
