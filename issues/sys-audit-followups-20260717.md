---
acceptance: ["補正内容を裏付ける qa_ref への再確定", "fetched-references.json の一次照合更新", "C01 SSOT の意味論明記"]
architecture_refs: []
artifact_kind: issue
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "issue", "candidate_path": "issues/sys-audit-followups-20260717.md", "confidence": 0.95}]
classification_confidence: 0.95
classification_reason: C06/C07/C08 監査 (2026-07-17) の残 findings 4 件を追跡する issue (聞き取り/マトリクス/鮮度の低〜中優先是正)
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "open"}
confirmation_evidence: {"evaluated_digest": null, "evaluator": null, "evidence_ref": null}
confirmation_status: draft
created_at: 2026-07-17T09:30:00Z
depends_on: []
domain: documentation
evaluation_status: pending
execution_contexts: []
feature_package_id: null
file_path: issues/sys-audit-followups-20260717.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
goal: auth.web / infrastructure.desktop-* の qa_ref 裏付け強化、claude-code-plugins / authjs の一次照合、hearing_progress 意味論の SSOT 明記が完了している
graph_node_id: issue-audit-followups-20260717
implementation_readiness: {"checked_at": "2026-07-17T09:30:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: null
phase_ref: null
priority: medium
project_id: harness-hub
pull_request_linkages: []
purpose: C06/C07/C08 監査 (2026-07-17) で残った低〜中優先 findings 4 件を追跡し、次回 spec 改訂時に是正する
related_nodes: ["spec-harness-hub-requirements"]
resource_scope: ["system-spec/spec-state.json", "system-spec/fetched-references.json"]
scope_in: ["auth.web qa_ref 再確定", "infrastructure.desktop-* qa_ref 差替", "C02 一次照合 (claude-code-plugins / authjs)", "C01 SSOT へ hearing_progress 意味論を明記"]
scope_out: ["Studio mockup 反映本体 (是正済み)", "C05 完了ゲートの再評価"]
source_lineage: {"imported_at": "2026-07-17T09:30:00Z", "origin_kind": "manual", "source_digest": null, "source_path": null, "source_plugin": null, "source_version": null}
start_date: null
status: draft
tags: ["audit", "system-spec", "follow-up"]
target_date: null
template_id: issue
template_version: 1.0.0
title: Studio 反映監査 (C06/C07/C08) の残 findings 4 件の是正
tracker_binding: beads
updated_at: 2026-07-17T09:30:00Z
---

# 概要

2026-07-17 の Studio mockup 要件反映に対する監査 (C06/C07/C08) で検出された、低〜中優先の残 findings 4 件をまとめて追跡する。

## 背景と問題

Harness Studio mockup の要件層反映 (qa-021〜030・D5/D6・U7 改訂) に対して C06 (ヒアリング監査)・C07 (マトリクス監査)・C08 (鮮度監査) を実施した。高 severity の指摘 (D5/D6/foundation の証跡欠落) は qa-028/029/030 + appr-005 で是正済み。ただし以下の低〜中優先 findings が未是正で残っている。

## 現在の挙動

1. [C07 / medium] auth.web の qa_ref=qa-005 は、elegant-review 由来の reopen 補正 (認可マトリクス・トークンライフサイクル・deny-by-default 欠落操作の修正) を裏付ける auth 向け質疑が qa_log に存在しない。mockup 反映で他 7 カテゴリは qa-021〜027 の再確認質疑を得たが、auth のみ初期質疑のまま。
2. [C07 / low] infrastructure.desktop-windows / desktop-macos の qa_ref=qa-003 は desktop 固有言及が末尾一文のみで薄い (ui-ux/security は過去に qa-007/qa-008 へ差替済みの前例あり)。
3. [C08 / medium] WebFetch 不可環境のため claude-code-plugins / authjs の再照合が WebSearch 二次照合に留まった。一次照合 (source_url 直接 GET) を C02 (run-system-spec-doc-fetch R2) で行い、latest_checked_at を更新する。特に authjs は 2026-07-07 の Vercel による Better Auth 買収 (D3 リスク) の公式ページ本文確認が必要。
4. [C06 / low] qa-014 が複数論点 (非保持境界 + U1-U9 承認) を 1 エントリに束ねており論点分離が検証しづらい。また hearing_progress.loop_count の意味論 (全体 loop か直近差分 loop か) が C01 SSOT に未定義。
5. [dev-graph / medium・2026-07-17 追記] 要件層の並行拡張 (qa-034〜037・dev-workflow カテゴリのヒアリング進行・章 .md の stub 化) の収束後に、(a) `/spec-compile` で全章を再描画し、(b) C05 完成度評価を再実行し、(c) spec/architecture wrapper 6 件の一括 reimport (digest 追従・本文短縮表記込み) と全 confirmed feature の pin 再確定を行う。wrapper は現在世代混在 (逐次追従の限界を確認済み)。plan 済み 6 feature の goal-spec lineage は時点記録として有効 (canonical gate は wrapper 非依存)。

## 期待する挙動

- auth.web と infrastructure.desktop-* が補正内容を成文化した qa_ref で再確定されている (C01 R4-reopen 経由)
- claude-code-plugins / authjs の一次照合が完了し fetched-references.json が更新されている
- C01 SSOT に hearing_progress の意味論が明記されている

## 再現手順またはユースケース

1. C06/C07/C08 の監査レポート (2026-07-17 実施、本 issue 本文に要約) を参照する

## 影響と優先度

- 影響範囲: system-spec の監査トレーサビリティ (実装ブロッカーではない)
- 深刻度: medium
- 緊急度: 低 — ゲート (coverage/citation/C05) は全て緑であり、次回 spec 改訂時にまとめて是正すれば足りる

## スコープ

- In: 上記 findings 4 件の是正
- Out: mockup 反映本体 (是正済み)・C05 完了ゲートの再評価

## 関連グラフ

- 原因/親ノード: spec-harness-hub
- 関連仕様: spec-harness-hub
- 関連アーキテクチャ: (該当なし)
- 解決タスク: (未割当)

## 受入条件

- [ ] auth.web の qa_ref が補正内容を裏付ける質疑を指す
- [ ] infrastructure.desktop-* の qa_ref が desktop 固有の質疑を指す
- [ ] claude-code-plugins / authjs の一次照合完了と record 更新
- [ ] hearing_progress の意味論が C01 SSOT に明記

## 検証証跡

- コマンド/テスト: python3 plugins/system-spec-harness/scripts/validate-coverage-matrix.py --matrix system-spec/spec-state.json --require-complete --require-foundation
- 証跡 path: system-spec/spec-state.json (qa_log / reopen_log), system-spec/fetched-references.json
