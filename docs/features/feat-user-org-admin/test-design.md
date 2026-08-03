---
status: confirmed
layer: feature-test-design
task: SYS-USER-ORG-ADMIN-P04
parent_feature: feat-user-org-admin
feature_package_id: feature-package/feat-user-org-admin
source: docs/features/feat-user-org-admin/design-review-notes.md
feature_context_digest: sha256:e67d33e37c98456225d7391c7f47a71c19e2efe043a76607487a50897adfa84f
architecture_refs: [arch-harness-hub-security, arch-harness-hub-backend, arch-harness-hub-frontend]
---

# feat-user-org-admin テストファースト設計

> **位置づけ**: P04 の成果物。[architecture-decision-record.md](./architecture-decision-record.md) (P02)、[design-review-notes.md](./design-review-notes.md) (P03、条件付き承認) で確定した設計を、**P05 実装の受入契約**として実行可能なテスト ID へ写像した記録。ここで定義した ID の主体を P05 が実装し、P06 が実行し、P07/P10 は**実行された証拠のみ**を裁定する (task spec の Trace rule)。本書は P04 時点の成果物であり、P06 実行結果セクションは含まない (§7 は未作成。実行後に別途追記される)。

## 0. サマリ

| 項目 | 値 |
|---|---|
| テスト配置 | `apps/hub/tests/user-org-admin/` (10 ファイル) |
| P04 で定義したテスト ID | **89 件** |
| うち契約層 (実行可能・pass 済み) | **47 件** |
| うち受入層 (`it.todo`。P05 が実テストへ昇格) | **42 件** |
| 2026-08-03 再実行結果 | `Test Files 13 passed (13)` / `Tests 124 passed | 21 todo (145)`。係数更新＋監査、通知実配線の todo は受入未達として扱う |
| 実行コマンド | `pnpm --filter @harness-hub/hub exec vitest run tests/user-org-admin/` |

### 契約層と受入層

契約層 (47 件) は既存の共通層 (`shared/pii`・`shared/notification`・`lib/authz`) を実際に import して呼び出す、今日から実行可能なテストである。受入層 (42 件) は P05 が新設する API route・repository・実画面・zod スキーマを対象にした `it.todo` であり、実装が着地した時点でそのまま実テストへ昇格する設計にしてある (参照実装をテスト内に先置きしてあるため、差し替え箇所は import 元のみ)。

| 層 | 対象 | 状態 | 意図 |
|---|---|---|---|
| **契約層 (47 件)** | `shared/pii`・`shared/notification`・`lib/authz` の実測値・ADR 記載の 9 件の quality_constraint exact-set・cross-feature 依存の実装有無 | pass | P05 が ADR の決定から外れた瞬間に既存テストが赤くなる |
| **受入層 (42 件)** | P05 が書く zod スキーマ・API route・repository 書込み port・実画面・legal ページ | todo | P05 の実装対象を先に確定し、Trace rule に沿って P06 で実行する |

契約層はすべて **Goodhart 対策の生存確認**を同居させている (走査 0 件で緑にしない・空 DOM で緑にしない・検出器が実際に発火することを変異入力で確認する・固定値を返すだけの偽実装を検出する)。

---

## 1. 配置と、task spec からの逸脱

| 項目 | task spec の宣言 | 実際の配置 | 理由 |
|---|---|---|---|
| テストスタブ | `apps/hub/src/features/user-org-admin/__tests__/` | **`apps/hub/tests/user-org-admin/`** | `apps/hub/vitest.config.ts` の `include` は `tests/**/*.{test,spec}.{ts,tsx}` と `src/__tests__/**/*.test.{ts,tsx}` のみで、`src/features/**/__tests__/**` は対象外。spec の宣言先に置くと **P06 が実行できず**、Trace rule (P04 が定義し P06 が実行する) を構造的に破る |

- 根拠: `apps/hub/vitest.config.ts` の `test.include` を直接確認した実測 (spec 記載パスはこの include に一致しない)。
- 先行事例: `apps/hub/tests/hearing-intake/`、`apps/hub/tests/auth-tenancy/`、`apps/hub/tests/a11y/`、`apps/hub/tests/shared-layers/` がすべて同じ配置パターン (`apps/hub/tests/<feature-name>/`) を採用している。feat-hearing-intake の test-design.md §1 も同型の逸脱を承認条件 C-2 として明記しており、本書はその前例を踏襲する。
- `src/**` はカバレッジ計測対象 (`coverage.include`) であり、テストを置く場所ではない。
- **この逸脱は P04 の裁量ではなく、実行可能性を担保するための構造的な補正**である。P07/P10 は spec の path 文字列ではなく「P06 が実行できたか」で判定すること。

### ファイル構成

| ファイル | テストカテゴリ | ID 接頭辞 | 契約 (実行) | 受入 (todo) |
|---|---|---|---|---|
| `quality-constraints-exact-set-contract.test.ts` | quality_constraints 9 件 exact-set・digest 一致 | `UOA-QC-` | 4 | 0 |
| `pii-salary-contract.test.ts` | AD-5 salary マスキング (`maskPii`/`canView`/`maskPiiForExport`) | `UOA-PII-` | 9 | 4 |
| `authz-role-rules-contract.test.ts` | AD-8 役割判定の `ACTION_RULES`/`atLeast` 完全委譲 | `UOA-AUTHZ-` | 6 | 3 |
| `audit-event-vocabulary-contract.test.ts` | AD-5/AD-6 監査イベント語彙・raw 値非露出 | `UOA-AUDIT-` | 5 | 3 |
| `notification-message-contract.test.ts` | AD-7 通知メッセージ組立て・実 dispatcher 結線 | `UOA-NOTIF-` | 5 | 3 |
| `coefficients-repository-contract.test.ts` | AD-4 `tenant_coefficients` 読取り port 消費 | `UOA-COEF-` | 3 | 3 |
| `metrics-rollup-repository-contract.test.ts` | `metrics_rollups` 実装有無確認 (P03 指摘事項4) | `UOA-METRICS-` | 3 | 2 |
| `legal-page-contract.test.ts` | `/legal` 全利用者アクセス方針 | `UOA-LEGAL-` | 2 | 5 |
| `screens-a11y-contract.test.tsx` | AD-2 S17/S18 axe a11y | `UOA-A11Y-` | 8 | 4 |
| `api-routes-acceptance.test.ts` | zod スキーマ契約・HTTP route 結合 | `UOA-API-`/`UOA-ROUTE-` | 2 | 15 |
| **合計** | | | **47** | **42** |

---

## 2. カテゴリ別の合否基準

### 2.1 quality_constraints 9 件 exact-set (`UOA-QC-*`)

| 項目 | 内容 |
|---|---|
| **対象** | requirements-baseline.md (P01) の quality_constraints は 8 件記載だが、architecture-decision-record.md (P02)「実装追補・未解決事項」が 9 件目 `legal-static-page-all-users` を申し送っている。本タスクの指示は ADR 側の記載を優先し 9 件を exact-set として扱うことを明示している |
| **合格条件** | ① baseline の §5 表が現行 8 件のまま (勝手に書き換えない) ② ADR が 9 件目を明示的に含む ③ 8+1=9 件の集合に重複が無い ④ 両文書の `feature_context_digest` が一致する |
| **不合格条件** | ADR から 9 件目の記述が消える / digest が食い違う (P01/P02 間で goal-spec が再確定されたのに転記が追随していない兆候) |
| **判定方法** | 両 markdown を静的に読み、表・見出しから抽出。書式が崩れると 0 件になり検出できる (Goodhart 対策) |
| **実行 ID** | `UOA-QC-001`〜`004` |

### 2.2 salary PII マスキング (`UOA-PII-*`)

| 項目 | 内容 |
|---|---|
| **対象** | AD-5: salary の PII 判定・マスキングは feature 独自関数を作らず、`apps/hub/src/shared/pii/` の実関数 (`maskPii`/`canView`/`maskPiiForExport`) をそのまま使う |
| **合格条件** | ① workspace-admin/provider-admin は実値を見られる ② member/owner はマスクされる (`***`) ③ policy 対象外フィールドは影響を受けない ④ salary が null のときも null のまま ⑤ export 経路は viewer の role に関わらず常にマスクする ⑥ 未知の role は fail-closed (安全側に倒れる) ⑦ `toPiiViewer` (AD-5 のコード例) が role リテラル比較を持ち込まない |
| **不合格条件** | feature 側に独自の mask 関数がある / role リテラル (`role === 'admin'`) で判定する / export でも実値が漏れる |
| **判定方法** | 実関数を直接 import して呼ぶ。`toPiiViewer` は AD-5 のコード例と一致する実装をテスト内に置き、`atlast()` (`atLeast`) の関数引数としての使用が `check-single-authz-middleware.mjs` の `ROLE_COMPARISON` に抵触しないことも確認 |
| **実行 ID** | `UOA-PII-001`〜`009` |
| **受入 ID** | `UOA-PII-101`〜`104` (実 API route での salary 読取り結線、export エンドポイント結線) |

### 2.3 役割判定の authz 完全委譲 (`UOA-AUTHZ-*`)

| 項目 | 内容 |
|---|---|
| **対象** | AD-8: role 判定は `apps/hub/src/lib/authz/rules.ts` の `ACTION_RULES` と `withAuthz` に完全委譲し、feature コードで role リテラル比較を行わない (`check-single-authz-middleware.mjs` が repo 全体で強制する不変条件) |
| **合格条件** | ① 6 action (`users.read`/`users.write`/`users.role_change`/`users.read_salary`/`users.write_salary`/`coefficients.change`) がすべて `ACTION_RULES` に `minRole:'workspace-admin', credential:'session', requiredScope:null, selfOnly:false` で登録済み ② P03 申し送り事項1: `GET /api/v1/users` は `docs/backend-spec-api-state.md` ではなく現行 `rules.ts` (workspace-admin 限定) を正本として扱う、という前提をテスト docstring に明示する ③ `me.read`/`me.update`/`coefficients.read` は P04 時点で未登録 (P05 の新設対象であることの canary) ④ `ROLE_ORDER` が weak→strong の順で固定されている |
| **不合格条件** | feature コードが role 文字列を直接比較する / `ACTION_RULES` を経由しない独自の認可分岐がある |
| **判定方法** | `ACTION_RULES`・`findActionRule`・`atLeast`・`ROLE_ORDER` を実際に import して呼ぶ実測 |
| **実行 ID** | `UOA-AUTHZ-001`〜`006` |
| **受入 ID** | `UOA-AUTHZ-101`〜`103` (実 API route での `withAuthz` 結線、`me.*`/`coefficients.read` 登録後の実測) |

### 2.4 監査イベント語彙 (`UOA-AUDIT-*`)

| 項目 | 内容 |
|---|---|
| **対象** | AD-5 決定4・AD-6: role 変更・salary 変更・salary 読取り・coefficient 変更は監査必須で、summary に raw 値 (実際の金額) を含めない |
| **合格条件** | ① 4 種の action 語彙 (`user.role_change`/`user.salary_change`/`user.salary_read`/`coefficient.change`) が固定されている ② salary 読取りに対する監査記録が必須(読み取っただけでも記録される) ③ summary オブジェクトに実際の salary 値が一切含まれない |
| **不合格条件** | salary の実額が監査ログの summary に載る / salary 読取りが監査対象から漏れる |
| **判定方法** | 実 `AuditRepo` は DB adapter が必要で apps/hub 単体テストからは呼べないため、`AuditRepo.append({action, summary})` と同じ契約形状を持つ `FakeAuditRepo` 参照実装と `withSalaryReadAudit()` ラッパーをテスト内に定義して固定する |
| **実行 ID** | `UOA-AUDIT-001`〜`005` |
| **受入 ID** | `UOA-AUDIT-101`〜`103` (実 `AuditRepo` への実結線・ハッシュチェーンとの整合) |

### 2.5 通知ディスパッチ (`UOA-NOTIF-*`)

| 項目 | 内容 |
|---|---|
| **対象** | AD-7: role 変更等の通知は `apps/hub/src/shared/notification/` (`NotificationDispatcher`/`NotificationMessage`) をそのまま使う |
| **合格条件** | ① メッセージ形状が `NotificationMessage` 契約と一致 ② 実 `createNotificationDispatcher` で 2 つの fake transport へ実際に配送できる ③ 本文・件名に PII キーワード (`salary`/`年収`/`¥`/`給与`) が含まれない ④ 本文が空でない (Goodhart 対策) ⑤ 単一チャンネル失敗が他チャンネルへ波及しない |
| **不合格条件** | feature 独自の通知経路を作る / 本文に金額情報が漏れる |
| **判定方法** | 実 `createNotificationDispatcher` を呼び、AD-7 のコード例に沿った `buildRoleChangedMessage()` をテスト内参照実装として置く |
| **実行 ID** | `UOA-NOTIF-001`〜`005` |
| **受入 ID** | `UOA-NOTIF-101`〜`103` (実 API route からの結線、実 transport (email/in_app) との統合) |

### 2.6 `tenant_coefficients` 読取り port 消費 (`UOA-COEF-*`)

| 項目 | 内容 |
|---|---|
| **対象** | AD-4: `tenant_coefficients` は feat-hearing-intake が owner。本 feature はスキーマ定義・migration を一切行わず、読取りは `HearingIntakeRepository.getCoefficients()` のみを port として消費する。書込み port (`updateCoefficients`) は現時点で存在せず、cross-feature follow-up として未確定 |
| **合格条件** | ① `getCoefficients(context)` を1回だけ呼び、他メソッドを呼ばない ② 返り値の型 (`annualHours`/`minutesPerRun`/`sheetReductionRate`/`updatedBy`) が AD-4 記述と一致 ③ テナントを変えると呼出し引数も追随する (固定値を返す偽実装の検出) |
| **不合格条件** | feature 側が `tenant_coefficients` のスキーマを複製する / 読取り以外のメソッドを呼ぶ |
| **判定方法** | `Pick<HearingIntakeRepository, 'getCoefficients'>` 型の consumer 関数を定義し、fake repo に対して呼出し履歴を検証 |
| **実行 ID** | `UOA-COEF-001`〜`003` |
| **受入 ID** | `UOA-COEF-101`〜`103` (書込み port が feat-hearing-intake 側で確定した後の契約テスト。**P05 着手前に AD-4 の cross-feature follow-up が確定していることが前提**) |

### 2.7 `metrics_rollups` 実装有無確認 (`UOA-METRICS-*`、P03 指摘事項4)

| 項目 | 内容 |
|---|---|
| **対象** | design-review-notes.md 指摘事項4: AD-2 の個別ダッシュボード (S17) は `metrics_rollups` (dim=user) の読取りを前提とするが、owner (feat-metrics-tracking) 側の実装が `packages/db/schema`・`packages/db/repository` のいずれにも存在しない。AD-4 と同型の cross-feature 依存だが、AD-2 側には同水準の明示的な手当てが無いと P03 が指摘した |
| **合格条件** | ① `packages/db/schema` に `metrics_rollups` の定義が無い (現状) ② `packages/db/repository` にそれを読む repository が無い (現状) ③ 走査ロジック自体は健全で、既存の `tenant_coefficients` は検出できる (Goodhart 対策) |
| **不合格条件 (=このテストが赤くなる条件)** | feat-metrics-tracking 側が `metrics_rollups` を実装した瞬間。これは「テスト失敗」ではなく「P05 着手前に確認が必要」という P03 の申し送りを実行可能な形で表現した合図であり、赤くなったら本ファイルを consumer 契約テストへ書き換える |
| **判定方法** | ファイルシステムを再帰走査して文字列一致を確認する、実行するたびに正本を再検査する契約テスト。`it.todo` にしない (宣言だけでは P05 が見落とせるため) |
| **実行 ID** | `UOA-METRICS-001`〜`003` |
| **受入 ID** | `UOA-METRICS-101`〜`102` (実装確定後の port 消費契約、または P05 実装からの除外判断) |

### 2.8 `/legal` 全利用者アクセス方針 (`UOA-LEGAL-*`)

| 項目 | 内容 |
|---|---|
| **対象** | 9 件目の quality_constraint `legal-static-page-all-users` / acceptance3「`/legal` は全利用者が閲覧できる」。未ログインを含む全利用者に公開する静的ページで、認可判定 (`ACTION_RULES`) の対象に含めない設計が前提 |
| **合格条件** | ① `legal.read`/`legal.write` という action が `ACTION_RULES` に存在しない (=設計上そもそも要らないことの固定) ② `/legal` 実装ディレクトリが P04 時点でまだ存在しない (P05 の新設対象であることの確認) |
| **不合格条件** | `/legal` に対して role 制限の action が新設される (設計逸脱) |
| **判定方法** | `findActionRule()` の実測 + ファイルシステム存在確認 |
| **実行 ID** | `UOA-LEGAL-001`〜`002` |
| **受入 ID** | `UOA-LEGAL-101`〜`105` (未ログインで 200・role 4 種で内容同一・axe=0・PII 語彙非含有・内容更新 owner の運用ドキュメント確認) |

### 2.9 axe a11y (`UOA-A11Y-*`)

| 項目 | 内容 |
|---|---|
| **対象** | AD-2: S17 (一覧・個別ダッシュボード) / S18 (アカウント設定) は `@harness-hub/ui` の既存部品のみを消費し、独自実装を持たない (quality_constraint `axe-a11y-zero`) |
| **合格条件** | ① AD-2 が指定した部品構成 (`DataTable`/`KpiCard`/`InlineEditTable`/`ConfirmDialog`/`TextInput`/`Select`) の axe 違反が **0 件** ② S17 一覧の列定義に salary 列が存在しない (マスクではなく DOM に一切出さない設計、AD-5) ③ 空 DOM による自動緑化でない (Goodhart 対策) ④ ラベル無し入力を混入させると検出器が実際に発火する (Goodhart 対策) |
| **不合格条件** | 違反 1 件以上 / salary 列が DOM に存在する / 検出器が変異入力でも発火しない |
| **判定方法** | `renderToStaticMarkup` → jsdom へ載せ替え → `axe.run(document)`。部品単体の a11y は `packages/ui` 側の責務なので重複させず「組み合わせ」のみを検査する |
| **実行 ID** | `UOA-A11Y-001`〜`008` |
| **受入 ID** | `UOA-A11Y-101`〜`104` (実画面 3 枚・role 別画面差分) |

### 2.10 zod スキーマ契約・HTTP route 結合 (`UOA-API-*`/`UOA-ROUTE-*`)

| 項目 | 内容 |
|---|---|
| **対象** | AD-3: `packages/schemas/user-org-admin/` に zod 単一ソースで API 契約を置く。API route・PII 実結線・監査記録・selfOnly 制御はすべて P05 の新設対象 |
| **合格条件** | 実装後に zod スキーマが salary フィールドを maskPii 経由でのみ変化させる、role 変更で `user.role_change` が監査記録される、CSV export が `maskPiiForExport` を通す、`/api/v1/me` が selfOnly で他ユーザーを解決しない、等 (§3 対応表を参照) |
| **判定方法** | P05 実装後に本ファイルの `it.todo` を実テストへ昇格する。現時点では `packages/schemas/user-org-admin/` と `apps/hub/src/app/api/v1/users` が存在しないことのみを実測で固定し (Trace rule の裏付け)、対象実装が無い段階の it.todo であることを構造的に示す |
| **実行 ID** | `UOA-API-000`、`UOA-ROUTE-000` |
| **受入 ID** | `UOA-API-001`〜`006`、`UOA-ROUTE-001`〜`008`、`UOA-ROUTE-101` |

---

## 3. Normative evidence の対応 (task spec 必須項目)

| # | Normative evidence | 対応テスト ID (契約/受入) | 検証の実体 |
|---|---|---|---|
| 1 | quality_constraints 9 件 exact-set (ADR 優先) | `UOA-QC-001`〜`004` | baseline 8 件 + ADR 申し送り 1 件 = 9 件、重複無し、digest 一致 |
| 2 | salary PII マスキング (AD-5, 実共通層使用) | `UOA-PII-001`〜`009` (契約) / `UOA-PII-101`〜`104` (受入) | `maskPii`/`canView`/`maskPiiForExport` の実測、role リテラル比較の不使用確認 |
| 3 | role マッピングの authz 完全委譲 (AD-8) | `UOA-AUTHZ-001`〜`006` (契約) / `UOA-AUTHZ-101`〜`103` (受入) | `ACTION_RULES`/`atLeast` の実測、P03 申し送り事項1 (`GET /api/v1/users` role 前提) の明示 |
| 4 | 監査イベント語彙・raw 値非露出 (AD-5/AD-6) | `UOA-AUDIT-001`〜`005` (契約) / `UOA-AUDIT-101`〜`103` (受入) | 4 語彙の固定、summary への raw salary 混入禁止 |
| 5 | 通知は共通層のみ (AD-7) | `UOA-NOTIF-001`〜`005` (契約) / `UOA-NOTIF-101`〜`103` (受入) | 実 dispatcher 結線、PII 語彙非混入 |
| 6 | `tenant_coefficients` は port 越し読取りのみ (AD-4) | `UOA-COEF-001`〜`003` (契約) / `UOA-COEF-101`〜`103` (受入) | `getCoefficients()` 単一呼出しの実測 |
| 7 | `metrics_rollups` 実装有無 (P03 指摘事項4) | `UOA-METRICS-001`〜`003` (契約) / `UOA-METRICS-101`〜`102` (受入) | ファイルシステム実測による未実装状態の固定、実装後に赤くなる設計 |
| 8 | `/legal` 全利用者アクセス方針 (9件目 quality_constraint) | `UOA-LEGAL-001`〜`002` (契約) / `UOA-LEGAL-101`〜`105` (受入) | `ACTION_RULES` に legal 系 action が無いことの実測 |
| 9 | axe a11y ゼロ違反 (quality_constraint `axe-a11y-zero`) | `UOA-A11Y-001`〜`008` (契約) / `UOA-A11Y-101`〜`104` (受入) | AD-2 部品構成の axe 実測、salary 列の DOM 非存在 |

未割当 0 件。

---

## 4. workstream 別の対応

| workstream | task spec の change 宣言 | 対応テスト |
|---|---|---|
| Frontend | S17/S18 の axe a11y、salary 列非表示 | `UOA-A11Y-001`〜`008` (契約) / `UOA-A11Y-101`〜`104` (受入) |
| Backend | role 判定の authz 委譲、監査記録、通知連携 | `UOA-AUTHZ-*`、`UOA-AUDIT-*`、`UOA-NOTIF-*` |
| API | zod スキーマ契約、HTTP route 結合 | `UOA-API-*`、`UOA-ROUTE-*` |
| Data | `tenant_coefficients` port 消費、`metrics_rollups` 有無確認 | `UOA-COEF-*`、`UOA-METRICS-*` |
| Security | salary PII マスキング、監査での raw 値非露出 | `UOA-PII-*`、`UOA-AUDIT-*` |
| Quality | quality_constraints 9 件 exact-set の整理 | `UOA-QC-*`、本文書 §2〜§3 |
| Legal/Compliance | `/legal` 全利用者アクセス方針 | `UOA-LEGAL-*` |
| Infrastructure / Operations | N/A | — |

---

## 5. 設計判断: なぜこの形のテストにしたか

### 5.1 契約層は実共通層を直接呼び、模型に置き換えない

`maskPii`/`canView`/`maskPiiForExport` (PII)、`createNotificationDispatcher` (通知)、`ACTION_RULES`/`atLeast` (authz) はすべて実際に import して呼ぶ。模型に置き換えると「模型が設計通り」を確認するだけになり、P05 が共通層から逸脱しても検出できなくなる。

### 5.2 DB 接続が必要な層は型を借りた最小 consumer で固定する

`AuditRepo`・`HearingIntakeRepository` は Drizzle 経由の実 DB adapter を要求し、apps/hub の単体テストからは呼べない。ここでは実型 (`Pick<Repo, 'method'>`) を借りた consumer 関数と fake 実装をテスト内に置き、呼出しシグネチャと呼出し回数を固定する。実 DB を通す統合テストは `packages/db/__tests__/` 側の責務として重複させない。

### 5.3 検出器には必ず生存確認を付ける

静的走査・authz 未登録確認・axe 検査はいずれも「対象が空なら合格」に退化しうる。そこで各検出器に対し、

- 走査対象ディレクトリは実在し、別の既知文字列 (`tenant_coefficients`) なら検出できること (`UOA-METRICS-003`)
- 変異入力 (ラベル無し input) で axe が実際に発火すること (`UOA-A11Y-008`)
- 空 DOM による自動緑化でないこと (`UOA-A11Y-007`)
- テナントを変えると fake の呼出し引数も追随し、固定値だけを返す偽実装を見逃さないこと (`UOA-COEF-003`)

を同居させた。「0 件」が「検査していない」の言い換えにならないようにするためである。

### 5.4 P03 の 2 件の申し送りは、宣言ではなく実行可能な検査として固定する

- `GET /api/v1/users` の role 前提 (`docs/backend-spec-api-state.md` と `rules.ts` の記載差) は、`UOA-AUTHZ-002` で「現行 `rules.ts` を正本として扱う」という前提を実測付きで明示し、`UOA-ROUTE-001` の it.todo にも同じ前提を docstring で引き継いだ。
- `metrics_rollups` の未実装状態は、`it.todo` (「確認した」という宣言) ではなく `UOA-METRICS-001`〜`003` という毎回実行されるファイルシステム検査にした。実装が現れた瞬間にこのテストが赤くなり、P05 が見落とせない設計にしている。

### 5.5 既存テストと重複させない

- role マトリクスの網羅は `tests/auth-tenancy/authz-matrix.test.ts` が既に担う → 本 feature は 6 action の登録状態と `me.*`/`coefficients.read` の未登録確認に限定。
- 部品単体の axe は `packages/ui` 側が担う → 本 feature は AD-2 が指定した「組み合わせ」に限定。
- 汎用共通層の 2-consumer 契約は `tests/shared-layers/contract.in-app-layers.test.ts` が既に担う → 本 feature は feature 固有の消費パターン (salary マスキング・role 変更通知等) に限定。

---

## 6. P05 への引き継ぎ

### 実行コマンド

```bash
pnpm --filter @harness-hub/hub exec vitest run tests/user-org-admin/
```

### 昇格手順

1. 42 件の `it.todo` はすべて P05 実装の対象である。実装が着地した箇所から順に、テスト内の参照実装/fake を実装本体への import に差し替えて実テストへ昇格する。
2. 契約層 47 件はそのまま残し、実装が共通層の設計から逸脱していないかを継続検査する。
3. `UOA-METRICS-*` は P05 着手前に feat-metrics-tracking 側の実装状況を確認すること (design-review-notes.md 指摘事項4)。未実装のままダッシュボードの rollup 表示を実装対象に含めるかどうかは、P05 着手前に判断が必要。
4. `UOA-COEF-101` は `HearingIntakeRepository.updateCoefficients()` が feat-hearing-intake 側で確定するまで着手できない (cross-feature follow-up)。

### P05 entry gate として明示すべき未解決事項 (P03 条件付き承認からの引き継ぎ)

| 事項 | 対応するテスト | 状態 |
|---|---|---|
| `GET /api/v1/users` の role 前提の食い違い (backend-spec-api-state.md vs rules.ts) | `UOA-AUTHZ-002`、`UOA-ROUTE-001` | 現行 `rules.ts` (workspace-admin 限定) を正本として明示済み。P05 はこの前提で実装する |
| `metrics_rollups` の実装未確認 (owner: feat-metrics-tracking) | `UOA-METRICS-001`〜`003`、`UOA-METRICS-101`〜`102` | 未実装を実測で固定済み。P05 着手前に owner feature 側の状況を再確認すること |
| `tenant_coefficients` 書込み port 未確定 (owner: feat-hearing-intake) | `UOA-COEF-101` | 契約テストの型注釈で「読取り専用」であることを明示済み。書込みは cross-feature follow-up 確定後 |
