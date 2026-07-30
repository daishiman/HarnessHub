---
graph_node_id: "issue-render-registration-receipt-contract-mismatch-20260726"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","render","acceptance-criteria","vacuous-pass","follow-up","qa-6in4"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "run-dev-graph-render の --registration-receipt が optional 表記なのに OUT1 受入条件は receipt 照合を必須要求している"
owners: ["daishiman"]
created_at: "2026-07-25T22:22:01Z"
updated_at: "2026-07-30T06:43:32Z"
status: "closed"
depends_on: ["issue-guard-fix-closure-verdict-refresh-20260726"]
related_nodes: ["issue-guard-graph-schema-timeout-fail-open-20260725","feat-dev-pipeline-improvement"]
resource_scope: ["plugins/dev-graph/skills/run-dev-graph-render/SKILL.md","plugins/dev-graph/scripts/render-graph-html.py","plugins/dev-graph/tests/test_render_registration_verification.py","plugin-plans/dev-graph/component-inventory.json","eval-log/dev-graph/run-dev-graph-render/"]
purpose: "receipt を渡さない実行では render-metadata の registration が null になり OUT1 の照合が成立しないが、仕様は optional と表記している。表示総数が偶然一致すると照合したように見える真空合格が成立し、呼び出し側から本物の合格と区別できない"
goal: "argument-hint / 引数定義 / criteria:OUT1 の 3 箇所が同じ必須性を述べ、receipt 不在時は照合未実施が出力から識別できる状態にする"
mvp_alignment: null
scope_in: ["SKILL.md 11 行 / 73 行 / 48 行 / 133 行 の必須性表記の整合","receipt 不在時に render-metadata と生成 HTML の双方へ照合未実施を明記する実装","receipt あり / なしの両系統と、子 task 件数が偶然一致する負例の単体テスト"]
scope_out: ["done 数 X の照合 (register-package.py が 13 子を active 強制するため、本変更は登録件数 Y と証拠由来を検証する)","receipt を required にして receipt なし render を廃止する案 (探索的 render の正当な用途を維持する)"]
acceptance: ["SKILL.md の 3 箇所が同じ必須性を述べている","receipt なし実行で render-metadata と HTML の双方に照合未実施が現れる","receipt あり実行で applied_count / expected_count と総数 Y の一致、および source_digest の HTML 出現 1 件以上を機械検証する単体テストが存在する","子 task 件数が receipt 件数と偶然一致する負例で照合未実施が正しく報告される"]
architecture_refs: ["arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-render-registration-receipt-contract-mismatch-20260726.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-25T22:22:01Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "live-trial の独立評価者が receipt 未指定 run を FAIL 判定し、同一条件の過去 run が PASS になっていた事実から、評価者の厳しさに依存して緑赤が変わる仕様不整合であることを確定した"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-render-registration-receipt-contract-mismatch-20260726.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-35ai","linked_at":"2026-07-26T03:25:49Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-30T06:43:32Z","evidence_refs":["docs/features/feat-dev-pipeline-improvement/render-registration-verification-spec-reflection-receipt.md","eval-log/dev-graph/run-dev-graph-render/live-trial/20260730T053500Z-wt18-35ai-render/verdict.json","eval-log/dev-graph/run-dev-graph-render/live-trial/20260730T053500Z-wt18-35ai-render/independent-verification.json","plugins/dev-graph/tests/test_render_registration_verification.py","plugins/dev-graph/skills/run-dev-graph-render/SKILL.md"],"policy":"manual","reconciled_at":"2026-07-30T06:43:32Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-07-25T22:22:01Z","missing_sections":[],"status":"complete"}
---

## 概要

`run-dev-graph-render` は `--registration-receipt` を省略できる一方、
旧 `criteria:OUT1` は receipt 照合を常に成立条件としていた。そのため
receipt 無しでも子 task が偶然 13 件なら、登録を検証したように見える
真空合格（照合していないのに成功したように見える状態）が成立していた。

## 採用した設計

探索的 render を維持するため receipt 自体は optional のままとし、
検証状態を出力へ明示する設計を採用した。

- receipt を指定し、既存 validator を通過した場合だけ `verified`。
- receipt 未指定の場合は `not_performed`。
- CLI JSON、可視 HTML banner、埋込み `render-metadata` で同じ状態を返す。
- receipt 無しで 13 child が見えても登録成功の証拠にしない。

## 実装

- `plugins/dev-graph/scripts/render-graph-html.py`
  - `registration_verification` state を追加した。
  - HTML に登録検証 banner を追加した。
  - stdout receipt と埋込み metadata に同じ state を含めた。
- `plugins/dev-graph/skills/run-dev-graph-render/SKILL.md`
  - argument hint、引数定義、OUT1 の optionality を統一した。
  - receipt 無しの探索表示は `not_performed` と明記した。
- `plugins/dev-graph/tests/test_render_registration_verification.py`
  - receipt 有りの verified と source digest 表示を検証した。
  - 同じ 13 child graph の receipt 無し負例を検証した。
  - 560 行だった混成テストから renderer 専用責務を分離した。

## 受入条件

- SKILL.md の引数説明と OUT1 は同じ必須性を述べる: PASS
- receipt 無しで HTML と metadata に照合未実施が現れる: PASS
- receipt 有りで件数と source digest を機械検証する: PASS
- 13 child の偶然一致を `not_performed` とする負例がある: PASS

## 検証

- focused renderer / sync test: PASS
- Dev Graph plugin test: PASS
- content review / criteria review: PASS
- fresh live trial
  `20260730T053500Z-wt18-35ai-render`: overall PASS、nudge 0、gate response 0
- independent evaluator: 8 checks PASS、blocker 0
- task package `feature-package/feat-dev-pipeline-improvement`: exact-13 / PASS

## 仕様・設計への影響

repository 内 renderer の登録検証表示を厳密化する設計影響があるため、
`system-spec/testing-qa.md`、集約仕様、testing architecture、feature、
P13 task、最終レビュー、仕様反映受領書へ同一 wave で反映した。

製品 API、DB schema、認証認可、製品 UI、Cloudflare deploy unit、
確定済み QA 回答は変更しない。詳細は
`docs/features/feat-dev-pipeline-improvement/render-registration-verification-spec-reflection-receipt.md`
を正とする。

## 残課題

本課題の実装・仕様反映・検証範囲に残課題はない。draft PR の URL は
作成後に Beads の completion note へ追記する。
