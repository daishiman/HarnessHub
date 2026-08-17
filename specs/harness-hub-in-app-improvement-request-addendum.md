---
kind: specification-addendum
status: confirmed
source: system-spec/00-requirements-definition.md#I15
related_feature: feat-feedback-loop
graph_node_id: issue-in-app-improvement-request-spec-20260817
recorded_at: 2026-08-17
---

# 画面内改善要望 (I15) 実装契約追補

製品章の本文は `system-spec/*.md` を正本とする。本書は実装着手時に参照する契約の要約である。

## 経路

認証済み業務画面の右下常設ボタン。画面遷移なし。投稿者入力は本文と注釈のみ。

## 必須の自動同送

- DOM 再描画スクリーンショット（D9: modern-screenshot / 許可ダイアログなし）
- DevTools 相当診断（console error/warn、未捕捉例外、失敗 network、viewport/DPR/theme、route pattern、build 版数、直近 navigation）
- 診断総量 32KB。溢れは commit した診断ファイルと管理画面 URL で所在を示す

## 出口

- D10: GitHub Issue（appr-061）
- D11: 画像は専用 R2 bucket
- D12: Workers から GitHub REST を fetch 薄 client で叩く
- token は Cloudflare Workers Secret。権限は Issues + Contents の read-write、対象 1 repo
- 起票は本文ハッシュで新規 / 更新 / 変更なしを導出する。Issue を同じ要望に重複させない

## 非対象

- 本追補だけでは Hub 実装を完了扱いにしない
- `feat-feedback-loop` exact-13 の S14/CLI 契約は維持する
