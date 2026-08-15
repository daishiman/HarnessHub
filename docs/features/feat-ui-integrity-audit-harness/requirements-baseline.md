---
status: confirmed
layer: feature-requirements
title: 実ブラウザ UI 崩れ監査の要件ベースライン
feature_id: feat-ui-integrity-audit-harness
graph_node_id: feat-ui-integrity-audit-harness
beads_id: HarnessHub-s36m
updated_at: "2026-08-15"
---

# 実ブラウザ UI 崩れ監査の要件ベースライン

本書は `feat-ui-integrity-audit-harness` の MVP 要件である。今回の縦切り (`issue-ui-integrity-remediation-slice-20260815` / `HarnessHub-s36m`) が実装した契約だけを書く。

## 1. 目的

画面が崩れていないことを、人が「見た感じ大丈夫」と申告するのではなく、実在する 28 画面の契約として機械が判定できるようにする。既存の 5 つの合成 fixture（検査器そのものを試すための偽物の画面）を、28 の実画面の合格証拠に数えない。

## 2. ゴール

`COVERAGE_MATRIX` から次の 3 つの母数を別々に数え、どれかが 0 件または不足なら不合格にする。

| 母数 | 件数 | 意味 |
|---|---|---|
| 実 route | 28 | Next の `page.tsx` と一致する画面 |
| 適用状態セル | 105 | 空 / 1 件 / 大量 / 長文 / エラーのうち、その画面で成立する状態 |
| 実行キー | 168 | 28 route × 幅 3（360 / 768 / 1280）× テーマ 2（light / dark） |

## 3. 含むもの

- `COVERAGE_MATRIX` からの route / 状態 / 実行キー導出
- Next `page.tsx` との静的な一致検査
- 横溢れ・44px 未満の操作域・意味セグメント内改行の検出
- 代表スモークと、168 キー全件の実行入口の分離
- 未実行キーを PASS にしない判定（到達不能は `blocked`）

## 4. 含まないもの

- 5 合成 fixture の 28 実 route への読み替え
- 検出した崩れの是正（`feat-ui-layout-remediation` の担当）
- seed データそのもの（`feat-demo-coverage-dataset` の担当）
- 認証済み 144 キーの完走（本 worktree に local seed / 認証環境が無い）

## 5. 受入

- route 28・state 105・runtime 168 が区別される
- 母数 0・欠落・Next route 不一致は fail-closed
- 公開代表 `/legal|360|light` は実 origin で実行できる
- 未実行の 168 キーを PASS と報告しない
