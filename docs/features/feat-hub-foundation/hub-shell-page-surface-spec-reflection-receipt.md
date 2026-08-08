---
status: accepted
layer: feature-spec-reflection
spec_impact: reflected
reviewed_at: 2026-08-08
feature_node_id: feat-hub-foundation
dev_graph_node_id: issue-hub-shell-page-surface-unification-20260808
beads_ids:
  - HarnessHub-imzk
---

# 共通シェル・全ページ表面 仕様反映受領書

## 1. 依頼と目的

今回変更中の UI shell と全画面表面を最終レビューし、実装、task 仕様、正規仕様、Beads、Dev Graph、公開 PR を同じ契約へ揃える。権限外の導線、取り消せない操作の誤認、画面ごとの見出し・余白・modal 挙動のばらつきを release 前に防ぐ。

## 2. 結論

- **仕様・設計影響: あり (`reflected`)**。
- `frontend.web` と `ui-ux.web` を正規 transition writer で R4-reopen し、qa-206 / qa-207 として再確定した。system-spec state digest は `a9b2b7930df43920ef68b9854c3c0c6473cba5bdfc71596bed4c04a608fbe3d2`。
- `origin/main` (`35a10b87`) を local `main` (`c3e28a3f`) へ反映し、その local `main` を作業 branch へ merge (`d322100c`) した。正しい base `main` 向け draft PR #683 を公開した。
- 公開 API、DB schema、session claim schema、認可の最終判定、Cloudflare deploy unit は変更しない。
- 実装レビューで role token の不一致、member への管理導線露出、破壊操作での汎用 Modal 使用、mobile の「その他」幅、mobile header title 欠落を検出し、修正と回帰テストを追加した。
- 602 行だった catalog 定義は `entries.tsx`、`entries-data.tsx`、`entries-shell.tsx` へ責務分割した。生成正本の `.dev-graph/state/graph.json` / `system-spec/spec-state.json` を除き、変更対象の手書きファイルは 500 行以下である。

## 3. 仕様影響の判断理由

| 観点 | 判断 |
|---|---|
| 単なる内部リファクタリングか | いいえ。全認証後 route の shell、画面見出し、面、mobile navigation を共通契約にした |
| 権限・security 境界が変わるか | API 認可は不変。UI は signed session role から deny-by-default で導線を投影し、権限外導線を DOM に出さない |
| 操作契約が変わるか | はい。破壊操作は `ConfirmDialog`、一般 overlay は `Modal` / `BottomSheet` とし、focus・Esc・復帰・scroll lock を共通化した |
| 外部データ契約が変わるか | いいえ。API、DB、認証 claim の shape は不変 |

## 4. 正規反映先

| 層 | 反映内容 |
|---|---|
| `system-spec/` | qa-206 の HubShell / role-aware navigation、qa-207 の page surface / overlay contract |
| `specs/` | `harness-hub-ui-foundation-addendum.md` の FR-007〜010、NFR、移行・受入条件 |
| `architecture/` | `packages/ui` owner と `apps/hub` consumer、shell / page surface の境界 |
| `features/` | hub foundation と post-signin scope routing の post-closeout 追補 |
| `tasks/` | feat-hub-foundation P12 / P13 の文書化・公開手順追補 |
| `docs/` | frontend 仕様、UI foundation guide、journey、runbook、QA、本受領書 |
| Dev Graph / Beads | issue node と `HarnessHub-imzk` を作業・公開単位として同期 |

## 5. 最終レビューで修正した問題

1. `SessionRole` を実際の `provider-admin / workspace-admin / member` に合わせ、navigation 表示を中央の `ACTION_RULES` 経由にした。
2. role 未確定・member は account のみ、workspace-admin は users / coefficients、provider-admin は auth を追加表示する回帰テストを設けた。
3. sheet 再生成と wizard 中止を、可逆性を必須表示する `ConfirmDialog` へ変更した。
4. `Modal` / `BottomSheet` / `ConfirmDialog` の focus trap、Esc、focus restore、scroll lock、overlay stacking を共通化した。
5. mobile の「その他」を tabbar 全幅で開き、現在 route の title を mobile header に表示する回帰テストを追加した。
6. catalog preview に実際の shell CSS を適用し、分割後も全公開部品の掲載漏れ検査と VRT を維持した。

## 6. 品質ゲート

| ゲート | 結果 |
|---|---|
| task spec: `feat-hub-foundation` | PASS、violations `[]`、digest `8735bb…`、legacy baseline exemption を明示 |
| task spec: `feat-post-signin-scope-routing` | PASS、violations `[]`、digest `ecbd1c…`、contract 1.3.0 |
| `packages/ui` tests | 17 files / 373 tests PASS |
| `apps/hub` tests | 139 files / 1503 pass / 10 todo |
| browser / VRT | 3 files / 33 tests PASS、macOS light/dark baseline と一致 |
| system-spec coverage | `--require-complete` PASS、未収集 0 |
| source citation | PASS |
| repository `pnpm verify` | exit 0。lint、全 workspace typecheck/test、Next/Worker build、auth、tenant、secret、drift、bundle gate を通過 |
| CI-equivalent local gate | 正本 `scripts/run-ci-checks.sh` を手動完走し、139 PASS / 5 段階導入 warning / 0 FAIL |
| diff hygiene | `git diff --check` PASS、競合 marker 0、無関係な `eval-log/review-queue.jsonl` は commit 対象外 |

`--require-foundation` は今回以前の HEAD にも存在する U1〜U9 の `qa_log` 参照欠落 9 件で FAIL する。原文・出典を捏造して直さず、通常の `--require-complete` と今回再確定した qa-206 / qa-207 の正規 gate が PASS することを受領条件とした。local `main` 取込時に production coverage smoke が qa-205 を先に使用していたため、単一 transition writer で UI 契約を qa-206 / qa-207 へ再採番した。

## 7. Beads と公開状態

- `HarnessHub-imzk`: 本変更の実装・仕様・検証・draft PR を追跡し、PR merge までは `in_progress` を維持する。
- 前回 UI 基盤 5 Beads (`tiqw / snlo / xuhj / xaa3 / 4a2z`): PR #679 の `main` merge を確認し、2026-08-08 に closed へ収束した。
- branch: `devgraph/issue-hub-shell-page-surface-unification-20260808`、draft PR: [#683](https://github.com/daishiman/HarnessHub/pull/683)、base: `main`。
- Linux Chromium VRT: 初回 Actions run [#31255679470](https://github.com/daishiman/HarnessHub/actions/runs/31255679470) は旧 baseline との差で FAIL。artifact の light/dark 8 枚を目視し、今回の shell / surface / overlay の意図した表示だけであることを確認して Linux baseline として受領した。更新後の再実行を待つ。
- pre-push の Git hook 文脈だけで `jsonschema` を未導入と誤判定する事象は `HarnessHub-sl6o` に分離した。同一の CI-equivalent gate は手動で 139/139 PASS 後、初回 push のみリポジトリ既定の `PUSH_SKIP_CI=1` を使用し、GitHub CI で再検査する。

## 8. 残課題

1. 更新した Linux Chromium baseline の再実行を PASS で受領する。
2. PR merge 後、`HarnessHub-imzk` と graph node を default branch reconciliation で閉じる。
3. system-spec U1〜U9 の既存 source-index debt は、原文を特定できる独立 task で扱う。
4. pre-push の Python 依存誤判定を `HarnessHub-sl6o` で再現・修復する。

## 9. 説明

### 中学生向け

ログイン後のどの画面でも、同じメニュー、同じ見出し、同じ確認画面を使うようにした。使う人の役割に合わないメニューは最初から見せず、消したら戻せない操作は「本当に実行するか」を分かりやすく確認する。

### 専門向け

`packages/ui` を shell / surface / overlay contract の owner、`apps/hub` を route・scope・session identity の adapter とした。RSC の server-first 境界を維持しつつ、`SessionRole` と中央 `ACTION_RULES` から navigation を deny-by-default 投影する。overlay は共通 focus trap と body scroll lock を持ち、destructive intent を `ConfirmDialog` の型契約で分離した。
