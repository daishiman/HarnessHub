# 目的

期限が近い作業を利用者が見落とさない状態を作り、期限超過を未然に減らす。

## 到達状態

期限が近づいた割当作業について、担当利用者へ通知が届いている状態。

## スコープ

- スコープ内: 期限接近判定、担当利用者への通知生成、通知送信履歴の記録
- スコープ外: 通知チャネルの利用者別カスタマイズ、エスカレーション通知、既読管理

## 受入

- [ ] 期限接近と判定された割当作業について担当利用者へ通知が 1 通生成される
- [ ] 同一作業の同一判定に対して通知が重複送信されない
- [ ] 期限接近でない作業について通知が生成されない

## アーキテクチャ参照

- `architecture_refs`: `arch-portal-data-notify-001`

## 機能間依存

- `depends_on`: `feat-assignment-dashboard-001`
- 依存理由: 通知対象は「利用者に割り当てられた作業とその期限」であり、割当と期限の正本を扱う機能が先に成立している必要がある。

## Handoff

- per-feature planning: 機能間依存が満たされ confirmed / evaluation pass / readiness complete に到達した時点で system-dev-planner (run-system-dev-plan) へ引き渡す。
- 生成物: P01..P13 の exact 13 executable task specs と 13-node intra-feature DAG。
- 登録先: 全 task を同一 `parent_feature` / `feature_package_id` で C02 経由 atomic 登録する。
- 完了 rollup: exact 13 が全て done かつ P07 / P10 / P11 の evidence が本 feature の受入条件を満たした場合だけ done とする。
