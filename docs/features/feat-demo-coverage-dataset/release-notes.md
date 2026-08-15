---
status: confirmed
layer: operations
---

# リリースノート / close-out receipt (feat-demo-coverage-dataset / P13)

本 feature の完了を確定する記録である。**実デプロイは行っていない。行わないことが正しい**という判定と、その根拠をここに残す。あわせて後続 feature `feat-ui-integrity-audit-harness` が本成果物を前提にできる状態になったことを確認する。

- 判定日: 2026-08-15
- 判定: **close-out (実デプロイなし)**
- feature: `feat-demo-coverage-dataset` (macro feature / P01〜P13)

## 1. 「本番・staging への配布物を持たない」判定と、その根拠

goal-spec の scope_out は「本番・staging データベースへの投入 (ローカル専用ガードを緩めない)」を明記している。本 feature がその通りに実装されている、つまり**デプロイすべき物が実在しない**ことを、文書の記述ではなく次の 4 点の実測で確認した。

| # | 何を確かめたか | 実測結果 |
|---|---|---|
| R-1 | Hub Worker の配布対象に本 feature のコードが含まれないか | `apps/hub/wrangler.jsonc` の配布対象は `main: src/worker.ts` と `assets` のみ。本 feature の成果物は `packages/db/scripts/` 配下にあり、いずれにも含まれない |
| R-2 | CI/CD が本 feature のコマンドを呼ばないか | `.github/workflows/` 配下に `seed-coverage` の参照 0 件。デプロイ job から起動される経路が存在しない |
| R-3 | 配布用の npm script として登録されていないか | `packages/db/package.json` の scripts に `seed-coverage` の登録なし (`tsx` で直接実行する開発者向けツール) |
| R-4 | 万一実行されても本番へ届かないか | `seed-coverage.ts` は `file:` / `127.0.0.1` / `localhost` 以外の URL を **exit 2 で拒否**する。`libsql://harness-hub-prod.turso.io` を渡した実測で拒否を確認済み (P12 runbook §2.3) |

R-1〜R-3 は「デプロイパイプラインに載っていない」ことを示し、R-4 は「載ってしまっても本番 DB を書き換えられない」ことを示す。前者だけだと将来 CI に追加された瞬間に前提が崩れるため、**多重に**確認している。

したがって本 feature に対して、Cloudflare Workers への deploy、DB migration の適用、環境変数・secret の追加といったリリース作業は**いずれも不要**である。既存デプロイパイプラインへの変更も行っていない。

### ロールバック方針

本 feature は配布物を持たないため、通常の意味でのロールバック対象がない。ロールバックが必要になるのは「実は配布物を持っていた」と後から判明した場合であり、そのときは本ファイルに判定誤りを追記したうえで、`feat-hub-foundation` の既存デプロイパイプラインのロールバック手順に従い、原因となった task を dev-graph へ差し戻す。

## 2. close-out の前提条件 (P01〜P12 の全成果物)

| phase | 成果物 | 状態 |
|---|---|---|
| P01 | `requirements-baseline.md` | 有 |
| P02 | `architecture-decision-record.md` | 有 |
| P03 | `design-review-notes.md` | 有 |
| P04 | `test-design.md` | 有 |
| P05 | `route-state-matrix.md` + 実装 (`packages/db/scripts/demo-coverage/`) | 有 |
| P06 | `test-run-report.md` | 有 |
| P07 | `acceptance-report.md` | 有 |
| P08 | `refactoring-migration-note.md` (migration 不要と確定) | 有 |
| P09 | `quality-assurance-report.md` | 有 |
| P10 | `final-review-notes.md` (3 constraint 全件充足・差し戻し 0 件) | 有 |
| P11 | `evidence/index.md` (参照 14 件 / 参照切れ 0 件) | 有 |
| P12 | `runbook.md` (28 route 全件の到達手順) | 有 |

未完了・保留の phase はない。品質面の最終判定は `final-review-notes.md`、証拠の索引は `evidence/index.md` が正本である。

## 3. 後続 feature への引き継ぎ確認

`feat-ui-integrity-audit-harness` (実ブラウザで UI 崩れを検査するハーネス) が、本 feature の成果物を前提データとして参照できる状態になったことを確認した。

| 確認項目 | 参照先 | 状態 |
|---|---|---|
| 前提データの投入手順が人手でなぞれる | [`runbook.md`](runbook.md) §2 | 可 (投入 exit 0 / 35 テーブル 637 件を実測) |
| 28 route × 5 状態の到達手順が機械可読 | `packages/db/scripts/demo-coverage/coverage-matrix.ts` | 可 (140 セル = 適用 105 + 非適用 35 + 未割当 0) |
| 到達手順が指す fixture が実在する | `verify-demo-coverage-matrix.ts` (exit 0 /「未カバー 0 件」) | 可 |
| 監査を繰り返しても前提データが変動しない | 冪等性検査 (P06 T3 / P09 G6) | 可 |
| 保証しない範囲が明示されている | [`final-review-notes.md`](final-review-notes.md) §5 | 可 |

**引き継ぎ時に必ず読むべき境界**: 本 feature は「到達手順とデータが揃っていること」までを保証し、**画面を実際に開いて崩れがないこと**は保証しない。後者の判定は `feat-ui-integrity-audit-harness` の責務である。

## 4. 仕様・アーキテクチャへの writeback

qa-236 の実行結果・確定した設計判断・改善知見の writeback について、記録先の扱いを分けた。

| 対象 | 状態 | 内容 |
|---|---|---|
| `architecture/harness-hub-testing-qa.md` | **完了** | 「2026-08-15 確認用データセットの実装結果 writeback」節を追記。実装物一覧・実測値・設計判断として固定した 3 点 (route 一覧を自動導出しない / 非適用理由記号 N1〜N7 / 保証範囲の境界)・後続への前提提供を記載。既存記述の削除 0 件 |
| `system-spec/testing-qa.md` | **未実施 (権限外)** | 下記の理由により本 task では書き込まない |

### system-spec/testing-qa.md へ直接書き込まなかった理由

`system-spec/testing-qa.md` は `status: confirmed` の**確定章**であり、次の 2 つの仕組みで直接編集が禁じられている。

1. 確定章への書込経路は C01 (`apply-spec-transition.py`) と C03 (`compile-spec-doc.py`) の**単一 writer** に一本化されている。他経路からの書込は契約違反である。
2. `guard-confirmed-chapter-overwrite.py` (C11 hook) が、確定章への `Write`/`Edit` を fail-closed (exit 2) で遮断する。

確定章を書き換えるには C01 の R4-reopen で当該セルを再オープンし、再ヒアリング → 再確定 → C03 で章を再生成する必要がある。しかし本 task が持ち込む内容は**実行結果と実装知見**であり、仕様の確定内容そのものの変更ではない。実行結果を書くために確定セルを一度 `未収集` へ巻き戻すのは、確定状態の保全という仕組みの目的に照らして割に合わない。

そこで本 task は、architecture 側 (`harness-hub-testing-qa.md`) の qa-236 参照索引節の直後へ実行結果を記録した。architecture 文書は C02 (`upsert-node.py`) が単一 writer であり、本 task はこの正規経路で書き込んでいる。

**この判断により、P13 の rubric (2)「system-spec/testing-qa.md への writeback が完了している」は未達のままである。** 握り潰さず follow-up として起票した (Beads `HarnessHub-q2n4` / `issues/spec-writeback-qa236-20260815.md`)。そこで「spec 側は不要と判断して記録する」か「C01 R4-reopen → 再確定 → C03 compile の正規手順で反映する」かに決着させる。

## 5. 検証

```bash
python3 plugins/system-dev-planner/scripts/validate-system-plan.py \
  --repo-root . --feature-package feature-package/feat-demo-coverage-dataset
```

実測 (2026-08-15): exit 0 / `violations: []`。

## 6. 参照

- [runbook (投入と 28 route × 5 状態への到達手順)](runbook.md)
- [エビデンス索引](evidence/index.md)
- [最終独立レビュー](final-review-notes.md)
- [architecture/harness-hub-testing-qa.md](../../../architecture/harness-hub-testing-qa.md)
- [system-spec/testing-qa.md (qa-236・確定章)](../../../system-spec/testing-qa.md)
