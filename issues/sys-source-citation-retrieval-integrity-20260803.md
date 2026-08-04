---
graph_node_id: "issue-source-citation-retrieval-integrity-20260803"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["system-spec-harness","citation","integrity"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "Citation の取得証跡・時刻実在性を fail-closed で検証する"
owners: ["daishiman"]
created_at: "2026-08-03T08:28:16Z"
updated_at: "2026-08-04T01:02:00Z"
status: "active"
depends_on: []
related_nodes: []
resource_scope: ["plugins/system-spec-harness/scripts/validate-source-citation.py","plugins/system-spec-harness/skills/run-system-spec-doc-fetch/","plugins/system-spec-harness/skills/run-system-spec-compile/","plugins/system-spec-harness/schemas/fetched-references.schema.json","plugins/system-spec-harness/tests/","docs/plugin-contracts/system-spec-harness-citation-retrieval-integrity.md","issues/sys-source-citation-retrieval-integrity-20260803.md"]
purpose: "モデル記憶で作られた citation と将来日時を形式だけで通す C13 の穴を塞ぎ、仕様書の出典を再検証可能にする"
goal: "各 citation が有効な時刻と repo 内の取得証跡 SHA-256 に束縛され、捏造・改変・取り違えを決定論的に exit 非0で検出できる"
scope_in: ["validate-source-citation.py の future/不正時刻・同一固定時刻・証跡 path/digest 検証","R2/R3/C08/C03 の fetched-references 契約・スキーマ・runbook 同期","fixture と回帰テストによる C19 r2 捏造パターンの固定"]
scope_out: ["WebFetch 実行自体を強制する live-trial fixture の改修 (HarnessHub-eiky が所有)","公式 host の意味的な鮮度判定 (既存 C08 の責務)","HarnessHub 製品の API、DB schema、認証認可、UI、Cloudflare 配置の変更"]
acceptance: ["retrieved_at/latest_checked_at の未来・不正形式を exit 非0で拒否する","複数 record の retrieved_at 完全一致を exit 非0で検出する","各 record の repo 内 evidence_ref と evidence_sha256 を実ファイルに突合する","20260804T003000Z-f84o-c19-r2 の未来日時・固定時刻捏造を回帰テストで失敗に固定する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-source-citation-retrieval-integrity-20260803.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"feca098df82289522ed3ff10aba3f9dd14e31cee65915942600872ce65343596","evaluator":"Codex final review","evidence_ref":"issues/sys-source-citation-retrieval-integrity-20260803.md"}
source_lineage: {"imported_at":"2026-08-03T08:28:16Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.96
classification_reason: "system-spec-harness の C13 citation validation 契約を強化する単独 bug 修正であり、issue artifact として issues/ へ正規配置する"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-source-citation-retrieval-integrity-20260803.md","confidence":0.96}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-p1ql","linked_at":"2026-08-03T08:16:11Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-03T08:28:16Z","missing_sections":[],"status":"complete"}
---

# 概要

`validate-source-citation.py` は、対象との対応と自己申告 host だけを見ており、実取得のない citation、未来の日時、同じ固定日時を通していました。これでは、ゲートが緑でも仕様書の根拠が実在するとは確認できません。

## 実施内容

- `retrieved_at` と `latest_checked_at` を timezone 付き RFC3339 として検証し、未来値を拒否する。
- 複数 record の取得時刻が完全一致する場合を、固定値による捏造の兆候として拒否する。
- 各 record に repo 相対 `evidence_ref` と SHA-256 `evidence_sha256` を必須化し、実ファイルの内容と突合する。
- R2-fetch、R3-record、C08 freshness audit、C03 compile、runbook、schema、fixture を同じ契約へ同期する。
- 最終レビューで検出した既存 `fetched-references.json` の 20 record の移行漏れを、実取得済みの証跡 JSON と digest で補完する。

## 仕様・設計への影響

今回の移行は `system-spec/fetched-references.json` と
`system-spec/retrieval-evidence/*.json` の出典完全性を回復する**仕様資料の反映**である。
`specs/`、`architecture/`、`features/`、`tasks/` には反映しない。理由は、製品 API、DB schema、認証認可、画面、Cloudflare 配置、受入条件を変更せず、外部資料への参照可能性だけを修復したためである。

`latest_checked_at`、version、summary の意味的鮮度 (C08) は別責務として維持する。引用が実在することと、記録された最新版が現在も正しいことを混同しない。人間向けの受領書は `docs/plugin-contracts/system-spec-harness-citation-retrieval-integrity.md` に、HEAD 束縛の機械受領書は commit 後に記録する。

## Task 仕様書ゲート

`HarnessHub-p1ql` は `feature_package_id: null` の単独 issue node である。feature package 向け exact-13 task-spec ゲートは対象外とし、graph schema、artifact placement、500-line gate、実データ C13、plugin 回帰テストと総合 CI を品質ゲートとする。無関係な製品 task 仕様書を形式的に変更しないことが正規フローである。

## 検証

- `python3 -m pytest -q plugins/system-spec-harness`（497 passed）
- `validate-source-citation.py --targets system-spec/spec-state.json --references system-spec/fetched-references.json --state system-spec/spec-state.json --repo-root .`（20 record PASS）
- `validate-graph-schema.py`、`lint-artifact-placement.py`、`lint-doc-line-limit.py`、`git diff --check`
- `scripts/run-ci-checks.sh`（139 PASS / 5 WARN / 0 FAIL）
