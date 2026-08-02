---
status: confirmed
layer: feature-evidence
beads_ids:
  - HarnessHub-ji8y
dev_graph_node_id: issue-task-spec-validate-command-unrunnable-20260725
feature_node_id: feat-task-spec-test-strategy
spec_impact: reflected
reviewed_at: 2026-08-02
---

# C12 世代非依存 rerun command 仕様反映受領書

## 目的と背景

`HarnessHub-ji8y` の最終レビューとして、system-dev-planner が生成する task 仕様書の
C12 検証コマンドを、promotion（生成物を正式版へ昇格する処理）後も記載どおりに
再実行できるようにした。従来の `--staging .` は repository root を staging generation
として誤って指し、promotion 後は staging path 自体が atomic rename で消えるため、
利用者向けコマンドとして成立していなかった。

## 結論

仕様・設計影響は **あり**。確定仕様を `testing-qa.web` の qa-131 として
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
5. downstream consumer（後段の利用側）である `run-dev-graph-requirements` も
   `--feature-package` を使い、選択 feature・`architecture_refs`・task 13 件からなる
   15-node lineage closure（引用元まで含む関係ノード集合）を source-digest gate へ渡す。
   positive live-trial fixture は promotion receipt と current pointer を開始前から持つ。

## 正規フローの受領

- 仕様正本: `system-spec/spec-state.json` に `qa-131` / `appr-024` を単一 writer の
  `apply-spec-transition.py` で記録し、`system-spec/testing-qa.md` を compiler で再生成した。
- 統合仕様: `specs/harness-hub-system-specification.md` に lifecycle、互換性、影響境界を反映した。
- 設計: `architecture/harness-hub-testing-qa.md` に current pointer 解決と versioned contract を反映した。
- feature/task: `features/feat-task-spec-test-strategy.md` と
  `tasks/feat-task-spec-test-strategy/sys-task-spec-test-strategy-p13.md` に実装フィードバックを反映した。
- issue/dev-graph: `issue-task-spec-validate-command-unrunnable-20260725` を
  `HarnessHub-ji8y` に結び、受入条件を pre/post-promotion lifecycle に合わせた。

## 変更境界

影響は system-dev-planner の task spec 生成・検証契約、dev-graph C04 consumer と
live-trial fixture、repository 内の品質証拠に限定する。
Harness Hub 製品の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit には影響しない。

## 品質ゲート記録

- task spec 再検証: `--feature-package feature-package/feat-task-spec-test-strategy` で
  P01〜P13 の正確に 13 phase、legacy contract 免除、違反 0 を確認した。
- projection / lineage: task projection 13 件すべて配線済み、current generation 1 件の
  marker 違反 0、書込み 0 を確認した。
- plugin 回帰: system-dev-planner `197 passed / 86 subtests passed`、dev-graph
  `755 passed / 2 skipped / 5 subtests passed`。
- repository 回帰: `make test` で root pytest `7643 passed / 5 skipped`、
  LLM coverage 67 Skill 平均 100%、phase 0 gate 33 Skill PASS。
- live acceptance: requirements r3、node r8、decompose r12 を current behavior closure として
  再利用可能と確認した。decompose r12 は nudge 0 / gate 0、独立評価 O1〜O7 全件 PASS。
- 仕様・文書: coverage matrix、公式出典、source digest 3 node、root graph schema、
  artifact placement、content review、300 行 lint、dev-graph live-trial lint が PASS。

repository 全体の `lint-live-trial-verdict.py --all --enforce` は、最新 main にも存在する
別 plugin 6 Skill の未収集 verdict を報告する。一方、本変更対象の dev-graph は
9 verdict / missing 0 で PASS しており、この既存横断課題を本 task の成果へ混在させない。

## トレーサビリティ

- Beads ID: `HarnessHub-ji8y`
- dev-graph node ID: `issue-task-spec-validate-command-unrunnable-20260725`
- feature package: `feature-package/feat-task-spec-test-strategy`
- specification: `qa-131`
- approval: `appr-024`
