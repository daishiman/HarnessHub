---
graph_node_id: "issue-c02-upsert-lifecycle-regression-20260729"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","c02","lifecycle","follow-up"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "C02 の同一 feature 再 upsert が昇格済み lifecycle を draft へ巻き戻す"
owners: ["daishiman"]
created_at: "2026-07-29T01:20:52Z"
updated_at: "2026-07-29T06:17:06Z"
status: "closed"
depends_on: []
related_nodes: ["issue-decompose-live-trial-audit-defects-20260726","feat-dev-pipeline-improvement"]
resource_scope: ["plugins/dev-graph/scripts/upsert-node.py","plugins/dev-graph/tests/test_upsert_node_lifecycle_regression.py","plugins/dev-graph/references/execution-tracker-contract.md","docs/features/feat-dev-pipeline-improvement/bk8v-c02-lifecycle-spec-reflection.md","docs/features/feat-dev-pipeline-improvement/final-review.md","features/feat-dev-pipeline-improvement.md"]
purpose: "C02 の再試行で前進済み feature lifecycle を暗黙に巻き戻さない"
goal: "古い feature snapshot の再 upsert が fail-closed で拒否され、意図的な reset だけが明示 patch で実行できる"
scope_in: ["feature 全体 snapshot の stale lifecycle before-image 検出","dry-run と apply の無変更拒否","意図的な lifecycle reset の明示 patch 経路","C02 正本契約と回帰テスト"]
scope_out: ["C14 live-trial 監査実装の変更","製品 API・DB・UI の変更","task・issue・specification・architecture・document の lifecycle policy 変更"]
acceptance: ["昇格済み feature に古い draft snapshot を再 upsert すると dry-run と apply の両方が明示エラーになる","拒否時に graph revision・node・artifact Markdown が変化しない","意図的な lifecycle reset は変更フィールドを列挙した patch で実行できる","通常の冪等 upsert と既存 artifact kind の挙動を壊さない","C02 正本契約と回帰テストが実装を説明し、必要な品質ゲートが PASS する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-c02-upsert-lifecycle-regression-20260729.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-29T01:20:52Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "C14 r7-r11 の実走で同一 feature snapshot による lifecycle 退行を beads/none 両系列で再現した"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-c02-upsert-lifecycle-regression-20260729.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-bk8v","linked_at":"2026-07-29T01:20:52Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-29T06:17:06Z","evidence_refs":["plugins/dev-graph/tests/test_upsert_node_lifecycle_regression.py","plugins/dev-graph/references/execution-tracker-contract.md","docs/features/feat-dev-pipeline-improvement/bk8v-c02-lifecycle-spec-reflection.md","eval-log/dev-graph/run-dev-graph-node/live-trial/20260729T012500Z-bk8v-node/verdict.json","eval-log/dev-graph/run-dev-graph-sync/live-trial/20260729T012501Z-bk8v-sync/verdict.json","eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260729T054655Z-bk8v-final-r5-none/verdict.json"],"policy":"manual","reconciled_at":"2026-07-29T06:17:06Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-07-29T01:20:52Z","missing_sections":[],"status":"complete"}
---

## 概要

C14 の live-trial で、生成時と同じ draft feature JSON を C02 `upsert-node.py` へ再入力すると、先に `confirmed`・`evaluation_status=pass`・`implementation_readiness=complete` まで進めた feature が draft 状態へ戻ることを確認した。

これは再試行しただけで「確認済み」という前進事実を失う不具合である。実走者は毎回 feature を再昇格しなければ publication candidate を維持できず、再昇格を忘れると実装可能な機能が未確定として扱われる。

## 目的

C02 の再試行を安全にし、古い feature snapshot が前進済み lifecycle を暗黙に巻き戻さないようにする。

## 受入条件

- 昇格済み feature に古い draft snapshot を再 upsert すると、dry-run と apply の両方が stale before-image として明示エラーになる。
- 拒否時に graph revision、対象 node、artifact Markdown のいずれも変化しない。
- source 変更などで意図的に再評価する場合は、変更フィールドを列挙した `patch` で lifecycle reset を実行できる。
- lifecycle を退行させない通常の full snapshot、既存の冪等 upsert、feature 以外の artifact kind の挙動を壊さない。
- C02 正本契約と回帰テストが実装と一致し、対象テスト・Dev Graph plugin test・repository 品質ゲートが PASS する。

## 変更範囲

- `plugins/dev-graph/scripts/upsert-node.py`
- `plugins/dev-graph/tests/test_upsert_node_lifecycle_regression.py`
- `plugins/dev-graph/references/execution-tracker-contract.md`
- `docs/features/feat-dev-pipeline-improvement/bk8v-c02-lifecycle-spec-reflection.md`
- `docs/features/feat-dev-pipeline-improvement/final-review.md`
- `features/feat-dev-pipeline-improvement.md`

## スコープ外

- C14 live-trial の監査・scenario 実装
- Harness Hub 製品の API、DB、UI
- feature 以外の artifact kind に対する新しい lifecycle policy

## 実装方針

`node` または bare canonical node は C14 が生成した feature 全体の snapshot とみなす。既存 feature が前進済みで、入力が `status=draft`、`confirmation_status=draft`、`evaluation_status=pending`、または `implementation_readiness.status=incomplete` へ戻そうとする場合は、書込み前に fail-closed で拒否する。

意図的な reset は `patch` として変更点を明示する。これにより、同じ入力の再試行と、担当者が意図した状態変更を入力形式で区別する。

## 品質ゲート

- focused pytest: lifecycle regression と既存 operational loop
- Dev Graph plugin pytest
- Python compile、`git diff --check`
- repository の変更分類に応じた CI parity gate
- behavior closure 変更により必要と判定された live-trial freshness gate

## 発見元

- Beads: `HarnessHub-bk8v`
- 発見元 node: `issue-decompose-live-trial-audit-defects-20260726`
- 仕様反映受領書:
  `docs/features/feat-dev-pipeline-improvement/bk8v-c02-lifecycle-spec-reflection.md`

## 実装結果

- feature の full snapshot 再 upsert 時に、前進済み lifecycle を
  `draft` / `pending` / `incomplete` へ戻す stale before-image を検出し、
  dry-run / apply の両方で書込み前に拒否するようにした。
- 意図的な lifecycle reset は、変更フィールドを列挙した `patch` だけで実行できる。
- 拒否時に graph・対象 node・artifact Markdown が変化しない回帰テストを追加した。
- C02 正本契約へ snapshot 再試行と明示 reset の区別を追記した。

## 検証結果

- focused pytest: `22 passed`
- Dev Graph plugin pytest: `691 passed, 2 skipped, 5 subtests passed`
- task 仕様書: P01〜P13 exact set、digest `af8a73df…`、violations 0
- Python compile: PASS
- `git diff --check`: PASS
- live-trial verdict lint: `9 verdict(s) verified`
- live-trial planner: `reuse=3, run=0, defer=0`
- repository CI parity: `PASS 123 / WARN 4 / FAIL 0`

main 統合後は C02 node と C03 sync の現行 PASS 証跡を再利用し、behavior closure が
変わった C14 decompose だけを fresh fixture で再実走した。r4 は tool result 後に
transcript が進まず上限時間へ達したため FAIL として保存し、新 session の r5 を取得した。
r5 は required observations 7/7、nudge 0、gate 0 で PASS し、fresh な独立 evaluator も
PASS / blockers なしと判定した。

製品 API、DB、認証認可、UI、deploy unit、運用 SLO、C02 単一 writer 境界は変わらない。
したがって `system-spec/`、`specs/`、`architecture/`、exact-13 `tasks/` は非変更とし、
二重正本を避ける層別判断を仕様反映受領書へ記録した。plugin 内部契約への影響は
`plugins/dev-graph/references/execution-tracker-contract.md` へ正規反映した。
