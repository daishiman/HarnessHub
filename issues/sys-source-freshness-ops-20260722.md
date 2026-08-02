---
graph_node_id: "issue-source-freshness-ops-20260722"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["system-spec","freshness","operations"]
priority: "low"
start_date: null
target_date: null
iteration: null
title: "C08 出典追随運用 (claude-code-plugins H7 再照合 / drizzle rc 再確認 / wrangler pinned version 検討)"
owners: ["daishiman"]
created_at: "2026-07-21T23:30:33Z"
updated_at: "2026-08-02T09:03:36.475602Z"
status: "closed"
depends_on: []
related_nodes: ["feat-stage0-distribution-gate","issue-h7-git-subdir-revalidation-20260730"]
resource_scope: ["system-spec/fetched-references.json","system-spec/index.md","specs/harness-hub-system-specification.md","architecture/harness-hub-infrastructure.md","features/feat-stage0-distribution-gate.md","tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p12.md","docs/features/feat-stage0-distribution-gate/requirements-baseline.md","docs/features/feat-stage0-distribution-gate/test-design.md","docs/features/feat-stage0-distribution-gate/stage0-gate-conclusion.md","docs/features/feat-stage0-distribution-gate/source-freshness-spec-reflection-receipt.md","issues/sys-source-freshness-ops-20260722.md","issues/sys-h7-git-subdir-revalidation-20260730.md"]
purpose: "C08 出典鮮度監査の findings を一次資料で解消し、仕様ドリフトを履歴と後続検証へ正しく接続する"
goal: "4 対象の公式出典が現行値と追随条件へ更新され、仕様・設計影響と H7 再検証境界が正本へ反映された状態"
scope_in: ["nextjs / drizzle-orm / claude-code-plugins / wrangler の公式一次資料による現行値と追随時点の再照合","canonical source registry と deterministic index の正規 writer 経由更新","git-subdir による H7 前提変化の仕様・設計・feature・task・evidence 層への追記","macOS / Windows E2E を別 issue として fail-closed に追跡"]
scope_out: ["runtime dependency と lockfile の更新","過去の H7 実行証跡と NOT_ESTABLISHED 判定の書き換え","E2E 未完了のまま Stage 1 gate を解除すること"]
acceptance: ["nextjs / drizzle-orm / claude-code-plugins / wrangler を公式一次資料で再照合し、canonical registry と生成 index が更新されている","仕様・設計影響が docs / features / system-spec / specs / architecture / tasks に dated addendum として反映され、受領書がある","現行 git-subdir の macOS / Windows E2E を、旧 H7 の判定を改変せず後続 Beads issue で fail-closed に追跡している"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-source-freshness-ops-20260722.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-02T09:01:07Z","origin_kind":"manual","source_digest":"1a85072d10ea2bc792ab2c7833d28b78f5038cb8dafd53daf7955024d654e72c","source_path":"system-spec/index.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.95
classification_reason: "C08 出典鮮度監査 (2026-07-22) の low findings 3 件 (追随運用の示唆) を追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-source-freshness-ops-20260722.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-e2u","linked_at":"2026-07-22T00:49:29Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-30T00:33:34Z","evidence_refs":["system-spec/fetched-references.json","system-spec/index.md","specs/harness-hub-system-specification.md","architecture/harness-hub-infrastructure.md","features/feat-stage0-distribution-gate.md","tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p12.md","docs/features/feat-stage0-distribution-gate/requirements-baseline.md","docs/features/feat-stage0-distribution-gate/test-design.md","docs/features/feat-stage0-distribution-gate/stage0-gate-conclusion.md","docs/features/feat-stage0-distribution-gate/source-freshness-spec-reflection-receipt.md","issues/sys-source-freshness-ops-20260722.md","issues/sys-h7-git-subdir-revalidation-20260730.md"],"policy":"manual","reconciled_at":"2026-07-30T00:33:34Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-07-21T23:30:33Z","missing_sections":[],"status":"complete"}
---

# 概要

C08 出典鮮度監査の low/moderate findings を運用として追跡し、2026-07-30 に
4 対象を公式一次資料へ再照合した。記録は C02 `run-system-spec-doc-fetch` の
決定論 assembler を通して更新し、`fetched-references.json` の手書き更新を避けた。

## 2026-07-30 再照合結果

| 対象 | 現行確認 | 追随タイミングと判断 |
|---|---|---|
| claude-code-plugins | Anthropic 公式 marketplace 文書を HTTP 200 で取得し、ローカル CLI 2.1.220 を確認。`git-subdir` は `url` / `path` と任意の `ref` / `sha` を持つ正式 source となり、monorepo の一部を sparse clone できる | H7 再検証または Publisher 実装着手の直前に公式文書と changelog を再照合し、macOS / Windows で install → `plugin details` → skill 実行まで確認する。旧 H7 の「github source の path/subdir が無視される」という実測は履歴として保持するが、現行 `git-subdir` の不成立根拠には使わない |
| nextjs | 公式 GitHub Releases と npm registry が安定版 16.2.12 で一致。16.3.0 は preview/canary | 実装着手・依存更新時に latest 安定版と採用 major の最新 patch を再照合する。今回の C02 記録を 16.2.12 へ更新した |
| drizzle-orm | 公式 GitHub Releases と npm registry が安定版 0.45.2 / v1 prerelease 1.0.0-rc.4 で一致。npm の `rc` dist-tag も現在は rc.4 | v1 採用判断の直前に 2 つの一次資料を再照合し、migration・SQLite/Turso 互換テスト後に固定版を更新する。現在の lockfile が解決する安定版 0.45.2 を維持する |
| wrangler | Cloudflare 公式 workers-sdk Releases と npm registry が 4.115.0 で一致。Cloudflare 公式文書は project-local install を推奨 | frozen lockfile の解決版を CI/deploy の固定点とする。更新は明示的な依存更新として行い、worker build/dry-run と deploy 関連ゲートの通過後に採用する。出典台帳には数値版 4.115.0 を追加した |

## 受け入れ条件との対応

1. 4 件の追随タイミングは上表と `system-spec/fetched-references.json` の各 summary
   に記録した。claude-code-plugins の H7 実行直前ゲートは
   `docs/features/feat-stage0-distribution-gate/requirements-baseline.md` と
   `test-design.md` にも既存配線されている。
2. nextjs / claude-code-plugins は C02 assembler 経由で現行情報へ更新した。
   あわせて drizzle-orm を再確認し、wrangler は `last_updated` だけの記録から
   数値版 4.115.0 の記録へ変更した。

## 検証

- `validate-source-citation.py`: 20 targets / 20 references、欠落・重複・必須項目欠落・host 不一致 0
- `test_build_fetched_references.py`: 29 passed
- `system-spec/index.md`: `compile-spec-doc.py` が生成した index と byte-for-byte 一致

## 仕様・設計影響と正規反映

`git-subdir` は旧 H7 の配信経路前提を変えるため、仕様・設計影響は **あり** と判断した。
一方、Next.js / Drizzle / Wrangler は出典台帳と依存更新方針の更新であり、
runtime dependency、外部 API、DB schema、認証認可、UI は変更しない。

次の層へ履歴を壊さない addendum（追記）として反映した。

- `system-spec/fetched-references.json` / `system-spec/index.md`
- `specs/harness-hub-system-specification.md`
- `architecture/harness-hub-infrastructure.md`
- `features/feat-stage0-distribution-gate.md`
- `tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p12.md`
- `docs/features/feat-stage0-distribution-gate/requirements-baseline.md`
- `docs/features/feat-stage0-distribution-gate/test-design.md`
- `docs/features/feat-stage0-distribution-gate/stage0-gate-conclusion.md`

正規フローの実施内容と層別判断は
`docs/features/feat-stage0-distribution-gate/source-freshness-spec-reflection-receipt.md`
に記録した。

## 残課題

現行 `git-subdir` 経路を macOS / Windows で install → `plugin details` →
skill 実行まで検証する作業を `HarnessHub-n2c0`
(`issue-h7-git-subdir-revalidation-20260730`) として起票した。
証跡が揃うまでは Stage 0 の `NOT_ESTABLISHED` と Stage 1 fail-closed を維持する。
