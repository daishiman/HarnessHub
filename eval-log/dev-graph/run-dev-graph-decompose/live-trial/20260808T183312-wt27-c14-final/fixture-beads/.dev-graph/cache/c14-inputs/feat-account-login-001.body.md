# 目的

利用者が自分のアカウントで業務ポータルへ入れる状態を作り、以降の全機能の利用者識別を成立させる。

## 到達状態

利用者が自分のアカウント資格情報でログインでき、ログイン状態が後続画面へ引き継がれている状態。

## スコープ

- スコープ内: ログイン画面、資格情報の検証、認証セッションの発行と維持、ログアウト
- スコープ外: パスワードリセット、二要素認証、社外 IdP 連携

## 受入

- [ ] 有効な資格情報でログインすると認証セッションが発行される
- [ ] 無効な資格情報のログイン試行は拒否されセッションが発行されない
- [ ] ログイン済み利用者は再認証なしで後続画面へ遷移できる

## アーキテクチャ参照

- `architecture_refs`: `arch-portal-platform-001`

## 機能間依存

- `depends_on`: なし (先行機能を持たない)
- 依存理由: 先行する機能間依存は無い。認証は他 3 機能の前提であり自身は他機能に依存しない。

## Handoff

- per-feature planning: 機能間依存が満たされ confirmed / evaluation pass / readiness complete に到達した時点で system-dev-planner (run-system-dev-plan) へ引き渡す。
- 生成物: P01..P13 の exact 13 executable task specs と 13-node intra-feature DAG。
- 登録先: 全 task を同一 `parent_feature` / `feature_package_id` で C02 経由 atomic 登録する。
- 完了 rollup: exact 13 が全て done かつ P07 / P10 / P11 の evidence が本 feature の受入条件を満たした場合だけ done とする。
