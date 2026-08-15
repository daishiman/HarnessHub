---
title: 確認用データセット テスト設計
feature_id: feat-demo-coverage-dataset
graph_node_id: SYS-DEMO-COVERAGE-DATASET-P04
status: confirmed
layer: feature-test
updated_at: "2026-08-15"
consumes:
  - docs/features/feat-demo-coverage-dataset/architecture-decision-record.md
  - docs/features/feat-demo-coverage-dataset/design-review-notes.md
produces:
  - packages/db/__tests__/seed-coverage/
---

# 確認用データセット テスト設計

## 1. 本書の位置づけ

P03 で承認された設計 (`architecture-decision-record.md`、以下 ADR) が満たされたかを判定するテストの合否基準を定める。テストは P05 の実装より先に置き、実装が満たすべき受入契約とする。

本書の時点でテストは red (失敗) である。実装が無いことを理由に skip したり `it.todo` で置いたりはしない。失敗しないテストは契約にならないためである。

## 2. P05 へ要求するモジュール構成

テストから検証できる形を先に決める。CLI の中に全ロジックを畳み込むと、DB 接続を差し替えられず結合テストが書けないため、定義・純関数・CLI を分ける。

| path | 責務 | 主な export |
|---|---|---|
| `packages/db/scripts/demo-coverage/coverage-matrix.ts` | 28 route × 5 状態の対応表 (ADR §2.2) | `COVERAGE_MATRIX`、型 `RouteCoverage` / `RouteState` / `Applicability` |
| `packages/db/scripts/demo-coverage/seed-id.ts` | 論理キー → 決定論 ID (ADR §3.2) | `seedId(logicalKey: string): string` |
| `packages/db/scripts/demo-coverage/fixtures.ts` | fixture 定義・長文文面・件数 (ADR §5・§6) | `FIXTURES`、`LOGICAL_KEYS`、`LONG_TEXT`、`BULK_COUNTS`、`BASE_TIME` |
| `packages/db/scripts/demo-coverage/boundaries.ts` | 実測した表示区切り (ADR §5.1) | `DISPLAY_BOUNDARIES` |
| `packages/db/scripts/demo-coverage/enums.ts` | ドメイン enum 全値 (ADR §10) | `DOMAIN_ENUMS` |
| `packages/db/scripts/demo-coverage/seed.ts` | 投入本体 (ADR §4.2 の S2〜S4) | `seedDemoCoverage(options): Promise<SeedSummary>` |
| `packages/db/scripts/seed-coverage.ts` | CLI。引数解釈とガード (ADR §4.2 の S1) だけを持つ | `main()` 相当 |
| `packages/db/scripts/verify-demo-coverage-matrix.ts` | 網羅検査コマンド (ADR §9) | CLI |

`seedDemoCoverage` は adapter を引数で受け取る。CLI 側で接続を作って渡す形とし、seed 本体が接続文字列を直接読まないようにする。これによりテストは一時ファイルの libSQL へ同じ関数を実行できる。

`LOGICAL_KEYS` は、seed が `seedId` へ渡す論理キーの全件を重複なく列挙した配列とする。ADR §3.3 の衝突検査 (T3-4) は「全論理キーから導出した ID の集合」を必要とするが、seed 実行後の DB からは衝突して消えた行を観測できない。衝突の有無を実行前に判定するには、論理キーの一覧そのものが値として取り出せる必要がある。

`SeedSummary` はテーブルごとの投入件数を持つ。テストは T3-2 で 1 回目と 2 回目の一致だけを見て、値そのものの正しさは DB の実件数 (T6-5) を正とする。実装の自己申告を単独の合否根拠にしないためである (§5 の C4)。

## 3. 6 テストカテゴリと合否基準

### 3.1 T1: route × 状態 網羅性

対応表そのものの整合を見る。実データではなく定義の検査であるため、DB を必要としない。

| # | 判定 | 合格条件 |
|---|---|---|
| T1-1 | 対応表の件数 | `COVERAGE_MATRIX.length === 28` |
| T1-2 | 状態キーの網羅 | 各要素が `empty` / `single` / `bulk` / `longText` / `error` の 5 キーをちょうど持つ |
| T1-3 | 未記入 0 件 | 全 140 セルが `applicable` または `notApplicable` のいずれかに解決する |
| T1-4 | 非適用の理由 | `notApplicable` のセルが `N1`〜`N7` のいずれかの `reason` を持つ |
| T1-5 | 適用セルの到達手順 | `applicable` のセルが 1 件以上の `reach` を持ち、各 `reach` が非空の `actor` / `url` / `fixtures` を持つ |
| T1-6 | 集計の一致 | 適用 105 / 非適用 35 (`requirements-baseline.md` §6.3 と一致) |
| T1-7 | route 集合の一致 | 対応表の route 集合が `apps/hub/src/app` 配下の `page.tsx` から導いた route 集合と一致する |

T1-7 の route 導出はテスト側に独自実装を置く。実装が持つ逆変換関数を使うと、実装の誤りをテストが追認してしまうためである。導出規則は「`(...)` のセグメントを除去」「`page.tsx` を除去」「残りが空なら `/`」とする。

### 3.2 T2: enum 全値網羅

| # | 判定 | 合格条件 |
|---|---|---|
| T2-1 | 定義の規模 | `DOMAIN_ENUMS` が 40 カラム・値の総数 129 (ADR §10 と一致) |
| T2-2 | 定義と schema の一致 | 各カラムの値集合が `packages/db/schema/**` の実定義と一致する |
| T2-3 | 投入後の存在 | seed 実行後、各カラムの各値が DB に最低 1 行存在する |
| T2-4 | 動作前提との両立 | サインインに使うテナント・利用者・連携が、それぞれ有効な状態の行として別に存在する (ADR §10.1) |

T2-3 は結合テストとして扱い、一時ファイルの libSQL へ `seedDemoCoverage` を実行してから SQL で確認する。

### 3.3 T3: 冪等性

| # | 判定 | 合格条件 |
|---|---|---|
| T3-1 | 2 回実行の一致 | 同一 adapter へ 2 回 `seedDemoCoverage` を実行し、投入対象全テーブルのダイジェストが 1 回目と 2 回目で一致する (ADR §4.4) |
| T3-2 | 件数の一致 | 2 回目の `SeedSummary` の件数が 1 回目と一致する |
| T3-3 | ID の決定論性 | 同じ論理キーへの `seedId` が同じ値を返し、Crockford Base32 26 文字である (ADR §3.2 の R1・R2) |
| T3-4 | 論理キーの衝突 0 | 全論理キーから導出した ID の集合の要素数が論理キー件数と一致する (ADR §3.3) |
| T3-5 | 時刻の決定論性 | 投入された時刻列が実行時刻に依存しない (2 回の実行で同一) |

ダイジェストの算出はテスト側に置く。実装が返す自己申告のダイジェストを使うと、実装が壊れたときにダイジェストも同時に壊れて検出できない。

### 3.4 T4: ローカル専用ガード

| # | 判定 | 合格条件 |
|---|---|---|
| T4-1 | 非ローカル URL の拒否 | `libsql://` / `https://` / `http://192.0.2.1` を渡した CLI 実行が終了コード 2 で終わる |
| T4-2 | 書き込み 0 | 拒否された実行の前後で対象 DB のファイルサイズと内容が変化しない |
| T4-3 | ローカル URL の受理 | `file:` / `http://127.0.0.1` / `http://localhost` が拒否されない |
| T4-4 | 判定の非再実装 | `seed-coverage.ts` が `./local-session` から `isLocalDatabaseUrl` を import しており、コメント行と `console.*` 行を除いた本体に URL の形を判定する文字列 (`libsql:` / `http://` / `127.0.0.1` / `localhost` / `'file:`) を持たない (ADR §8.2 の G4) |

T4-1 は子プロセス実行で終了コードを見る。T4-4 は実装ソースの静的検査とする。

CLI の契約を次のとおり定める。`seed-coverage.ts` は `--url <database-url>` を受け取り、無指定なら `TURSO_DATABASE_URL` を読む。**URL の判定は他のどの引数検査よりも先に行う**。他の引数不足でも終了コード 2 になるため、判定を後ろに置くと「URL を拒否したのか、別の引数が足りなかったのか」をテストが区別できない。テストは終了コードに加えて、標準エラーに URL 拒否の文言 (`ローカル DB 専用`。既存 `seed-local.ts` と同じ言い回し) が出ることも確認する。

### 3.5 T5: 長文パターン

| # | 判定 | 合格条件 |
|---|---|---|
| T5-1 | 文字数規約 | 見出し 40 / 本文先頭段落 200 / タグ・カテゴリ名 20 / 利用者名・部署名 25 の各最小文字数を満たす (ADR §6.2) |
| T5-2 | 折返し条件 (L1) | 見出しと本文が句読点・中黒・全角括弧のいずれかを含む |
| T5-3 | 連続文字列 (L2) | タグ名が空白・記号による区切りを持たない |
| T5-4 | 反復でない (L3) | 各文面の最頻文字の出現比率が 20% 未満 |
| T5-5 | 境界 | 規約の最小文字数ちょうどと最小 − 1 を与えたとき、検査が合格・不合格を正しく分ける |

`LONG_TEXT` は `heading` / `body` / `tagName` / `personName` の 4 キーを持ち、各値を文字列の配列とする。fixture が長い見出しを複数必要とするため単一文字列にはしない。テストは各キーの全要素に規約を課す。

T5-4 の 20% は、意味の通る日本語なら最頻文字 (助詞の「の」など) でも 2 割には届かないという経験則による。同一文字で埋めた文面は 1 文字が 100% 近くを占めるため確実に落ちる。

### 3.6 T6: 大量パターンとページング境界

| # | 判定 | 合格条件 |
|---|---|---|
| T6-1 | 境界値の実測一致 | `DISPLAY_BOUNDARIES` の値が実コードの定数と一致する (`BOARD_PAGE_LIMIT` = 100、`METRICS_RANKING_LIMIT` = 10) |
| T6-2 | 件数規則 | 区切りを持つ画面の投入件数が「実測境界値 + 1 以上、かつ 50 以上」、区切りなしが「50 以上」(ADR §5.2) |
| T6-3 | `/builds` の具体 | `/builds` 対象の投入件数が 101 件以上 |
| T6-4 | 境界 3 点 | 境界値 − 1 / ちょうど / + 1 の件数に対し、ページングの跨ぎ判定が「跨がない / 跨がない / 跨ぐ」となる (ADR §5.3) |
| T6-5 | 投入後の実件数 | seed 実行後の実レコード数が `BULK_COUNTS` の宣言値以上である (同一テーブルへ複数の大量パターンが載るため一致では見ない) |

T6-1 は実コードから定数を読み取って比較する。テスト側に 100 や 10 を書き写すと、実コードが変わったときにテストが古い値を守り続けてしまう。

`DISPLAY_BOUNDARIES` は境界ごとに `limit` / `sourcePath` / `constantName` を持つ。値だけを持たせると、テストは「どこの何と一致すべきか」を自前で知る必要があり、結局テスト側へ実装の所在を書き写すことになる。所在を定義ファイル側に持たせれば、実コードが移動したときに定義ファイルの修正で追随でき、テストは触らずに済む。

`BULK_COUNTS` は `{ key, table, count, boundary }` の配列とする。`table` は件数を数える対象のテーブル名、`boundary` は `DISPLAY_BOUNDARIES` のキーまたは `null` (区切りなし) とする。件数を route ではなくテーブルで持つのは、T6-5 が DB の実件数と突き合わせるためである。

読み取りの経路は 2 つある。`BOARD_PAGE_LIMIT` は `apps/hub/src/app/(dashboard)/builds/build-board.tsx` の module 内 const で export されておらず、`METRICS_RANKING_LIMIT` は `@harness-hub/schemas` にあるが `packages/db` はこの package へ依存していない。どちらも import できないため、定義ファイルを読んで `const <名前> = <数値>` を抽出する形で照合する。P05 で `packages/db` の依存を増やしてまで import 可能にはしない。テストが依存追加を強いる状態は、テストの都合が実装の構成を歪めることになるためである。

## 4. テストレベルの割当

| レベル | 対象 |
|---|---|
| 単体 | T1 全件、T2-1・T2-2、T3-3・T3-4、T5 全件、T6-1〜T6-4 |
| 結合 | T2-3・T2-4、T3-1・T3-2・T3-5、T6-5 |
| 境界値 | T5-5、T6-4 |
| 回帰 | T3-1 (2 回連続実行で状態が一致すること自体が回帰の検査) |

### 4.1 「DB 状態ベース」の範囲

task spec は「テストが DB 状態ベースの assertion のみで構成されている」ことを求めている。この要求の意図は、画素位置や DOM 構造といった見た目に依存する検査を持ち込まないこと (task spec の保守性制約の逐語) である。

一方で受入条件 A5 (冪等性) と A6 (ローカル専用ガード) は、DB の最終状態だけを見ても判定できない。冪等性は「2 回実行しても同じ」という実行の性質であり、ガードは「実行が拒否される」ことそのものが仕様だからである。この点は P03 の設計レビューでも申し送り H3 として明示されている。

したがって本設計では、T3 と T4 に限り実行の観測 (終了コード・2 回実行の状態一致・DB ファイルの不変) を assertion に用いる。観測対象はいずれもデータ内容であり、見た目への依存は全テストで 0 件である。

## 5. 保守性の制約

| # | 制約 |
|---|---|
| C1 | assertion はレコード件数・enum 値・文字数・終了コードといったデータ内容に限る。画素位置や DOM 構造に依存しない |
| C2 | 実装の内部関数名やモジュール内部構造に密結合しない。§2 で定めた export だけを入口とする |
| C3 | 実測値 (境界値・enum 値・route 集合) はテストに書き写さず、実コードまたは schema から読み取って比較する |
| C4 | 実装が返す自己申告値 (ダイジェスト・件数) を単独の合否根拠にしない。テスト側で独立に算出した値と突き合わせる |

## 6. 実行方法

```bash
pnpm --filter @harness-hub/db test
```

`vitest.config.ts` の `include` が `__tests__/**/*.test.ts` であるため、`__tests__/seed-coverage/` 配下は追加設定なしで拾われる。`support/` 配下のヘルパは `*.test.ts` ではないため実行対象にならない。

カバレッジ閾値 80% は P05 実装対象コードへ適用する。現在の `coverage.include` に `scripts/**` が含まれていないため、P05 で `scripts/demo-coverage/**` を追加する必要がある。この設定変更は P05 の作業範囲とし、P04 では行わない。

## 7. 現時点の状態

全テストが red である。原因は §2 のモジュールが未実装であることであり、失敗メッセージにその旨と要求 export を含めている。P06 で green 化する。

実測 (2026-08-15、`vitest run __tests__/seed-coverage`): 6 ファイルすべてが failed。内訳は、`beforeAll` の動的 import が落ちる 5 ファイル (T1・T2・T3・T5・T6) と、CLI 不在で個々のテストが落ちる 1 ファイル (T4) である。失敗メッセージの例:

```
P05 未実装: .../packages/db/scripts/demo-coverage/fixtures.ts を読み込めない。
要求 export: LONG_TEXT
契約: docs/features/feat-demo-coverage-dataset/test-design.md §2
```

| ファイル | 対応 | テスト数 |
|---|---|---|
| `__tests__/seed-coverage/coverage-matrix.test.ts` | T1 | 7 |
| `__tests__/seed-coverage/enum-coverage.test.ts` | T2 | 5 |
| `__tests__/seed-coverage/idempotency.test.ts` | T3 | 5 |
| `__tests__/seed-coverage/local-guard.test.ts` | T4 | 4 |
| `__tests__/seed-coverage/long-text.test.ts` | T5 | 5 |
| `__tests__/seed-coverage/bulk-boundary.test.ts` | T6 | 5 |

`support/pending-module.ts` と `support/db-digest.ts` はヘルパであり `*.test.ts` ではないため、実行対象にならない。

## 8. P05 への申し送り

| # | 内容 |
|---|---|
| H1 | §2 のモジュール構成と export 名はテストが直接参照する。名前を変える場合はテストも同時に更新する |
| H2 | `seedDemoCoverage` は adapter を引数で受ける。接続文字列を関数内部で読まない (T3 の結合テストが接続を差し替えられなくなる) |
| H3 | `vitest.config.ts` の `coverage.include` へ `scripts/demo-coverage/**/*.ts` を追加する |
| H4 | T4-4 は静的検査である。URL 判定を `seed-coverage.ts` へ書き写すとテストが落ちる |
