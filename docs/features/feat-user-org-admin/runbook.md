---
status: ready
layer: feature-operations
task: SYS-USER-ORG-ADMIN-P12
feature_package_id: feature-package/feat-user-org-admin
source_digest: sha256:2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14
---

# S17/S18 運用 runbook (P12)

> **注意**: 本 runbook は**手順**であり、未実装の仕組みを手順で代替しない。未実装項目は §5 に明示する。

## 1. salary PII ガード運用手順 (SEC4)

- salary は `workspace-admin` / `provider-admin` viewer にのみ表示される。`member` / `owner` (資源所有者関係で導かれる `owner` を含む) には露出しない。`toPiiViewer` (`apps/hub/src/features/user-org-admin/service.ts`) が role 比較を一元的に担う。
- export (CSV/JSON 等) は viewer に関係なく常時マスクする。「viewer が admin だから export も生値」という例外は存在しない。
- role 判定の変更が必要な場合、`apps/hub/src/lib/authz/` 以外のファイルに role literal (`'workspace-admin'` 等) を書かない。`check-single-authz-middleware.mjs` が違反を機械検出する (現状 allowlist 6 件・route 例外 5 件が期待集合)。
- client component から role 判定を使う際は `lib/authz/types.js` を直接 import する (barrel `index.js` は next-auth 依存の `runtime.ts` を re-export しており、client bundle 予算 (120 KiB) を圧迫する。実際に P09 でこの混入を検出・修正した経緯あり)。

## 2. 監査ログ確認手順 (SEC6)

- 記録先: `audit_events` テーブル (`tenantId`+`seq` 一意、追記専用)。
- 確認すべき語彙: `user.role_change` / `user.salary_change` / `user.salary_read`。
- 定期確認クエリ (tenant 別、直近の salary 読取件数):

```sql
SELECT tenant_id, event_type, COUNT(*) AS events, MAX(created_at) AS last_at
FROM audit_events
WHERE event_type IN ('user.role_change', 'user.salary_change', 'user.salary_read')
GROUP BY tenant_id, event_type
ORDER BY tenant_id, event_type;
```

- 異常兆候: 特定 admin アカウントからの `user.salary_read` が短時間に多発している、または監査記録が付かずに salary 値が返っている (後者は `withAuthz` 経由でない route が新設された疑い。即座に route 定義を確認する)。
- 監査記録の summary には金額そのものを含めない設計。summary に金額が現れていたら実装バグとして扱い、`audit-event-vocabulary-contract.test.ts` の期待に反する変更が入っていないか確認する。

## 3. 通知ディスパッチ運用 (D6, SEC9)

- **未実装**: 現時点で feature は共通層 `createNotificationDispatcher` / `dispatch()` を呼んでおらず、`NotificationMessage` の組立て関数も存在しない。通知設定の保存を「通知を配送できる」と読み替えない。
- 実装時は feature から Resend 等の外部 API を直接呼ばず、共通 dispatcher に PII を含まない `NotificationMessage` を渡す。`buildRoleChangedMessage` 等の組立て関数は salary を引数に受け取らない形にする。
- `dispatch()` は channel (`in_app`/`email`) ごとに個別の成否を返す。1 channel の失敗は他 channel の送出を止めない。失敗した channel の `detail` (`transport_not_registered` 等) を記録する。
- 現状の共通層に自動リトライ機構は無い (§5 参照)。`delivered: false` を受け取った呼び出し元が再送する場合は、`idempotencyKey` を変えずに同一メッセージを再送し、二重通知を防ぐ。

## 4. 障害対応・ロールバック手順

- リリース前後の確認:

```bash
pnpm --filter @harness-hub/hub build:worker
node apps/hub/scripts/check-bundle.mjs
node apps/hub/scripts/check-client-bundle.mjs
node apps/hub/scripts/check-single-authz-middleware.mjs
pnpm --filter @harness-hub/hub exec vitest run tests/user-org-admin
```

- salary が admin 以外に露出した、または監査記録なしに salary 読取が成立したことを検知した場合: 該当 route を即座に無効化 (直前の Hub Worker version へロールバック)、影響範囲 (tenant/user) を `audit_events` から特定し、原因修正後にのみ再有効化する。
- `/legal` が閲覧不可 (未ログイン含む) になった場合: `withAuthz` を誤って経由させる変更が入っていないか確認する (設計上 `/legal` は認可を経由しない静的ページ)。
- role/部門/salary の PATCH が失敗し続ける場合: `ACTION_RULES` (`apps/hub/src/lib/authz/rules.ts`) の該当 action 定義を確認する。DB を手で書き換えて回避しない。

## 5. 未実装 (手順で代替しないもの)

- 通知ディスパッチの自動リトライ・バッチ分割: 現状の `createNotificationDispatcher` は 1 メッセージ単位の即時送出のみで、日次送信数上限・週次サマリのバッチ分割・失敗時の自動リトライは実装されていない。Resend 等の実 transport 接続自体もこのリポジトリには存在せず (`NotificationTransport` は呼び出し元がテスト用 fake を注入する契約のみ)、これらは feat-hub-foundation 側の共通層拡張が必要な将来課題であり、本 runbook では手順として代替しない。
- 係数の変更と `coefficient.change` 監査: `HearingIntakeRepository.updateCoefficients()` が未実装のため、`PATCH /api/v1/tenant/coefficients` は `501`。DB を直接更新して代替せず、owner port と feature 側監査経路を実装してから公開する。
- `/legal` の内容更新 owner: 規約・ポリシー本文の実際の更新責任者・更新フローは、本 feature の write_scope 外 (法務/コンテンツ管理側の意思決定) のため未確定。内容更新が必要になった時点で dev-graph へ別途起票する。
