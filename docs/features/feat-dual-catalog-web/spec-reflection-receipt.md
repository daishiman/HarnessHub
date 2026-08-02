---
status: confirmed
layer: feature-spec-reflection
beads_id: HarnessHub-dhy
dev_graph_node_id: SYS-DUAL-CATALOG-WEB-P13
recorded_at: 2026-08-01
reconciled_at: 2026-08-02
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
3. main 統合時に QA ID の衝突を検出し、両方の質疑を保全するため `qa-117`、`qa-118`、`qa-119` で各セルを再確定。
4. `qa-111` の共有 Google OAuth と `qa-117` の dual catalog cache をどちらも有効とする security 統合正本 `qa-120` を確定。
5. coverage matrix の complete/foundation 検査と source citation 検査を PASS。
6. compile の単一 writer で `system-spec/` を再生成し、今回と無関係な既存追補は保持。

| QA | 正本 | 受領した契約 |
|---|---|---|
| `qa-117` | `system-spec/security.md` | 非閲覧 failure の stale 禁止、scope 束縛、private/Vary marketplace cache |
| `qa-118` | `system-spec/frontend.md` | 縮退／認可表示境界、scope 切替、submit 単位の一覧取得 |
| `qa-119` | `system-spec/testing-qa.md` | 成功→403、同一／別 scope 503、cache header、要求数の回帰束 |
| `qa-120` | `system-spec/security.md` | 共有 Google OAuth (`qa-111`) と dual catalog cache (`qa-117`) の防御契約を両方維持する現行 security 統合正本 |

### 2.1 main 統合受領 (2026-08-02)

main 側の共有 Google OAuth 仕様が `qa-110`〜`qa-116` を先に使用したため、
dual catalog 側の旧 `qa-110`〜`qa-112` をそのまま複数定義にせず、単一 transition writer の
R4 reopen → confirm で `qa-117`〜`qa-119` へ再登録した。質問・回答・上位ゴールとの対応は変更していない。
さらに security.web の最終参照を `qa-120` とし、先行した `qa-111` と再登録後の
`qa-117` の双方を全面維持することを明示した。
coverage matrix、source citation、compile、Dev Graph source digest の各ゲートで、
共有 OAuth と dual catalog の両仕様が同時に保持されていることを受領した。

### 2.2 本番反映後の CWV 計測不能 (2026-08-02)

PR #628 の main 反映と deploy 成功後、`hub-cwv` を `/catalog` 指定で実行したが、run
`30736055772` は HTTP 401 により Lighthouse 実行で停止した。401 は既存の
deny-by-default（認証情報が無い要求を既定で拒否する設計）どおりであり、catalog の認可、
CWV の閾値、P13 の受入条件を変更する新しい製品仕様ではない。

このため、本追加記録の仕様・設計影響は **なし** と判断した。`system-spec/`、`specs/`、
`architecture/`、`features/`、`tasks/` の正本は更新しない。既存の feature / P13 task は
すでに「CWV は実測値でのみ pass」と定めており、未計測を good としない契約も維持される。
計測用セッション、専用 preview route、認証済みブラウザ実行のいずれを採るかは未決定で、
ここでいずれかを記載すると未承認の設計判断を正本化してしまう。

事実と後続の責務は `docs/features/feat-dual-catalog-web/` の release / QA 記録、および
Beads `HarnessHub-9cgb`（dev-graph node
`issue-hub-cwv-auth-required-route-unmeasurable-20260802`）へ記録した。後続課題で計測経路を
選定・実装するときは、影響する確定セルを R4 reopen し、compile を通して
`system-spec/`・`specs/`・`architecture/`・feature / task projection を同期する。

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
- PR #628 の Hub 全体検査で見つかった fixture 記法の誤検知を是正。実行時データと production 契約は不変のため、追加の仕様 transition は不要と判断した。

## 5. 行数ルール

ユーザー指定の 500 行上限より厳しい repository 規約を採用し、今回追加・変更した
手書きコードと feature 文書はすべて 300 行以下へ分割した。
`system-spec/spec-state.json` と content-addressed generation は writer/schema がファイル単位を規定する
機械正本であり、人手分割すると digest と transaction contract を壊すため分割対象外とする。

## 6. 完了境界と残課題

本受領書は仕様反映の完了を示し、P01〜P13 の完了を示さない。CWV 本番実測、2 社同時稼働、
低品質報告導線、未実装 catalog API、E2E は既存の未完了／他 feature 境界として維持する。
draft PR merge と default branch reconciliation までは Beads と dev-graph を in-progress のままにする。
