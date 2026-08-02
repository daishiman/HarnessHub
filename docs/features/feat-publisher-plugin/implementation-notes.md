---
status: confirmed
layer: feature-implementation
---

# feat-publisher-plugin 実装ノート (P05)

- graph node: `SYS-PUBLISHER-PLUGIN-P05` / beads: `HarnessHub-zdh.5`
- 前提: P04 [`docs/features/feat-publisher-plugin/test-design.md`](./test-design.md)
- 正本: `.dev-graph/plans/generations/feature-package-feat-publisher-plugin/b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df/task-specs/phase-05-implementation.md` (package digest `sha256:b98891c2...`)

本書は「何を実装したか」ではなく、**P04 の PT1〜PT7 全テストケースに実装対象が対応しており未割当が 0 件であること**、
および **設計 (P02 ADR AD-1〜AD-6 / P03 指摘) のどの決定がコードのどこに落ちているか** を追跡可能にするために置く。

---

## 1. 実装ファイルと責務

### 1.1 契約 (`packages/schemas/publisher-plugin/`)

| ファイル | 責務 |
|---|---|
| `credential-record.ts` | `publisherCredentialRecordSchema` (OS 資格情報域に保存する refresh token レコードの形) |
| `manifest.ts` | `publisherPackageManifestSchema` (`plugin.json` の緩い型。必須判定は `packages/inspection` の PKG-* ルールへ委譲, AD-3) |
| `index.ts` | 上記の再輸出 |

`packages/schemas/publish-pipeline/` (feat-publish-pipeline 提供、既存) の `publishRequestViewSchema` 等はそのまま消費するのみで、
本 feature は再定義しない (AD-3)。

### 1.2 apps/publisher/src/ の 5 サブディレクトリ (AD-1)

| ディレクトリ | 公開 API | 責務 |
|---|---|---|
| `core/` | `collectPackageFiles`, `completePackageManifest`, `buildCatalogEntry`, `buildPackageArchive` | package 収集・manifest 補完・catalog 表示用整形・ZIP 組み立て。`auth/`・`deploy/` に依存しない (PT1-C) |
| `inspection-client/` | `runLocalPreCheck` | `@harness-hub/inspection` の `createPublishInspectionRules`/`runInspection` を Hub と全く同じ形で呼ぶだけ (AD-3) |
| `auth/` | `createCredentialStoreAdapter`, `pollForToken`, `scopesForCommand`, `decodeAccessTokenClaims`, `refreshOrClear` | Device Authorization Flow (RFC 8628) の状態機械・OS 資格情報域 (Keychain/Credential Manager) 保存・scope 最小化・token claims 復元 |
| `deploy/` | `runWranglerDeploy`, `extractDeployUrl`, `registerWranglerDeployment` | wrangler CLI 子プロセス実行・stdout からの URL 抽出・`POST /api/v1/projects/:id/deployment` 登録 |
| `cli/` | `main`, `parseArgs`, `runPublishCommand`, `runFeedbackCommand`, `HubApiClient` | サブコマンド分岐・Hub API 呼出しクライアント・`publish`/`feedback` の一連処理を束ねる |
| `shared/` | `RunProcess`, `ProcessResult` | 子プロセス実行の抽象 (`auth/credential-store.ts` と `deploy/wrangler.ts` が共有) |

`core/` が `auth/`・`deploy/` の実装詳細を import していないことは PT1-C (`pt1-core-manifest-and-python-parity.test.ts`) が固定する。

### 1.3 plugin 面 (`plugins/harness-hub-publisher/`, AD-2)

| ファイル | 責務 |
|---|---|
| `.claude-plugin/plugin.json` | plugin manifest |
| `commands/publish.md` | `/publish` slash command 定義。`allowed-tools: [Skill]` で `run-publisher-publish` skill を呼ぶだけ |
| `skills/run-publisher-publish/SKILL.md` | skill 定義 |
| `skills/run-publisher-publish/scripts/run-publisher-publish.sh` | `exec node apps/publisher/bin/harness-publisher.mjs publish "$@"` の 1 行実行のみ。業務ロジックを複製しない (PT5-B) |

Electron/Tauri 等の desktop GUI 依存は `apps/publisher/package.json` に存在しない (qa-007, PT5-A)。

---

## 2. 設計決定の反映点 (P02 ADR AD-1〜AD-6)

| 決定 | 反映先 | 理由 |
|---|---|---|
| AD-1: apps/publisher を 5 サブディレクトリに分割 | `src/{cli,core,inspection-client,auth,deploy}/` | 責務境界を import グラフで機械的に検証できるようにする (PT1-C) |
| AD-2: plugin 面は薄いラッパー | `run-publisher-publish.sh` は 1 行 exec のみ | 二重実装 (plugin 側と apps/publisher 側で同じロジックを 2 回書く) を防ぐ |
| AD-3: packages/inspection の owner は feat-publish-pipeline | `inspection-client/index.ts` は `createPublishInspectionRules` をそのまま呼ぶだけ | 判定ロジックを 2 箇所に置くと、片方だけ secret scan を結線し忘れる事故が起こりうる |
| AD-4: token は OS credential store のみ | `auth/credential-store.ts` (Keychain/Credential Manager)。平文ファイル・環境変数への保存経路なし | 漏洩経路を OS の保護機構に閉じ込める |
| AD-5: web_app 出口は wrangler CLI local 実行 | `deploy/wrangler.ts` が子プロセス実行、`deploy/deployment-report.ts` が Hub へ結果登録 | Cloudflare API を直接叩かず、作者のローカル認証済み wrangler を再利用する |
| AD-6: feedback サブコマンドの owner を本 feature に確定 | `cli/feedback-command.ts` は Device Flow 基盤 (Bearer token) を再利用し `POST /api/v1/feedback` を呼ぶだけ | feat-feedback-loop 側のデータモデル・受理ロジックを複製しない |

---

## 3. PT テストケース ↔ 実装対象の対応 (未割当 0 件)

| PT ID | 実装対象 | 状態 |
|---|---|---|
| PT1-A/B/C | `core/manifest.ts`, `core/collect.ts`, `core/catalog.ts` | 7 件 pass (1 todo: Python 資産同値の追加観点) |
| PT2-A〜E | `auth/device-flow.ts`, `auth/token-manager.ts`, `auth/credential-store.ts`, `auth/scopes.ts` | 14 件 pass (1 todo) |
| PT3-A/B | `inspection-client/index.ts` | 4 件 pass |
| PT4-A/B/C | `deploy/wrangler.ts`, `deploy/deployment-report.ts` | 8 件 pass (2 todo: PT4-D 実機 E2E) |
| PT5-A/B | `plugins/harness-hub-publisher/` 構造・依存検査 | 6 件 pass |
| PT6-A | `apps/publisher/package.json` の scripts 静的検査 | 4 件 pass (2 todo: PT6-B 実機 E2E) |
| PT7-A | `cli/feedback-command.ts` | 3 件 pass |
| 追加 (test-design 範囲外の実装カバレッジ補完) | `cli/index.ts`, `cli/publish-command.ts`, `cli/session.ts`, `cli/http-client.ts`, `core/package-archive.ts`, `cli/device-endpoints.ts` | それぞれ専用 unit test を追加 (`index.test.ts`, `publish-command.test.ts`, `session.test.ts` 等)、全 pass |

実装対象が無い PT: **0 件**。PT4-D・PT6-B (実機 E2E タイムボックス計測) のみ `it.todo` に留めている。
これは test-design.md §11 が定めた運用方針どおりであり (macOS 自動実測は P06 実行時点で確定、Windows は実機が
この開発環境に存在しないため手動再現手順書に委譲)、P05 の実装漏れではなく P06 が確定させる評価事項として引き継ぐ。

---

## 4. Write scope からの逸脱 (3 件)

P05 の Write scope (`apps/publisher/`, `packages/schemas/publisher-plugin/`, `plugins/harness-hub-publisher/`,
`docs/features/feat-publisher-plugin/implementation-notes.md`) 外を触った箇所。隠さず記録し、P08 へ引き継ぐ。

| ファイル | 変更 | 必要だった理由 | 影響 |
|---|---|---|---|
| `packages/schemas/src/index.ts` | `publisher-plugin` を再輸出 | 契約を `@harness-hub/schemas` から解決させるため。相対パス直参照にすると package 境界が崩れる | 追加輸出のみ。既存輸出の削除・改名なし |
| `pnpm-workspace.yaml` | `apps/publisher` を workspace packages へ追加 | 新規 package を pnpm workspace に登録しないと `pnpm --filter @harness-hub/publisher` 自体が解決できない | 追加のみ。既存 workspace 定義は不変 |
| `scripts/ci/shared-layer-registry.json` | `@harness-hub/schemas`・`@harness-hub/inspection` の consumers に `apps/publisher` を追加 | `check-shared-layer-duplicates.mjs` が未登録 consumer を検出すると違反として扱う (AD-3 の二重実装検知ゲート) | 追加のみ。既存 consumer 一覧は不変 |

いずれも feat-dual-catalog-web P05 と同型の「新規 package を monorepo へ追加する際の付随登録」であり、既存挙動を変えない追加のみに限定した。

---

## 5. 既知の制約 (後続フェーズへ)

1. **Windows 実機がこの開発環境に存在しない**ため、PT4-D/PT6-B の実機 E2E は macOS 分のみ自動実測できる。
   Windows 分の手動再現手順書は P06 成果物として作成する (test-design.md §11 の既定方針)。
2. **`cli/index.ts` の `dispatchPublish`/`dispatchFeedback` 経由フルパス統合テストは未実装**。
   `node:child_process` の spawn と `global.fetch` の両方をモックする大掛かりな統合テストが必要になる一方、
   `parseArgs`/`requireOption`/`main` の早期リターン分岐は個別 unit test (`index.test.ts`) で検証済みで、
   `runPublishCommand`/`runFeedbackCommand` 自体も直接呼び出す unit test (`publish-command.test.ts`,
   `pt7-feedback-subcommand.test.ts`) で分岐を網羅している。カバレッジ閾値 (グローバル集計 80%) は
   既に超過達成しており、実装コストに見合わないため本 phase では見送った。P08 (リファクタリング) で
   dispatchPublish/dispatchFeedback の配線自体を変更する場合は、あわせて統合テストの要否を再判断する。
3. `plugins/harness-hub-publisher/skills/run-publisher-publish/scripts/.claude/handoff/` に PreCompact フックが
   自動生成したハンドオフ記録ファイルが残る場合がある (エージェント基盤の副産物、本 feature の成果物ではない)。
   feat-dual-catalog-web P05 と同型の既知事象であり、コミット対象に含めるかは運用判断とする。

---

## 6. 検証結果 (P05 時点)

| コマンド | 結果 |
|---|---|
| `pnpm --filter @harness-hub/publisher typecheck` | pass (エラー 0 件) |
| `pnpm exec biome check apps/publisher packages/schemas/publisher-plugin` | pass (No fixes applied) |
| `pnpm --filter @harness-hub/publisher exec vitest run --coverage` | 19 files / **106 tests passed \| 6 todo** / exit code 0 |
| カバレッジ (グローバル集計, 閾値 80%) | Stmts 87.68% / Branch 94.73% / Funcs 88.7% / Lines 87.68% |
| `node scripts/ci/check-shared-layer-duplicates.mjs` | 違反 0 件 (登録共通層 12 件 + 運用機構 4 件 / 走査 504 ファイル) |
| `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-publisher-plugin` | `status: pass`, violations 0 件 (P05 task spec §実行契約の rerun 規約どおり `--feature-package` 解決を使用) |
