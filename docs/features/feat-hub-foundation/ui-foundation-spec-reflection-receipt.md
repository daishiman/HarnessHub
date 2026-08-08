---
status: accepted
layer: feature-spec-reflection
spec_impact: reflected
reviewed_at: 2026-08-08
feature_node_id: feat-hub-foundation
dev_graph_node_id: issue-ui-foundation-final-review-20260808
beads_ids:
  - HarnessHub-tiqw
  - HarnessHub-snlo
  - HarnessHub-xuhj
  - HarnessHub-xaa3
  - HarnessHub-4a2z
---

# UI 基盤・実ブラウザ品質ゲート 仕様反映受領書

## 1. 依頼と目的

上記 5 Beads の実装を最終レビューし、差分・task 仕様・テストを再確認する。実装で具体化した UI 所有境界、画面状態、レスポンシブ値、実ブラウザ/VRT ゲートを正規仕様へ戻し、仕様とコードが別方向へ進むことを防ぐ。

## 2. 結論

- **仕様・設計影響: あり (`reflected`)**。
- `frontend.web`、`ui-ux.web`、`testing-qa.web` を R4-reopen し、qa-201 / qa-203 / qa-204 で再確定した（qa-203 / qa-204 は実装照合で見つけた列挙誤差を append-only で訂正）。
- 公開 API、DB schema、認証認可判定、秘密情報、Cloudflare deploy unit は変更しない。
- 実装レビューで VRT baseline が CPU architecture に依存していた問題を検出し、OS 単位へ修正した。
- 500 行を越えた `ci.yml` から実ブラウザ job を `ui-visual.yml` へ責務分離した。生成正本 (`graph.json` / `spec-state.json`) と lockfile を除く変更対象の手書きファイルは 500 行以下で、repository の Markdown 300 行制約も守る。
- `origin/main` (`fe756872`) を local `main` へ merge (`84552836`) し、その local `main` を本 branch へ merge (`049d0c39`) した。競合は 0 件だった。

## 3. 仕様影響の判断理由

| 観点 | 判断 |
|---|---|
| 単なる内部リファクタリングか | いいえ。共通 AppShell と状態 file を consumer が守る契約になった |
| 数値契約が変わるか | はい。breakpoint 正本を 480 / 768 / 1120 に明確化した |
| 品質ゲートが変わるか | はい。`ci.yml` の G15 と、`ui-visual.yml` の opt-in browser/VRT job を追加した |
| 外部データ契約が変わるか | いいえ。API・DB・認可結果は不変 |

## 4. 正規反映先

| 層 | 反映内容 |
|---|---|
| `system-spec/` | qa-201 / qa-203 / qa-204 と compiled frontend / ui-ux / testing-qa |
| `specs/` | `harness-hub-ui-foundation-addendum.md` |
| `architecture/` | packages/ui owner、apps/hub consumer、browser/VRT 境界 |
| `features/` | feat-hub-foundation の post-closeout UI 基盤追補 |
| `tasks/` | feat-hub-foundation P12 / P13 の追補実行記録 |
| `docs/` | frontend 実装ガイド、QA 追補、本受領書 |
| Beads | 5 issue の最終レビュー・検証・PR 状態を notes へ追記 |

## 5. 実装レビュー結果

### 修正した問題

VRT baseline directory が `${platform}-${arch}` だったため、同じ macOS/Chromium でも arm64 Node と Rosetta x64 Node が別基準として扱われ、基準画像 14 件を「欠落」と誤判定した。baseline key を `process.platform` に変更し、`darwin` directory へ統合した。回帰テストで basename / directory の OS 単位契約を固定した。

### 見た目の確認

catalog の layout-light、data-dark、form-light、chart-dark を画像で確認した。light/dark の文字・面・状態色、長い表の局所スクロール、フォーム操作域に blocking な崩れは無かった。

## 6. 品質ゲート

| ゲート | 結果 |
|---|---|
| task spec validator | pass、violations `[]`、digest `8735bb…`（legacy baseline exemption を明示） |
| UI tests | 14 files / 307 tests PASS |
| Hub tests | 136 files / 1475 pass、10 todo（既存 user-org-admin 範囲） |
| browser tests | 3 files / 33 tests PASS（macOS baseline 14 枚を含む） |
| screen-state gate | root / dashboard / workspace の 3 区分 PASS |
| UI / Hub typecheck | PASS |
| UI / Hub lint | PASS |
| system-spec coverage | `--require-complete` PASS、未収集 0 |
| source citation | PASS |
| repository `pnpm verify` | PASS（build / Worker build / 全 workspace test / tenant / secret / drift / bundle） |
| 今回追加した dev-graph 2 node | 必須見出し・placeholder・frontmatter PASS |
| diff whitespace | `git diff --check` PASS |

`--require-foundation` は今回以前から存在する U1〜U9 source-index 未登録 9 件で FAIL する。原文を捏造して埋めず、既存 debt として残す。通常の complete gate と今回再確定した 3 セルは PASS している。

最新 `main` の強化後 `validate-graph-schema.py` を graph 全体へ実行すると、今回 node 以外の既存 specification / task に必須見出し未移行が残り FAIL する。今回追加した `spec-harness-hub-ui-foundation-addendum` と `issue-ui-foundation-final-review-20260808` は新契約で個別 PASS している。既存 debt の正本は `HarnessHub-o4zi` とし、本 PR へ無関係な文書移行を混ぜない。

## 7. 残課題

1. Linux VRT baseline は GitHub Actions の実 Chromium で初回 actual を取得し、画像確認後に追加する。
2. draft PR merge 前の Beads は in_progress を維持し、merge 後に default branch reconciliation で閉じる。
3. system-spec U1〜U9 source-index の既存欠落は、元の書面・対話原文を特定できる独立 task で扱う。
4. 既存 dev-graph artifact の新必須見出し移行は `HarnessHub-o4zi` で扱う。

## 8. 説明

### 中学生向け

画面を共通の部品で作り、スマホ・タブレット・PC の本物のブラウザで自動点検できるようにした。読み込み中や権限不足のときも、真っ白な画面にせず次に何をすればよいか分かる。

### 専門向け

`packages/ui` を layout/token/base-style の owner とし、App Router の state boundary を `apps/hub` の薄い adapter とした。jsdom に無い layout engine の検査を Playwright-backed Vitest Browser Mode へ分離し、document overflow、tap target、responsive column、OS-scoped pixel baseline を deterministic gate にした。
