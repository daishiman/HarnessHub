---
graph_node_id: "spec-harness-hub-plugin-hook-governance-20260804"
artifact_kind: "specification"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["plugin-governance","hooks","qa-146"]
priority: "high"
start_date: "2026-08-04"
target_date: null
iteration: null
title: "全 plugin hook entry point governance 追補"
owners: ["daishiman"]
created_at: "2026-08-04T00:00:00Z"
updated_at: "2026-08-04T00:00:00Z"
status: "active"
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["issue-hooks-entry-point-parity-generalization-20260728","arch-harness-hub-dev-workflow"]
resource_scope: ["specs/harness-hub-plugin-hook-governance-addendum.md","system-spec/dev-workflow.md","architecture/harness-hub-dev-workflow.md","docs/features/feat-dev-pipeline-improvement/hooks-entry-point-parity-spec-reflection-receipt.md"]
purpose: "全 plugin の hook 台帳・登録・実体を fail-closed で一致させ、手動 script との責務混同を防ぐ。"
goal: "qa-146 の統合 hook parity 契約を仕様として参照可能にし、500 行上限を守る。"
scope_in: ["plugin 配布・CI・開発品質ゲート","hook entry point の宣言・登録・実体 parity"]
scope_out: ["Harness Hub の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit"]
acceptance: ["HK-001..003 の検査境界を明記する","手動 script の置場を hooks/ と区別する","qa-146 と architecture/receipt を参照する"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "specs/harness-hub-plugin-hook-governance-addendum.md"
template_id: "specification"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"89f42b29a1af7b635ec8534fe3bdf452d8f878309696305200484e0d2c8c4ec6","evaluator":"system-spec-harness compile + coverage validation (qa-146)","evidence_ref":"docs/features/feat-dev-pipeline-improvement/hooks-entry-point-parity-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-04T00:00:00Z","origin_kind":"system-spec-harness","source_digest":"89f42b29a1af7b635ec8534fe3bdf452d8f878309696305200484e0d2c8c4ec6","source_path":"system-spec/dev-workflow.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.97
classification_reason: "qa-146 の統合開発品質契約を既存仕様 wrapper の行数上限を超えずに参照する追補。"
classification_candidates: [{"artifact_kind":"specification","candidate_path":"specs/harness-hub-plugin-hook-governance-addendum.md","confidence":0.97}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-04T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 全 plugin hook entry point governance 追補

## 目的

自動処理を起動する hook が、配布時の台帳、Claude Code の登録、実際のファイルで食い違うと、意図しない処理が動いたり、必要な処理が動かなかったりする。`qa-146` はこの食い違いを repository 全体で止めるための統合開発品質契約である。`qa-143` が別ブランチで別内容に割り当てられたため、同じ ID を再利用せず C01 で新しい統合 ID を確定した。

## 契約

- `package-contract.json` の `entry_points.hooks` を宣言台帳とし、`hooks/hooks.json` と manifest inline hooks の和を登録実態として照合する。
- HK-001 は登録済み・未宣言を、HK-002 は登録構成を持つ plugin の宣言済み・未登録を非 0 終了で拒否する。相対 command は `hooks/foo.py` と `./hooks/foo.py` を同じ実体として読む。
- HK-003 は `hooks/` の残余を import 専用 Python support module だけに限定する。shebang や `__main__` block を持つ実行可能なファイル、shell script、手動運用 script は自動 hook と混同しない。
- 手動操作は `scripts/` に置く。`plugins/skill-intake/scripts/post-keychain-add.sh` はその適用例であり、台帳・登録・実体の 3 者一致の対象ではない。
- 検査本体が 500 行を超える場合は責務で分離する。本件では CLI/全体走査を `validate-plugin-completeness.py`、hook 判定を `validate-plugin-hooks.py` が所有する。

## 影響境界

これは repository の plugin 配布・CI・開発品質ゲートの変更であり、Harness Hub の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。正本は `system-spec/dev-workflow.md` の `qa-146`、設計参照は `architecture/harness-hub-dev-workflow.md`、確認結果は `docs/features/feat-dev-pipeline-improvement/hooks-entry-point-parity-spec-reflection-receipt.md` とする。

## 目的と成功状態

自動 hook の宣言台帳、登録設定、実ファイルを全 plugin で一致させる。三者のどれかが欠ける、または手動 script が hook と誤認される状態を CI が非 0 終了で拒否できれば成功とする。

## スコープ

対象は repository 内 plugin の `entry_points.hooks`、`hooks/hooks.json`、manifest inline hooks、`hooks/` と `scripts/` の配置である。Harness Hub 製品の実行時機能は対象外である。

## 用語と主体

台帳は `package-contract.json`、登録は sidecar または manifest の hook 設定、実体は `hooks/` の実行ファイルを指す。plugin 作者が宣言と登録を管理し、CI が一致を検査する。

## ユースケースとユーザーフロー

plugin 作者は hook を追加するとき台帳・登録・実体を同時に更新する。CI は HK-001..003 を走らせ、不一致なら merge 前に修正を求める。手動操作は `scripts/` から明示して実行する。

## 機能要件

- HK-001: 登録済み hook は必ず台帳に宣言する。
- HK-002: 登録構成を持つ plugin の台帳宣言は必ず登録する。
- HK-003: `hooks/` の残余は import 専用 support module のみとする。

## 非機能要件

検査は決定論的かつ fail-closed とし、全 plugin を一度に走査する。検査本体は責務ごとに分離し、各 Python ファイルを 500 行以下に保つ。

## UI・状態遷移

N/A: UI は変更しない。台帳・登録・実体は整合または CI 失敗の二状態であり、失敗からは三者を一致させて再検査する。

## ビジネスルールと検証

相対 command は同じ実体へ正規化する。shebang、`__main__` block、shell script を持つ残余は import 専用とは扱わず拒否する。

## API契約

N/A: 外部 API は追加・変更しない。検査の入力契約は repository 内 JSON とファイル配置である。

## データモデル

N/A: 製品 DB schema は変更しない。検査が読むデータは plugin の JSON 台帳と設定ファイルである。

## 認証・認可

N/A: 製品認証認可は変更しない。CI は既存の repository 読取権限で検査する。

## エラー・例外・回復

台帳・登録・実体の不一致、読めない設定、実行可能な残余は非 0 終了にする。作者は失敗メッセージに従い対象を修正して再実行する。

## イベント・非同期処理

N/A: 非同期処理や新しいイベント契約は追加しない。hook の起動設定は既存の Claude Code 設定を検査するだけである。

## 可観測性

CI 出力は plugin 名、違反規則、対象パスを示す。focused pytest と全 plugin 完全性検査を受領書に記録する。

## 互換性・移行・リリース

既存 plugin は現在の設定を棚卸しし、未宣言 hook を台帳へ加えるか手動 script を `scripts/` へ移す。製品 API と deploy unit の移行はない。

## テストと受入条件

HK-001..003 の違反系と import 専用 support module の許容系を回帰テストで固定する。全 plugin 完全性、script naming、Python compile、shell syntax、task 仕様書・graph schema の各ゲートが pass することを受入条件とする。

## 未決事項

N/A: 本契約の範囲で未決事項はない。skills、agents、commands の宣言漏れは `HarnessHub-zrn` で別追跡する。
