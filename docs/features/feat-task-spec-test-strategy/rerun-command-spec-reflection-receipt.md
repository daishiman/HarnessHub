# C12 世代非依存 rerun command 仕様反映受領書

## 目的と背景

`HarnessHub-ji8y` の最終レビューとして、system-dev-planner が生成する task 仕様書の
C12 検証コマンドを、promotion（生成物を正式版へ昇格する処理）後も記載どおりに
再実行できるようにした。従来の `--staging .` は repository root を staging generation
として誤って指し、promotion 後は staging path 自体が atomic rename で消えるため、
利用者向けコマンドとして成立していなかった。

## 結論

仕様・設計影響は **あり**。確定仕様を `testing-qa.web` の qa-121 として
reopen → re-confirm し、task spec contract 1.3.0 に世代非依存 rerun command の
fail-closed gate（条件を確認できなければ失敗にする検査）を追加した。

## 中学生にもわかる説明

作業中だけ使える「仮の住所」を説明書に書いていたため、完成後にその住所へ行っても
何も見つからない状態だった。そこで、毎回いまの正式版へ案内してくれる
「機能名の案内板」を説明書に書くようにした。間違った住所、案内板の書き忘れ、
別機能の案内板を自動テストで見つけて止める。

## 専門的な設計判断

1. pre-promotion validation は planner が保持する実 staging generation path を使う。
2. post-promotion rerun は `--feature-package <self-package-id>` から current pointer を
   解決し、generation digest の直書きと消滅する staging path を公開契約から除外する。
3. Markdown の fenced code block と inline code だけを実行コマンドとして解析する。
   CommonMark の backtick/tilde fence、行継続、未閉じ fence を扱い、散文の言及は除外する。
4. contract 1.3.0 では `--staging`、flag 欠落、package mismatch を拒否する。
   1.2.0 以前の promote 済み package は content-addressed で immutable のため、
   当時の contract で再検証して digest を変えない。

## 正規フローの受領

- 仕様正本: `system-spec/spec-state.json` に `qa-121` / `appr-022` を単一 writer の
  `apply-spec-transition.py` で記録し、`system-spec/testing-qa.md` を compiler で再生成した。
- 統合仕様: `specs/harness-hub-system-specification.md` に lifecycle、互換性、影響境界を反映した。
- 設計: `architecture/harness-hub-testing-qa.md` に current pointer 解決と versioned contract を反映した。
- feature/task: `features/feat-task-spec-test-strategy.md` と
  `tasks/feat-task-spec-test-strategy/sys-task-spec-test-strategy-p13.md` に実装フィードバックを反映した。
- issue/dev-graph: `issue-task-spec-validate-command-unrunnable-20260725` を
  `HarnessHub-ji8y` に結び、受入条件を pre/post-promotion lifecycle に合わせた。

## 変更境界

影響は system-dev-planner の task spec 生成・検証契約と repository 内の品質証拠に限定する。
Harness Hub 製品の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit には影響しない。

## 品質ゲート記録

最終コマンド・件数・結果は Draft PR の検証結果と Beads notes に記録する。
本受領書は、focused test、plugin 全テスト、実 feature package 検証、projection check、
system-spec / dev-graph / 文書 lint、repository CI gate がすべて PASS した時点で受領済みとする。

## トレーサビリティ

- Beads ID: `HarnessHub-ji8y`
- dev-graph node ID: `issue-task-spec-validate-command-unrunnable-20260725`
- feature package: `feature-package/feat-task-spec-test-strategy`
- specification: `qa-121`
- approval: `appr-022`
