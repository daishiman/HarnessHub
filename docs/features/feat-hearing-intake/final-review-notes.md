---
status: pass
layer: feature-final-review
task: SYS-HEARING-INTAKE-P10
feature_package_id: feature-package/feat-hearing-intake
source_digest: sha256:61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5
---

# feat-hearing-intake 最終独立レビュー

P01〜P09の成果物と実行済みゲートを、goal-specのquality constraints 10件へ突合した。

| quality constraint | 判定 | 根拠 |
|---|---|---|
| async-ui-pattern-hearing-wizard | pass | 4段階Wizard、receipt + `generating`、sessionStorage、離脱警告 |
| ai-queue-pull-type-d5 | pass | 汎用 `ai_jobs`、pull/complete/fail API、サーバAI SDKなし |
| ai-queue-authz-payload-secret-ban | pass | Device Flow token/scope/role + tenant/workspace + claim token、salary/secret禁止テスト |
| markdown-sanitize-sec7 | pass | 共通 `MarkdownView` の4経路、XSS変異テスト |
| tenant-scope-d4-new-entities | pass | 業務資源2テーブルはtenant/workspace必須、tenant単位の採番・係数2テーブルはqa-032詳細正本どおりtenant scope、workspace越境のsheet更新・job claimを拒否 |
| hearing-sheet-entities-and-receipt-number | pass | snapshot・CAS採番・enqueueを同一transactionで実DB確認 |
| wizard-common-component-qa022 | pass | `packages/ui` の `StepWizard` を消費 |
| estimate-server-computed-only | pass | server adapterの `estimateSavings` 1回、結果snapshotのみ返却 |
| b1-zod-single-source-authz-mw | pass | `packages/schemas/hearing-intake` と全routeの `withAuthz` |
| authz-single-mw-role-table | pass | 中央 `can(action)`、status/re-generateの管理者制御 |

## 最終判定

10/10 pass。受入3件も3/3 pass。URL・S11 filter/cursor・AI queue workspace分離の
仕様ずれを実装側で是正し、正本に新しい意味変更は生じていない。

手書きの変更ファイルはすべてリポジトリ固有の300行文書上限、またはユーザー指定の
500行コード上限以下とした。超過していた repository は
`hearing-intake.ts` / `hearing-intake-queue.ts`、queue test は contract / runtime、
ADR は基盤決定 / アプリケーション境界 / review appendix に分割した。
`packages/db/migrations/meta/0002_snapshot.json`、`.dev-graph/state/graph.json`、
`pnpm-lock.yaml` は各ツールが単一ファイルとして読み書きする機械生成正本のため、
分割すると migration lineage / graph schema / 依存解決の再現性を壊す。
この3件だけは生成形式を維持する。

ただしdurable done（既定branch上での正式完了）はlinked PR merge後にだけ確定するため、
Draft PR作成時点ではBeadsをcloseしない。
