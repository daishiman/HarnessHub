---
layer: feature-spec-reflection
feature_id: feat-hub-foundation
beads_ids: [HarnessHub-bmhq]
dev_graph_node_id: issue-hub-local-dev-runtime-reliability-20260811
task_node_id: SYS-HUB-FOUNDATION-P13
spec_impact: reflected
status: verified_with_external_browser_followup
updated: 2026-08-11
---

# ローカル開発ランタイム信頼性 — 仕様反映受領書

## 依頼・目的・背景

一度停止した sqld と Next.js を `nohup` で再起動した状態が本当に安全かを再点検し、
セッション切断だけでなく、同一 DB、正確な health、異常終了時復旧、認証付き画面確認まで
再現可能にするため、`HarnessHub-bmhq` の実装と最終レビューを行った。

## 結論

仕様・設計への影響は **あり（reflected）** と判断した。公開 API、DB schema、認証認可の
判定、本番 Cloudflare 構成は変えないが、ローカル運用の owner、保存場所、監視構造、health、
復旧、認証 smoke の契約が変わるため、正規 system-spec transition `qa-230` と各追補へ反映した。

自動検証対象は PASS している。HttpOnly Cookie を使う実ブラウザの `/sheets` 表示だけは、
利用可能な browser session がないため未受領であり、Beads は PR merge 前かつ画面確認前の
`in_progress` を維持する。

## 中学生向けの説明

前は、パソコンの画面を閉じてもプログラムが動き続けるようにしただけでした。しかし、
途中で壊れたときに自分で立ち直れず、別の保存箱を開く危険もありました。

今回は、保存箱の場所を一つに決め、見張り役を置き、壊れたら自動で起こし、正しいデータが
3件見えるところまで一つのコマンドで確認できるようにしました。最後に人のブラウザで同じ
3件が見える確認だけを、未完了として正直に残しています。

## 技術的な変更

- `.local-state/hub/` に DB、env、PID、lock、ログを集約し、相対 path と一時 scratchpad 依存を除去。
- LaunchAgent が supervisor を、supervisor が sqld / Next.js を監視。readiness 順序、process group 停止、異常終了時再起動、5 MiB × 5世代のログ rotation を実装。
- HTTP loopback sqld は空 token でも probe し、remote URL は従来どおり credential 必須。
- `start / status / stop / restart / smoke / cookie / paths / migrate` を単一 CLI 契約へ統合。
- session Cookie 発行を read-only 化し、seed 再実行と分離。smoke は tenant/workspace scope 付きで sheets 3件を検査。
- middleware 公開入口を `middleware-contract.ts` に移し、Next.js の重複 page 解決を排除。

最終レビューの実プロセス再起動で、初回コンパイルが30秒を超えたときに `ok:false` でも
終了コード0になる fail-open を再現した。health と root の readiness、最終 status PASS を
成功条件へ追加して是正した。またログ上限が再起動時だけ適用されていたため、稼働中の
stdout / stderr 受信時にも rotation するよう修正し、focused test を追加した。

## 正規仕様反映

| 層 | 反映内容 |
|---|---|
| `system-spec/` | `qa-230` を正規 transition で確定し、canonical compiler で `maintenance-ops.md` へ反映 |
| `specs/` | ローカル runtime の owner、監視、health、smoke、middleware 契約を writeback |
| `architecture/` | launchd → supervisor → sqld / Next.js と検査境界を記録 |
| `features/` | closed feature に post-closeout 追補として登録 |
| `tasks/` | exact-13 を増やさず P13 後の writeback として登録 |
| `docs/` | 操作、復旧、Cookie、残る browser gate を runbook に記録 |

## 検証結果

| 検証 | 結果 |
|---|---|
| task package exact-13 | PASS |
| local lifecycle unit test | PASS: 5/5 |
| local session / seed focused test | PASS: 10/10 |
| Hub health focused test | PASS: 32/32 |
| middleware/shared-layer focused test | PASS |
| Hub / DB typecheck、duplicate detector、format | PASS |
| lifecycle restart / status / authenticated smoke | PASS: health 200、sheets 3件、同一 DB 維持 |
| child process crash recovery | PASS: sqld / Next.js とも supervisor が再起動 |
| actual in-app browser `/sheets` | PENDING: browser session 不在。CLI/API PASS から推測しない |

`system-spec` の current transition と loop coverage は PASS。repository 全体の
`--require-complete --require-foundation` は、本変更前から残る11件の legacy QA に
`design_applications` がないため FAIL する。本変更の `qa-230` は必要項目を持ち、既存11件を
本 issue で改変しない。

## ファイル分割

手書き runtime 本体が500行を超えないよう、process supervision を
`local-dev-supervisor.mjs` へ分離した。生成済み machine-readable 正本
`.dev-graph/state/graph.json` と `system-spec/spec-state.json` は固定 schema のため分割しない。

## 残課題

- draft PR の CI と review を受領する。
- 利用可能な in-app browser session で Cookie を登録し、`/sheets` の3件表示を確認する。
- PR merge 後に default branch reconciliation を行い、Beads と dev-graph を close する。
