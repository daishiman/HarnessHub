---
graph_node_id: "issue-ci-token-least-privilege-20260725"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "operations"
tags: ["security","secret","least-privilege","cloudflare","github-actions","r2"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "CLOUDFLARE_API_TOKEN 1 本を deploy と R2 write で共用しており最小権限分離が未達"
owners: ["daishiman"]
created_at: "2026-07-25T05:50:00Z"
updated_at: "2026-08-01T06:02:02Z"
status: "draft"
depends_on: ["issue-actions-secrets-missing-20260725"]
related_nodes: ["SYS-HUB-FOUNDATION-P13","SYS-DOMAIN-MODEL-DB-P13"]
resource_scope: [".github/workflows/backup.yml",".github/workflows/ci.yml","apps/hub/tests/ci/actions-secrets.test.ts","scripts/ci/actions-secrets-registry.json","docs/infrastructure-spec.md","docs/features/feat-hub-foundation/","docs/features/feat-domain-model-db/release-record.md","system-spec/","features/feat-hub-foundation.md","specs/harness-hub-system-specification.md","architecture/harness-hub-infrastructure.md","tasks/feat-hub-foundation/sys-hub-foundation-p13.md","issues/ci-token-least-privilege-20260725.md"]
purpose: "CI/CD の Cloudflare token が漏洩した場合の影響範囲を、Workers deploy と R2 write のどちらか一方に閉じ込める"
goal: "backup.yml が R2 write 専用 token を使い、ci.yml の deploy token では R2 バケットへ書き込めない状態にして、infrastructure-spec §7 の 2 token 推奨を実装が満たす"
mvp_alignment: null
scope_in: ["Cloudflare API token を deploy / rollback 用 Workers Scripts Edit と backup / production smoke 用 Workers R2 Storage Write の 2 本へ分離する","workflow と Actions secret 台帳を用途別 token 参照へ更新し、相互利用を静的テストで拒否する","infrastructure.web の credential 境界を正規 system-spec フローで qa-091 として反映する","Cloudflare token 発行と GitHub Secrets 投入後に --live 検査、拒否系、backup / production smoke の完走を実測する"]
scope_out: ["Turso token の分割 (DB 接続 token と Platform API token は既に分離済み)","R2 S3 互換アクセスキー方式への差し戻し","backup / restore の設計そのものの変更"]
acceptance: ["backup.yml と production smoke が CLOUDFLARE_R2_API_TOKEN、deploy / rollback が CLOUDFLARE_API_TOKEN だけを参照し、静的ゲートが相互利用を拒否する","R2 専用 token で hub-backup と production smoke が完走する","deploy 用 token で R2 バケットへ書き込もうとすると権限エラーになることを実測する","docs/infrastructure-spec.md §7 と system-spec/infrastructure.md qa-091 が分離設計と外部実測待ちの境界を記録している"]
architecture_refs: ["arch-harness-hub-infrastructure"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/ci-token-least-privilege-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-25T05:50:00Z","origin_kind":"generated","source_digest":"f5e7935b007bb51d75b2209bd5b11ac87b02b4b9bf50ce8c438a5830b52f7f57","source_path":"docs/features/feat-domain-model-db/release-record.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.95
classification_reason: "SYS-DOMAIN-MODEL-DB-P13 の finding F-8。backup.yml の secret 設計は P13 の resource_scope 外であり、かつ docs/infrastructure-spec.md §7 の推奨に対する未達なので別 issue として切り出す"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/ci-token-least-privilege-20260725.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-bda4","linked_at":"2026-07-25T06:16:36Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-25T05:50:00Z","missing_sections":[],"status":"complete"}
---

# 概要

SYS-DOMAIN-MODEL-DB-P13 で `backup.yml` の R2 upload 経路を S3 互換アクセスキーから `wrangler` へ統一した結果、R2 専用キー 3 件 (`R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_ACCOUNT_ID`) は不要になった。一方で R2 write が既存の `CLOUDFLARE_API_TOKEN` に相乗りしたため、**同じ 1 本の token が Workers deploy と R2 write の両方を持つ**状態になっている。

`docs/infrastructure-spec.md` §7 は当初から「Workers deploy + R2 write 権限を分離した 2 token 推奨」と書いており、実装はこの推奨を満たしていない。

## なぜ問題か

- token が漏洩した場合、影響範囲が「本番 Worker を差し替えられる」+「バックアップを上書き/削除できる」の両方へ広がる。バックアップ側を汚染されると障害復旧そのものが成立しなくなる。
- `backup.yml` は cron で毎日走るため、token を使う頻度と経路が deploy より多い。使用頻度の高い経路に最も強い権限を載せている状態は、最小権限 (least privilege = 必要最小限の権限だけを与える原則) の逆になっている。

## 2026-07-29 の実装結果

repository 内の分離は実装済み。

- `.github/workflows/backup.yml` は `CLOUDFLARE_R2_API_TOKEN` だけを参照する。
- `.github/workflows/ci.yml` は deploy / rollback で `CLOUDFLARE_API_TOKEN`、production smoke の R2 往復で `CLOUDFLARE_R2_API_TOKEN` を使い分ける。
- `scripts/ci/actions-secrets-registry.json` を secret 名・権限・利用 workflow の機械可読な正本とし、`apps/hub/tests/ci/actions-secrets.test.ts` が相互利用を拒否する。
- `system-spec/infrastructure.md` を正式に reopen し、qa-091 として credential 境界と完了境界を確定した。

Wrangler の `r2 object put/get --remote` は Cloudflare REST API を使う。この経路では S3 互換 API 専用の bucket-scoped `Workers R2 Storage Bucket Item Write` を利用できないため、R2 token は account-scoped の `Workers R2 Storage Write` とする。これは「可能なら bucket スコープ」という当初案からの設計更新である。

## 外部環境で残る作業

1. Cloudflare で token を 2 本発行する。
   - deploy 用: `Workers Scripts Edit`、R2 write なし
   - R2 用: account-scoped `Workers R2 Storage Write`、Workers Scripts なし
2. GitHub repository secret `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_R2_API_TOKEN` を用途別の値へ更新する。
3. `node scripts/ci/check-actions-secrets.mjs --live` で投入済み集合を確認する。
4. deploy token で R2 write が権限エラーになることを実測する。
5. `hub-backup` と production smoke を実走し、R2 token で完走することを確認する。

## 受入条件

- [x] `backup.yml` が deploy token を参照せず、R2 専用 token を参照する（静的配線）
- [ ] R2 専用 token で `hub-backup` が完走する（外部実測）
- [ ] deploy 用 token では R2 バケットへ書き込めないことを実測する（権限エラーを確認）
- [x] `docs/infrastructure-spec.md` §7 と qa-091 が、分離設計と外部実測待ちの境界を記録している

## 参照

- `docs/features/feat-domain-model-db/release-record.md` §8 F-8 / §14
- `docs/infrastructure-spec.md` §7 (GitHub Secrets 台帳・残存リスク)
- `docs/security-spec.md` §4.5 (secret インベントリ)
- `architecture/harness-hub-infrastructure.md` (Risks and verification)
- `system-spec/infrastructure.md` qa-091
- `docs/features/feat-hub-foundation/ci-token-least-privilege-spec-reflection-receipt.md`
