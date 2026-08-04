---
graph_node_id: "feat-hub-foundation"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "infrastructure"
tags: ["macro-feature","stage-1","infrastructure"]
priority: "high"
start_date: null
target_date: null
iteration: "Stage 1"
title: "Hub 基盤: Workers + Next.js scaffold / CI/CD / 運用 baseline"
owners: ["daishiman"]
created_at: "2026-07-17T00:38:30Z"
updated_at: "2026-08-04T07:11:21.952635Z"
status: "closed"
depends_on: []
related_nodes: []
resource_scope: ["features/feat-hub-foundation.md"]
purpose: "費用ゼロ制約 (C2) 下で Hub の実行基盤 (Cloudflare Workers 一体型 + OpenNext) と CI/CD・監視・SLO 運用の土台を確立する"
goal: "pnpm 強制 CI → wrangler deploy が自動化され、/health・監視・SLO 99.5% 計測が稼働し、Worker 3MiB 予算内で Next.js と共通層の単一実装が動作する状態"
scope_in: ["Next.js + TypeScript + pnpm monorepo scaffold","@opennextjs/cloudflare デプロイ","GitHub Actions CI/CD (npm 混入 fail)","/health + 外部死活監視","SLO ダッシュボード + bundle サイズ予算 CI","docs/shared-layers.md §1〜§3 の共通 UI・backend・CI/CD/運用層の実装 owner と package 境界"]
scope_out: ["業務ドメインロジック","テナント固有の OIDC/role/Device Flow policy (共通 auth adapter・認可 MW の package 境界のみ対象)"]
acceptance: ["CI が test→deploy を完走する","Worker bundle が 3MiB 以内で bundle 予算チェックが CI に存在する","SLO 99.5% の計測と /health が稼働する","shared-layers 登録済み共通層が単一 package/境界に実装され、消費 feature が同じ実装を参照する"]
architecture_refs: ["arch-harness-hub-infrastructure","arch-harness-hub-frontend","arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-security","arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-hub-foundation.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502/plan-findings.json"}
source_lineage: {"imported_at":"2026-08-02T06:25:09Z","origin_kind":"generated","source_digest":"7e1a6753bec43aa5e758f148039c1af71517142bb6e039dc8b1de20638018d77","source_path":"specs/harness-hub-system-specification.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "C14 マクロ分解 (確定 system-spec の Stage 0-2 スコープから導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-hub-foundation.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-37h","linked_at":"2026-07-18T01:45:33Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-02T03:44:06Z","evidence_refs":["docs/features/feat-hub-foundation/acceptance-report.md","docs/features/feat-hub-foundation/release-notes.md","docs/features/feat-hub-foundation/runbook.md","docs/features/feat-hub-foundation/ci-local-gate-registry-spec-reflection-receipt.md"],"policy":"manual","reconciled_at":"2026-08-02T03:44:06Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# Hub 基盤: Workers + Next.js scaffold / CI/CD / 運用 baseline

> Stage 1 / macro feature (C14)。1 feature = 13 task への細分解は system-dev-planner (`/dev-graph plan`) が行う。

## 目的

費用ゼロ制約 (C2) 下で Hub の実行基盤 (Cloudflare Workers 一体型 + OpenNext) と CI/CD・監視・SLO 運用の土台を確立する

## 到達状態

pnpm 強制 CI → wrangler deploy が自動化され、/health・監視・SLO 99.5% 計測が稼働し、Worker 3MiB 予算内で Next.js と共通層の単一実装が動作する状態

## スコープ

**対象 (in):**

- Next.js + TypeScript + pnpm monorepo scaffold
- @opennextjs/cloudflare デプロイ
- GitHub Actions CI/CD (npm 混入 fail)
- /health + 外部死活監視
- SLO ダッシュボード + bundle サイズ予算 CI
- docs/shared-layers.md §1〜§3 の共通 UI・backend・CI/CD/運用層の実装 owner と package 境界

**対象外 (out):**

- 業務ドメインロジック
- テナント固有の OIDC/role/Device Flow policy (共通 auth adapter・認可 MW の package 境界のみ対象)

## 受入

- CI が test→deploy を完走する
- Worker bundle が 3MiB 以内で bundle 予算チェックが CI に存在する
- SLO 99.5% の計測と /health が稼働する
- shared-layers 登録済み共通層が単一 package/境界に実装され、消費 feature が同じ実装を参照する

## 実装反映 (2026-07-26)

- CI の静的ゲートに GitHub Actions secret / variable 台帳の突合を追加した。用途・種類・必須度・利用 workflow の正本は `scripts/ci/actions-secrets-registry.json` で、散文の投入一覧を現在状態の正本にしない。
- 本番 smoke が DB package から Hub workspace の Wrangler を起動する境界を固定し、package cwd や runner の PATH に依存しない形へ修正した (`HarnessHub-fnzl`)。
- landing 前は remote workflow の完走を証明できないため、受入「CI が test→deploy を完走する」の最終判定は GitHub Actions 実走まで `blocked` を維持する。

## 実装反映 (2026-07-28 / HarnessHub-vns9)

- GitHub Actions の secret / variable は実投入済みで、`node scripts/ci/check-actions-secrets.mjs --live` が exit 0 (台帳 9 件 = workflow 参照 9 件)。未参照になっていた `TURSO_API_TOKEN` / `TURSO_DATABASE_NAME` は削除した。
- 日次 backup の**採否判定を `packages/db/scripts/verify-export-artifact.ts` へ一本化**した。旧実装は workflow の shell で「データ行が 0 なら不採用」と判定しており、migration 済みだが全 19 テーブル 0 行の稼働直後 DB を恒常的に落としていた (3 夜連続失敗)。判定の詳細正本は [infrastructure-spec §7 / §10](../docs/infrastructure-spec.md)。
- 受入「CI が test→deploy を完走する」(A1) は run `30143422049` で達成済み。**日次 backup の初回成功も 2026-08-01 に達成**し、run `30686023662` で export 19 テーブル / 64 行、R2 往復一致、heartbeat ping まで完走した ([release-notes.md](../docs/features/feat-hub-foundation/release-notes.md) §4.1 の #5)。
- 3 夜連続の失敗が誰にも気づかれなかった経路の欠落は `HarnessHub-dbx6` / `issue-backup-failure-undetected-20260728` へ分離した。2026-07-29 に backup 専用 heartbeat、`BACKUP_HEARTBEAT_URL` required 化、workflow 前提確認、限定適用 CLI をローカル実装した。**2026-08-01 に外部適用まで完了**し、heartbeat `477775` 作成・secret 投入・`--live` exit 0・run `30686023662` success・ping 受理が揃った。
- 証跡: [evidence/actions-secrets-2026-07-28.json](../docs/features/feat-hub-foundation/evidence/actions-secrets-2026-07-28.json) / [evidence/backup-heartbeat-applied-2026-08-01.json](../docs/features/feat-hub-foundation/evidence/backup-heartbeat-applied-2026-08-01.json)

## 実装反映 (2026-07-29 / HarnessHub-bda4)

- GitHub Actions の Cloudflare token を、Workers deploy / rollback 用の `CLOUDFLARE_API_TOKEN` と、backup / 本番 smoke の R2 object 操作用 `CLOUDFLARE_R2_API_TOKEN` に分離した。一方の token が漏れても Worker と backup の両方を変更できない境界にする。
- R2 経路は Wrangler の Cloudflare REST API を使うため、R2 token は account-scoped の `Workers R2 Storage Write` とする。S3 互換 API 専用の bucket item 権限へ読み替えない。
- workflow と機械可読台帳の静的整合は実装済み。Cloudflare 側の token 発行、GitHub secret 投入、deploy token による R2 write 拒否、本番 workflow 完走は外部実測待ちのため、`HarnessHub-bda4` は継続中とする。
- 仕様反映と最終レビューの記録: [Cloudflare token 最小権限分離 仕様反映受領書](../docs/features/feat-hub-foundation/ci-token-least-privilege-spec-reflection-receipt.md)
- backup 失敗検知の仕様反映: [backup heartbeat 分離 仕様反映受領書](../docs/features/feat-hub-foundation/backup-heartbeat-spec-reflection-receipt.md)

## 実装反映 (2026-07-30 / HarnessHub-pyb3)

- G4 の `pnpm -r test` は入口を維持したまま、`pnpm-workspace.yaml` の `workspaceConcurrency: 1` で package 間を直列化した。
- 各 package 内の Vitest 並列性は維持し、設定欠落・値変更を `pnpm check:pnpm` の正負テストで拒否する。これにより assertion 全成功後の worker RPC timeout を G4 の失敗と誤認しない。
- 製品仕様は変更せず、CI/CD 実行設計と検証結果は [仕様反映受領書](../docs/features/feat-hub-foundation/g4-workspace-test-concurrency-spec-reflection-receipt.md) を正とする。

## 実装反映 (2026-08-02 / HarnessHub-9cgb)

- protected `/catalog` の G11 Core Web Vitals を、通常の session/access token を CI へ渡さずに実測できるようにした。
- GitHub Actions と Worker が共有する専用 secret から最大 5 分の ticket を発行し、固定 tenant/workspace の GET/HEAD catalog read だけへ閉じる。ticket は redirect 後の URL、ログ、Lighthouse artifact に残さない。
- Worker/GitHub secret の投入、本番 deploy、初回 Lighthouse は外部実測待ちであり、未計測を good と数えない。詳細は [仕様反映受領書](../docs/features/feat-hub-foundation/cwv-probe-credential-spec-reflection-receipt.md)。

## アーキテクチャ参照

- [arch-harness-hub-infrastructure](../architecture/harness-hub-infrastructure.md)
- [arch-harness-hub-frontend](../architecture/harness-hub-frontend.md)
- [arch-harness-hub-backend](../architecture/harness-hub-backend.md)
- [arch-harness-hub-data](../architecture/harness-hub-data.md)
- [arch-harness-hub-security](../architecture/harness-hub-security.md)
- [arch-harness-hub-dev-workflow](../architecture/harness-hub-dev-workflow.md)

- 要件正本: [spec-harness-hub-requirements](../specs/harness-hub-system-specification.md)

## 機能間依存

- なし

## Handoff

- 次工程: `/dev-graph plan --feature-id <本 feature id> --feature-context features/<id>.context.json` (exact-13 task 仕様化)
- 昇格条件: confirmation_status=confirmed + evaluation_status=pass + implementation_readiness=complete で起票対象になる

## 実装反映 (2026-08-01 / HarnessHub-37h.15)

- Better Stack の公開 status page を認証なしで実測する `verify:slo-observation` を追加し、設定の存在ではなく現在状態と日次履歴から SLO 観測進捗を判定する。
- 当日と `not_monitored` を観測窓から除外し、30 日未満は合否を断定しない。2026-08-01 時点は 6 日 / 30 日の `collecting` で、外形エラーバジェット消費は 48.7%。
- 30 日到達後も Workers Analytics の 5xx 率が揃うまで A3 を確定しない。2026-08-02 のユーザー判断により、この観測 follow-up 自体は `not_applicable` として閉じた（下記 closeout 参照）。
- 正規仕様は `system-spec/infrastructure.md` の qa-116、反映経路と残課題は [SLO 公開実測 仕様反映受領書](../docs/features/feat-hub-foundation/slo-observation-spec-reflection-receipt.md) を正とする。

## Closeout (2026-08-02 / `HarnessHub-37h` / qa-123)

- exact-13 の P01〜P13、CI test→deploy、本番 `/health`、bundle 予算、共通層、release / runbook 証跡を delivery closure（開発成果を閉じる境界）として本 feature を閉じた。
- `HarnessHub-37h.14` と `HarnessHub-37h.15` は独立した運用 follow-up であり、ユーザーが追加対応不要と判断したため `not_applicable` で閉じた。これは SLO 99.5% 達成を意味しない。
- qa-019 / qa-116 の 30 日観測、Workers Analytics 5xx 率との複合判定、70% 警告／100% 変更凍結は維持する。再開時は issue を reopen または再起票し、同じ runbook / CLI 契約で検証する。
- 仕様反映と判断根拠は [feature closeout 仕様反映受領書](../docs/features/feat-hub-foundation/feature-closeout-spec-reflection-receipt.md) を正とする。
