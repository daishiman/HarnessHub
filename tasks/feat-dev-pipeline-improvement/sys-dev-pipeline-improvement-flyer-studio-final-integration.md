---
graph_node_id: "task-flyer-studio-final-integration-20261025"
artifact_kind: "task"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["flyer-studio","final-integration","spec-reflection"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "flyer-studio 最終レビュー・対象限定公開の統合task"
owners: ["daishiman"]
created_at: "2026-10-25T00:00:00Z"
updated_at: "2026-10-25T08:20:31.401588Z"
status: "draft"
depends_on: []
related_nodes: ["issue-flyer-studio-agent-capability-manifest-20261022","issue-flyer-studio-arbitrary-rotation-20261022","issue-flyer-studio-elegant-review-findings-20261022","issue-flyer-studio-pilot-order-gate-20261022","issue-flyer-studio-review-evidence-refresh-20261022","issue-flyer-studio-style-knowledge-lenses-20261022","doc-flyer-studio-final-review-spec-reflection-20261025","feat-dev-pipeline-improvement"]
resource_scope: ["plugins/flyer-studio/","docs/features/feat-dev-pipeline-improvement/flyer-studio-final-review-spec-reflection-receipt.md","tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-flyer-studio-final-integration.md"]
purpose: "flyer-studioの最終統合条件と仕様影響を、完了済みと残課題を分けて記録する"
goal: "対象差分・最小品質ゲート・仕様索引・追跡ID・draft PRが同じ完了範囲を指す"
scope_in: ["flyer-studio plugin","仕様反映受領","最小品質ゲート","対象限定公開"]
scope_out: ["製品API/DB/認証/UI/配備変更","他plugin変更","実案件再承認","既存exact13再生成"]
acceptance: ["対象限定diff","最小品質ゲート成功","層別索引と課題対応が一致","latest runの限界と残課題を明記"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-flyer-studio-final-integration.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-10-22T14:40:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "既存プラグインの最終統合・仕様影響を記録する補助成果物。exact13 packageと製品API/DB仕様を変更しない。"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-flyer-studio-final-integration.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-h9xn","linked_at":"2026-10-25T01:33:19.984898+00:00","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":["docs/features/feat-dev-pipeline-improvement/flyer-studio-final-review-spec-reflection-receipt.md"],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-10-25T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 目的

flyer-studio の変更だけを、現行base取り込み後のdraft PRへ提出し、品質ゲート・仕様反映・課題を追跡できる状態にする。

## 背景

引継ぎ後の改善と後続Claude runが共存するため、古い全PASSと最新incompleteを区別し、無関係な既存差分と個人資料を混ぜない。既存exact13 packageは凍結したまま、本統合を補助taskとして扱う。

## 入力と前提条件

元rootの6 Beads課題、flyer-studio現物、最新Claude restartのr06限定検証、隔離worktree、originの正しいbaseを入力とする。公開素材の許可範囲を確定してからstageする。

## 出力と成果物

対象限定commit、originのdevgraph branch、正しいbase向けdraft PR、仕様反映受領書、C02単一writer receipt。公開前に未確定値を実測で更新する。

## 依存関係

issue-flyer-studio-elegant-review-findings-20261022 と pilot-order-gate の既存close根拠を保持する。残4課題の解消は本PRの完了前提にしない。製品API/DB仕様への依存追加はない。

## 実装対象

- Frontend / Backend / Database / Infrastructure: N/A: Hub製品runtime変更なし。
- Plugin: 6skill共通判断、独立評価、承認鮮度、pilot順序、様式提案、owner中立、配布対象閉包。
- Security/Privacy: 個人素材・案件履歴・私的handoffの公開許可を推定しない。
- Documentation: docs/features/system-spec索引/specs/architecture/taskと6 issueの追跡を整合させる。

## Write scope と競合制約

対象は plugins/flyer-studio と本件受領書・既存層索引・6 issue・canonical graphの本件nodeに限定する。pluginと文書の担当を分け、同一graphはC02単一writerのみで更新。元rootのdirty graphを全体コピーしない。branchは devgraph/issue-flyer-studio-elegant-review-findings-20261022、専用worktreeを使う。既存P01..P13と他案件の差分を変更しない。

## GitHub publication

tracker_binding=beads（HarnessHub-h9xn）、GitHub Issue mirrorは作らない。ユーザーが明示許可した本件のみcommit/push/draft PRを行う。baseはorigin/devがあればdev、それ以外はmain。PR本文へ目的・変更・検証・仕様反映・Beads・dev-graph ID・残課題を記載する。draft PR作成はmerge完了を意味しない。完了policyはmanual。

## 実行手順

1. git status/diffと対象課題・最新runを照合する。
2. remote baseをローカルbaseへ取り込み、作業branchへmergeする。既存差分は隔離worktreeで保護する。
3. 内部契約と各層索引をC02で反映し、必要最小ゲートを実行する。
4. 公開範囲を確定し、対象pathだけstageしてcached diffを最終確認する。
5. commit/push/draft PR、Beads notes、受領書の実測結果を更新する。

## 受入条件

対象外差分0、必須ゲート失敗0、新規doc/schema/link不整合0。最新Claude runのincompleteと残4課題を明記。製品API/DB非変更判断と内部仕様反映の根拠へ到達できること。

## 検証方法

repo rootから以下を実行する。通常試験がSKIPする実PDF/実案件試験は既存の隔離回帰証跡を参照し、今回の文書・梱包整理で再実行しない。

```bash
npm --prefix plugins/flyer-studio test
python3 -B plugins/flyer-studio/scripts/build-local-package.py --check
python3 -B plugins/flyer-studio/scripts/build-asset-gallery.py --check
claude plugin validate plugins/flyer-studio
git diff --check
python3 plugins/dev-graph/scripts/validate-graph-schema.py --graph .dev-graph/state/graph.json --repo-root .
python3 scripts/lint-artifact-placement.py --repo-root .
python3 scripts/lint-doc-line-limit.py --repo-root . --ratchet-base origin/main
python3 scripts/lint-doc-internal-link-integrity.py --repo-root . --max-violations 354 --ratchet-base origin/main
bash scripts/run-ci-checks.sh
```

最終commit後にbuild-spec-reflection-receipt.pyでHEADに結び付く受領書を生成し、PR作成用guardは実際のhook入力で評価する。stdin無しのguard実行は検査として数えない。

全体既存違反と本件の新規違反を区別し、許容baselineを書換えて合格にしない。詳細結果と実行環境は仕様反映受領書へ記録する。

## リスクとロールバック

私的handoff・個人素材の誤公開、規範変更で既存評価が失効すること、古いレビュー結果の転用が主なリスク。公開許可の範囲と差分を確認する。差し戻しは本件commitのrevert（追加commitで変更を戻すこと）で行い、無関係な変更をresetしない。

## Handoff

実装routeは既存CLI/skill。仕様影響の正本は [受領書](../../docs/features/feat-dev-pipeline-improvement/flyer-studio-final-review-spec-reflection-receipt.md)。残課題は f0ps/mv0o/dtr8/pzdu のまま保持し、cgix/h9ahを後続レビューの未完了と混同して再closeしない。

## 最終レビューの追跡

統合追跡は Beads HarnessHub-h9xn。実装課題cgix/h9ahと公開前レビューを区別する。最終通常試験は221件中217 PASS・0 FAIL・4 SKIP、読取専用CLIの回帰25件全PASS。共通CIは151 PASS・5 WARN・0 FAIL、共通feedback梱包境界の回帰4件全PASS。discovery台帳は正規再生成し、floor回帰なし。公開先がpublicであることを説明後、利用者の選択「2」で個人素材・案件履歴も含めた公開を明示承認済み。commit・push・PRとHEAD束縛受領書は未実施。
