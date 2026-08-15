---
graph_node_id: "issue-flaky-parallel-test-wop-w-003-20260812"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["testing","flaky"]
priority: "medium"
start_date: "2026-08-12"
target_date: null
iteration: null
title: "並列実行のときだけ落ちるテスト WOP-W-003 の待ち方を直す"
owners: ["daishiman"]
created_at: "2026-08-12T00:00:00Z"
updated_at: "2026-08-11T23:45:38Z"
status: "closed"
depends_on: []
related_nodes: []
resource_scope: ["apps/hub/src/__tests__/web-only-publish/wizard-and-entries.test.tsx"]
purpose: "実行のたびに結果が変わるテストを 1 件なくし、テスト全体の結果を信用できる状態に戻す。"
goal: "WOP-W-003 を並列実行でも安定して緑にする。"
scope_in: ["待ち方 (findBy / waitFor) の見直し"]
scope_out: ["テスト対象の実装の変更","タイムアウト値の引き上げによる回避"]
acceptance: ["apps/hub の全体実行を 5 回連続で緑にする","タイムアウト値の引き上げでは閉じない (待ち方の変更で閉じる)"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/flaky-parallel-test-wop-w-003-20260812.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"7ea2969a65ee77a4717ccd4f137262607ee90ed3f981f9eb27ab29f0c39b82d6","evaluator":"2026-08-12 の UI 統一作業中に実測した flaky 事象","evidence_ref":"issues/flaky-parallel-test-wop-w-003-20260812.md"}
source_lineage: {"imported_at":"2026-08-12T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"docs/product/backlog.md","source_plugin":null,"source_version":null}
classification_confidence: 0.97
classification_reason: "既存テストが実行条件によって結果を変える不具合であり、実装単位の課題に該当する。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/flaky-parallel-test-wop-w-003-20260812.md","confidence":0.97}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-u9hq","linked_at":"2026-08-12T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-12T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 並列実行のときだけ落ちるテスト WOP-W-003 の待ち方を直す

## 概要

`apps/hub/src/__tests__/web-only-publish/wizard-and-entries.test.tsx:125`
`WOP-W-003: 公開 ID を状態確認へ伝播し、H7 未成立の導入リンクを成功扱いで出さない`
が、実行のしかたによって緑にも赤にもなる。

## 背景と問題

結果が実行条件で変わるテストが 1 件でもあると、赤を見たときに「実装が壊れたのか、
テストが不安定なだけなのか」を毎回確かめる必要が出る。テスト全体の合否が判断材料に
ならなくなるため、実装の不具合と同じ扱いで直す。

## 現在の挙動

- **落ちる**: `apps/hub` でファイルを指定せず vitest を実行し、他のテストファイルと
  同時に走らせたとき。所要 6 秒前後で失敗する。
- **落ちない**: このファイルだけを指定して実行したとき。436ms で緑。

実行順序ではなく「同時に走っている本数」で結果が変わる。6 秒という所要時間は、
`findBy*` / `waitFor` の既定タイムアウトを待ち切って失敗している形と整合する。
CPU が埋まると既定の待ち時間内に再描画が間に合わない、という待ち方の問題に見える。

## 期待する挙動

同時に走っている本数に関係なく緑になる。

## 再現手順またはユースケース

```
cd apps/hub && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run
```

を実行する (ファイル指定なし)。以下は落ちない対照条件。

```
cd apps/hub && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run \
  src/__tests__/web-only-publish/wizard-and-entries.test.tsx
```

## 影響と優先度

本番の挙動には影響しないが、テスト結果の信用に直接効くため medium。

## スコープ

時間で待つのをやめ、状態で待つ形へ直す。公開 ID が状態確認側へ渡ったことを
DOM 上の確定した表示で待つ。タイムアウト値を伸ばして通す対処は取らない
(同時実行数が増えれば同じことが起きるため)。

## 関連グラフ

なし。

## 受入条件

上記 acceptance のとおり。

## 検証証跡

2026-08-12 の UI 統一作業中に、単体実行 436ms 緑 / 全体実行 6s 赤を実測。
