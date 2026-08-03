# 目的

運営者が全ユーザーの利用状況を一元的に集計・可視化でき、運営判断に活用できるようにする。

## 到達状態

管理者ロールを持つユーザーが専用レポート画面で全ユーザーの集計統計を確認できる状態。

## スコープ

- スコープ内: 管理者ロール判定・アクセス制御、全ユーザー利用統計集計、レポート画面UI実装、集計API
- スコープ外: 個別ユーザー強制停止、全件ログダウンロード、ML異常検知

## 受入

- [ ] 管理者ロール認証成功時のみアクセス可能
- [ ] 全ユーザー集計統計が表示される
- [ ] CSVエクスポート可能

## アーキテクチャ参照

- `architecture_refs`: arch-webapp-001

## 機能間依存

- `depends_on`: feat-user-auth-001
- 依存理由: 管理者ロールの判定はユーザー認証基盤に依存するため、認証機能が先に必要

## Handoff

- per-feature planning: ready 時に system-dev-planner を自動起動
- 生成物: P01..P13 exact 13 executable task specs + 13-node intra-feature DAG
- 登録先: 全taskを同一parent_feature/feature_package_idでC02経由atomic登録
- 完了rollup: exact 13全done + P07/P10/P11 evidenceがfeature acceptanceを満たす場合だけdone
