---
status: confirmed
layer: feature-spec-reflection
beads_id: HarnessHub-dhy
dev_graph_node_id: SYS-DUAL-CATALOG-WEB-P13
recorded_at: 2026-08-01
---

# feat-dual-catalog-web 仕様反映受領書

## 1. 判定

仕様・設計への影響は **あり**。

最終レビューで、認証済み `/marketplace.json` が shared cache 可能であったことと、一覧・詳細・
Release 履歴が最新の 401/403/契約不正後にも以前の内容を描画し得たことを確認した。
これは単なる内部実装ではなく、tenant 分離、認可失敗時の UI、Hub 停止時の stale 利用範囲という
製品契約に影響するため、正本への反映が必要と判断した。

## 2. 正規フローの受領

system-spec harness の単一 transition writer を使い、既存契約を次の順に更新した。

1. `security.web`、`frontend.web`、`testing-qa.web` を理由付き R4 reopen。
2. ユーザーの最終レビュー・仕様反映指示を明示承認として、既存契約を全面維持する追補を登録。
3. `qa-110`、`qa-111`、`qa-112` で各セルを再確定。
4. coverage matrix の complete/foundation 検査と source citation 検査を PASS。
5. compile の単一 writer で `system-spec/` を再生成し、今回と無関係な既存追補は保持。

| QA | 正本 | 受領した契約 |
|---|---|---|
| `qa-110` | `system-spec/security.md` | 非閲覧 failure の stale 禁止、scope 束縛、private/Vary marketplace cache |
| `qa-111` | `system-spec/frontend.md` | 縮退／認可表示境界、scope 切替、submit 単位の一覧取得 |
| `qa-112` | `system-spec/testing-qa.md` | 成功→403、同一／別 scope 503、cache header、要求数の回帰束 |

## 3. 反映先

- `system-spec/`: `spec-state.json` と security / frontend / testing-qa
- `specs/`: `spec-dual-catalog-cache-boundary` として登録した cache・認可境界追補
- `architecture/`: frontend / security / testing-qa の実装判断
- `features/`: `feat-dual-catalog-web` の最終レビュー feedback
- `tasks/`: P10 task overlay の最終レビュー追補と P01〜P13 の完了境界
- `docs/`: ADR、test design、implementation、acceptance、QA、evidence、runbook、release、本受領書

## 4. 実装への反映

- 一覧・詳細・Release 履歴の cache を tenant/workspace/project key に束縛。
- 401/403/契約不正では以前の内容を描画せず、同一 scope の degraded のみ stale を許可。
- marketplace を private cache とし、Cookie/tenant/workspace の `Vary` を追加。
- 一覧の draft filter と applied query を分離し、submit 1 回 = request 1 回に修正。
- DC-TEN-06..10、DC-LIST-01、改訂 DC-MKT-07 を回帰テストへ追加。

## 5. 行数ルール

ユーザー指定の 500 行上限より厳しい repository 規約を採用し、今回追加・変更した
手書きコードと feature 文書はすべて 300 行以下へ分割した。
`system-spec/spec-state.json` と content-addressed generation は writer/schema がファイル単位を規定する
機械正本であり、人手分割すると digest と transaction contract を壊すため分割対象外とする。

## 6. 完了境界と残課題

本受領書は仕様反映の完了を示し、P01〜P13 の完了を示さない。CWV 本番実測、2 社同時稼働、
低品質報告導線、未実装 catalog API、E2E は既存の未完了／他 feature 境界として維持する。
draft PR merge と default branch reconciliation までは Beads と dev-graph を in-progress のままにする。
