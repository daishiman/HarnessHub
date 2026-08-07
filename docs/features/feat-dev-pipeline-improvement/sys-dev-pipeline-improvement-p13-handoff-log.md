---
status: active
layer: implementation-notes
---

# P13 Phase 13 引き継ぎ・書き戻し履歴ログ

> [sys-dev-pipeline-improvement-p13.md](sys-dev-pipeline-improvement-p13.md) から分離した引き継ぎ・書き戻し履歴の分冊。300 行上限 (`lint-doc-line-limit.py`) を超えたための分割remediation (先例: `docs/features/feat-dev-pipeline-improvement/feat-dev-pipeline-improvement-changelog.md`、`HarnessHub-3d8` の `docs/security-spec.md` 分冊)。時系列は本体側で追記せず、新規の過去エントリはここへ追記する。直近の Phase 13 引き継ぎエントリは本体 (`sys-dev-pipeline-improvement-p13.md`) 側に残す。

## 2026-07-29 P13 書き戻し記録

C14 live-trial acceptance の証拠完全性、最終 persisted node への評価 digest 束縛、正準 validator の negative control を `system-spec/testing-qa.md` の qa-089、`specs/harness-hub-system-specification.md`、`architecture/harness-hub-testing-qa.md`、`features/feat-dev-pipeline-improvement.md` へ書き戻した。外部 API・DB・認証認可・UI・deploy unit は非変更で、変更境界は repository 内の開発品質ゲートである。受領書は `docs/features/feat-dev-pipeline-improvement/live-trial-acceptance-hardening-spec-reflection.md` を正とする。

書き戻し後の再検証は PR #598 の最新 `main` (`bb95580`) 統合後ツリーで広域 pytest 9308 passed / 7 skipped、repository CI 123 PASS / 4 既存 WARN / 0 FAIL、現行 task package P01〜P13 violations 0、fresh r7 live-trial beads/none 2 系列 PASS である。live-trial は統合後も有効な behavior closure `c0d843d7…4801` へ束縛し、旧 reaper による別 worktree session 回収は main の ownership 契約で解消した。

## 2026-07-30 scenario contract 受領ゲートの追補

`HarnessHub-yn71` は P13 の release evidence 受領条件を qa-100 へ具体化した。
`verify_by=live-trial` の verdict は `scenario_contract` を省略できず、required/observed
の同数・同順、`unobserved=[]`、引数、宣言済み task 契約、run 内 evidence の実在を
criteria-test が再照合する。C15 schedule は 4/4 観測の fresh run へ更新した。
schedule 実装と製品契約は非変更で、判断・検証の正本は
`docs/features/feat-dev-pipeline-improvement/live-trial-scenario-contract-required-spec-reflection.md`
とする。

## 2026-07-29 C02 lifecycle 回帰の最終レビュー追記

`HarnessHub-bk8v` では、C14 の stale full feature snapshot が評価済み lifecycle を
draft へ戻す回帰を C02 の単一 writer 境界で遮断した。明示 patch による意図的 reset は
維持し、通常の同一入力は noop、stale full snapshot は graph / Markdown / revision を
変えずに拒否する。

書き戻し先は `system-spec/dev-workflow.md`、
`architecture/harness-hub-dev-workflow.md`、
`specs/harness-hub-system-specification.md`、
`features/feat-dev-pipeline-improvement.md` とした。製品仕様への影響はなく、
開発管理ツール内部の整合性契約だけを具体化した。検証と判断理由は
`docs/features/feat-dev-pipeline-improvement/bk8v-c02-lifecycle-spec-reflection.md`
を正とする。

2026-07-30 の最終レビューでは、重複報告 `HarnessHub-j66m` を別実装にせず `HarnessHub-bk8v` / `issue-c02-upsert-lifecycle-regression-20260729` の完了証拠へ統合し、現行 `main` で受入条件と品質ゲートを再実行して製品 runtime 契約に差分がない判断を仕様反映受領書へ記録する。

## 2026-07-29 skill tree lint P13 書き戻し

`HarnessHub-xswf` の実装結果を testing-qa の R4-reopen → qa-095 再確定として
`system-spec/spec-state.json` / `system-spec/testing-qa.md` へ書き戻した。
参照 wrapper、system spec 要約、feature 履歴、P12 品質ゲート、仕様反映受領書も
同一 wave で更新した。

変更境界は repository 内の skill 構造 lint と local test reproducibility であり、
Harness Hub 製品の API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。
最終検証は
`docs/features/feat-dev-pipeline-improvement/skill-tree-cache-spec-reflection-receipt.md`
へ記録し、draft PR は `main` 向けに作成する。

## 2026-07-30 `HarnessHub-ml57` Phase 13 引き継ぎ

- branch: `devgraph/issue-local-ci-gate-drift-20260728`
- base: repository default branch `main`
- commit scope: implementation、focused tests、CI/local wiring、仕様反映文書、
  dev-graph / Beads linkage に限定する
- excluded dirty files: 既存の
  `eval-log/run-dev-graph-schedule-beads-ready.json` と
  `eval-log/run-dev-graph-schedule-execution.json`
- PR body: 目的、変更内容、検証結果、仕様反映、Beads ID、dev-graph node ID、
  残課題を明記し Draft で作成する
- merge order: `origin/main` → local `main` → 本 branch の順に統合し、
  統合後 tree で品質ゲートを再実行する

仕様反映受領書は
`docs/features/feat-dev-pipeline-improvement/local-ci-parity-spec-reflection-receipt.md`
とする。

## 2026-07-30 `HarnessHub-35ai` Phase 13 引き継ぎ

- branch: `devgraph/issue-render-registration-receipt-contract-mismatch-20260726`
- base: repository default branch `main`
- commit scope: renderer、skill 契約、正負の回帰テスト、評価証拠、
  仕様反映文書、dev-graph / Beads 完了投影に限定する
- registration receipt 有りは `verified`、無しは `not_performed` とし、
  13 task の見かけの一致を成功根拠にしない
- test 分割後の変更対象コード／文書は 500 行以下を維持する
- `origin/main` → local `main` → 本 branch の順で統合し、統合後 tree で
  task package、plugin test、content/live-trial、repository CI を再検証する
- 仕様反映受領書: `docs/features/feat-dev-pipeline-improvement/render-registration-verification-spec-reflection-receipt.md`。2026-08-02 の C10/C11/C28 final review は `guard-authority-c10-c11-c28-spec-reflection-receipt.md` を正とする。

## 2026-07-30 PR #610 CI follow-up

stale になった 9 skill の live-trial を fresh session で再取得し、C19 の report / ledger / session を canonical gate で突合した。結果は `qa-102` / `appr-019` と [受領書](../../docs/features/feat-dev-pipeline-improvement/c02-document-layer-spec-reflection.md) を正とする。

## 2026-08-03 `HarnessHub-f84o` Phase 13 引き継ぎ

branch は `devgraph/issue-guard-graph-schema-inline-python-variable-path-20260726`、base は `main`。
対象実装・テスト・仕様層・fresh evidence・Beads 投影だけを commit し、無関係な既存差分を除外する。
`origin/main` → local `main` → branch を `1c60a47d` / `5bdf3c25` まで統合し、全ゲート PASS を確認。
目的、変更、検証、仕様反映、Beads/node ID、残課題を本文に持つ draft PR を作る。詳細は
[f84o 仕様反映受領書](../../docs/features/feat-dev-pipeline-improvement/f84o-inline-python-guard-spec-reflection-receipt.md) を正とする。
