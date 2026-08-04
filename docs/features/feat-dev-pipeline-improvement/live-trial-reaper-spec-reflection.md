---
status: confirmed
layer: feature-spec-reflection
beads_ids:
  - HarnessHub-cjwm
  - HarnessHub-0vs2
dev_graph_node_id: issue-live-trial-reap-unscoped-kill-20260728
feature_node_id: feat-dev-pipeline-improvement
spec_impact: reflected
reviewed_at: 2026-07-29
---

# live-trial reaper 並行安全化 — 仕様反映受領書

## 依頼と目的

変更中の Beads タスクを最終レビューし、main 統合後に task 仕様書の品質ゲートを
再実行した。目的は、ある live-trial の後片付けが、別 worktree や別 trial の
tmux session を巻き添えで終了させない状態を作り、その運用契約を仕様へ残すことである。

## 仕様影響の結論

**反映あり。ただし Harness Hub 製品契約は非変更。**

変更は repository 内の macOS 開発用 acceptance harness と並行運用に影響する。
製品の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

## 正規フローでの反映先

| 層 | 反映内容 |
|---|---|
| `system-spec/spec-state.json` | 単一 transition writer で `appr-012`、`qa-090`、R4-reopen→再確定を記録 |
| `system-spec/dev-workflow.md` | C03 compiler で qa-090 を再生成 |
| `specs/harness-hub-system-specification.md` | 製品境界と開発運用差分を追記 |
| `architecture/harness-hub-dev-workflow.md` | run-id + owner PID の削除権限モデルを反映 |
| `features/feat-dev-pipeline-improvement.md` | Beads 2 件の実装結果と 500 行分割を履歴化 |
| `tasks/feat-dev-pipeline-improvement/*-p11.md` | 責務別テストと負例を証跡契約へ追補 |
| `tasks/feat-dev-pipeline-improvement/*-p12.md` | READY の owner PID を使う cleanup 手順を追補 |
| `docs/worktree-parallel-operations-runbook.md` | 並行 trial の運用コマンドと禁止事項を追加 |

## 中学生向けの説明

以前は、同じ色のロッカーを全部片付けるような仕組みでした。そのため、別の人がまだ
使っているロッカーまで空にできました。

今は「今回の活動番号（run-id）」と「片付け担当者番号（owner PID）」が両方合う
ロッカーだけを片付けます。全部を片付ける操作は、管理者が `--all` と明示したとき
だけです。

## 専門的な説明

- `new-session` は tmux user option の `@lt_run_id` と `@lt_owner_pid` を記録する。
- 通常 `reap` は安全な run-id と正の owner PID を必須入力にする。
- 削除対象は session prefix、metadata run-id、metadata owner PID の三条件で積集合を取る。
- metadata 欠落・不一致は削除しない fail-closed（判定不能なら安全側で止める）とする。
- boot READY は記録済み owner PID を返し、cleanup 側の shell PID による誤所有を防ぐ。
- 全件削除は排他的な `--all` flag だけに分離し、引数なし `reap` は argparse で拒否する。

## 実装とテスト構造

- backend と boot の CLI/API 契約を同時に更新した。
- fake tmux で別 owner・別 run・metadata 無し session の生存を固定した。
- 実 tmux が利用可能な環境では同じ run-id の sibling session が残ることも確認する。
- 1,600 行超の `tests/test_live_trial_harness.py` は 6 責務と共通 support へ分割し、
  全ファイルを 500 行未満にした。
- 今回変更した手書きの実装・テスト・説明文書はすべて 500 行未満にした。
  `.dev-graph/state/graph.json` と `system-spec/spec-state.json` は writer/compiler が
  単一パスを前提に扱う生成 state store（機械処理用の正本）のため、互換性を壊す分割は
  行わない。人が読む差分は本受領書と各層の 500 行未満の文書へ分離している。

## 品質ゲート

- main 統合後 focused pytest: `104 passed`。
- backend / boot self-test: `OK`。
- content review: 75 skill の schema/hash lint が PASS、高・中 severity finding 0。
- system-spec coverage: 未収集 0、foundation trace PASS。
- C03 compile: 12 system-spec 文書の決定論生成 PASS。
- task package: exact P01〜P13、contract `1.1.0`、digest
  `af8a73…da6`、violations 0。
- repository CI: `123 PASS / 4 WARN / 0 FAIL`。4 WARN は main に既存の段階導入項目。
- 広域 pytest: `tests/` は `7618 passed / 5 skipped`、変更対象 plugin は
  `1668 passed / 2 skipped`、合計 `9286 passed / 7 skipped`。
- graph/source: graph schema PASS、登録 5 node の source digest 不一致 0、
  evidence ref 277 件の dangling 0。
- document: 419 文書の 300 行上限、frontmatter、artifact placement、`git diff --check` が PASS。

## Beads / dev-graph

- 正本 Beads: `HarnessHub-cjwm`
- 重複 Beads: `HarnessHub-0vs2`
- dev-graph: `issue-live-trial-reap-unscoped-kill-20260728`

## 残課題

本機能の未実装はない。`--all` は意図的な管理者 escape hatch のため、通常 cleanup で
使わない運用注意を継続する。無関係な scheduler JSON と一時ログは commit 対象外とする。
