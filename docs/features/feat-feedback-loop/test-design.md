---
status: confirmed
layer: feature-test-design
task: SYS-FEEDBACK-LOOP-P04
parent_feature: feat-feedback-loop
feature_package_id: feature-package/feat-feedback-loop
feature_context_digest: sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3
test_root: apps/hub/src/__tests__/feedback-loop/
---

# feat-feedback-loop テスト設計 (P04)

> **位置づけ**: [requirements-baseline.md](./requirements-baseline.md) の acceptance 3 件・quality_constraints 8 件を、実行可能なテストへ写像する。P05 は本書が指す `describe.skip` ブロックの被験体を実装し、P06 はそれらを実行対象へ昇格させる。P07/P10 は実行された証跡のみを裁定する。

## 0. 配置の確定 (task spec からの訂正)

`.dev-graph/plans/feature-package-feat-feedback-loop/task-specs/phase-04-test-design.md` の「成果物」節は文字どおりには `apps/hub/src/features/feedback-loop/__tests__/` を指す。しかし `apps/hub/vitest.config.ts` の `include` は次の 2 系統のみを走査する。

```
tests/**/*.test.ts
src/__tests__/**/*.test.ts
```

feature 側 (`src/features/**`) にネストしたテストディレクトリは収集対象外であり、書いても実行 0 件で緑化してしまう (`feat-auth-tenancy` の P03 指摘 R6 と同種のリスク)。よって本 feature は既存規約 `apps/hub/src/__tests__/<feature>/*.test.ts` (precedent: `apps/hub/src/__tests__/dual-catalog-web/`) に従い、`apps/hub/src/__tests__/feedback-loop/` を実テスト配置とする。task spec の記述はここで正式に訂正する。

## 1. acceptance 3 件の写像

| acceptance | 直接対応するテストファイル | 判定条件 |
|---|---|---|
| **AC-1** CLI/Web の 2 経路が単一資源 `feedbacks` へ正規化される | `two-route-single-resource.test.ts` | source はリクエストで申告不可・principal 導出のみで表現されることを契約レベルで固定。P05 後は経路別 principal 判定の統合テストを追加 |
| **AC-2** status 遷移が workspace-admin 限定+監査記録で行われる | `status-transition-workspace-admin-audit.test.ts` | 隣接遷移のみ許可・逆行/スキップ拒否を状態機械レベルで固定。P05 後は authz+監査ロガー統合テストを追加 |
| **AC-3** resolved 通知がアプリ内正本+Resend補助で届く | `resolved-notification-inapp-resend.test.ts` | in_app 単独/in_app+email 両送出/email 失敗時の in_app 非影響を NotificationDispatcher 実装に対して直接検証 |

## 2. quality_constraints 8 件の写像

| quality_constraint ID | テストファイル | 検証内容 | 現時点の判定 (P04) | P05後に昇格する範囲 |
|---|---|---|---|---|
| `feedback-two-route-single-resource-b6-i12` | `two-route-single-resource.test.ts` | source はクライアント申告不可・harness/manual の 2 値のみ | 実行 (schema) | ルートハンドラの経路別 principal 判定 |
| `feedback-status-transition-audit-sec6` | `status-transition-workspace-admin-audit.test.ts` | 隣接遷移のみ許可・PATCH は status 以外を受理しない | 実行 (状態機械+schema) | authz 403・監査 event 記録・不正遷移 422 |
| `ai-response-pull-queue-d5-sec8` | `ai-pull-queue-provider-admin-device-flow.test.ts` | payload/result の contract 検証。qa-048 改訂を反映し pull 権限は workspace-admin(自テナント)+provider-admin(cross-tenant) の汎用モデルへ確定 (ADR §5/§11 参照。baseline の「provider-admin限定」表記は goal-spec 再確認へ escalate 済み・baseline 本文は書き換えない) | 実行 (schema) | pull/complete/fail の権限別振る舞いと writeback |
| `resolved-notification-inapp-primary-resend-supplementary-d6-b8-sec9` | `resolved-notification-inapp-resend.test.ts` | in_app 正本・email はオプトイン補助・1 channel 失敗が他へ波及しない | 実行 (共通層呼び出し契約) | `user_settings.notify_feedback` に基づく channels 組み立て |
| `feedback-markdown-sanitize-sec7` | `markdown-sanitize-render.test.ts` | body/ai_response を MarkdownView 経由で描画し script/onerror/javascript: を無害化 | 実行 (描画) | S14 詳細ビューが dangerouslySetInnerHTML を使わないことの静的検査 |
| `feedback-entity-tenant-scope-d4` | `feedback-entity-tenant-scope-isolation.test.ts` | wire schema が tenant_id/workspace_id を露出しない・.strict() で混入拒否 | 実行 (schema) | リポジトリ層の WHERE 句強制注入・他テナント混入 0 件 |
| `feedback-fix-publish-existing-pipeline-no-automerge` | `publish-connect-no-automerge.test.ts` | feedback-loop 契約に publish/automerge 関連の export が存在しない | 実行 (契約不在の確認) | 既存 PublishRequest API への接続・自動マージ不在 |
| `feedback-rest-zod-single-source-authz-mw-b1-sec2` | `rest-zod-authz-mw.test.ts` | 全 request/response schema が .strict()・既存 primitives/enum を再利用 | 実行 (schema) | 単一認可ミドルウェアへの適合・feature 固有 authz 分岐の不在 |
| (AC-2 の一部として) status 遷移監査 | 上記 `feedback-status-transition-audit-sec6` に同じ | — | — | — |

## 3. テストダブル方針

| 対象 | 方針 | 理由 |
|---|---|---|
| zod schema (`@harness-hub/schemas` feedback-loop) | 実装をそのまま使う | P04 時点で実在する唯一の実装コードであり、モックすると受入契約の意味が消える |
| `NotificationDispatcher` | `packages/schemas` 同様、共通層 (`apps/hub/src/shared/notification`) の実装をそのまま使い、transport のみ fake に差し替える | 共通層自体のテストはスコープ外 (owner=feat-hub-foundation) だが、feedback-loop からの呼び出し契約は共通層 dispatch を実際に通して検証する必要がある |
| `MarkdownView` (`@harness-hub/ui`) | 実装をそのまま使う | sanitize の正しさは実際のレンダラでしか検証できない (hearing-intake と同じ判断) |
| DB / API route / AiJob pull-lease runtime | 未実装のため使用しない。該当検証は `describe.skip` + `it.todo` で P05→P06 の昇格対象として明示する | 実装が存在しないものをモックで代替すると「テストが通ること」が実装の正しさを保証しなくなる |

## 4. テスト配置

```
apps/hub/src/__tests__/feedback-loop/
├── two-route-single-resource.test.ts
├── status-transition-workspace-admin-audit.test.ts
├── ai-pull-queue-provider-admin-device-flow.test.ts
├── resolved-notification-inapp-resend.test.ts
├── markdown-sanitize-render.test.ts
├── feedback-entity-tenant-scope-isolation.test.ts
├── publish-connect-no-automerge.test.ts
└── rest-zod-authz-mw.test.ts
```

契約 schema 本体は `packages/schemas/feedback-loop/{contracts.ts,index.ts}` に新設し、`packages/schemas/src/index.ts` のバレルから再エクスポートする (hearing-intake と同じパターン)。`contract-registry.ts` (OpenAPI drift 検査) には登録しない — 同ファイルの既存コメントのとおり、登録簿の責務は共通契約までであり、hearing-intake 等の他ドメイン schema も未登録である。

## 5. カバレッジ表 (全件写像の証明)

| 要件 | テストファイル数 | 現時点の実行テスト数 | P05後昇格 (it.todo) 数 | 最低 1 件 |
|---|---|---|---|---|
| AC-1 / QC feedback-two-route-single-resource | 1 | 3 | 3 | ✅ |
| AC-2 / QC feedback-status-transition-audit | 1 | 6 | 4 | ✅ |
| QC ai-response-pull-queue | 1 | 4 | 4 | ✅ |
| AC-3 / QC resolved-notification | 1 | 3 | 3 | ✅ |
| QC feedback-markdown-sanitize | 1 | 5 | 1 | ✅ |
| QC feedback-entity-tenant-scope | 1 | 3 | 2 | ✅ |
| QC feedback-fix-publish-existing-pipeline | 1 | 1 | 2 | ✅ |
| QC feedback-rest-zod-single-source-authz-mw | 1 | 4 | 2 | ✅ |

**未写像 0 件。合計 8 ファイル・29 件実行 (green) + 21 件 P05→P06 昇格対象。**

再現コマンド: `/opt/homebrew/bin/node node_modules/vitest/vitest.mjs run src/__tests__/feedback-loop`
(既定の `node` バイナリは x64 スライスで起動し `@rollup/rollup-darwin-x64` 欠落により失敗するため、arm64 の `/opt/homebrew/bin/node` で `vitest.mjs` を直接起動する)

## 参照

- 要件: [requirements-baseline.md](./requirements-baseline.md)
- 設計: [architecture-decision-record.md](./architecture-decision-record.md) / [design-review-notes.md](./design-review-notes.md)
- 正本: [docs/backend-spec.md](../../backend-spec.md) §3.3 / §3.8 / §4.7、[docs/backend-spec-api-state.md](../../backend-spec-api-state.md) §4.7 / §4.11 / §5.4 / §5.5
