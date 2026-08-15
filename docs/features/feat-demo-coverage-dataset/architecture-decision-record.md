---
title: 確認用データセット アーキテクチャ決定記録
feature_id: feat-demo-coverage-dataset
graph_node_id: SYS-DEMO-COVERAGE-DATASET-P02
status: confirmed
layer: feature-design
updated_at: "2026-08-15"
consumes:
  - docs/features/feat-demo-coverage-dataset/requirements-baseline.md
  - packages/db/scripts/seed-local.ts
  - packages/db/schema/
---

# 確認用データセット アーキテクチャ決定記録

本書は `feat-demo-coverage-dataset` の設計契約である。P05 の実装は本書の決定に従い、本書に無い設計判断を独自に行わない。要件の正本は `requirements-baseline.md` であり、本書はそれを実装可能な粒度へ具体化したものである。

## 1. 決定一覧

| ID | 決定 | 節 |
|---|---|---|
| D1 | route × 状態対応表を機械可読なデータ構造として持ち、Markdown 表は生成物とする | §2 |
| D2 | fixture は「論理キー → 決定論 ID」の写像で識別し、実行のたびに ID が変化しない | §3 |
| D3 | 冪等性はテナント単位の削除 → 再投入で実現し、既存 `seed-local.ts` の順序制約を踏襲する | §4 |
| D4 | 大量パターンの件数は画面ごとの実測境界値から導出し、一律 50 件としない | §5 |
| D5 | 長文パターンは文字数規約を満たす固定文面を持ち、乱数生成しない | §6 |
| D6 | エラー状態は既存ドメインの失敗系ステータス値で表現し、障害注入を行わない | §7 |
| D7 | ローカル専用ガードは既存 `isLocalDatabaseUrl` をそのまま再利用し、新しい判定を書かない | §8 |
| D8 | 網羅検査は seed 実行とは独立した検査コマンドとして提供する | §9 |

## 2. D1: route × 状態対応表のデータ構造

### 2.1 方針

`requirements-baseline.md` §6 の 140 セルを、人手で二重管理しない。機械可読な定義ファイルを唯一の正本とし、そこから検査 (A7) を行う。

### 2.2 構造

```ts
type RouteState = 'empty' | 'single' | 'bulk' | 'longText' | 'error';

type Applicability =
  | { readonly kind: 'applicable'; readonly reach: ReachStep[] }
  | { readonly kind: 'notApplicable'; readonly reason: NotApplicableReason };

type NotApplicableReason = 'N1' | 'N2' | 'N3' | 'N4' | 'N5' | 'N6' | 'N7';

interface ReachStep {
  /** サインインに使う利用者の論理キー (§3.2) */
  readonly actor: string;
  /** 到達先の URL。動的 route は実際の識別子まで解決済みとする */
  readonly url: string;
  /** その状態を成立させている fixture の論理キー */
  readonly fixtures: readonly string[];
  /** 実行時操作が要る場合のみ */
  readonly operation?: string;
}

interface RouteCoverage {
  readonly screenCode: string;   // 例: 'S16.USAGE'
  readonly route: string;        // 例: '/metrics/usage'
  readonly states: Readonly<Record<RouteState, Applicability>>;
}

/** 28 件ちょうど。過不足は検査で落とす */
type CoverageMatrix = readonly RouteCoverage[];
```

### 2.3 不変条件

| # | 不変条件 |
|---|---|
| M1 | `CoverageMatrix` の要素数が 28 であり、`route` が `apps/hub/src/app` 配下の `page.tsx` 実測集合と一致する |
| M2 | 各要素の `states` が 5 キーすべてを持つ (欠落は型で落ちる) |
| M3 | `applicable` のセルは `reach` を 1 件以上持つ |
| M4 | `notApplicable` のセルは `reason` を持つ |
| M5 | `reach[].fixtures` が §3 の fixture 定義に実在する論理キーを指す |

### 2.4 Markdown 表の位置づけ

`requirements-baseline.md` §6.3 の表は人が読むための投影であり、定義ファイルから再生成できる状態を保つ。両者の不一致は検査 (§9) で検出する。

## 3. D2: fixture の識別と決定論 ID

### 3.1 課題

既存の `packages/db/repository/ulid.ts` の `newUlid()` は Web Crypto の乱数に依存するため、seed を 2 回実行すると別の ID が生成され、受入条件 A5 (連続 2 回実行で状態一致) を満たせない。

### 3.2 決定

fixture は人が読める**論理キー**で識別し、ID は論理キーから決定論的に導出する。

```ts
/**
 * 論理キーから ULID 形式 (Crockford Base32・26 文字) の ID を決定論的に導出する。
 * seed 専用。実行時コードの newUlid() は置き換えない。
 */
function seedId(logicalKey: string): string;
```

| 要件 | 内容 |
|---|---|
| R1 | 同じ論理キーからは常に同じ ID が得られる (乱数・時刻を入力にしない) |
| R2 | 出力は既存 PK の形式 (Crockford Base32 26 文字) に適合する |
| R3 | 異なる論理キーが同じ ID へ衝突しない |
| R4 | 論理キーは `<領域>/<用途>/<連番>` 形式とする (例: `project/bulk/0042`) |

論理キーの命名を固定することで、§2 の `reach[].fixtures` から fixture を追跡でき、対応表と実データの対応が人にも機械にも追える。

### 3.3 論理キー衝突の検証

要件 R3 (衝突しない) は宣言では担保できない。定義ファイルに含まれる全論理キーへ `seedId` を適用し、得られた ID の集合の要素数が論理キーの件数と一致することを検査する。この検査は §9 の検査コマンドに含める。衝突が出た場合は論理キーの命名で回避し、導出方式の切り詰め幅を広げるなどの場当たり的な変更を行わない。

### 3.4 時刻の扱い

`created_at` などの時刻列も、乱数と同様に非決定性の発生源になる。seed が投入する時刻列は、実行時刻ではなく**固定の基準時刻からの相対値**として算出する。基準時刻は定義ファイル内の定数とする。

## 4. D3: 冪等性の実現方式

### 4.1 既存パターンの踏襲

`packages/db/scripts/seed-local.ts` は、テナント ID を条件に対象テーブルを削除してから再投入している。外部キーの依存順に従い、子から親の順で削除する (実測した既存の削除順: hearingSheets → displayCodeCounters → tenantCoefficients → catalogEntries → publishRequests → releases → targetChannels → projects → auditEvents → userSettings → userWorkspaces → users → workspaces → idpConnections → tenants)。本 feature もこの方式と順序制約を踏襲する。

### 4.1.1 新規に扱うテーブルと削除順の決め方

既存 seed が扱うのは上記 15 テーブルである。§10 の enum 129 値を網羅するには、次の 14 テーブルを新たに扱う必要がある。

`builds` / `buildStageEvents` / `packages` / `deploymentReferences` / `deviceAuthorizations` / `encryptionKeys` / `smokeFixtureLeases` / `documents` / `feedbacks` / `aiJobs` / `hearingShareTokens` / `metricsRollups` / `notionIntegrations` / `tenantDataObjects`

削除順は人手で並べず、次の規則で決める。

| # | 規則 |
|---|---|
| O1 | 対象テーブルの集合は定義ファイルから導出し、既存 15 テーブルと新規 14 テーブルを同じ出所で扱う |
| O2 | 削除順は schema の外部キー参照関係から位相順序 (参照する側が先、参照される側が後) で導出する |
| O3 | 位相順序が一意に定まらない場合はテーブル名の辞書順で安定化し、実行ごとに順序が変わらないようにする |
| O4 | 参照関係に循環がある場合は停止し、順序を推測で決めない |

### 4.2 手順

| 手順 | 内容 |
|---|---|
| S1 | 引数を解釈し、DB URL がローカル専用ガード (§8) を通ることを確認する。通らなければ終了コード 2 で停止し、DB へ一切書き込まない |
| S2 | 対象テナントの既存行を、外部キー依存順 (子 → 親) に削除する |
| S3 | 定義ファイルから fixture を展開し、決定論 ID (§3.2) と固定基準時刻 (§3.3) を用いて親 → 子の順に投入する |
| S4 | 投入件数を集計して標準出力へ出す。件数は定義ファイルから算出できる値と一致する |

### 4.3 冪等性が壊れる条件と防ぎ方

| 壊れる条件 | 防ぎ方 |
|---|---|
| ID が実行ごとに変わる | §3.2 の決定論 ID を使う |
| 時刻列が実行時刻を持つ | §3.3 の固定基準時刻を使う |
| 削除範囲が投入範囲より狭い | 投入するテーブルの集合と削除するテーブルの集合を定義ファイルから同一の出所で導出する |
| 削除がテナント境界を越える | 削除条件は必ずテナント ID を含める |

### 4.4 検証

同じ引数で 2 回実行し、投入対象の全テーブルの内容 (行を主キー順に整列して直列化したもの) のダイジェストが一致することを検査する (A5)。

## 5. D4: 大量パターンの件数

### 5.1 実測した表示区切り

一覧画面の「区切り」は一種類ではない。実測結果は次のとおり。

| 区切りの形 | 該当 | 実測値 |
|---|---|---|
| カーソルページング | `/builds` | `BOARD_PAGE_LIMIT = 100` (`apps/hub/src/app/(dashboard)/builds/build-board.tsx`) |
| 表示上限による切り詰め | `/metrics` のランキング | `METRICS_RANKING_LIMIT = 10` (`packages/schemas/metrics-tracking/contracts.ts`) |
| 区切りなし (全件描画) | 上記以外の一覧 | — |

### 5.2 決定

受入条件 A3 は「50 件以上でページング境界を跨ぐ」と定める。区切りを持つ画面で 50 件を投入しても境界を跨がない場合があるため、件数は画面ごとに次の規則で決める。

| 区切りの形 | 投入件数 |
|---|---|
| カーソルページング / 表示上限あり | 実測境界値 + 1 以上、かつ 50 件以上 |
| 区切りなし | 50 件以上 |

この規則により、`/builds` は 101 件以上、`/metrics` のランキング対象は 50 件以上 (上限 10 を大きく超える) を投入する。境界値は定義ファイル側に実測値として明記し、実装コードの定数を再宣言しない。

### 5.3 境界値テストへの引き継ぎ

P04 は、区切りを持つ画面について境界値 − 1 / 境界値ちょうど / 境界値 + 1 の 3 点を設計対象とする。本書は投入件数の下限のみを定め、テストの具体は P04 に委ねる。

## 6. D5: 長文パターン

### 6.1 決定

長文は乱数生成せず、`requirements-baseline.md` §8 の文字数規約を満たす**固定文面**を定義ファイルに持つ。理由は、乱数生成では A5 (2 回実行で一致) が壊れ、また折返しの発生が実行ごとに変わって再現性が失われるため。

### 6.2 文字数規約 (要件からの再掲)

| 対象 | 最小文字数 |
|---|---|
| 見出し (プロジェクト名・ドキュメント題名・要望題名・シート題名) | 40 |
| 説明文・本文の先頭段落 | 200 |
| タグ名・カテゴリ名 | 20 |
| 利用者名・部署名 | 25 |

### 6.3 文面の性質

| # | 要件 |
|---|---|
| L1 | 日本語の句読点・中黒・全角括弧を含み、実運用に近い折返し条件を作る |
| L2 | タグ名は単語区切りを持たない連続文字列とし、途中で折り返さざるを得ない状況を作る |
| L3 | 文面は意味の通る日本語とし、同一文字の反復で文字数を埋めない (折返し判定が現実と乖離するため) |

## 7. D6: エラー状態の表現

### 7.1 決定

エラー状態は、実行時に例外を注入するのではなく、**既存ドメインの失敗系ステータス値**を持つデータで表現する。障害注入は seed の責務外であり、また A5 の冪等性と両立しにくい。

### 7.2 種別ごとの表現

| 種別 | 表現 |
|---|---|
| 取得失敗 | `publishRequests.status = failed`、`aiJobs.status = failed` / `dead`、`builds` の失敗系 |
| 権限不足 | `users.role = member` の利用者を用意し、管理者専用 route へ到達させる |
| 未同期 | Notion 連携が未接続の状態 (`notionIntegrations` の行を持たない)、`idpConnections.credential_status = pending`、`hearingSheets.status = generating` |

### 7.3 境界

ネットワーク断や DB 接続失敗といった実行時障害の再現は、本 feature の対象外とする。それらの表示検証が必要になった場合は、実ブラウザ検査を担う `feat-ui-integrity-audit-harness` 側の関心事として扱う。

## 8. D7: ローカル専用ガードの維持

### 8.1 決定

新しい URL 判定を書かず、`packages/db/scripts/local-session.ts` の `isLocalDatabaseUrl` をそのまま再利用する。許可される形は `file:` / `http://127.0.0.1` / `http://localhost` の 3 種であり、これを緩和しない。

### 8.2 遵守事項

| # | 事項 |
|---|---|
| G1 | ガードの判定は投入処理より**前**に行い、拒否時は DB へ一切書き込まない |
| G2 | 拒否時の終了コードは既存の実装に合わせて 2 とする |
| G3 | ガードを回避する環境変数・オプション・デバッグ経路を追加しない |
| G4 | ガード判定を seed 側で再実装せず、既存関数の呼び出しに限る (判定が二重化すると片方だけ緩む余地が生まれるため) |

### 8.3 根拠

既存実装のコメントが記すとおり、この判定は「`libsql://` や `https://` を渡せてしまうと本番テナントを消しうる」ことへの一次防壁である。本 feature は削除 → 再投入を行うため、ガードが破れたときの被害は既存 seed と同等かそれ以上になる。

## 9. D8: 網羅検査のインターフェース

### 9.1 決定

網羅検査は seed 実行から独立した検査コマンドとして提供する。seed の内部で自己申告的に検査すると、seed が壊れたときに検査も同時に壊れて検出できないため。

### 9.2 入出力契約

| 項目 | 内容 |
|---|---|
| 入力 | 対応表定義ファイル、fixture 定義ファイル、seed 済み DB の URL |
| 検査 1 (A7) | 対応表の 140 セルに未記入が 0 件である |
| 検査 2 (A7) | 対応表の route 集合が `apps/hub/src/app` 配下の `page.tsx` 実測集合と一致する |
| 検査 3 (A2) | §10 の全 enum 値が、seed 後の DB に最低 1 件ずつ存在する |
| 検査 4 (A3) | 大量パターン対象の件数が §5.2 の規則を満たす |
| 検査 5 (A4) | 長文パターン対象の文字数が §6.2 の規約を満たす |
| 検査 6 | `requirements-baseline.md` §6.3 の表が定義ファイルと一致する |
| 検査 7 (§3.3) | 全論理キーから導出した ID に重複が 0 件である |
| 出力 | 検査ごとの合否と、不合格の場合は不足している具体 (未記入セル、未使用 enum 値など) の列挙 |
| 終了コード | 全検査合格で 0、1 件でも不合格なら非 0 |

### 9.3 A5 / A6 の位置づけ

A5 (冪等性) と A6 (ガード) は DB 状態の検査ではなく実行の検査であるため、本検査コマンドではなく P04 が設計するテストで扱う。

## 10. ドメイン enum 全値 (実測 40 カラム / 129 値)

`packages/db/schema/**/*.ts` の実測結果である。検査 3 (A2) の入力となる。

| 領域 | テーブル.カラム | 値 | 件数 |
|---|---|---|---|
| build-pipeline | `buildStageEvents.from_stage` | hearing / requirements / design / build / test / review / publish | 7 |
| build-pipeline | `buildStageEvents.to_stage` | 同上 | 7 |
| builds | `builds.type` | hearing / improvement / review / bug | 4 |
| builds | `builds.stage` | hearing / requirements / design / build / test / review / publish | 7 |
| core/catalog | `projects.status` | active / suspended / archived | 3 |
| core/catalog | `targetChannels.target` | skill / web_app | 2 |
| core/catalog | `releases.status` | available / suspended / deprecated | 3 |
| core/catalog | `packages.kind` | skills-package | 1 |
| core/catalog | `deploymentReferences.provider` | cloudflare | 1 |
| core/catalog | `catalogEntries.visibility` | private / workspace | 2 |
| core/identity | `tenants.status` | active / suspended | 2 |
| core/identity | `idpConnections.credential_mode` | customer_google / shared_google | 2 |
| core/identity | `idpConnections.credential_status` | pending / tested / active / disabled | 4 |
| core/identity | `idpConnections.pending_credential_mode` | customer_google / shared_google | 2 |
| core/identity | `users.role` | provider-admin / workspace-admin / member | 3 |
| core/identity | `users.status` | active / inactive | 2 |
| core/publish | `publishRequests.status` | draft / validating / needs_fix / ready / approval_pending / approved / publishing / failed / published | 9 |
| core/publish | `publishRequests.verdict` | green / yellow / red | 3 |
| core/publish | `deviceAuthorizations.status` | pending / approved / denied / consumed | 4 |
| core/security | `auditEvents.actor_type` | user / publisher_token / system | 3 |
| core/security | `encryptionKeys.purpose` | salary / idp_secret / tenant_data | 3 |
| core/security | `encryptionKeys.status` | active / retiring / retired | 3 |
| core/smoke | `smokeFixtureLeases.kind` | database / hearing / coverage / publish | 4 |
| docs-cms | `documents.scope` | common / tenant | 2 |
| docs-cms | `documents.status` | draft / published | 2 |
| docs-cms | `documents.thumbnail_source` | auto / manual | 2 |
| docs-cms | `documents.excerpt_source` | auto / manual | 2 |
| feedback-loop | `feedbacks.type` | improvement / review / bug | 3 |
| feedback-loop | `feedbacks.priority` | high / medium / low | 3 |
| feedback-loop | `feedbacks.source` | harness / manual | 2 |
| feedback-loop | `feedbacks.status` | open / in_progress / resolved | 3 |
| hearing-intake | `hearingSheets.status` | received / generating / review / completed | 4 |
| hearing-intake | `aiJobs.kind` | sheet_generation / feedback_response / doc_draft | 3 |
| hearing-intake | `aiJobs.status` | queued / processing / completed / failed / dead | 5 |
| hearing-intake | `displayCodeCounters.kind` | HS / FR / DOC | 3 |
| hearing-intake | `hearingShareTokens.audience` | harness_creator / system_orchestrator | 2 |
| metrics-tracking | `metricsRollups.period` | daily / weekly | 2 |
| metrics-tracking | `metricsRollups.dimension` | tenant / harness / department / user | 4 |
| notion-integration | `notionIntegrations.mode` | url / api_key | 2 |
| tenant-data | `tenantDataObjects.kind` | knowledge_doc / run_input / run_output / hearing_screenshot | 4 |

合計: 40 カラム / 129 値。

### 10.1 動作前提と衝突する enum 値の扱い

一部の enum 値は、「テナント `local` が有効で、seed した利用者でサインインできる」という動作前提と正面から衝突する。単純に既存行の値を書き換えると、画面に到達できなくなる。

| 衝突する値 | 衝突の内容 | 扱い |
|---|---|---|
| `tenants.status = suspended` | サインイン対象テナントを停止すると全画面へ到達できない | サインインに使うテナントとは別に、停止状態のテナントを 1 件用意する |
| `users.status = inactive` | サインインに使う利用者を非活性にするとサインインできない | サインイン用の利用者とは別に、非活性の利用者を用意する |
| `idpConnections.credential_status = disabled` | 認証連携を無効にするとサインイン経路が塞がる | サインインに使う連携とは別の連携行として用意する |

この扱いにより、対象テナントは「サインインに使う主テナント」と「停止状態の副テナント」の 2 件になる。§4 の削除条件がテナント境界を含むという制約 (§4.3) は 2 件それぞれに対して適用する。

### 10.2 画面に現れないテーブルの enum

`encryptionKeys` / `smokeFixtureLeases` / `auditEvents.actor_type` / `buildStageEvents` などは、28 route のいずれにも直接表示されない。受入条件 A2 は「各ドメインモデルの enum ステータスが全値」と定めており、画面表示の有無で対象を絞っていない。したがってこれらも投入対象に含め、検査 3 (§9.2) の対象とする。画面到達手順 (§2 の `reach`) は持たない。

## 11. 既存 schema への影響

本設計は `packages/db/schema/**` への列追加・型変更・制約変更を伴わない。既存 schema が表現できる値の範囲内で fixture を構成する。したがって移行 (migration) と後方互換の考慮は不要であり、P08 における該当判定は「非該当」となる。

## 12. テスト方針の固定 (P04 への引き継ぎ)

| レベル | 対象 |
|---|---|
| 単体 | 決定論 ID の導出 (同一入力で同一出力・衝突なし)、fixture 生成規則 |
| 結合 | seed 実行 → DB 状態の確認 (enum 網羅・件数・文字数) |
| 境界値 | 表示区切りの前後 3 点 (§5.3)、長文の規約文字数の前後 |
| 回帰 | 同一引数の連続 2 回実行で状態が一致すること (A5)、非ローカル URL の拒否 (A6) |

| 制約 | 内容 |
|---|---|
| C1 | テストは画面の DOM 構造や画素位置に依存せず、データ内容 (enum 値・件数・文字数) を契約とする |
| C2 | カバレッジ目標 80% は P05 が実装するコードに適用する。定義ファイル (データのみ) は対象としない |

## 13. 未解決事項

現時点で本設計に未解決の判断は無い。P03 のレビューで指摘が出た場合は、本書へ反映してから P04 以降へ引き継ぐ。
