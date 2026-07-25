---
graph_node_id: "arch-harness-hub-dev-workflow"
artifact_kind: "architecture"
artifact_subtypes: ["infrastructure"]
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["system-spec-import","dev-workflow"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "Harness Hub dev-workflow アーキテクチャ (system-spec 取込)"
owners: ["daishiman"]
created_at: "2026-07-18T08:10:00Z"
updated_at: "2026-07-23T09:50:00Z"
status: "active"
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["arch-harness-hub-frontend","arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-security","arch-harness-hub-infrastructure"]
resource_scope: ["architecture/harness-hub-dev-workflow.md"]
purpose: "Hub 本体の開発フロー (GitHub Flow + PR 必須・required status checks・PR preview + production 環境・main merge 自動デプロイ・expand/contract migration)、作者ローカル環境規律、dev-graph/beads (bd) タスク優先度選定の MVP ファースト判断軸 (目的・背景・MVP) を参照する"
goal: "qa-038/qa-039/qa-066/qa-067/qa-069 の確定内容に適合し、P0〜P5 の開発運用・feature baseline の source lineage 逆引き・開発管理パイプライン改善 8 要件 (qa-067)・タスク優先度選定の MVP ファースト判断軸 (qa-069: 目的=何のために作るか / 背景=どういう経緯か / MVP=今必要な動くもの の3軸を第一ソートキーとし、品質・再現性強化系タスクは MVP 成立後へ繰り延べる。既確定 CI/CD・quality gate 要件は維持) の指針を提供する"
scope_in: ["system-spec/dev-workflow.md"]
scope_out: ["正本章の内容複製","未確定章の取込"]
acceptance: ["正本章が confirmed かつ evaluator PASS","source_digest が正本と一致"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "architecture/harness-hub-dev-workflow.md"
template_id: "architecture"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"43336931b9d84c400dc5782da751ef86682e031b5169643c25778584c065cd86","evaluator":"assign-system-spec-completeness-evaluator","evidence_ref":"eval-log/system-spec-harness/assign-system-spec-completeness-evaluator/completeness-report-20260723-qa069.json"}
source_lineage: {"imported_at":"2026-07-23T04:45:00Z","origin_kind":"system-spec-harness","source_digest":"43336931b9d84c400dc5782da751ef86682e031b5169643c25778584c065cd86","source_path":"system-spec/dev-workflow.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.95
classification_reason: "system-spec-harness 確定章の R3-import 正規取込 (confirmed + evaluator PASS)"
classification_candidates: [{"artifact_kind":"architecture","candidate_path":"architecture/harness-hub-dev-workflow.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-07-18T08:10:00Z","missing_sections":[],"status":"complete"}
---

# Harness Hub dev-workflow アーキテクチャ (system-spec 取込)

> 本 artifact は system-spec 確定章への **参照型 wrapper** (R3-import)。内容は複製せず、正本の変更は source_digest 不一致として検出される。

## 正本 (source of truth)

- [system-spec/dev-workflow.md](../system-spec/dev-workflow.md) (sha256: `43336931b9d8…` (完全値は frontmatter source_lineage.source_digest))

- confirmation: `confirmed` / evaluator: `assign-system-spec-completeness-evaluator` → **PASS** (`eval-log/system-spec-harness/assign-system-spec-completeness-evaluator/completeness-report-20260723-qa069.json`)
- 取込日時: 2026-07-23T04:45:00Z / plugin: system-spec-harness v0.1.0

## Architecture overview

正本: system-spec/dev-workflow.md (qa-038: GitHub Flow + PR 必須・required status checks 8 種・PR preview + production・main merge 自動デプロイ・expand/contract migration 強制 / qa-039: 作者ローカル環境 macOS 主・Windows 従・CI と同一の pnpm verify・本番操作の CI 一本化 / qa-066: features README と 11 requirements-baseline を P0〜P5 の派生投影として参照し、循環する二重正本を作らない)。

## Context and drivers

正本章 (system-spec/dev-workflow.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Goals and non-goals

正本章 (system-spec/dev-workflow.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## System context and boundaries

正本章 (system-spec/dev-workflow.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Container and component view

正本章 (system-spec/dev-workflow.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Cross-cutting contracts

正本章 (system-spec/dev-workflow.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Subtype architecture

- subtype: infrastructure — 詳細は正本章を参照 (複製しない)。dev-workflow は CI/CD・デプロイ・環境戦略を扱うため infrastructure subtype に分類 (schema の subtype enum に dev-workflow が無いための写像。domain=dev-workflow が実態を表す)

## Architecture decisions

正本章 (system-spec/dev-workflow.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Delivery, migration and rollback

正本章 (system-spec/dev-workflow.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Risks and verification

正本章 (system-spec/dev-workflow.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

### 差分追記 (2026-07-21): 検証証跡の真正性リスク

live-trial 証跡の調査 (`HarnessHub-s7b`/`-rix`/`-aoe`/`-m7d`) で、**成果物だけを見る検査では「実行した」と「実行したことにした」を区別できない**というリスクが実測された。同一構造の抜け道が別々の局面で 3 回選ばれている (digest 単独書き換え / 下位 script 直叩き / registration receipt 偽造)。

本リスクは製品 (Harness Hub) の仕様ではなく**リポジトリ内の開発ツール統治**に属するため、正本章へは逆輸入しない (`system-spec/dev-workflow.md` qa-066 の「下流投影を system-spec へ逆輸入して二重正本にしない」原則)。詳細と実務ルールは次を参照する。

- [`doc/evidence-integrity-practices.md`](../doc/evidence-integrity-practices.md) — 3 局面の記録、4 つの教訓 (指標の独立性 / 充足可能性の担保 / 改竄と訂正の同型性 / 検証主体の分離)、導入した検証入口とその限界

検証入口 (いずれも read-only):

| 入口 | 検出対象 |
|---|---|
| `validate-receipt.py` (検査 SSOT は `register-package.py` を共有) | registration receipt の手書き・事後改変 |
| `run-skill-live-trial/scripts/validate-goal-seek-evidence.py` | `goal_seek` 実行契約の省略 |
| `lint-live-trial-verdict.py --check-provenance` | commit 差分での digest 単独書き換え |
| `lint-live-trial-verdict.py` の `check_c02_bypass` (`scripts/receiptguard_helper.py`) | `.gitignore` された fixture 内で registration receipt を `register-package.py` を通さず書換え/削除する C02 迂回 (束縛済み transcript を走査) |
| `plugins/dev-graph/scripts/validate-repo-config.py` | live-trial fixture および caller repo の `.dev-graph/config.json` が「本番なら起動ゲートで落ちる」不適合入力であること (schema 条件制約・repo 外脱出・秘密材料混入) |

> **差分追記 (2026-07-24):** `check_c02_bypass` を追加し、`--check-provenance` が届かない fixture 内 receipt 偽造 (局面 3 の実手口) を verdict 生成側の最終ゲートで塞いだ。実装は責務分離のため `scripts/lint-live-trial-verdict.py` から `receiptguard_helper.py` (C02 迂回検出) と `provenance_helper.py` (digest provenance) へ抽出済み (各ファイル ≤500 行)。

> **差分追記 (2026-07-25):** 検証入口を「証跡の真正性」から **trial 入力の適合性** へ 1 軸広げた (`validate-repo-config.py`)。成果物が真正でも、**入力が本番の起動ゲートを通らない状態**なら PASS は挙動の保証にならない。実測として 8 kind 全ての live-trial fixture が schema 違反 config で走っていたことが本入口で初めて機械検出された (`HarnessHub-n88`)。
>
> 同時に、C02 単一 writer の強制点である `guard-graph-schema.py` が **Bash 破壊操作枝のみ hook timeout で fail-open する**ことが実測された。判定に寄与しない `schema_ok()` (実測 66.47s) が fail-closed 経路の内側にあり、`Write` 0.32s に対し `Bash` は 23.88s。live-trial 中に被験セッションが自力でこの窓を発見し、`.dev-graph/state/graph.json` への生書きまで通している。**C02 の不変条件は現状「guard が遅すぎて止められない」ことに依存しており、保証ではない。** 併発して `.dev-graph/config.json` を書く sanctioned な writer が不在であり、fail-open を閉じるだけでは init が実行不能になる。是正は `HarnessHub-6in4` (`issues/sys-guard-graph-schema-timeout-fail-open-20260725.md`) で追跡する。

### 差分追記 (2026-07-25): CI にしか存在しないゲートは「着手前に気づけない」

出典: `issue-auth-tenancy-ci-wiring-20260725` (bd `HarnessHub-1f28`)。

qa-039【2】(CI と local の乖離防止) は required status check を local から同一実装で実行できることを求める。実測で、feat-auth-tenancy が追加した認証・認可の静的検査 3 件が **CI からも local `pnpm verify` からも 1 度も呼ばれていない**状態が見つかった。原因は feature の write scope が共有 CI を含まないことで、**検査を実装した本人が結線できない構造**にある。呼ばれない検査は存在しないのと同じで、手動 pass の記録は挙動の保証にならない。「検査を書いた」と「検査が走り続ける」は別の達成である。

是正として `.github/workflows/ci.yml` の静的ゲート段へ **G12** を、root には `pnpm check:auth` を同時に用意した。あわせて、必須ゲートとして名指しされている tenant 分離テストが `pnpm -r test` に紛れて実行されるだけの状態を、`scripts/ci/check-tenant-isolation-gate.mjs` (対象実在 / ケース ID 網羅 / `skip`・`only` の不在を fail-closed で検査) で名指し化した。ゲート数は増やしていない。

この作業中に **同型の未結線が G7 / G7b / G9 に残っている**ことが判明した (`HarnessHub-yhc3`)。またメタ層 lint (`governance-check.yml`) には local 入口そのものが無く、プロダクト層 `verify` へ混ぜると層分離を壊すため設計判断を要する (`HarnessHub-11qt`)。ゲート登録簿と local 入口の対応表は `docs/shared-layers.md` §3 (下流投影) が持ち、本節は「乖離が構造的に再発する」というリスクの記録に留める。
