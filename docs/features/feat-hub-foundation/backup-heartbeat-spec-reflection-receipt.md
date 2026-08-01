---
status: confirmed
layer: feature-spec-reflection
beads_ids:
  - HarnessHub-dbx6
dev_graph_node_id: issue-backup-failure-undetected-20260728
feature_node_id: feat-hub-foundation
spec_impact: reflected
reviewed_at: 2026-07-30
---

# backup heartbeat 分離 仕様反映受領書

## 1. 依頼と目的

`HarnessHub-dbx6` (`issue-backup-failure-undetected-20260728`) の最終レビューとして、日次 backup が失敗または cron 不発になっても無音にならず、予定時刻の約 1 時間後までに外形監視で異常化する契約を確定する。

## 2. 結論

- **仕様影響: あり (`reflected`)**。監視資源の責務分離、`BACKUP_HEARTBEAT_URL` の必須度、失敗検知時間、外部実測までの完了境界が変わる。
- **正規反映: 完了**。`main` の qa-092 を保持したうえで `infrastructure.web` と `maintenance-ops.web` を単一 transition writer で reopen し、backup heartbeat 契約を qa-093、既存 qa-091 / qa-058 / qa-011 / qa-019 を情報欠落なく維持する統合契約を qa-094 として再確定した。
- **repository 実装: 完了**。backup 専用 heartbeat、required secret、workflow 前提確認、限定適用 CLI、回帰テスト、運用文書を同期した。
- **競合解消: 完了**。`main` の Dev Graph C11 仕様 (`qa-092`) と本変更の QA ID が衝突していたため、`main` を優先土台として取り込み、本変更を `qa-093/qa-094` へ正規 writer で再登録した。`main` 側の仕様、設計、実装注記は保持した。
- **外部実測: 未完了**。Better Stack 資源適用、GitHub secret 投入、main 上の成功 run、heartbeat 着信実測が残るため、Beads は `in_progress` を維持する。

## 3. 中学生向けの説明

バックアップは毎日動く「データの避難訓練」です。今までは失敗しても、見に行かなければ気づけませんでした。また、別の定期作業と同じ見張り番を使うと、片方だけ成功したのに「全部成功した」ように見える危険がありました。

そこで、バックアップ専用の見張り番を用意しました。毎日決まった時刻に「今日も成功した」と連絡が来なければ、約 1 時間後に異常になります。見張り番の秘密の住所が未登録なら、最初から処理を失敗させて不足を見えるようにします。

## 4. 専門的な説明

Better Stack heartbeat を Worker cron (`CRON_HEARTBEAT_URL`) と GitHub Actions backup (`BACKUP_HEARTBEAT_URL`) に分離した。backup 専用 `hub-backup-daily` は `period=86400` / `grace=3600` で、workflow は全 step 成功後にのみ ping する。`BACKUP_HEARTBEAT_URL` は Actions 台帳上 `required` であり、preflight step が未投入を fail-closed で拒否する。

適用器は全監視適用と backup 限定適用を分離する。`--only-backup-heartbeat --put-github-secret` は monitor、Worker heartbeat、status page、SLO dashboard に触れず、backup heartbeat の create/reuse と repository secret の stdin 投入だけを行う。API token と heartbeat URL は設定、証跡、引数、ログへ保存しない。

## 5. 仕様反映の正規フロー

1. `system-spec/spec-state.json` の `infrastructure.web` / `maintenance-ops.web` を writer 経由で reopen。
2. `main` 側で先に確定していた qa-092 を保持。
3. qa-093 で backup heartbeat 契約を追加。
4. compiler 出力レビューで直前契約の継承記述不足を検出。
5. qa-094 で qa-091 / qa-058 / qa-011 / qa-019 と backup heartbeat 契約を統合して再確定。
6. coverage / foundation gate を通し、正規 compiler で `system-spec/infrastructure.md` / `maintenance-ops.md` を再生成。
7. `specs/` / `architecture/` / `features/` / `tasks/` / `docs/` へ同一変更単位で反映。

反映先:

- `system-spec/spec-state.json`
- `system-spec/infrastructure.md`
- `system-spec/maintenance-ops.md`
- `specs/harness-hub-system-specification.md`
- `architecture/harness-hub-infrastructure.md`
- `features/feat-hub-foundation.md`
- `tasks/feat-hub-foundation/sys-hub-foundation-p12.md`
- `docs/infrastructure-spec.md`
- `docs/features/feat-hub-foundation/runbook.md`

## 6. 品質ゲート

2026-07-29 の実装時、および `main` 競合解消後の 2026-07-30 に最終差分へ次を再実行した。

- focused Vitest: 4 files / 55 tests PASS。監視設定、適用器、CLI 境界、Actions secret 台帳を検証した。
- Hub typecheck / Biome: PASS。
- workspace `pnpm verify`: PASS。全 workspace の lint、型検査、build、test、テナント分離、secret scan、契約 drift、Worker / client bundle 予算を含む。2026-07-30 の初回は全 assertion PASS 後に Vitest worker RPC timeout が 1 件出たが、対象 schemas 86 tests の単独再実行と `pnpm verify` 全体の再実行がともに PASS し、競合差分由来の再現性ある失敗でないことを確認した。
- workflow guard: self-test と 10 workflows が PASS。Actions secret の workflow 参照 13 件と台帳 13 件が一致した。
- task 仕様 validator: `feat-hub-foundation` と `feat-domain-model-db` がともに PASS。
- system-spec: coverage / foundation / source citation gate が PASS、validator は 529 tests PASS。
- dev-graph / 文書: graph JSON、implementation readiness、artifact placement、500 行 ratchet が PASS。
- dry-run: 全監視適用と backup 限定適用が PASS。`git diff --check` と conflict marker 検査も PASS。
- 実環境 secret gate: `BACKUP_HEARTBEAT_URL` と既存の `CLOUDFLARE_R2_API_TOKEN` が未投入のため、想定どおり NG。repository 内の実装品質ではなく、外部受け入れ条件として残課題へ継続する。

task-specification-creator の一般チェックリストが例示する `scripts/verify-pr-ready.sh` は本 repository に存在しない。この repository で実在する上記の task / system-spec / workspace gate を個別に実行し、同等範囲を確認した。

## 7. 500 行分割

- `apps/hub/scripts/apply-better-stack-monitoring.mjs` は API 適用責務を保持し、CLI / secret 配送を `better-stack-monitoring-cli.mjs` へ分離した。
- `apps/hub/tests/monitoring/apply-better-stack-monitoring.test.ts` は assertion を保持し、fake API / fixture を `better-stack-monitoring-test-support.ts` へ分離した。
- `system-spec/spec-state.json` は system-spec-harness の単一 writer が管理する機械可読 state であり、schema 契約上は分割不能。人間向け仕様は 500 行未満の章別 Markdown へ compiler が分割出力している。

## 8. 残課題

- Better Stack Uptime API token を使い、backup heartbeat だけを外部適用する。
- `BACKUP_HEARTBEAT_URL` を GitHub repository secret へ投入する。
- branch を main へ landing 後、`backup.yml` を成功完走させる。
- Better Stack 側で heartbeat 着信と期限超過時の異常化を実測する。
- 以上が揃うまで `HarnessHub-dbx6` を close しない。
