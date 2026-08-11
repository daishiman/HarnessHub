---
layer: feature-spec-reflection
feature_id: feat-hub-foundation
beads_ids: [HarnessHub-f04p]
dev_graph_node_id: issue-production-publish-smoke-cwd-paths-20260811
spec_impact: none
status: verified
updated: 2026-08-11
---

# 本番 publish smoke cwd 非依存化 — 仕様反映受領書

## 依頼・目的・背景

GitHub Actions run #419 の本番 deploy 後に、publish smoke の R2 取得とfixture回収レポートがENOENTで失敗した。実装とworkflowが暗黙に異なる作業ディレクトリを前提にしていたため、path契約をcwd非依存に是正した。

## 結論

仕様・設計への影響は **なし** と判断した。既存の正本はR2から公開packageを再取得して検証し、回収結果をrepositoryのartifactとして保存することを既に要求している。今回はその契約やデータ構造を変えず、pnpmが子processのcwdをHub packageへ変更しても既存契約どおり実行できるようpath解決だけを直した。

このため `system-spec/`、`specs/`、`architecture/`、`features/`、`tasks/`への新しい要件・設計追記は行わない。非影響判断、原因、対象、検証結果は本受領書とDev Graph issueへ記録する。

## 中学生向けの説明

プログラムは正しいファイル名を知っていましたが、「どのフォルダーから探し始めるか」が実行場所によって変わっていました。住所を途中からではなく最初から最後まで書くようにして、どこから実行しても同じファイルと保存先を選べるようにしました。

## 技術的な変更

- Wrangler configを`import.meta.url`から求めたrepository root基準の絶対pathへ固定。
- deploy workflowと定期sweeperのreport引数を`$GITHUB_WORKSPACE/artifacts/...`へ固定。
- config実在と2 workflowの出力先を検査するfocused testを追加。
- publish状態遷移、DB schema、R2 key、artifact schema、認証情報は変更しない。

## 検証結果

| 検証 | 結果 |
|---|---|
| GitHub Actions run #419 log inspection | PASS: 2件のENOENTをcwd相対pathへ特定 |
| production smoke focused test | PASS: 16 tests |
| Hub typecheck | PASS |
| Biome | PASS |
| workflow step guard | PASS: 14 workflows / violation 0 |
| Dev Graph schema | PASS |

## 残る検証境界

production deploy jobは`main`のpushまたは`main`に対するworkflow_dispatchだけで実行される。ユーザー指定により新規PRは作成しないため、本変更を`main`へ統合した後の実R2 smoke再実行は本ブランチでは行わない。branch pushで実行される静的・build・testゲートを受領し、本番資格情報を使うdeploy gateはdefault branch統合後に確認する。
