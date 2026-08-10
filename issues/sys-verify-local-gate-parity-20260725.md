---
graph_node_id: "issue-verify-local-gate-parity-20260725"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["follow-up","ci","local-parity","qa-039"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "required status checks の G7 / G7b / G9 が local pnpm verify に未結線 (CI にしか無い)"
owners: ["daishiman"]
created_at: "2026-07-25T14:49:11.542286Z"
updated_at: "2026-08-04T03:11:02Z"
status: "closed"
depends_on: []
related_nodes: ["issue-auth-tenancy-ci-wiring-20260725"]
resource_scope: ["package.json","docs/shared-layers.md"]
purpose: "ADR §6 R-18 と system-spec/dev-workflow.md【2. CI と local の乖離防止】は、required status checks と同一コマンドを root の pnpm verify から実行できることを求める。2026-07-25 時点で G7 (破壊的 DDL 検査) / G7b (tenant 分離網羅・接続層隔離) / G9 (axe a11y) は .github/workflows/ci.yml にしか結線されておらず local verify に載っていない。CI にしか無いゲートは着手前に気づけず、PR を出して初めて落ちる (issue-auth-tenancy-ci-wiring-20260725 と同型の欠落)"
goal: "CI 品質ゲート登録簿の全ゲートが、CI と local の双方から同一実装で起動できる状態"
scope_in: ["G7 / G7b / G9 の local 入口を root package.json へ追加","verify チェーンへの結線","docs/shared-layers.md の「local からの実行」対応表の更新"]
scope_out: ["ゲート自体のロジック変更","新規ゲートの追加"]
acceptance: ["pnpm verify から G7 / G7b / G9 が起動し exit code で判定される","docs/shared-layers.md の「local からの実行」対応表に未結線ゲートが 0 件と記録される"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-verify-local-gate-parity-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":null,"origin_kind":"manual","source_digest":null,"source_path":"issues/sys-auth-tenancy-ci-wiring-20260725.md","source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "issue-auth-tenancy-ci-wiring-20260725 の実装中に判明した同型の未結線を追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-verify-local-gate-parity-20260725.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-yhc3","linked_at":"2026-07-25T14:50:44Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":null,"missing_sections":[],"status":"incomplete"}
---

## 概要

required status checks のうち **G7 (破壊的 DDL 検査) / G7b (tenant 分離網羅・接続層隔離) / G9 (axe a11y)** が
`.github/workflows/ci.yml` にしか結線されておらず、root の `pnpm verify` から起動できない。
CI に出して初めて落ちるゲートが残っている状態を解消する。

## 背景と問題

ADR §6 R-18 と `system-spec/dev-workflow.md`【2. CI と local の乖離防止】は、
required status check を **local から同一実装で実行できること** を求めている。
CI 専用の検査手順を作らないという不変条件であり、これが崩れると
「手元は緑 → PR で赤」という往復が発生する。

`issue-auth-tenancy-ci-wiring-20260725` の実装中に、
docs/shared-layers.md へ「local からの実行」対応表を新設した際、
G7 / G7b / G9 の 3 つに local 入口が無いことが判明した。
同 issue のスコープ (auth / tenant 分離) 外だったため、独立 issue として切り出す。

## 現在の挙動

- `pnpm verify` は G1・G2・G3・G4・G5・G6・G8・G10・G12 を起動する
- G7 / G7b / G9 は `ci.yml` の step としてのみ存在し、local からは個別に叩く手順も明文化されていない

## 期待する挙動

- `pnpm verify` から G7 / G7b / G9 が起動し、exit code で合否が判定される
- docs/shared-layers.md の「local からの実行」対応表で、未結線ゲートが 0 件になる

## 再現手順

1. `docs/shared-layers.md` §3 の CI 品質ゲート登録簿と `package.json` の `verify` を突き合わせる
2. G7 / G7b / G9 に対応する script が root に無いことを確認する

## 影響と優先度

優先度 medium。実害は「PR を出すまで気づけない」往復コストで、
production の不具合には直結しない。ただし不変条件 (R-18) の違反状態であり、
放置するとゲートを足すたびに乖離が広がる。

## スコープ

- **in**: G7 / G7b / G9 の local 入口を root `package.json` へ追加、`verify` チェーンへの結線、対応表の更新
- **out**: ゲート自体のロジック変更、新規ゲートの追加

## 検討事項

- G7 は `packages/db/migrations` の変更有無で分岐する条件付き step のため、
  local でも同じ条件判定を再現する必要がある (無条件実行にすると常に重くなる)
- G9 (axe a11y) は build → 実ブラウザ検査の 2 段構成で、`verify` の所要時間への影響を測ってから結線を決める

## 関連グラフ

- `issue-auth-tenancy-ci-wiring-20260725` — 本 issue の発見元。G12 追加と G4 名指しで同型の欠落を 1 件解消済み
