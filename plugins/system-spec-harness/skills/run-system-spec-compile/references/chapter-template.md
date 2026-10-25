# 章別 Markdown 構造テンプレート

`scripts/compile-spec-doc.py` が各カテゴリ章 (`system-spec/<category>.md`) を生成する際の決定論構造。

**正本関係**: 章の**構造** (節の順序・frontmatter キー・各節が何を載せるか) の正本は本ファイル。その構造を**生成する実装**の正本は `../../../lib/spec_docset_chapters.py` の `render_chapter` (`scripts/compile-spec-doc.py` は同 module を star import する CLI 入口で、自前に持つのは `load_json` / `main` だけ。章レンダリング関数は定義しない)、受入は `../fixtures/expected-*.md` (`tests/` の下ではなく skill root 直下)。実装を変えたら本ファイルを同じ commit で追随させる (実装だけ進んで説明が取り残されると、本ファイルを読んで書いた章が実体と食い違う)。

## frontmatter (確定マーカー・C11 hook 判定ソース)

```
---
status: confirmed        # 終端カテゴリ (集約=確定/対象外) は confirmed / 進行中 (未着手/収集中) は draft
category: <category-id>  # 章のカテゴリ id (例: database)
aggregate: 確定          # 真理値表導出の集約状態 (未着手/収集中/確定/対象外)
spec_cells: [<category>.web, <category>.mobile, <category>.tablet, <category>.desktop-windows, <category>.desktop-linux, <category>.desktop-macos]
serves_goals: [G1, G2]   # 章の確定セル serves_goals の和集合 (要件 C9 anchor)
---
```

- `status`: 集約が終端 (確定/対象外) のとき `confirmed`、進行中 (未着手/収集中) のとき `draft`。
- `aggregate`: セル状態から真理値表で再導出 (`category_aggregate` 宣言値を鵜呑みにしない)。
- `spec_cells`: 章が対応する `<category>.<platform>` セル id 一覧 (canonical platform 順)。
- `serves_goals`: 章の確定セルが資する上位概念ゴール id の和集合。`00-requirements-definition.md` の goals へトレースし、どのゴールにも資さない収集を `--require-foundation` が drift として検出する。確定セルが無い章では空になる。

## 本文セクション

順序厳守。**全節を常に出力する** (入力の有無で節を落とさない)。該当データが無い節は見出しを残したまま不在を明示する placeholder を置く (例: 確定セルが 0 件の章でも `## 確定内容 (質疑録)` を出し、本文に `- (確定セルなし。本章は対象外または収集中)` を置く)。空節を落とすと「確定セルが 0 件である」事実が章から消え、未確定が不可視になる — fail-visible を優先する設計であり、受入は `../fixtures/expected-maintenance-ops.md` (確定セル 0 件でも 5 節すべてを保持) が固定している。

1. **見出し + 集約サマリ**: `# <label> (<category>)` と集約状態・確定マーカー。
2. **カテゴリ別収集状態** 表: 各 canonical platform の状態 (未収集 / 対象外+理由 / 確定+qa_ref)。

   | プラットフォーム | 状態 | 根拠 |
   |---|---|---|
   | Web (web) | 確定 | 確定質疑: qa-database |
   | ... | 対象外 | 理由: <除外理由> |

3. **確定内容 (質疑録)** (`## 確定内容 (質疑録)`): 確定セルが参照する qa entry を `### <qa_id> (対応セル: <platform>, ...)` の小見出しで並べ、**質問**と**回答**を原文のまま載せる。要約・言い換えで置き換えない (回答本文が確定の一次根拠であり、compile は転記だけを担う)。

4. **上流指針 (doctrine anchor)** (`## 上流指針 (doctrine anchor)`): `doctrine-anchor-registry.json` (C15) が当該 category の concern へ割り当てた authority を、concern / authority (正本) / 導く上流原則 / 出典 の表で示す。registry は具体技術を直書きせず上流工程を導くのみなので、この節は選定結果ではなく**選定が従属する指針**を書く。

5. **適用された設計知識**: カテゴリに割り当てた `ref-system-design-knowledge/references/*.md` の deep card 本文 (目的/解決する問題/適用条件/非適用条件/トレードオフ・失敗モード/goalへの寄与) + 末尾「本章での適用」節。card 本文は汎用原則の逐語転記のため、末尾節では `qa_log[].design_applications` の具体原則、`applied|not_applicable`、章固有理由、trade-off を確定 qa_ref・対応セル・serves_goals へ束縛する。記録が無い旧 state は未記録を明示し、compiler が定型の適用済み文で補完しない。複数 card が該当する章では、resource-map.yaml の記述順ではなく `knowledge-catalog.json` の depends_on が定める位相順 (topo_order・C14) で並べる (依存先の知識を依存元より先に反映する)。
6. **最新ドキュメント出典** 表: 割り当てた fetched-references (対象 / version / 公式発行元 (host) / source_url / 取得 / 最新確認)。未割当は index.md の全体出典へ。

## canonical platform 順序 (厳守)

`web, mobile, tablet, desktop-windows, desktop-linux, desktop-macos`
