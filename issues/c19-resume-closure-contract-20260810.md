---
graph_node_id: "issue-c19-resume-closure-contract-20260810"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["dev-graph","c19","live-trial","resume","quality-gate"]
priority: "medium"
start_date: "2026-08-10"
target_date: null
iteration: null
title: "C19 resume live-trial の経路別完了契約を閉じる"
owners: ["daishiman"]
created_at: "2026-08-09T21:21:12Z"
updated_at: "2026-08-09T21:37:31Z"
status: "active"
depends_on: []
related_nodes: ["issue-system-spec-import-heading-contract-20260808","issue-resource-map-deep-cards-20260722","arch-harness-hub-dev-workflow","feat-dev-pipeline-improvement"]
resource_scope: ["plugins/dev-graph/skills/run-dev-graph-system-spec","plugins/dev-graph/scripts/validate-system-spec-evaluator-completion.py","plugins/dev-graph/scripts/build-system-spec-resume-import.py","eval-log/dev-graph/run-dev-graph-system-spec/live-trial"]
purpose: "初回 build 専用の evaluator completion gate と、evaluator 再実行を禁じる resume path の矛盾を解消し、fresh C19 trial を正しく fail-closed に閉じる。"
goal: "build と resume がそれぞれの authority で検証され、resume の C02・lineage・evidence 全 step を transcript と runner report で証明できる状態にする。"
scope_in: ["build/resume 経路別 completion validation","deterministic resume runner の source/evidence gate","fresh bounded C19 live trial","仕様反映受領書と Beads 同期"]
scope_out: ["system-spec の製品要件追加","Hub runtime API・DB・認証・UI の変更","C19 以外の live-trial redesign"]
acceptance: ["resume path が evaluator/upstream Skill/Agent/direct upsert 0 件を検証しながら PASS できる","runner report/stdout と C02・source digest・evidence ref 全 step が exit 0 で束縛される","fresh bounded C19 live trial と独立 goal evaluation が PASS する","draft PR merge 後に Beads と graph completion を reconciliation できる"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/c19-resume-closure-contract-20260810.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"d615f06ca65ed9e92ac307b5ad459e8a28d0e93383a2689e487f1a2ccb077c4f","evaluator":"fresh C19 bounded goal evaluator","evidence_ref":"docs/features/feat-dev-pipeline-improvement/c19-resume-closure-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-09T21:21:12Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 1.0
classification_reason: "pre-push の fresh C19 evaluator が再現可能な completion contract 矛盾を検出し、実装修正と merge 後追跡が必要なため issue とする。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/c19-resume-closure-contract-20260810.md","confidence":1.0}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-6fgb","linked_at":"2026-08-09T21:27:01Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-08-09T21:21:12Z","missing_sections":[],"status":"complete"}
---

# C19 resume live-trial の経路別完了契約を閉じる

## 概要

初回 build 専用の evaluator completion gate が、evaluator を再実行してはいけない resume path にも一律適用され、正常な C02 import を失敗扱いにしていた。経路別 authority と post-run evidence を定義して解消する。

## 背景と問題

fresh bounded C19 trial は digest-bound PASS receipt を検証し、上流 Skill と network を 0 回に保ったまま architecture / specification を C02 経由で登録した。しかし従来の完了 validator は evaluator Skill 起動と transcript 上の direct `upsert-node.py` を要求したため、resume runner 内に正しく隠蔽した C02 を証明できなかった。

また、outer session が書く `out/status.json` の evidence 本文に `completeness-report.json` が現れただけで、report の代筆と誤認する偽陽性があった。

## 期待する挙動

- build は独立 evaluator の native completion 後だけ C02 import を許す。
- resume は current receipt を authority とし evaluator を再起動しない。
- resume runner は C02、graph preview、source digest、evidence ref の全 step を report に残す。
- post-run gate は runner stdout と report を一致確認し、runner 外の direct upsert を拒否する。
- report 代筆は Write/Edit の target path でのみ判定する。

## スコープ

対象は C19 の completion validator、resume runner、Skill 契約、focused regression、fresh bounded trial、仕様反映である。Hub 製品 runtime と system-spec の確定製品要求は変更しない。

## 受入条件

1. resume path が evaluator / upstream Skill / Agent / direct upsert 0 件で PASS できる。
2. runner report/stdout、C02、source digest、evidence ref の全 step が exit 0 で束縛される。
3. status evidence 本文の report path 言及を代筆と誤認しない。
4. fresh bounded C19 trial と独立 goal evaluation が PASS する。
5. draft PR merge 後に Beads と graph completion を reconciliation できる。

## 仕様と設計

- [C19 resume completion contract 仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/c19-resume-closure-spec-reflection-receipt.md)
- [Dev workflow architecture](../architecture/harness-hub-dev-workflow.md)
- [System specification implementation writebacks](../specs/harness-hub-system-specification-implementation-writebacks.md)

## 検証証跡

- focused regression: 26 tests PASS
- fresh bounded r1: 独立 evaluator FAIL。契約矛盾と report path 偽陽性を検出
- fresh bounded r2: 75 秒、post-run gate / goal-seek / independent evaluator / formal verdict PASS
