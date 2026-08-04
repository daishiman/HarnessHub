---
graph_node_id: "issue-hooks-entry-point-parity-generalization-20260728"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","plugin-governance","entry-points","contract-test"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "hooks entry point の宣言・登録 parity 検査が dev-graph 専用テストにしか存在しない"
owners: ["daishiman"]
created_at: "2026-07-28T00:00:00Z"
updated_at: "2026-08-04T08:01:43.939979Z"
status: "active"
depends_on: []
related_nodes: ["feat-dev-pipeline-improvement","spec-harness-hub-plugin-hook-governance-20260804","arch-harness-hub-dev-workflow","task-hooks-entry-point-parity-final-review-handoff-20260804","doc-hooks-entry-point-parity-spec-reflection-receipt-20260804","task-live-trial-evidence-selection-handoff-20260804"]
resource_scope: ["scripts/validate-plugin-completeness.py","scripts/validate-plugin-hooks.py","tests/scripts-root/test_root__validate_plugin_completeness_hooks_parity.py","tests/scripts-root/test_root__plugin_hooks_entry_point_contract.py","plugins/*/package-contract.json","plugins/*/hooks/hooks.json","plugins/*/.claude-plugin/plugin.json","system-spec/dev-workflow.md","specs/harness-hub-plugin-hook-governance-addendum.md","architecture/harness-hub-dev-workflow.md","docs/features/feat-dev-pipeline-improvement/hooks-entry-point-parity-spec-reflection-receipt.md"]
purpose: "scripts/validate-plugin-completeness.py は hooks について declared ⊆ actual (宣言した hook がディスクに実在すること) しか強制しておらず、hooks/hooks.json が実際に登録している entry point が package-contract.json に宣言されているかを検査しない。この parity 検査は 2026-07-28 に dev-graph 1 plugin 専用の契約テストとしてのみ実装されており、他 plugin が hooks.json へ hook を登録しながら宣言を怠っても repo 全体の完全性検査は素通りする"
goal: "全 plugin の hook entry point で、台帳・登録・実体の 3 者一致を qa-146 の repo 全体 fail-closed 検査として維持し、手動 script との責務混同を防ぐ状態にする"
scope_in: ["validate-plugin-completeness.py で sidecar hooks.json と manifest inline hooks を登録実態として突合する","全 plugin の宣言・登録 parity と import 専用 support module の許容境界を回帰テストで固定する","既存 plugin の乖離を棚卸しし、手動 script を hooks/ から分離する","qa-146 の仕様・設計・Beads・draft PR の追跡を一致させる"]
scope_out: ["skills / agents / commands の entry_points 宣言漏れ (HarnessHub-zrn で追跡)","hooks 実装そのものの変更","live-trial behavior closure digest の算出範囲変更"]
acceptance: ["HK-001 が登録済み・未宣言を repo 全体で非 0 終了にする","HK-002 が登録構成を持つ plugin の宣言済み・未登録を repo 全体で非 0 終了にする","HK-003 が実行可能な残余を拒否し import 専用 support module を許容する","focused pytest、全 plugin 完全性、task 仕様書ゲート、C01 coverage が pass する"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-hooks-entry-point-parity-generalization-20260728.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"89f42b29a1af7b635ec8534fe3bdf452d8f878309696305200484e0d2c8c4ec6","evaluator":"final-review: focused pytest + plugin completeness + task-spec gate + C01/C03 coverage (qa-146)","evidence_ref":"docs/features/feat-dev-pipeline-improvement/hooks-entry-point-parity-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-07-28T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "PR #82 の CI 是正で判明した、repo 全体検査と plugin 専用テストの被覆差に関する追跡課題"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-hooks-entry-point-parity-generalization-20260728.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-vf66","linked_at":"2026-07-28T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":["docs/features/feat-dev-pipeline-improvement/hooks-entry-point-parity-spec-reflection-receipt.md","https://github.com/daishiman/HarnessHub/pull/666"],"policy":"linked_pr_merged_all","reconciled_at":"2026-08-04T00:00:00Z","source":"manual","status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-28T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`hooks/hooks.json` へ登録済みの hook が `package-contract.json` の `entry_points.hooks` に宣言されているか（登録 ⊆ 宣言）を検査する経路が、dev-graph 1 plugin 専用の契約テストにしか存在しない。他 plugin では同じ宣言漏れが repo 全体の完全性検査を素通りする。

## 背景と問題

`scripts/validate-plugin-completeness.py` は hooks について **declared ⊆ actual**（宣言した hook がディスクに実在すること）だけを強制する。逆方向、すなわち **実際に Claude Code へ登録されている hook が宣言されていること** は検査しない。

一方 2026-07-28 の PR #82 で、dev-graph に限っては 3 者一致（宣言 = 登録 ⊆ 実体）を検査する契約テストを `tests/scripts-root/test_root__plugin_hooks_entry_point_contract.py` に置いた。経緯は次のとおり。

- `guard-graph-schema.py` を 500 行以下へ分割した結果、`plugins/dev-graph/hooks/guard_graph_commands.py`（import 専用 support module）が生まれた。
- 当時の契約テストは `entry_points.hooks` を「`hooks/` にある `.py` / `.sh` の一覧」と厳密一致で突合していたため、この support module を「未宣言の entry point」として FAIL させた。
- 500 行分割規約と entry point 宣言規約が同時には満たせない構造だったため、突合相手を代理指標（ディスク上のファイル一覧）から実体（`hooks.json` の登録内容）へ差し替えた。

この是正は dev-graph の契約テスト 1 本に閉じている。**他 plugin が hooks.json へ hook を登録しながら `package-contract.json` への宣言を怠っても、`validate-plugin-completeness.py` は検出しない。**

同型の被覆差は skills についても `HarnessHub-zrn`（harness-creator の `entry_points` が実体 30 skill に対し 1 件のみ）で観測されている。宣言台帳と実体の乖離は 1 plugin の事故ではなく、検査の非対称性に由来する構造的な穴である。

## 再現手順

1. dev-graph 以外の任意の plugin の `hooks/hooks.json` へ、`package-contract.json` の `entry_points.hooks` に載っていない hook command を追加する。
2. `python3 scripts/validate-plugin-completeness.py` を実行する。
3. 終了コードが 0 のままであることを確認する（宣言漏れが検出されない）。

## 検討軸

| 軸 | 論点 |
|---|---|
| 一般化の是非 | 全 plugin へ広げると既存の乖離が一斉に FAIL する可能性がある。棚卸しと移行コストの見積りが先に要る |
| support module の許容判定 | `_is_import_only_support_module()`（`.py` かつ import 可能な名前、shebang なし、`__main__` ブロックなし）を全 plugin 共通ロジックとして共有できるか。命名規則だけを許容条件にすると、underscore 名を付けた実 hook の宣言漏れを素通りさせる |
| 検査の置き場所 | `validate-plugin-completeness.py`（repo 全体・CI 必須ゲート）に置くか、plugin ごとの契約テストに留めるか。前者は behavior closure の外側なので live-trial receipt を失効させない |

## 影響

- 影響範囲: 全 plugin の entry point 台帳の信頼性。台帳が実体と乖離すると、live-trial の被覆計算と配布物の完全性検査がともに実態より楽観的な結果を返す。
- 緊急度: 中。現時点で dev-graph 以外に実測された宣言漏れはないが、検出手段がないため「無い」ことは確認できていない。

## 実施結果 (2026-08-04)

- 一般化を採用した。HK-001 は登録 ⊆ 宣言、HK-002 は登録構成を持つ plugin の宣言 ⊆ 登録、HK-003 は hook directory の残余を import 専用 support module だけに限定する。
- 登録は `hooks/hooks.json` と manifest inline hooks の和で取得する。相対 command の `hooks/foo.py` と `./hooks/foo.py` を同じ entry point として扱う。
- repo 全体検査は harness-creator の未宣言 `auto-sync-on-session-start.py` と、skill-intake に混在していた手動 keychain script を発見した。前者は宣言を追加し、後者は `scripts/` へ移動して自動 hook として登録しない構造に訂正した。
- 検査本体は 500 行を超えたため hook 判定を `scripts/validate-plugin-hooks.py` へ分離した。focused pytest 68 PASS、全 plugin 完全性 23/23 PASS、task 仕様書品質ゲート PASS を確認した。別ブランチで異なる契約に同じ qa-143 が使われたため、仕様・設計の正規反映は統合済み `qa-146` と [仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/hooks-entry-point-parity-spec-reflection-receipt.md) を正とする。

## 関連

- `HarnessHub-6in4` — 本課題を派生させた guard fail-open 是正（PR #82）
- `HarnessHub-zrn` — skills 側の同型課題（harness-creator の `entry_points` 宣言漏れ）
- `arch-harness-hub-dev-workflow` — 「500 行分割規約が entry point 宣言契約と衝突する」差分追記（2026-07-28）
