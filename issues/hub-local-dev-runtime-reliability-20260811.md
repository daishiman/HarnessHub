---
graph_node_id: "issue-hub-local-dev-runtime-reliability-20260811"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "infrastructure"
tags: ["local-dev","sqld","health","supervision","browser-smoke"]
priority: "high"
start_date: "2026-08-11"
target_date: null
iteration: null
title: "Hub ローカル開発基盤の永続性・health・自動復旧を一体で是正する"
owners: ["daishiman"]
created_at: "2026-08-11T00:00:00Z"
updated_at: "2026-08-11T03:45:00Z"
status: "active"
depends_on: []
related_nodes: ["feat-hub-foundation","spec-harness-hub-system-specification-implementation-writebacks","arch-harness-hub-infrastructure-operations-addenda","SYS-HUB-FOUNDATION-P13"]
resource_scope: ["apps/hub/src/app/health/probes.ts","apps/hub/src/middleware-contract.ts","apps/hub/src/middleware.ts","apps/hub/src/middleware/index.ts","apps/hub/src/__tests__","apps/hub/src/app","apps/hub/src/lib","apps/hub/tests","apps/hub/scripts","packages/db/__tests__/local-session.test.ts","packages/db/scripts/seed-local.ts","packages/db/scripts/issue-local-session.ts","packages/db/scripts/local-session.ts","apps/hub/package.json","packages/db/package.json","scripts/ci/check-shared-layer-duplicates.mjs","scripts/ci/shared-layer-registry.json","plugins/system-spec-harness/skills/run-system-spec-elicit/SKILL.md","plugins/system-spec-harness/skills/run-system-spec-elicit/references/spec-state-contract.md","plugins/system-spec-harness/schemas/spec-state.schema.json","plugins/system-spec-harness/skills/run-system-spec-elicit/scripts/apply-spec-transition.py","plugins/system-spec-harness/skills/run-system-spec-elicit/scripts/state_transition_matrix.py","plugins/system-spec-harness/skills/run-system-spec-elicit/tests/test_spec_transition.py","plugins/system-spec-harness/skills/run-system-spec-elicit/tests/test_spec_transition_design_backfill.py","plugins/system-spec-harness/lib/spec_docset_chapters.py","plugins/system-spec-harness/scripts/validate-coverage-matrix.py","plugins/system-spec-harness/skills/assign-system-spec-completeness-evaluator/prompts/R1-score.md","plugins/system-spec-harness/skills/run-system-spec-compile/fixtures/expected-database.md","plugins/system-spec-harness/skills/run-system-spec-compile/fixtures/expected-security.md","plugins/system-spec-harness/skills/run-system-spec-compile/tests/test_compile_spec_doc_knowledge.py","plugins/system-spec-harness/tests/test_validate_scripts.py","plugins/system-spec-harness/tests/test_validate_design_application_provenance.py","eval-log/system-spec-harness/run-system-spec-elicit/content-review","eval-log/dev-graph/run-dev-graph-system-spec/criteria-test/scenario-verdict.json","eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260811T123120-wt5-c19v","docs/features/feat-hub-foundation/local-development.md","docs/features/feat-hub-foundation/local-dev-runtime-reliability-spec-reflection-receipt.md","docs/features/feat-hub-foundation/runbook.md","features/feat-hub-foundation.md","specs/harness-hub-system-specification-implementation-writebacks.md","system-spec/spec-state.json","system-spec/auth.md","system-spec/backend.md","system-spec/dev-workflow.md","system-spec/frontend.md","system-spec/infrastructure.md","system-spec/maintenance-ops.md","system-spec/security.md","system-spec/testing-qa.md","system-spec/ui-ux.md","architecture/harness-hub-infrastructure-operations-addenda.md","tasks/feat-hub-foundation/sys-hub-foundation-p13.md",".gitignore"]
purpose: "ツールセッション終了耐性だけでなく、同一DBの再選択、healthの正確性、異常終了時の復旧、認証付き画面確認までを再現可能にする。"
goal: "安定した絶対パスのローカルDBを監視付きで起動でき、Hub health・認証付きAPI・ブラウザ画面の一連の検証がPASSする。"
scope_in: ["ローカルDB health契約の通常runtimeとの整合","絶対DBパスとログ・PID管理","start/status/stop/restartと異常終了時再起動","loopback bind","middleware重複警告の解消","cookie再発行とseedの分離","認証付きAPI・ブラウザsmoke"]
scope_out: ["本番Cloudflare環境の変更","既存seedデータの削除","ユーザー既存の未関連差分の変更"]
acceptance: ["Hub /healthがローカルsqldを正しく判定しcritical dependencyがPASSする","DBは安定した絶対パスに保存され再起動後もhearing_sheets 3件を保持する","単一コマンド群でstart/status/stop/restart/smokeが再現できる","sqldとNextはloopback限定で異常終了後に自動復旧する","Duplicate page detected警告が消える","seedを変更せず新しいローカルsession cookieを発行できる","認証付きAPIが3件を返しブラウザで対象画面を確認できる"]
architecture_refs: ["arch-harness-hub-infrastructure-operations-addenda"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/hub-local-dev-runtime-reliability-20260811.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"73ab279d80272f5003888b65c0698ff385751386271d677b030b70590358a226","evaluator":"read-only runtime audit 2026-08-11","evidence_ref":"apps/hub/src/app/health/probes.ts"}
source_lineage: {"imported_at":"2026-08-11T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "実測でlocal health 503、一時相対DB、supervisor不在、middleware重複警告、browser未確認を同一ローカル開発ライフサイクル欠陥として確認した。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/hub-local-dev-runtime-reliability-20260811.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-bmhq","linked_at":"2026-08-10T23:32:06Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: [{"base_branch":"main","closing_reference_verified":false,"head_branch":"devgraph/issue-hub-local-dev-runtime-reliability-20260811","linked_at":"2026-08-11T01:34:15Z","merge_commit_sha":null,"merged_at":null,"pr_number":696,"repo":"daishiman/HarnessHub","state":"open","url":"https://github.com/daishiman/HarnessHub/pull/696"}]
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-11T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

Hub のローカル開発環境を、セッション切断だけでなく同一 DB の再利用・正しい health・異常終了時復旧・認証付き画面確認まで再現可能にする。

## 背景と問題

2026-08-11 の実測では `nohup` と `disown` による切り離しは機能したが、Hub `/health` は 503、DB は `/private/tmp` 配下の相対パス、異常終了時の監督なし、Next.js の middleware 重複警告あり、Cookie 再発行は seed 再投入と結合、実ブラウザ確認は未完だった。

## 現在の挙動

`.local-state/hub/` の absolute DB と設定を launchd + supervisor が管理し、sqld / Next.js の異常終了後も同じ DB で自動復旧する。Hub `GET /health` は HTTP 200、認証・スコープ指定済み API は `hearing_sheets` 3 件を返し、middleware 重複警告は発生しない。実ブラウザ確認だけは利用可能な browser session がなく未完である。

## 期待する挙動

安定した絶対パスの DB と秘密ファイルを使い、単一の lifecycle コマンドで監視付き起動・状態確認・停止・再起動ができる。Hub health はローカル sqld を正しく判定し、認証付き API とブラウザ画面が同じ 3 件を表示する。

## 再現手順またはユースケース

1. ローカル lifecycle の `start` を実行する。
2. `status` と `smoke` で sqld、Hub health、認証付き sheets 3 件を確認する。
3. 子プロセスを異常終了させ、監督プロセスが再起動することを確認する。
4. lifecycle の `restart` 後も同じ DB の 3 件が残ることを確認する。
5. ブラウザで `http://localhost:3100/sheets` を開き 3 件を確認する。

## 影響と優先度

- 影響範囲: ローカル画面テスト、DB データ、認証付き Hub API、開発時の障害復旧
- 深刻度: high
- 緊急度: 現状報告を「問題なし」と確定できず、同じ停止・別 DB 誤選択が再発しうるため即時対応する。

## スコープ

- In: local health 契約、絶対 DB path、監視、start/status/stop/restart/smoke、loopback bind、middleware 警告、Cookie 再発行分離、ブラウザ確認
- Out: 本番 Cloudflare の変更、既存 seed データの削除、未関連のユーザー差分

## 関連グラフ

- 原因/親ノード: なし（2026-08-11 のローカル実測から直接起票）
- 関連仕様: `system-spec/maintenance-ops.md` の `qa-230`
- 関連アーキテクチャ: `architecture/harness-hub-infrastructure-operations-addenda.md`
- 解決タスク: 本 issue 内の一体修正として追跡
- 仕様反映受領書: `docs/features/feat-hub-foundation/local-dev-runtime-reliability-spec-reflection-receipt.md`

## 受入条件

- [x] Hub `/health` の critical dependency がローカル sqld で PASS する。
- [x] 安定した絶対 DB path へ移行し、再起動後も `hearing_sheets` 3 件を保持する。
- [x] `start/status/stop/restart/smoke` が単一コマンド群で再現できる。
- [x] sqld と Next.js が loopback 限定で、異常終了後に自動復旧する。
- [x] `Duplicate page detected` 警告が消える。
- [x] seed を変更せずローカル session Cookie を再発行できる。
- [x] 認証付き API が 3 件を返す。
- [ ] 利用可能な in-app browser session で `/sheets` の3件表示を確認する。

## 検証証跡

- コマンド/テスト: focused Vitest、typecheck、lifecycle `restart` / `status` / `smoke`、プロセス異常終了テスト
- 証跡 path: `docs/features/feat-hub-foundation/local-dev-runtime-reliability-spec-reflection-receipt.md`
- 未完了: in-app browser の実画面確認と draft PR merge 後の default branch reconciliation
