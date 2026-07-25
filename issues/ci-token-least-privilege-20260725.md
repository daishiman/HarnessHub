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
updated_at: "2026-07-25T06:40:00Z"
status: "draft"
depends_on: ["issue-actions-secrets-missing-20260725"]
related_nodes: ["SYS-DOMAIN-MODEL-DB-P13"]
resource_scope: [".github/workflows/backup.yml","docs/features/feat-hub-foundation/runbook.md"]
purpose: "CI/CD の Cloudflare token が漏洩した場合の影響範囲を、Workers deploy と R2 write のどちらか一方に閉じ込める"
goal: "backup.yml が R2 write 専用 token を使い、ci.yml の deploy token では R2 バケットへ書き込めない状態にして、infrastructure-spec §7 の 2 token 推奨を実装が満たす"
mvp_alignment: null
scope_in: ["Cloudflare API token を deploy 用 (Workers Scripts Edit) と backup 用 (R2 Write に限定) の 2 本へ分割発行","backup.yml の CLOUDFLARE_API_TOKEN 参照を R2 専用 secret 名へ差し替え","docs/infrastructure-spec.md §7 の secret 台帳と残存リスク節の更新","docs/features/feat-hub-foundation/runbook.md の secret 投入手順の更新","分割後に hub-backup を手動 dispatch して 1 回 green を実測"]
scope_out: ["Turso token の分割 (DB 接続 token と Platform API token は既に分離済み)","R2 S3 互換アクセスキー方式への差し戻し","backup / restore の設計そのものの変更"]
acceptance: ["backup.yml が deploy token を参照しておらず、R2 write 権限のみを持つ token で完走する","deploy 用 token で R2 バケットへ書き込もうとすると権限エラーになることを実測する","docs/infrastructure-spec.md §7 の残存リスク節から本 issue の未達記述が消えている"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/ci-token-least-privilege-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-25T05:50:00Z","origin_kind":"generated","source_digest":"a3ff8e3653e08fdd5d1f62d199b0b054aedf7a0c31ca8694fb3e3694862f4c22","source_path":"docs/features/feat-domain-model-db/release-record.md","source_plugin":"dev-graph","source_version":null}
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

## なぜ今すぐ直さなかったか

- R2 専用キーの削除自体は `docs/security-spec.md` §4.5 が既に「R2 は Workers binding 利用時は不要」と確定した範囲内であり、後退ではない。
- 2 token 化は Cloudflare 側の token 再発行と GitHub Secrets の差し替えを伴い、P13 の resource_scope (`docs/features/feat-domain-model-db/release-record.md`) の外側にある。P13 の受入条件を満たすために必要な作業ではない。
- 未達を文書から消して「達成」に見せるより、未達として台帳に残すほうが安全であるため、`docs/infrastructure-spec.md` §7 に残存リスクとして明記した上で本 issue に切り出した。

## 対応方針

1. Cloudflare で token を 2 本発行する
   - deploy 用: `Workers Scripts:Edit`（R2 権限なし）
   - backup 用: `Workers R2 Storage:Edit` を `harness-hub-backups` に限定（可能なら bucket スコープ）
2. `.github/workflows/backup.yml` の `CLOUDFLARE_API_TOKEN` 参照を R2 専用 secret 名へ差し替える
3. `docs/features/feat-hub-foundation/runbook.md` の secret 投入手順と `docs/infrastructure-spec.md` §7 の台帳・残存リスク節を更新する
4. 分割後に `hub-backup` を手動 dispatch し、1 回 green を実測する

## 受入条件

- [ ] `backup.yml` が deploy token を参照せず、R2 write 権限のみの token で完走する
- [ ] deploy 用 token では R2 バケットへ書き込めないことを実測する（権限エラーを確認）
- [ ] `docs/infrastructure-spec.md` §7 の残存リスク節から本 issue の未達記述が消えている

## 参照

- `docs/features/feat-domain-model-db/release-record.md` §8 F-8 / §14
- `docs/infrastructure-spec.md` §7 (GitHub Secrets 台帳・残存リスク)
- `docs/security-spec.md` §4.5 (secret インベントリ)
- `architecture/harness-hub-infrastructure.md` (Risks and verification)
