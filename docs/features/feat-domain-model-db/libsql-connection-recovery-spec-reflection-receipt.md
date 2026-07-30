---
status: confirmed
layer: feature-spec-reflection
beads_ids:
  - HarnessHub-njkm
dev_graph_node_id: issue-libsql-connection-recovery-20260726
feature_node_id: feat-domain-model-db
spec_impact: reflected
reviewed_at: 2026-07-30
---

# libSQL 接続復旧 仕様反映受領書

## 1. 依頼と目的

`HarnessHub-njkm` の最終レビューとして、別プロセスが同じローカル file DB を触って
`SQLITE_BUSY` が起きても、「成功したのに行が保存されていない」という静かなデータ消失を
起こさず、接続層で検知・隔離・明示復旧できる契約を確定する。

## 2. 結論

- **仕様影響: あり (`reflected`)**。`TursoAdapter` の公開契約、ローカル障害時の read/write
  挙動、再試行可否、復旧手順が増えるため、内部実装だけの変更ではない。
- **正規反映: 完了**。`database.web` を transition writer で R4-reopen し、既存 qa-086 を
  情報欠落なく維持した qa-097 として再確定し、compiler で `system-spec/database.md` を再生成した。
- **実装と実プロセス競合テスト: 完了**。process-local の poison 隔離、明示 reconnect、
  request-bound 非隔離、別プロセス write lock の回帰テストを揃えた。
- **完了境界**: draft PR の required checks と merge までは Beads `HarnessHub-njkm` を
  `in_progress` に維持する。

## 3. 中学生向けの説明

同じノートに二人が同時に書こうとすると、片方のペンが途中で止まることがあります。
ところが以前は、止まったペンをそのまま使うと「書けたように見えるのに、あとで見ると
書いていない」という危険がありました。

そこで、いちど詰まったペンには「使用禁止」の札を付け、読むことも書くことも止めます。
原因になった作業を終わらせてから、新しいペンへ交換すると再開できます。実際に別の
プログラムがノートを押さえるテストも行い、交換後の文字が別の人からも見えることを確認します。

## 4. 専門的な説明

`createRecoverableClient()` は不変の `Client` facade の内側に raw `@libsql/client` を保持する。
`writeConcurrencyScope=process-local` で lock conflict を捕捉した場合、poison state と
`ConnectionPoisonedError` を生成し、以降の `execute` / `batch` / `migrate` /
`executeMultiple` / `transaction` と transaction 内操作を fail-fast させる。read も遮断するのは、
壊れた接続が未 commit 行を自分にだけ見せるためである。

`reconnect()` は新 raw client の生成に成功してから poison を解除し、旧 client を閉じる。
facade と Drizzle instance の参照は不変なので、既存 repository と spread 済み test adapter は
再構築不要である。自動 reconnect は並行 transaction を途中で巻き込み、故障観測を消すため採用しない。
`request-bound` の Turso Web / D1 は接続状態が要求をまたがないため poison にせず、
`retryOnConflict` と DB 側 CAS を維持する。`isLockConflict()` は poison error chain を除外し、
cause に残した `SQLITE_BUSY` を再試行可能と誤判定しない。

## 5. 仕様反映の正規フロー

1. `apply-spec-transition.py apply` で `database.web` を根拠付き R4-reopen。
2. ユーザー指示を `appr-016`、統合契約を `qa-097` として `chunk` で確定。
3. `compile-spec-doc.py compile` で `system-spec/database.md` を再生成。
4. `specs/`、`architecture/`、`features/`、`tasks/`、`docs/`、issue 文書へ同一変更単位で反映。
5. commit 後に `build-spec-reflection-receipt.py --spec-impact reflected` で
   HEAD（その時点の commit）へ束縛した機械受領書を記録する。

反映先:

- `system-spec/spec-state.json`
- `system-spec/database.md`
- `specs/harness-hub-system-specification.md`
- `architecture/harness-hub-data.md`
- `features/feat-domain-model-db.md`
- `tasks/feat-domain-model-db/sys-domain-model-db-p13.md`
- `docs/backend-spec.md`
- `docs/features/feat-domain-model-db/runbook.md`
- `issues/sys-libsql-connection-recovery-20260726.md`

## 6. 検証計画

- packages/db 全 test と focused connection/conflict test。
- packages/db typecheck、Biome、`git diff --check`。
- connection isolation、tenant isolation coverage、DDL、repository write gate。
- apps/hub typecheck（`TursoAdapter` の公開型変更が consumer を壊さないこと）。
- `validate-system-plan.py --feature-package feature-package/feat-domain-model-db`。
- system-spec coverage / foundation / source citation gate と system-spec-harness pytest。
- dev-graph schema、artifact placement、500 行 ratchet、PR 前 CI 集約。

最終数値と pass/fail は、マージ後の状態を取り込んで再実行した結果で本受領書を更新する。

## 7. 500 行分割

- 変更対象の最大は `packages/db/__tests__/connection-recovery.test.ts` で 500 行未満に保つ。
- 接続 facade は `connection/recoverable-client.ts`、例外判定は `src/lock-conflict.ts` へ責務分離済み。
- `system-spec/spec-state.json` は transition writer が管理する schema 上の単一 state で分割不能。
  人間向け仕様は compiler が章別 Markdown に分割している。

## 8. 残課題

- draft PR の required checks を確認する。
- PR merge 後に Beads と Dev Graph の completion を確定する。
- 新しい外部サービス、DB migration、secret 投入、production 操作は不要。
