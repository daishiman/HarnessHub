---
layer: feature-spec-reflection
feature_id: feat-hub-foundation
beads_ids: [HarnessHub-yhc3, HarnessHub-42g]
dev_graph_node_id: issue-shared-layers-registry-baseline-drift-20260724
task_node_id: SYS-HUB-FOUNDATION-P13
spec_impact: reflected
status: verified
updated: 2026-08-10
---

# CI 品質ゲート登録簿と local `verify` の整合 — 仕様反映受領書

## 1. 依頼・目的・背景

`HarnessHub-yhc3` は、CI にだけ結線されていた G7（破壊的 DDL）、G7b
（tenant 分離網羅・connection isolation）、G9（axe a11y）を root の
`pnpm verify` からも実行可能にする課題である。`HarnessHub-42g` は、feature の
requirements baseline が昔の 5 項目を現在の gate 集合のように見せるドリフトを
解消する課題である。

目的は、local で緑でも PR で初めて赤になる往復を減らし、CI 品質ゲートの正本、
要約、実行入口を同じ実装へそろえることである。

## 2. 結論

仕様・設計への影響は **あり（`reflected`）** と判断した。製品の API、DB schema、
認証・認可、UI、Cloudflare deploy unit は変更しない。一方、CI と local で同じ
検査実装を使う開発品質契約を具体化するため、`specs/` と `architecture/` の追補、
`docs/` の gate 登録簿、feature/task の完了証拠へ正規に反映した。

最新 `main` 取り込み後の `system-spec/dev-workflow.md` は `qa-216` が現行確定セルで、
旧ブランチで使った `qa-144` は別論点へ再利用されていた。したがって旧 ID を戻さず、
`qa-216` が統合・継承する `qa-038` / `qa-039` / `qa-140` の「CI と local は同じ
pnpm 実装を使う」という既存契約の実装具体化として扱った。

## 3. 中学生向けの説明

提出前に家で使うチェック表と、先生が学校で使うチェック表が違うと、家では
「全部できた」と思っても学校で初めて不足に気づきます。

今回、家のチェックである `pnpm verify` に、学校の自動チェックである
「データを危なく壊していないか」「別の会社のデータが混ざらないか」
「画面が使いやすいか」「ログインの安全ルールを守れているか」を追加しました。
古い短い一覧も、今の正しい登録簿を見る案内へ直しました。

## 4. 技術的な説明

root `package.json` に wrapper を追加し、package script の実在を検査してから既存実装を
起動するようにした。

| local 入口 | CI 登録簿 | 再利用する既存実装 |
|---|---|---|
| `check:ddl` | G7 | `@harness-hub/db#check:ddl` |
| `check:tenant-isolation-coverage` | G7b | `@harness-hub/db#check:tenant-isolation-coverage` |
| `check:connection-isolation` | G7b | `@harness-hub/db#check:connection-isolation` |
| `check:a11y` | G9 | UI / Hub の `test:a11y` |
| `check:auth-release-contract` | G14 | Hub の `test:auth-release-contract` |

wrapper は script の rename / 削除を曖昧な成功や無実行にせず fail-closed
（確認できなければ停止）にする。G11 は main 反映後に行う定期 Core Web Vitals 計測で、
PR 前の実行時点と異なるため `pnpm verify` へ含めない。

## 5. 仕様反映の正規フロー

| 層 | 反映内容 |
|---|---|
| `system-spec/` | `main` の現行正本 `qa-216` が `qa-038` / `qa-039` / `qa-140` の CI/local 同値契約を統合継承済みであることを確認。新しい製品判断はないため C01 の追加 transition は行わない |
| `specs/` | `spec-harness-hub-verification-tiering-20260809` に G7 / G7b / G9 / G14 の root 入口、既存実装の再利用、G11 の実行境界を追記 |
| `architecture/` | `arch-harness-hub-infrastructure-operations-addenda` に CI 専用実装を複製せず package script を共有する判断を追記 |
| `features/` | `feat-hub-foundation` の completion evidence に本受領書を登録 |
| `tasks/` | 凍結済み exact-13 本文を変えず、`SYS-HUB-FOUNDATION-P13` の completion evidence に本受領書を登録 |
| `docs/` | G1〜G14 の登録簿、インフラ要約、ADR、requirements baseline を同じ事実へ同期 |

`system-spec/spec-state.json` は schema 1.0 の read-only compatibility（旧形式は暗黙変換しない）
である。正規 writer の明示 `init` は全 matrix を再収集状態へ移す migration なので、既存契約の
実装具体化だけを理由に実行しない。生成済み正本を手編集したり writer を迂回したりせず、
新しい意思決定だけを追補層へ記録した。

## 6. 影響判定の根拠

- **開発品質への影響あり**: local gate の集合と実行順を変更するため、仕様追補と設計追補が必要。
- **新しい system-spec 判断なし**: CI と local の同値、pnpm script の共有、CI を merge 前の正本とする契約は既に確定済み。今回は gate 名と接続先の実装値を具体化しただけである。
- **製品への影響なし**: runtime 機能、公開 interface、保存形式、認可規則は変更していない。
- **G11 の除外は仕様どおり**: merge 後の定期実測を PR 前の local gate と混同しない。

## 7. 検証

最終差分で task 仕様書の品質ゲートと root gate を再実行した。最初の
GitHub Actions 失敗は、P13 Markdown と Dev Graph の `completion_evidence` 不一致
（OR-002）だったため C02 正規 writer で同期した。また、全 test suite の高負荷時だけ
境界を超えた version gate test は、production の 90 秒契約を変えず test 用 timeout を
3 秒から 10 秒へ広げ、意図した delayed propagation を安定して検証できるようにした。

| 検証 | 結果 |
|---|---|
| task package exact-13 | PASS: P01〜P13 が重複・欠落なく、仕様検証違反 0 件 |
| Dev Graph schema / artifact placement | PASS: schema valid、対象 3 node の open-residue 違反 0 件、配置 self-test / repository scan とも成功 |
| system-spec coverage matrix | PASS: `--require-complete --require-foundation` |
| G7 | PASS: migration 8 件、未承認の破壊的 DDL 0 件 |
| G7b | PASS: scoped 25 / exempt 3、fixture 25/25、DB driver 直接 import 0 件 |
| G9 | PASS: UI 30 test、Hub 5 test |
| G14 | PASS: auth release contract 63 test |
| version gate focused test | PASS: 5/5（全 suite 内でも成功） |
| root `pnpm verify` | PASS: build、全 package test、G1〜G14 の PR 前 gate を完走 |
| diff / document line limit | PASS: `git diff --check`、300 行 ratchet、手書き変更は 500 行以下 |

## 8. ファイルサイズ

手書きで更新したファイルはすべて 500 行以下に保つ。500 行を超える生成済み集約正本
（`.dev-graph/state/graph.json` と `system-spec/spec-state.json`）は固定 path / schema の
機械可読 artifact であり、分割すると読取契約を壊すため対象外とする。

## 9. 残課題

- PR 上の GitHub Actions とレビュー結果を確認する。
- repository 全体に既存する別 node の lifecycle residue は本変更の対象外であり、本変更の
  3 node に限定した検査では違反 0 件である。
