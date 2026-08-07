---
graph_node_id: "issue-auth-501-doc-refresh-20260726"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "docs"
tags: ["follow-up","doc-drift","auth-tenancy"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "feat-auth-tenancy 成果物の /api/auth 501 記述を実装へ追従させる"
owners: ["daishiman"]
created_at: "2026-07-26T00:00:00Z"
updated_at: "2026-07-28T04:11:53Z"
status: "done"
depends_on: ["issue-auth-tenancy-production-adapter-20260725"]
related_nodes: ["feat-auth-tenancy","issue-auth-tenancy-production-adapter-20260725"]
resource_scope: ["docs/features/feat-auth-tenancy/"]
purpose: "HarnessHub-b7ng で @auth/core を adapter 境界内へ導入し、/api/auth/[...nextauth] は 501 auth_provider_not_wired ではなく tenant 別 OIDC を処理するようになった。しかし feat-auth-tenancy の成果物 6 件 (architecture-decision-record.md / acceptance-record.md / test-run-results.md / release-record.md / refactoring-migration-note.md / final-review-record.md) は依然として『501 を返す』『next-auth 未導入』『本番 runtime 未結線』と記述している。これらは feature 完了時の記録であり、当時としては正しいが、現在の実装を知らない読者が『まだ未結線だ』と誤読する。特に final-review-record.md の未達表は HarnessHub-b7ng を open として掲げており、epic rollup の判断材料になる。記録の改竄ではなく『いつ何が変わったか』を追記する形で追従させる必要がある"
goal: "feat-auth-tenancy の成果物を読んだ人が、/api/auth の現在の挙動 (tenant 別 OIDC を処理する) と、501 だった期間および解消した経緯を取り違えずに読める状態"
scope_in: ["docs/features/feat-auth-tenancy/ の該当 6 ファイルについて、501 記述に HarnessHub-b7ng で解消した旨の追記または更新を行う","final-review-record.md の未達表から Auth.js 実結線の行を解消済みへ更新する (HarnessHub-b7ng の acceptance 4 件を根拠として参照する)","doc-line-limit の ratchet 対象ファイルがある場合は行数を増やさない形 (置換) に留める"]
scope_out: ["実装の変更 (実装は HarnessHub-b7ng で完了している)","system-spec/ および docs/security-spec.md の内容変更 (R4-reopen が必要。spec delta は issue-auth-tenancy-spec-delta-20260725 が所有)","feat-auth-tenancy epic の close 判定 (依存 feature の未了があり別途)"]
acceptance: ["docs/features/feat-auth-tenancy/ 配下に、/api/auth が 501 を返すと現在形で述べている記述が残っていない (grep で確認できる)","final-review-record.md の Auth.js 実結線の行が解消済みとして、根拠 (HarnessHub-b7ng の受入条件) 付きで更新されている","lint-doc-line-limit.py が exit 0 のままである"]
architecture_refs: ["arch-harness-hub-security"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-auth-501-doc-refresh-20260726.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52","evaluator":"final-review/docs-gates","evidence_ref":"docs/features/feat-auth-tenancy/spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-07-26T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"docs/features/feat-auth-tenancy/final-review-record.md","source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "HarnessHub-b7ng の実装により陳腐化した feature 成果物の記述を追従させる doc drift issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-auth-501-doc-refresh-20260726.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-mr3c","linked_at":"2026-07-26T06:24:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: [{"base_branch":"main","closing_reference_verified":true,"head_branch":"devgraph/issue-auth-tenancy-production-adapter-20260725","linked_at":"2026-07-26T04:29:00Z","merge_commit_sha":"8e8f9a46851906926f00bf097fda4a34ba672ec1","merged_at":"2026-07-26T01:35:21Z","pr_number":76,"repo":"daishiman/HarnessHub","state":"merged","url":"https://github.com/daishiman/HarnessHub/pull/76"}]
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-26T01:35:21Z","evidence_refs":["docs/features/feat-auth-tenancy/spec-reflection-receipt.md","https://github.com/daishiman/HarnessHub/pull/76"],"policy":"linked_pr_merged_all","reconciled_at":"2026-07-26T04:29:00Z","source":"github_pr_merge","status":"done"}
implementation_readiness: {"checked_at":"2026-07-26T06:46:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`feat-auth-tenancy` の成果物 6 件が `/api/auth/[...nextauth]` を「501
`auth_provider_not_wired` を返す」と現在形で記述していた。
HarnessHub-b7ng で `@auth/core` を adapter 境界内へ導入し、tenant 別 OIDC を
処理するようになったため、履歴を保ちながら現行実装へ追従した。

## 背景と問題

501 を返す実装は「未結線を隠さない」ための意図的な設計だった
（ADR AD-8 と同じ思想）。成果物はその時点を正しく記録しているため、
記録を消さず、**「いつ何が変わったか」を追記する**形で更新した。

## 現在の挙動

| ファイル | 反映内容 |
|---|---|
| ADR / implementation notes | `@auth/core`、JWT bridge、tenant route、本番 DB ports の解消追記 |
| acceptance / test results | 初回条件付き判定と 2026-07-26 の完全結線を区別 |
| release / final review | production composition 完了と本番デプロイ未実施を区別 |
| evidence / QA / refactoring | CI 結線と Auth.js 結線の現在状態を更新 |
| spec reflection receipt | 仕様影響、正規フロー、migration、検証、残課題を集約 |

## 期待する挙動

読者が「現在の `/api/auth` は tenant 別 OIDC を処理する」と
「501 だった期間とその理由」を取り違えずに読める。

## 再現手順またはユースケース

`rg -n "501|auth_provider_not_wired" docs/features/feat-auth-tenancy`

## 影響と優先度

- 影響: 実装ではなく読み手の判断。未結線と誤読すると重複実装や誤った epic 判定に繋がる。
- 優先度: medium。動作影響はないが、`final-review-record.md` は rollup 判断に使われる。

## スコープ

- In: 該当成果物の追記・更新、`final-review-record.md` 未達表の更新。
- Out: 実装変更、本番デプロイ、feat-auth-tenancy epic の close 判定。

## 関連グラフ

- `feat-auth-tenancy`
- `issue-auth-tenancy-production-adapter-20260725` / `HarnessHub-b7ng`

## 受入条件

1. [x] 501 記述を過去時点の履歴として明示した。
2. [x] `final-review-record.md` の Auth.js 実結線を根拠付きで解消済みへ更新した。
3. [x] `lint-doc-line-limit.py` と `lint-artifact-placement.py` が exit 0。
4. [x] PR #76 が default branch へ merge された。

## Verification and evidence

- Automated command: `python3 scripts/lint-doc-line-limit.py`
- Automated command: `python3 scripts/lint-artifact-placement.py`
- Required evidence: `docs/features/feat-auth-tenancy/spec-reflection-receipt.md`
- Required evidence: `docs/features/feat-auth-tenancy/final-review-record.md`
- Merge authority: `https://github.com/daishiman/HarnessHub/pull/76`
