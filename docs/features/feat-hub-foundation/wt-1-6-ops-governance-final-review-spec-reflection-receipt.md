---
status: confirmed
layer: feature-spec-reflection
wave: wt-1-6-ops-governance-final-review-20260812
beads_ids:
  - HarnessHub-j7a4
  - HarnessHub-jab2
  - HarnessHub-mfh7
  - HarnessHub-9am.3
  - HarnessHub-alyy
  - HarnessHub-ydf8
  - HarnessHub-7mc6
dev_graph_node_ids:
  - issue-doc-internal-link-integrity-gate-20260811
  - issue-dolt-remote-push-http-400-20260812
  - issue-session-cookie-workspace-ids-ceiling-20260812
  - issue-docs-master-detail-layout-20260812
  - issue-ui-vrt-linux-baseline-20260811
  - SYS-BUILD-PIPELINE-BOARD-P03
recorded_at: 2026-08-12
---

# wt-1-6 最終レビュー 仕様反映受領書

## 1. 判定

**製品の確定章契約（API / DB / 認可 / 画面状態機械）は変更なし。**
索引と architecture への **ポインタ反映のみ** を行い、機械受領書は
`--spec-impact reflected` とする（`system-spec/index.md` と
`architecture/harness-hub-dev-workflow.md` を更新したため）。

本 wave は次の 3 種に限る。

1. **開発品質ゲート・運用導線**（文書内リンク lint、VRT baseline 更新経路、Beads Dolt ref 初期化）
2. **既確定設計の着地記録**（S15 master-detail 不採用、P03 design review ↔ landed ADR）
3. **測定の固定と後続分離**（session cookie 所属数上限の unit 測定、方式変更は `HarnessHub-oewu`）

## 2. 判断理由（なぜ確定章本文を改訂しないか）

| 変更 | 理由 |
|---|---|
| doc-internal-link-integrity | repo 内 Markdown の参照健全性ゲート。製品 API / 画面契約を変えない |
| Dolt push 400 恒久化 | Beads 同期の clone 初期化。Hub runtime 契約外 |
| VRT update_baseline | CI 運用手順の安全化。UI 契約・見た目の正本は別 issue |
| session cookie ceiling test | qa-036 / R4-reopen が既に「cookie 肥大を受容」と確定済み。今回は 95 件境界の **測定固定のみ** |
| S15 master-detail 不採用 | 情報設計 sheet（`docs/features/feat-docs-cms/information-design/S15.md`）が SSOT。system-spec の「S15 一覧/閲覧/編集」と矛盾しない |
| P03 design review | landed ADR（PR #694）が既に main 正本。記録の supersede 関係だけを固定 |

## 3. 反映した文書（docs / features / tasks / system-spec / architecture）

| 領域 | path | 内容 |
|---|---|---|
| docs | `docs/beads-operations-runbook.md` | Dolt baseline の診断・`bd bootstrap`・installer 補完 |
| docs | `docs/features/feat-docs-cms/information-design/S15.md` | master-detail 不採用の決着文面 |
| docs | `docs/features/feat-build-pipeline-board/design-review-notes.md` | F-2 解決境界の明確化 |
| docs | 本受領書 | 仕様影響の判断根拠 |
| features | `features/feat-docs-cms.md` ほか | 各 feature への着地メモ |
| tasks | `tasks/feat-build-pipeline-board/sys-build-pipeline-board-p0{1..13}.md` | P01〜P03 done reconciliation 等 |
| issues | 各 issue artifact | status / completion_evidence の整合 |
| architecture | `architecture/harness-hub-dev-workflow.md` | ゲート / Dolt baseline の非製品追記 |
| system-spec | `system-spec/index.md` | 実装 writeback 索引へ 1 行追加（確定章本文は非変更） |
| specs | （変更なし） | 新規製品契約なし |

## 4. 検証（MVP 最小）

- `pytest tests/scripts-root/test_root__lint_doc_internal_link_integrity.py tests/scripts-root/test_root__validate_git_hooks_wiring.py` → 74 passed
- `python3 scripts/lint-doc-internal-link-integrity.py --max-violations 354 --ratchet-base origin/main` → OK（新規 fingerprint 0）
- `python3 scripts/lint-doc-line-limit.py --ratchet-base origin/main` → OK
- vitest: session-cookie-ceiling / browser-harness-optin → 8 passed

## 5. 残課題（本 PR 外）

- `HarnessHub-wenp`: dangling 354 fingerprint を 0 へ縮退
- `HarnessHub-76im`: OR-003 残置 195 件の一括 reconcile
- `HarnessHub-7mc6`: Linux VRT baseline 画像そのものの更新と目視
- `HarnessHub-oewu`: session claims 方式変更で所属数上限を撤廃
- `HarnessHub-9am.4` 以降: パイプラインボード実装フェーズ
- `HarnessHub-a7tk`: 共通 client bundle 土台の分解

## 6. 完了境界

本受領書は **本 branch の最終レビュー + 仕様影響判定 + 文書反映** の完了を示す。
Beads の durable close と draft PR merge 後の graph reconciliation は別手順。
