---
status: recorded
layer: feature-spec-reflection
spec_impact: reflected
reviewed_at: 2026-08-15
parent_features:
  - feat-demo-coverage-dataset
  - feat-ui-integrity-audit-harness
  - feat-ui-layout-remediation
dev_graph_node_id: issue-ui-integrity-remediation-slice-20260815
beads_ids:
  - HarnessHub-s36m
  - HarnessHub-7xk9
  - HarnessHub-q2n4
  - HarnessHub-wx4h
---

# UI 崩れ縦切り 仕様反映受領書

## 1. 判定

仕様・設計への影響は **あり（reflected）**。

利用者要望は「全画面の崩れ確認」「変な位置での改行を意味の境目で整える」「不要な印刷導線を隠す」「確認用データを入れる」である。これは UI-UX と testing-qa の受入契約、および frontend / design-system / testing-qa の設計記録に触れる。

確定章 `system-spec/ui-ux.md` と `system-spec/testing-qa.md` へ C01 R4-reopen で web セルを差し替えると、既存の qa-226（画面・KPI・図表）と qa-217（production coverage smoke / tier）本文が章から消える。本 MVP ではその破壊的 compile を採用せず、既存確定契約を維持したまま architecture / specs / docs / features へ additive（足し算）に記録する。

## 2. 正規フローの受領

| 領域 | 正本 | 受領した契約 |
|---|---|---|
| 確認用データ | `architecture/harness-hub-testing-qa.md` / `docs/features/feat-demo-coverage-dataset/` | 28 route × 5 状態、適用 105 / 非適用 35、ローカル専用・冪等 seed |
| 監査契約 | 同上 + 本受領書 | route 28 / state 105 / runtime 168 を別母数。0 件は PASS にしない |
| 意味改行 | `architecture/harness-hub-frontend.md` / `architecture/harness-hub-design-system.md` | 完全 label は Hub、改行境界だけ共通 UI |
| 印刷 | 同上 | 製品所有の印刷 Button / `window.print` は 0 件。legal と print stylesheet は残す |
| 操作域 | design-system | compact でもタップ領域は 44px |

## 3. 反映先

- `architecture/`: testing-qa / frontend / design-system の章末 writeback
- `specs/harness-hub-system-specification-implementation-writebacks.md`: 索引
- `features/`: `feat-demo-coverage-dataset` / `feat-ui-integrity-audit-harness` / `feat-ui-layout-remediation`
- `tasks/feat-demo-coverage-dataset/`: P01..P13
- `docs/features/feat-demo-coverage-dataset/` と本ディレクトリ
- `issues/ui-integrity-remediation-slice-20260815.md`

## 4. 確定章へ直接書かなかった理由

1. 確定章の writer は C01 / C03 だけである。`guard-confirmed-chapter-overwrite.py` が直接編集を止める。
2. 作業ツリー上の compile 差分は qa-303 / qa-304 で web セルを置き換え、qa-226 / qa-217 を削除していた。これは仕様後退なので本 PR に含めない。
3. 実行結果（seed 件数、168 キーのうち未到達 144）は設計要件ではなく運用観測なので、architecture 側が正しい置き場である（`HarnessHub-q2n4` 判断 A）。

将来 C01 で取り込む場合は、**既存 web セル契約を残した統合 entry** にすること。追補だけの再確定は章本文を消す。

## 5. 影響なしと判断した境界

- 認証・テナント分離・session 契約
- DB schema / migration（確認用データは既存表への seed のみ）
- 公開 API path 集合
- revision conflict / CAS
- 全ページ印刷の新規実装（`HarnessHub-wx4h`）
- ID 形式（UUIDv4）や一覧ページ送り方式の改訂（別セッションの qa-275。本 PR に混ぜない）

## 6. 検証（MVP 最小）

品質ゲートと focused test の実測は PR 本文と Beads notes に書く。本受領書の機械束縛は commit 後に次で記録する。

```bash
python3 scripts/build-spec-reflection-receipt.py --repo-root . --spec-impact reflected --base origin/main
```

## 7. 残課題

- 認証済み 144 runtime キーの実走（本 worktree に local seed / 認証環境なし）
- 確定章への統合は、qa-226 / qa-217 を消さない C01 経路が必要
