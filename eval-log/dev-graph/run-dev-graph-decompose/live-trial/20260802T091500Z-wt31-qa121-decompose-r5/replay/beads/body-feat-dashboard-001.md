# 目的

ログイン後のユーザーが自分の利用状況を可視化できるようにする。

## 到達状態

認証済みユーザーがダッシュボード画面で自分の利用統計を確認できる状態。

## スコープ

- スコープ内: 利用統計データの収集・格納、ダッシュボードUI実装、バックエンドAPI集計、アクセス制御
- スコープ外: リアルタイム通知、管理者向けレポート、AI予測

## 受入

- [ ] ログイン済みユーザーがダッシュボードにアクセス可能
- [ ] 利用統計が正確に表示される
- [ ] 未ログイン状態ではアクセス拒否

## アーキテクチャ参照

- `architecture_refs`: arch-webapp-001

## 機能間依存

- `depends_on`: feat-user-auth-001
- 依存理由: ダッシュボードはログイン済みユーザーにのみ提供されるため、認証基盤が先に必要

## Handoff

- per-feature planning: ready 時に system-dev-planner を自動起動
- 生成物: P01..P13 exact 13 executable task specs + 13-node intra-feature DAG
- 登録先: 全taskを同一parent_feature/feature_package_idでC02経由atomic登録
- 完了rollup: exact 13全done + P07/P10/P11 evidenceがfeature acceptanceを満たす場合だけdone
