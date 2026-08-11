# elegant-review: Harness Hub 画面情報設計

- run-id: `harness-hub-information-design-20260811`
- scope: Harness Hub 製品仕様・frontend architecture・system-spec 生成基盤
- purpose: Qiita の画面改善例を固定的に模倣せず、内容・利用者・タスクに応じて情報と視覚要素を足し引きできる再利用可能な情報設計契約へ変換する
- source: Qiita の本文・画像シーケンス・反証コメント、WCAG 2.2、既存 Harness Hub の確定仕様と実装ゲート
- reset: 既存成果物は削除せず、A案/B案の優劣を前提にしない状態から利用文脈・業務能力・意味構造を再評価した
- orchestration: 俯瞰1 → 独立分析3並列 (9+9+12) → 改善3並列 → 独立再レビュー3並列 → 修正サイクル3
- final verdict: **矛盾なし PASS / 漏れなし PASS / 整合性あり PASS / 依存関係整合 PASS**

## 30思考法の適用証跡

| # | 思考法 | このレビューでの適用と結論 |
|---:|---|---|
| 1 | 批判的思考 | 「表は悪い」「カードは良い」「ラベルは消す」を疑い、条件付きの選定規則へ置換した。 |
| 2 | 演繹思考 | 利用文脈が未確定なら表現形式を確定できないため、required-info を frontend architecture の前提へ接続した。 |
| 3 | 帰納的思考 | S01/S05/S11/S14/S17の走査・比較・一括操作から、画面幅を変えても業務能力を保持する一般則を導いた。 |
| 4 | アブダクション | 読みにくさの最善説明を「装飾不足」ではなく、保存項目から始めて情報の役割を決めない工程欠落と特定した。 |
| 5 | 垂直思考 | 表面の見た目から、view model、認可、意味構造、測定、Dev Graph・Beads証跡まで根を掘った。 |
| 6 | 要素分解 | ラベル、線/余白、アイコン、画像、整列/反復、顕著度、表示加工、patternを独立した意味契約へ分解した。 |
| 7 | MECE | 10工程と要素別意味契約で、工程の抜けと「補完」を別工程に数える重複を解消した。 |
| 8 | 2軸思考 | 初見/熟練と理解速度/処理効率の2軸で、適応型profileと密度variantを選ぶ構造にした。 |
| 9 | プロセス思考 | 利用文脈→取捨→意味判定→グループ→顕著度→加工→pattern→配置→機能→装飾の順を固定した。 |
| 10 | メタ思考 | レビュー自身の固定30手法・4条件・最大3反復を検査し、初回FAILを隠さず次サイクルへ戻した。 |
| 11 | 抽象化思考 | 記事の完成画面を、情報候補・意味関係・表現pattern・検証という汎用モデルへ抽象化した。 |
| 12 | ダブル・ループ思考 | 「Simple is best」自体を疑い、必要なラベル・境界・画像は積極採用する規則へ改めた。 |
| 13 | ブレインストーミング | table/card/list/grid以外にform、wizard、timeline、board、chart+table、tree、master-detailと複合を候補化した。 |
| 14 | 水平思考 | role、task-mode、breakpoint、熟練度、頻度、情報量、誤操作コストから同じ画面の別解を許容した。 |
| 15 | 逆説思考 | 情報を減らすほど、比較・監査・回復に必要な情報を増やす場合があると捉え、削除仮説を可逆化した。 |
| 16 | 類推思考 | 表示patternを共有部品台帳になぞらえ、中央SSOT・variant統合・owner・review triggerを定義した。 |
| 17 | if思考 | UIなし、狭幅、高密度、画像中心、破壊操作、未知pattern、正確日時が必要な場合を分岐検証した。 |
| 18 | 素人思考 | 中学生向け説明と「今の状態/次の操作」を基準にし、英語語彙には定義と実例を付けた。 |
| 19 | システム思考 | knowledge→elicitation→product spec→profile registry→implementation guide→validationの流れを接続した。 |
| 20 | 因果関係分析 | DB直写→同じ強さ→探索増大の連鎖を、利用文脈と顕著度の先行確定で切った。 |
| 21 | 因果ループ | baseline/target/実測→pattern/削除仮説更新のフィードバックを要件化した。 |
| 22 | トレードオン思考 | 初見理解と熟練者の比較・一括操作を二者択一にせず、role/task/breakpoint別profileで両立した。 |
| 23 | プラスサム思考 | 可視ラベルと意味構造を保ちながら冗長装飾だけを減らし、視覚・タッチ・支援技術の価値を同時に上げた。 |
| 24 | 価値提案思考 | 「見栄え」ではなく、発見・理解・正確な判断・完遂・回復を提供価値として定義した。 |
| 25 | 戦略的思考 | 一画面の修正で終わらせず、将来生成されるsystem-specの質問順とknowledge cardへ組み込んだ。 |
| 26 | why思考 | 5 Whysで読みにくさ→同強度→DB起点→文脈未収集→生成/検証ゲート未接続まで特定した。 |
| 27 | 改善思考 | 旧P語彙、二値profile、固定上限、曖昧or、draft参照、旧graph、prompt未接続、証跡digestを3サイクルで解消した。 |
| 28 | 仮説思考 | 文脈先行で完了率・発見時間・誤操作が改善する仮説を、同一代表タスクの前後比較で反証可能にした。 |
| 29 | 論点思考 | 真の論点を「表かカードか」から「必要能力と意味をどう選び証明するか」へ再設定した。 |
| 30 | KJ法 | findingsを意味論、生成時収集、画面profile、品質gate、graph/証跡の5群へ整理して重複修正を避けた。 |

## 収束した改善

- 固定的なラベル全外し・4形式・件数上限を廃止し、要素別意味契約とopen-world pattern台帳へ変更した。
- 顕著度を `lead / context / metadata` に統一し、構築phaseとresponsive patternのP番号衝突を解消した。
- profileを `role × task-mode × breakpoint` にし、S01/S14をwide table、narrow cardへ確定した。
- 読み取り専用値は意味構造、操作部品はaccessible nameとして責務を分離した。
- 相対時刻・短縮IDから、可視または操作可能な正確値へ到達できるようにした。
- 現行machine gate、manual gate、future machine gateを実装実態に合わせて分離した。
- `screen-information-priority` をblocking required-infoとし、R2/R3 promptがcollection orderとUI有無分岐を実行するようにした。
- Dev GraphはC02 upsert経路で現在契約へ同期し、frontend architectureから本追補への依存を追加した。

## 4条件の最終判定

| 条件 | 判定 | 根拠 |
|---|---|---|
| 矛盾なし | PASS | 固定削減とa11y、高密度と狭幅、current/future gate、draft/activeの衝突を解消した。 |
| 漏れなし | PASS | 30/30手法、10工程、6種の視覚手段、UIなし分岐、測定、正確値、未知pattern昇格を被覆した。 |
| 整合性あり | PASS | 用語、工程数、profile、breakpoint、S11項目数、graph/frontmatter/resource scopeを同期した。 |
| 依存関係整合 | PASS | usability→information-design、product goal/target→screen information→frontend arch、UI foundation→information addendum→frontend architectureの順を検証した。 |

## 検証

- system-spec-harness focused tests: `126 passed`; plugin full suite: `566 passed`
- knowledge/required-info DAG: PASS。`screen-information-priority` は `frontend-arch` より前
- Dev Graph schema / artifact placement / local Markdown links / table shape / `git diff --check`: PASS
- 旧契約語彙と未決定profileの残存検索: 0件

Beadsの作業課題は `HarnessHub-f6ix`。仕様は実行タスクではないため `tracker_binding=none` を維持し、作業課題側の `external_ref=dev-graph:spec-harness-hub-information-design-addendum` と本証跡で追跡する。
