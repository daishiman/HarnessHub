---
graph_node_id: "feat-runtime-env-resolution-discipline"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "platform"
tags: ["runtime-env","secrets","auth","ci","web-only"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "環境値解決層の一本化と module 最上位での構築禁止"
owners: ["daishiman"]
created_at: "2026-08-07T11:12:00Z"
updated_at: "2026-08-07T11:12:00Z"
status: "draft"
depends_on: []
related_nodes: ["spec-post-signin-landing-observability","arch-harness-hub-infrastructure","arch-harness-hub-security"]
resource_scope: ["apps/hub/src/lib/env","apps/hub/src/middleware.ts","apps/hub/src/app/page.tsx","apps/hub/src/lib/authz","apps/hub/scripts"]
purpose: "Cloudflare Workers では環境値がリクエスト context 経由でしか解決できず、module 最上位での構築は解決前に走る。この規律が実装横断で守られていることを人手のレビューに頼っている状態を、機械検査へ移す。"
goal: "認証を含む全ての環境値読み出しが既存の吸収層を通り、吸収層外の直接読み出しと module 最上位での構築が CI で 0 件に保たれる状態にする。"
scope_in: ["環境値読み出しの吸収層への一本化","module 最上位で環境値に依存する構築を行わない規律の機械検査","認証系の環境値について、投入の有無と実装が読める経路かを別々に検査する","初回 deploy 相当 (secret 未投入の新規 Worker) と preview Worker を検査対象に含める","既存の deploy 時ゲート (必須 secret の実投入検査) の維持と限界の明記"]
scope_out: ["環境値の値そのものの記録 (名前だけを扱い値は扱わない)","secret の投入操作そのもの (運用操作)","wrangler.jsonc へ値を保存する変更 (必須名の宣言のみに留める既存方針を維持)"]
acceptance: ["認証を含む全ての環境値読み出しが既存の吸収層を通り、吸収層外の直接読み出しが 0 件である","module 最上位で環境値に依存する構築を行っていない","認証に関わる構築物が module scope に保持されず、リクエストごとに解決される","現在の middleware.ts / app/page.tsx / lib/authz/runtime.ts の 3 箇所すべてに対して検査が実際に発火する","認証系の環境値について、投入の有無と実装が読める経路かの両方が別々に検査される","既存の deploy 時ゲートが維持され、必須名を 1 つ外した状態で deploy が実際に失敗する","初回 deploy 相当でも deploy が不足名の列挙で失敗し、preview Worker が検査対象から外れていない"]
architecture_refs: ["arch-harness-hub-infrastructure","arch-harness-hub-security"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-runtime-env-resolution-discipline.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-07T11:12:00Z","origin_kind":"system-spec-harness","source_digest":"e1ecf64f6bd0dfc66926fc252aae33dd70303563a0bfda48954e3f58f64a9146","source_path":"system-spec/spec-state.json","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.95
classification_reason: "確定仕様追補 spec-post-signin-landing-observability (qa-170〜qa-199) を macro 分解した feature"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-runtime-env-resolution-discipline.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-07T11:12:00Z","missing_sections":[],"status":"incomplete"}
---

# 環境値解決層の一本化と module 最上位での構築禁止

## 0. なぜこの feature があるのか

Cloudflare Workers の環境値は、Node.js のように process 起動時に揃っているわけではない。リクエスト context を通じてしか解決できず、**module 最上位で構築したものは解決前に走る**。この違いは静かに効く — 動くこともあるし、環境によっては解決できずに縮退する。

本 feature は、この規律を人手のレビューではなく CI が守る状態にする。

## 1. 目的

Cloudflare Workers では環境値がリクエスト context 経由でしか解決できず、module 最上位での構築は解決前に走る。この規律が実装横断で守られていることを人手のレビューに頼っている状態を、機械検査へ移す。

## 2. ゴール

認証を含む全ての環境値読み出しが既存の吸収層を通り、吸収層外の直接読み出しと module 最上位での構築が CI で 0 件に保たれる状態にする。

## 3. 含むもの

- 環境値読み出しの吸収層への一本化
- module 最上位で環境値に依存する構築を行わない規律の機械検査
- 認証系の環境値について、投入の有無と実装が読める経路かを別々に検査する
- 初回 deploy 相当 (secret 未投入の新規 Worker) と preview Worker を検査対象に含める
- 既存の deploy 時ゲート (必須 secret の実投入検査) の維持と限界の明記

## 4. 含まないもの

- 環境値の値そのものの記録 (名前だけを扱い値は扱わない)
- secret の投入操作そのもの (運用操作)
- wrangler.jsonc へ値を保存する変更 (必須名の宣言のみに留める既存方針を維持)

## 5. 受入基準

- 認証を含む全ての環境値読み出しが既存の吸収層を通り、吸収層外の直接読み出しが 0 件である
- module 最上位で環境値に依存する構築を行っていない
- 認証に関わる構築物が module scope に保持されず、リクエストごとに解決される
- 現在の middleware.ts / app/page.tsx / lib/authz/runtime.ts の 3 箇所すべてに対して検査が実際に発火する
- 認証系の環境値について、投入の有無と実装が読める経路かの両方が別々に検査される
- 既存の deploy 時ゲートが維持され、必須名を 1 つ外した状態で deploy が実際に失敗する
- 初回 deploy 相当でも deploy が不足名の列挙で失敗し、preview Worker が検査対象から外れていない

## 6. 前提となる feature

- なし (他 feature の完了を待たずに着手できる)

## 7. 参照するアーキテクチャ

- `arch-harness-hub-infrastructure`
- `arch-harness-hub-security`

## 8. 補足

> **値ではなく名前だけを扱う。** 縮退の記録に環境値の値を含めてはならない。非記録契約 (qa-151 [147-b]) により、token・cookie 値・claim 本文・個人データは記録しない。解決できなかった**名前**は記録してよい。

> 既存の deploy 時ゲートには限界がある — 必須 secret が投入されているかは見るが、**実装がその名前を読める経路にいるか**は見ていない。投入済みでも吸収層外から読んでいれば解決できない。この 2 つを別々に検査する。

## 9. 出所

確定仕様追補 [`spec-post-signin-landing-observability`](../docs/features/feat-post-signin-landing-surface/landing-observability-investigation.md) を macro 分解したもの。
正本は `system-spec/spec-state.json` (qa-170〜qa-199, digest `e1ecf64f6bd0dfc6…`)。
本 feature は仕様本文を複製せず、`architecture_refs` と source lineage で参照する。
