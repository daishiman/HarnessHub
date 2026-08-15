---
graph_node_id: "issue-relative-time-display-20260812"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["ui-consistency","information-design"]
priority: "low"
start_date: "2026-08-12"
target_date: null
iteration: null
title: "日時に「3 日前」のような相対表記を併記する"
owners: ["daishiman"]
created_at: "2026-08-12T00:00:00Z"
updated_at: "2026-08-12T03:37:45Z"
status: "closed"
depends_on: []
related_nodes: []
resource_scope: ["packages/ui/src/index.ts"]
purpose: "日時が「最近のことなのか」を、日付を読み解かなくても分かるようにする。"
goal: "絶対日時に相対表記を併記する見せ方を、部品として 1 か所に決める。"
scope_in: ["併記の方式の決定","共通部品の追加","適用画面の決定"]
scope_out: ["日時そのものの保持形式の変更","タイムゾーンの扱いの変更"]
acceptance: ["相対表記の出し方が共通部品 1 か所に集約される","サーバ側とブラウザ側で表示が食い違わないことをテストで固定する","絶対日時は消さず、併記の形にする"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/relative-time-display-20260812.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"7a28aa088eab8c23e4877e02adcb921509e59e47d44fe4fafc32349daa02e408","evaluator":"2026-08-12 の UI 統一作業で 3 画面の日時表示を実読","evidence_ref":"issues/relative-time-display-20260812.md"}
source_lineage: {"imported_at":"2026-08-12T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"docs/product/backlog.md","source_plugin":null,"source_version":null}
classification_confidence: 0.97
classification_reason: "表示形式の統一に関する情報設計の課題であり、実装単位の課題に該当する。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/relative-time-display-20260812.md","confidence":0.97}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-p26n","linked_at":"2026-08-12T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-12T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 日時に「3 日前」のような相対表記を併記する

## 概要

一覧や詳細に出る日時が絶対表記 (2026年8月12日) だけで、それが最近のことなのかを
読み手が頭の中で計算している。相対表記 (3 日前) を併記したい。

## 背景と問題

判断に効くのは多くの場合「いつか」ではなく「どれくらい前か」。ただし相対表記だけに
すると、記録として日付を控えたいときに使えない。併記が要る。

**未決の点が 2 つある。着手前にどちらかへ決める。**

### 1. 方式の選択

| 方式 | 内容 | 引き換えに失うもの |
|---|---|---|
| A: 画面が表示されてから相対表記を出す部品 | サーバ側では絶対日時だけを出し、ブラウザ側で描画された後に相対表記を足す | 一瞬だけ相対表記が出ない。読み上げの読み直しが起きる |
| B: サーバ側の時刻を props で配る | 「いつ時点で数えた相対表記か」をサーバ側で決め、そのまま出す | 画面を開いたまま放置すると表記が古くなる |

### 2. サーバ側とブラウザ側の食い違い

- **いま対象にしている 3 画面では、この食い違いは起きない。** 相対表記を出していない
  ため、そもそも時刻に依存した文字列を描いていない。
- **部品にして横展開すると、起きる画面が出る。** サーバ側で描いた時刻と、ブラウザ側で
  描き直したときの時刻がずれると、React が「サーバとブラウザで中身が違う」と判定して
  警告を出し、条件によっては描き直しになる。方式 A はこれを避けるために描画後まで
  待つ形、方式 B はサーバ側の時刻を正として固定する形。

## 現在の挙動

絶対表記のみ。

## 期待する挙動

絶対表記に相対表記を併記する。出し方は 1 つの部品に集約し、画面ごとに書き起こさない。

## 再現手順またはユースケース

一覧を見て「この案件は動いているのか、止まっているのか」を判断するとき、日付から
今日との差を毎回引き算している。

## 影響と優先度

いまも判断はできるので low。ただし部品を用意する前に画面ごとに書き始めると、
上記の食い違いを画面の数だけ踏むことになる。

## スコープ

方式の決定と共通部品の追加、適用画面の決定まで。

## 関連グラフ

なし。

## 受入条件

上記 acceptance のとおり。

## 検証証跡

2026-08-12 の UI 統一作業で 3 画面の日時表示を実読し、いずれも絶対表記のみと確認。
