# 目的

ログインした利用者が自分に割り当てられた作業と期限を 1 画面で把握できる状態を作る。

## 到達状態

ログイン後のダッシュボードで、自分に割り当てられた作業と各作業の期限が一覧表示されている状態。

## スコープ

- スコープ内: ダッシュボード画面、利用者単位の割当作業取得、期限の表示と並び替え
- スコープ外: 作業の新規作成と編集、他人の割当の閲覧、全社横断の集計表示

## 受入

- [ ] ログイン利用者のダッシュボードに自分の割当作業だけが表示される
- [ ] 各作業行に期限が表示される
- [ ] 割当が 0 件の利用者には空状態が表示されエラーにならない

## アーキテクチャ参照

- `architecture_refs`: `arch-portal-platform-001`、`arch-portal-data-notify-001`

## 機能間依存

- `depends_on`: `feat-account-login-001`
- 依存理由: 表示対象を「自分の割当」に絞るには認証済み利用者の識別が先に成立している必要がある。

## Handoff

- per-feature planning: 機能間依存が満たされ confirmed / evaluation pass / readiness complete に到達した時点で system-dev-planner (run-system-dev-plan) へ引き渡す。
- 生成物: P01..P13 の exact 13 executable task specs と 13-node intra-feature DAG。
- 登録先: 全 task を同一 `parent_feature` / `feature_package_id` で C02 経由 atomic 登録する。
- 完了 rollup: exact 13 が全て done かつ P07 / P10 / P11 の evidence が本 feature の受入条件を満たした場合だけ done とする。
