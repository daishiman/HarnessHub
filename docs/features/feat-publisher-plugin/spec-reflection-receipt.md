---
status: confirmed
layer: feature-spec-reflection
parent_feature: feat-publisher-plugin
feature_package_id: feature-package/feat-publisher-plugin
beads_ids: [HarnessHub-zdh, HarnessHub-zdh.6, HarnessHub-zdh.7, HarnessHub-zdh.10, HarnessHub-zdh.11, HarnessHub-zdh.13]
graph_node_id: feat-publisher-plugin
---

# feat-publisher-plugin 仕様反映受領書

確認日: 2026-08-02

## 結論

今回の実装は、既に確定している Publisher の製品契約を追加・変更していない。`apps/publisher` と
`plugins/harness-hub-publisher` は、その契約を実装したものなので、`system-spec/`、`specs/`、
`architecture/`、`features/`、`tasks/` の正本は変更しない。実装・試験・リリース状態の反映は
`docs/features/feat-publisher-plugin/` に記録した。

## 確認した正本と判断理由

| 層 | 確認対象 | 判断 |
|---|---|---|
| system-spec | Device Flow、最小 scope、OS 資格情報域、Wrangler CLI の既存確定回答 | 実装は既存契約の範囲内。新しい API、DB、認可、配備単位は導入していない |
| specs | `specs/harness-hub-system-specification.md` | Publisher の目的・スコープ・受入基準を変更していない |
| architecture | `architecture/harness-hub-backend.md`、`architecture/harness-hub-security.md` | `apps/publisher` を consumer、Hub API を `feat-publish-pipeline` owner とする既存境界を守った |
| features | `features/feat-publisher-plugin.md` | feature の scope/acceptance は不変。実機未検証は製品要件の変更ではなく実行証跡の未完である |
| tasks | `tasks/feat-publisher-plugin/sys-publisher-plugin-p01.md`〜`p13.md` | content-addressed task spec は「両 OS 実機 E2E」と「初回 publish 15 分実測」を既に要求しており、変更せずに適用する |
| docs | `docs/features/feat-publisher-plugin/` | P07/P10/P11/P13 の誤った合格・close-out 表記を訂正し、実サービスを使う両 OS の証跡が必要と記録した |
| 配布登録簿 | `.claude-plugin/marketplace.json`、`.claude-plugin/bundles.json` | 新 plugin が CI の配布完全性ゲートを通るための append-only 登録。draft PR の未マージ状態を保ち、A1/A3 未達の間は公開開始に使わない |

## 反映した実行状態

- ローカル実装・型検査・19 test files / 110 tests（4 todo）は成功した。最新の再実行では Statements 89.55% / Branches 94.65% / Functions 89.70% / Lines 89.55%、共有層重複検査は 528 ファイルで違反 0 件だった。
- pre-check と Hub 検査の同値性（A2）は充足した。
- fake I/O テストと Windows 手順書は、実サービスを使う E2E や 15 分実測の代替ではない。したがって A1/A3 は未達であり、marketplace 登録依頼を保留する。

## 再開条件

macOS と Windows の各実機で、Hub API、Device Flow のブラウザ認可、Wrangler deploy を含む publish を実行し、
`status=published` と `deployedUrl`、ならびに 15 分以内の実測値を保存する。その後、P06/P07/P10/P11/P13 を
同じ証跡で再判定する。
