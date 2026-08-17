---
status: confirmed
layer: feature-spec-addendum
parent_feature: feat-feedback-loop
graph_node_id: issue-in-app-improvement-request-spec-20260817
spec_impact: reflected
recorded_at: 2026-08-17
---

# I15 画面内改善要望 — 仕様追補

P01 の `requirements-baseline.md` は exact-13 の確定転記なので書き換えない。
本追補は 2026-08-15〜17 に正規ヒアリングで確定した **I15** だけを書く。

## 何が決まったか

認証済み業務画面の右下に常設ボタンを置き、画面を離れずに改善要望を送る。
投稿者が書くのは本文と注釈だけ。裏側で次を自動収集する。

- 今の画面の画像（DOM 再描画。許可ダイアログは出さない）
- DevTools 相当の診断（console の error/warn、未捕捉例外、失敗した通信、画面サイズ、テーマ、route、build 版数、直近の移動）

管理者は一覧で選び、同じ要望を GitHub Issue へ重複なく渡す。
画像と診断ファイルは専用 R2 と GitHub Contents API に置き、Issue 本文は量を抑える。

## 確定した設計選択

| ID | 選択 | 意味 |
|---|---|---|
| D9 | `modern-screenshot` | 許可ダイアログなしで画面を 1 枚撮る |
| D10 | `github-issue` | AI 改修への出口は GitHub Issue（appr-061 で再確定） |
| D11 | `dedicated-bucket` | スクリーンショットは 5 本目の専用 R2 |
| D12 | `fetch-thin-client` | Workers から GitHub REST を薄い自前 client で叩く |

## 既存 S14 / CLI との関係

I12 の 2 経路（CLI + S14）は残す。I15 は「今見ている画面から送る」第 3 経路であり、
実装時に同じ Feedback 資源へ正規化するかどうかは後続実装 issue で決める。
本追補は仕様の確定であり、Hub の画面・API・DB はまだ作っていない。

## 正本

- 上位概念: `system-spec/00-requirements-definition.md` の I15
- 章本文: `system-spec/frontend.md` / `ui-ux.md` / `backend.md` / `database.md` / `security.md`
- 取込: `specs/system-spec-index.md` / `architecture/system-spec-overview.md`
- 受領書: [i15-in-app-improvement-request-spec-reflection-receipt.md](./i15-in-app-improvement-request-spec-reflection-receipt.md)
