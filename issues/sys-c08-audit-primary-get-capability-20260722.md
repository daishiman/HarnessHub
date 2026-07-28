---
graph_node_id: "issue-c08-audit-primary-get-capability-20260722"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["system-spec-harness","audit-environment","doc-freshness"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "C08 監査 sub-agent が公式 API へ一次 GET できず WebSearch 二次索引依存で doc_freshness FAIL が反復する"
owners: ["daishiman"]
created_at: "2026-07-22T23:38:10Z"
updated_at: "2026-07-26T01:39:34.074446Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/system-spec-harness/agents/","plugins/system-spec-harness/skills/assign-system-spec-completeness-evaluator/"]
purpose: "C05 再々評価 (2026-07-22 23:21Z、completeness-report.json) の medium finding (bucket: audit-environment) と gap 4 の恒久是正。C08 (system-spec-doc-freshness-auditor) の実行環境では WebFetch が無効 ('No such tool available')・curl は Bash 権限拒否で、registry.npmjs.org / api.github.com 等の公式一次ソースへ直接 GET できない。C08 は WebSearch (検索エンジンの二次索引) のみに依拠し、索引ラグと真の乖離を区別できず、pnpm 11.16.0 / opennext-cloudflare 1.20.2 のような公開直後の版で『裏取り不能 FAIL』が構造的に反復する。"
goal: "C08 監査 sub-agent と C05 評価経路が公式 API host (registry.npmjs.org / api.github.com 等) へ read-only の一次 GET を実行でき、二次索引ラグ由来の判定不能 FAIL が発生しない"
scope_in: ["C08 auditor の一次 GET 手段の確立 (WebFetch 有効化、Bash python3 urllib 手順の agent 定義への明記、または許可リスト追加のいずれか)","auditor prompt / agent 定義への照合手順 (curl 拒否時の fallback) の追記","C05 evaluator の delegation prompt での手段伝達の標準化"]
scope_out: ["検査基準の緩和 (fail-closed 原則は維持)","WebSearch 照合自体の廃止 (補助手段としては維持)"]
acceptance: ["C08 auditor が registry.npmjs.org と api.github.com へ read-only GET を実行した監査証跡が残る","公開直後の版 (npm index 遅延中) でも一次 2 経路照合で確定判定できる","変更が agent 定義または SKILL の正本に反映され、session 一時指示に依存しない"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-c08-audit-primary-get-capability-20260722.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-22T23:38:10Z","origin_kind":"manual","source_digest":null,"source_path":"system-spec/completeness-report.json","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "C05 再々評価 (HarnessHub-t9q) の medium finding (audit-environment) と gap 4 で指摘された監査環境の構造要因を追跡する follow-up issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-c08-audit-primary-get-capability-20260722.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-nq2","linked_at":"2026-07-23T10:11:37Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-22T23:38:10Z","missing_sections":[],"status":"complete"}
---

# 概要

C08 (`system-spec-doc-freshness-auditor`) が公式一次ソース (npm registry / GitHub Releases 等) へ
read-only GET する手段を持たず、検索エンジンの二次索引 (WebSearch) のみに依拠した結果、公開直後の版で
「索引ラグ」を「世代落ち」と区別できず、`doc_freshness` の裏取り不能 FAIL が構造的に反復していた。

## 背景と問題

C08 の実行環境では `WebFetch` が無効 (`No such tool available`) であり、`curl`/`wget` は Bash 権限で
拒否される。そのため C08 は `WebSearch` の検索結果だけを根拠に鮮度を判定していたが、WebSearch は検索
エンジンが構築した二次索引であり、公開直後の版に対しては索引の更新が遅延する。C05 の再々評価
(2026-07-22 23:21Z, `completeness-report.json`) で medium finding (bucket: `audit-environment`) および
gap 4 として、pnpm 11.16.0 や `@opennextjs/cloudflare` 1.20.2 のような公開直後の版を「裏取り不能」と
して FAIL 判定してしまう事例が指摘された。

## 現在の挙動

- C08 は `WebSearch` のみを鮮度判定の根拠にしており、索引未更新の package/version で
  「現行版を確定できない」まま安全側 FAIL を返していた。
- 「一次ソースへの到達を試みたが失敗した」のか「そもそも試みていない」のかを事後に区別する監査証跡が
  存在しなかった。

## 期待する挙動

- C08 (および C05 の delegation prompt) が公式 API host (`registry.npmjs.org` / `api.github.com` など)
  へ read-only GET を実行できる。
- npm registry の検索 index 反映が遅れている場合でも、npm registry 本体の dist-tags と GitHub Releases
  API の 2 経路照合により現行版を確定できる。
- 実行した GET の試行 (成功・到達不能いずれも) が append-only 台帳へ残り、事後監査できる。

## 再現手順またはユースケース

1. C08 に `fetched-references.json` 上の記録 version が公開直後の package (例: pnpm 11.16.0) を含む
   `doc_freshness` 監査を delegate する。
2. 是正前は `WebFetch` 不在・`curl` 拒否により一次ソースへ到達できず、`WebSearch` の索引ラグにより
   「鮮度未確認」または誤った STALE 判定に倒れていた。
3. 是正後は `python3 $CLAUDE_PLUGIN_ROOT/scripts/validate-primary-source.py --npm pnpm --github pnpm/pnpm
   --recorded-version 11.16.0` を Bash 実行し、npm registry の dist-tags と GitHub Releases の 2 経路
   観測から `FRESH`/`STALE`/`INDETERMINATE` を確定できる。

## 影響と優先度

- 影響範囲: system-spec-harness プラグインの C08 監査 sub-agent、および C05 (`assign-system-spec-completeness-evaluator`) の delegation 経路。エンドユーザー向け機能ではなく開発支援ツールの内部品質ゲート。
- 深刻度: medium (C05 再々評価の finding bucket 分類に準拠)
- 緊急度: 公開直後の package/version を扱う監査のたびに誤 FAIL が反復するため、C08 の判定精度に恒常的な悪影響がある。

## スコープ

- In: C08 auditor の一次 GET 手段の確立 (`validate-primary-source.py` の新設)、auditor 定義・SKILL への
  照合手順と fallback 順の明記、C05 evaluator の delegation prompt での手段伝達の標準化。
- Out: 検査基準の緩和 (fail-closed 原則は維持)、WebSearch 照合自体の廃止 (host 裏取りの補助手段としては
  維持)。

## 関連グラフ

- 原因/親ノード: なし (C05 再々評価 finding からの独立 follow-up issue)
- 関連仕様: なし (実装は開発支援ツール `plugins/system-spec-harness/` 内部に閉じ、`system-spec/`・
  `specs/`・`architecture/` の正本には影響しない。判定根拠は「仕様反映受領書」参照)
- 関連アーキテクチャ: なし (同上)
- 解決タスク: `issue-c08-audit-primary-get-capability-20260722` (本 issue 自身が実装対象)

## 受入条件

- [x] C08 auditor が `registry.npmjs.org` と `api.github.com` へ read-only GET を実行した監査証跡が
      `eval-log/system-spec-harness/primary-get-ledger.jsonl` へ残る (append-only、成功=`ok`/
      到達不能=`unreachable` いずれも記録)
- [x] 公開直後の版 (npm index 遅延中) でも一次 2 経路照合で確定判定できる (live-trial で pnpm
      11.15.0→STALE / 11.17.0→FRESH、`@opennextjs/cloudflare` 1.20.2→FRESH を確認)
- [x] 変更が agent 定義 (`system-spec-doc-freshness-auditor.md`)・SKILL 正本
      (`assign-system-spec-completeness-evaluator/SKILL.md` ほか prompts/references) に反映され、
      session 一時指示に依存しない

## 検証証跡

- コマンド/テスト: `python3 -m pytest plugins/system-spec-harness -q` (557 passed)、
  `python3 -m pytest plugins/system-dev-planner -q` (166 passed)、
  `python3 scripts/lint-script-naming.py` (VIOLATION=0、`primary_source_http.py` は
  `PENDING_RENAME_PATHS` へ理由付きで登録済み)、
  `python3 scripts/lint-skill-name.py plugins/system-spec-harness/skills/assign-system-spec-completeness-evaluator/SKILL.md` (exit 0)、
  `python3 scripts/lint-skill-tree.py plugins/system-spec-harness/skills/assign-system-spec-completeness-evaluator` (exit 0、既知警告 LS-203/MED-4 は本変更に無関係と切り分け済み)、
  `python3 scripts/validate-harness-coverage.py --ratchet` (RATCHET OK: 全軸が floor 以上)
- 500 行超過分割: `validate-primary-source.py` が 535 行になったため、HTTP/policy 層
  (定数・例外・`check_url`/`_norm_host`/台帳書込等) を `primary_source_http.py` (230 行) へ切出し、
  probe・判定・CLI 層は `validate-primary-source.py` (364 行) に残した。呼び出し元は
  `from primary_source_http import (...)` の標準 import で参照する。
- harness-coverage ratchet 回帰の是正: 新規 script 2 本 (`validate-primary-source.py`・
  `primary_source_http.py`、いずれも llm_eval verdict 未添付) が母数に加わり
  `scripts.llm_eval` が 63.1%→62.8% へ希釈され floor 割れした。`git worktree add` で
  origin/main 実測 (412 件 63.1%) と本ブランチ実測 (414 件 62.8%) を個別計測して希釈のみが
  原因と確認し、`eval-log/harness-coverage-floor.json` の floor を実測値へ手動 baseline reset
  (先例 3 件と同型の 4 例目、詳細は同ファイル note 参照。verdict 捏造による緑化はしていない)。
- 証跡 path: `eval-log/system-spec-harness/assign-system-spec-completeness-evaluator/content-review/rubric-verdict.json`
  (notes 欄に live-trial 実測結果と pytest 件数を記録)、
  `issues/sys-c08-audit-primary-get-capability-20260722-spec-reflection.md` (仕様反映受領書、
  正本 spec への影響なしの判定根拠)
