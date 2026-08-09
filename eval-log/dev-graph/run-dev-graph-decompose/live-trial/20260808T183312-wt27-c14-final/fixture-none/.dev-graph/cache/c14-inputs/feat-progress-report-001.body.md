# 目的

管理者が全社の作業進捗を集計された形で把握できる状態を作り、遅延の偏りを判断可能にする。

## 到達状態

管理者が全社の進捗を集計したレポートを閲覧できる状態。

## スコープ

- スコープ内: 全社進捗の集計、レポート閲覧画面、管理者権限による閲覧制御
- スコープ外: レポートの外部エクスポート、任意条件のアドホック分析、個人評価指標の算出

## 受入

- [ ] 管理者は全社の進捗を集計したレポートを閲覧できる
- [ ] 管理者でない利用者のレポート閲覧要求は拒否される
- [ ] レポートの集計値がダッシュボードと同一の割当データから導出される

## アーキテクチャ参照

- `architecture_refs`: `arch-portal-platform-001`、`arch-portal-data-notify-001`

## 機能間依存

- `depends_on`: `feat-account-login-001`、`feat-assignment-dashboard-001`
- 依存理由: 管理者判定には認証済み利用者の識別が必要で、集計対象は割当作業と期限の正本である。

## Handoff

- per-feature planning: 機能間依存が満たされ confirmed / evaluation pass / readiness complete に到達した時点で system-dev-planner (run-system-dev-plan) へ引き渡す。
- 生成物: P01..P13 の exact 13 executable task specs と 13-node intra-feature DAG。
- 登録先: 全 task を同一 `parent_feature` / `feature_package_id` で C02 経由 atomic 登録する。
- 完了 rollup: exact 13 が全て done かつ P07 / P10 / P11 の evidence が本 feature の受入条件を満たした場合だけ done とする。
