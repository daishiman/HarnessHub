---
graph_node_id: "issue-dual-catalog-polling-terminal-visibility-20260810"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["dual-catalog","polling","bug","accessibility"]
priority: "high"
start_date: "2026-08-10"
target_date: null
iteration: null
title: "Dual Catalog polling の fatal 即時停止と visibility 復帰再開"
owners: ["daishiman"]
created_at: "2026-08-10T00:00:00Z"
updated_at: "2026-08-10T11:21:31.986602Z"
status: "active"
depends_on: []
related_nodes: ["feat-dual-catalog-web","issue-hub-cwv-tbt-over-budget-20260724"]
resource_scope: ["apps/hub/src/components/catalog","apps/hub/src/components/publish","apps/hub/src/lib/catalog","apps/hub/src/__tests__/dual-catalog-web"]
purpose: "回復不能な失敗で無駄な再試行を止め、不可視タブから戻った利用者には publish 状態の確認を安全に再開する。"
goal: "失敗分類・publish 状態・visibility を一貫した停止条件として扱い、不要通信と更新停止を同時に解消する。"
scope_in: ["401/403/fatal の即時停止","visibilitychange による復帰時再開","fake timer と visibility event の回帰検査","ADR と運用文書の同期"]
scope_out: ["publish API の状態機械変更","ポーリング間隔上限の変更","push 通知への移行"]
acceptance: ["401/403/契約不正では次の poll timer を予約しない","hidden 中は poll せず visible 復帰時に pollable state だけ再開する","cleanup 後に listener または timer が残らない","実装・ADR・回帰検査が同じ停止条件を表明する"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/dual-catalog-polling-terminal-visibility-20260810.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"285d88f967f7488fd54c0d9a55f946b14c208a2f0eb957bcc06c3779b7468fb7","evaluator":"feat-dual-catalog-web independent design review","evidence_ref":"docs/features/feat-dual-catalog-web/design-review-notes.md"}
source_lineage: {"imported_at":"2026-08-10T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "既存 hook の具体的な失敗再試行と visibility 復帰停止をコードレビューで確認した、実装可能な独立 bug。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/dual-catalog-polling-terminal-visibility-20260810.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-h2pe","linked_at":"2026-08-09T20:50:43.234907Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-10T00:00:00Z","missing_sections":[],"status":"complete"}
---

# Dual Catalog polling の fatal 即時停止と visibility 復帰再開

## 概要

publish 状態ポーリングが回復不能な失敗でも再試行し、不可視タブから戻った後は自動再開しない。この二つを同じ lifecycle 契約で直す。

## 背景と問題

設計レビューで、401・403・契約不正が通常の一時失敗と同じ回数だけ再試行されること、hidden で停止した timer が visible 復帰時に再設定されないことを確認した。前者は不要通信、後者は古い状態の表示を生む。

## 起票時の挙動

- 401 / 403 / fatal でも attempt 上限まで poll する。
- hidden 時は停止するが、visible 復帰を購読していない。
- 利用者が明示的に Retry すれば復旧できる。

## 期待する挙動

回復不能な失敗は即時停止し、hidden 中は通信せず、visible 復帰時は pollable な publish 状態だけを安全に再開する。

## 再現手順またはユースケース

1. publish status API を 401、403、契約不正の順に stub する。
2. fake timer を進め、追加 request が発生しないことを確認する。
3. pollable state で document を hidden から visible へ変え、復帰後に一度だけ再開することを確認する。

## 影響と優先度

失敗時の不要通信と、復帰した利用者が古い状態を見続ける問題があるため high。API 状態機械自体は変更しない。

## スコープ

hook、polling 純関数、focused test、ADR を対象とする。publish API、backoff 上限、push 通知は対象外。

## 関連グラフ

- `feat-dual-catalog-web`
- `arch-harness-hub-frontend`
- `issue-hub-cwv-tbt-over-budget-20260724`

## 受入条件

- 401 / 403 / fatal では次の timer を予約しない。
- hidden 中は poll せず、visible 復帰時は pollable state だけ再開する。
- unmount 後に timer と event listener が残らない。

## 実装状況（2026-08-10）

- 401 / 403 / fatal は共通の純関数で終端判定し、次の timer を予約しない。
- timer 待機中に hidden へ変わった場合も、通信開始前に可視性を再判定して request を送らない。
- visible 復帰時は、可視性以外の停止理由がない pollable state だけを一度再開する。
- S03 (`CatalogPublishStatus`) と S01 (`PublishWizard`) を同じ契約へ揃えた。
- lifecycle 検査は hidden 中の request 増分 0、復帰時 +1、終端失敗後 +0、unmount 後 +0 を確認する。

## 検証証跡

- 起票根拠: `docs/features/feat-dual-catalog-web/design-review-notes.md` §5.3 / F1 / F2
- 回帰検査: `polling-contract.test.ts` 14件、`polling-lifecycle.test.tsx` 9件（2026-08-10 PASS）
- 仕様反映: 同 design review §5.3 の follow-up 解消記録
