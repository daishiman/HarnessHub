---
status: confirmed
layer: operations
title: 確認用データセット 30 route 到達手順 (SCR-15〜30)
feature_id: feat-demo-coverage-dataset
updated_at: "2026-08-16"
---

# 確認用データセット 30 route 到達手順 (SCR-15〜30)

前半 (SCR-01〜14) は [runbook-route-reach.md](docs/features/feat-demo-coverage-dataset/runbook-route-reach.md) を参照する。

### SCR-15 — `/feedback`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | member | `/feedback` | 子データを持たないテナントで開く | `feedback/open/0001`<br>`feedback/resolved/0001`<br>`tenant/empty/0001` |
| 1 件 | member | `/feedback` | そのまま表示を確認 | `feedback/open/0001`<br>`feedback/resolved/0001`<br>`tenant/main/0001` |
| 大量 | member | `/feedback` | 既定の並び順のまま、DISPLAY_BOUNDARIES を跨ぐ件数まで送る | `feedback/open/0001`<br>`feedback/resolved/0001`<br>`tenant/main/0001` |
| 長文 | member | `/feedback` | そのまま表示を確認 | `feedback/open/0001`<br>`feedback/resolved/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | member | `/feedback` | 停止テナントの資源を要求する | `feedback/open/0001`<br>`feedback/resolved/0001`<br>`tenant/suspended/0001` |

### SCR-16 — `/feedback/new`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | — | — | **非適用 (N2)**: 入力専用画面で、初期表示が常に未入力の 1 状態である | — |
| 1 件 | member | `/feedback/new` | そのまま表示を確認 | `project/active/0001`<br>`tenant/main/0001` |
| 大量 | — | — | **非適用 (N5)**: 単一フォームで、繰り返し要素のページング境界を持たない | — |
| 長文 | member | `/feedback/new` | そのまま表示を確認 | `project/active/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | member | `/feedback/new` | 停止テナントの資源を要求する | `project/active/0001`<br>`tenant/suspended/0001` |

### SCR-17 — `/feedback/[id]`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | — | — | **非適用 (N4)**: 詳細画面は対象 1 件の存在が前提で、不在は「エラー」状態に含める | — |
| 1 件 | member | `/feedback/23RK79TWQSKVKE890HY56KFXDY` | そのまま表示を確認 | `feedback/open/0001`<br>`ai-job/feedback-processing/0001`<br>`tenant/main/0001` |
| 大量 | member | `/feedback/23RK79TWQSKVKE890HY56KFXDY` | 既定の並び順のまま、DISPLAY_BOUNDARIES を跨ぐ件数まで送る | `feedback/open/0001`<br>`ai-job/feedback-processing/0001`<br>`tenant/main/0001` |
| 長文 | member | `/feedback/23RK79TWQSKVKE890HY56KFXDY` | そのまま表示を確認 | `feedback/open/0001`<br>`ai-job/feedback-processing/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | member | `/feedback/23RK79TWQSKVKE890HY56KFXDY` | 停止テナントの資源を要求する | `feedback/open/0001`<br>`ai-job/feedback-processing/0001`<br>`tenant/suspended/0001` |

### SCR-18 — `/metrics`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | member | `/metrics` | 子データを持たないテナントで開く | `metrics-rollup/tenant-daily/0001`<br>`metrics-rollup/harness-weekly/0001`<br>`tenant/empty/0001` |
| 1 件 | member | `/metrics` | そのまま表示を確認 | `metrics-rollup/tenant-daily/0001`<br>`metrics-rollup/harness-weekly/0001`<br>`tenant/main/0001` |
| 大量 | member | `/metrics` | 既定の並び順のまま、DISPLAY_BOUNDARIES を跨ぐ件数まで送る | `metrics-rollup/tenant-daily/0001`<br>`metrics-rollup/harness-weekly/0001`<br>`tenant/main/0001` |
| 長文 | member | `/metrics` | そのまま表示を確認 | `metrics-rollup/tenant-daily/0001`<br>`metrics-rollup/harness-weekly/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | member | `/metrics` | 停止テナントの資源を要求する | `metrics-rollup/tenant-daily/0001`<br>`metrics-rollup/harness-weekly/0001`<br>`tenant/suspended/0001` |

### SCR-19 — `/metrics/usage`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | member | `/metrics/usage` | 子データを持たないテナントで開く | `metrics-event/base/0001`<br>`tenant-coefficient/main/0001`<br>`tenant/empty/0001` |
| 1 件 | member | `/metrics/usage` | そのまま表示を確認 | `metrics-event/base/0001`<br>`tenant-coefficient/main/0001`<br>`tenant/main/0001` |
| 大量 | member | `/metrics/usage` | 既定の並び順のまま、DISPLAY_BOUNDARIES を跨ぐ件数まで送る | `metrics-event/base/0001`<br>`tenant-coefficient/main/0001`<br>`tenant/main/0001` |
| 長文 | member | `/metrics/usage` | そのまま表示を確認 | `metrics-event/base/0001`<br>`tenant-coefficient/main/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | member | `/metrics/usage` | 停止テナントの資源を要求する | `metrics-event/base/0001`<br>`tenant-coefficient/main/0001`<br>`tenant/suspended/0001` |

### SCR-20 — `/sheets`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | member | `/sheets` | 子データを持たないテナントで開く | `hearing-sheet/completed/0001`<br>`hearing-sheet/received/0001`<br>`tenant/empty/0001` |
| 1 件 | member | `/sheets` | そのまま表示を確認 | `hearing-sheet/completed/0001`<br>`hearing-sheet/received/0001`<br>`tenant/main/0001` |
| 大量 | member | `/sheets` | 既定の並び順のまま、DISPLAY_BOUNDARIES を跨ぐ件数まで送る | `hearing-sheet/completed/0001`<br>`hearing-sheet/received/0001`<br>`tenant/main/0001` |
| 長文 | member | `/sheets` | そのまま表示を確認 | `hearing-sheet/completed/0001`<br>`hearing-sheet/received/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | member | `/sheets` | 停止テナントの資源を要求する | `hearing-sheet/completed/0001`<br>`hearing-sheet/received/0001`<br>`tenant/suspended/0001` |

### SCR-21 — `/sheets/new`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | — | — | **非適用 (N2)**: 入力専用画面で、初期表示が常に未入力の 1 状態である | — |
| 1 件 | member | `/sheets/new` | そのまま表示を確認 | `tenant-coefficient/main/0001`<br>`tenant/main/0001` |
| 大量 | — | — | **非適用 (N5)**: 単一フォームで、繰り返し要素のページング境界を持たない | — |
| 長文 | member | `/sheets/new` | そのまま表示を確認 | `tenant-coefficient/main/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | member | `/sheets/new` | 停止テナントの資源を要求する | `tenant-coefficient/main/0001`<br>`tenant/suspended/0001` |

### SCR-22 — `/sheets/[id]`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | — | — | **非適用 (N4)**: 詳細画面は対象 1 件の存在が前提で、不在は「エラー」状態に含める | — |
| 1 件 | member | `/sheets/0JWEE6BZ9X72KHY5ECHPBKWDY6` | そのまま表示を確認 | `hearing-sheet/completed/0001`<br>`hearing-screenshot/main/0001`<br>`tenant/main/0001` |
| 大量 | member | `/sheets/0JWEE6BZ9X72KHY5ECHPBKWDY6` | 既定の並び順のまま、DISPLAY_BOUNDARIES を跨ぐ件数まで送る | `hearing-sheet/completed/0001`<br>`hearing-screenshot/main/0001`<br>`tenant/main/0001` |
| 長文 | member | `/sheets/0JWEE6BZ9X72KHY5ECHPBKWDY6` | そのまま表示を確認 | `hearing-sheet/completed/0001`<br>`hearing-screenshot/main/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | member | `/sheets/0JWEE6BZ9X72KHY5ECHPBKWDY6` | 停止テナントの資源を要求する | `hearing-sheet/completed/0001`<br>`hearing-screenshot/main/0001`<br>`tenant/suspended/0001` |

### SCR-23 — `/users`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | — | — | **非適用 (N7)**: 認証済み利用者が必ず 1 件以上存在するため 0 件が成立しない | — |
| 1 件 | workspace-admin | `/users` | そのまま表示を確認 | `user/workspace-admin/0001`<br>`user/inactive/0001`<br>`tenant/main/0001` |
| 大量 | workspace-admin | `/users` | 既定の並び順のまま、DISPLAY_BOUNDARIES を跨ぐ件数まで送る | `user/workspace-admin/0001`<br>`user/inactive/0001`<br>`tenant/main/0001` |
| 長文 | workspace-admin | `/users` | そのまま表示を確認 | `user/workspace-admin/0001`<br>`user/inactive/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | workspace-admin | `/users` | 停止テナントの資源を要求する | `user/workspace-admin/0001`<br>`user/inactive/0001`<br>`tenant/suspended/0001` |

### SCR-24 — `/users/[id]`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | — | — | **非適用 (N4)**: 詳細画面は対象 1 件の存在が前提で、不在は「エラー」状態に含める | — |
| 1 件 | workspace-admin | `/users/5WMVZRDFGS5XQAJJY933AXS1K2` | そのまま表示を確認 | `user/member/0001`<br>`user-workspace/member/0001`<br>`tenant/main/0001` |
| 大量 | workspace-admin | `/users/5WMVZRDFGS5XQAJJY933AXS1K2` | 既定の並び順のまま、DISPLAY_BOUNDARIES を跨ぐ件数まで送る | `user/member/0001`<br>`user-workspace/member/0001`<br>`tenant/main/0001` |
| 長文 | workspace-admin | `/users/5WMVZRDFGS5XQAJJY933AXS1K2` | そのまま表示を確認 | `user/member/0001`<br>`user-workspace/member/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | workspace-admin | `/users/5WMVZRDFGS5XQAJJY933AXS1K2` | 停止テナントの資源を要求する | `user/member/0001`<br>`user-workspace/member/0001`<br>`tenant/suspended/0001` |

### SCR-25 — `/settings/account`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | — | — | **非適用 (N7)**: 認証済み利用者が必ず 1 件以上存在するため 0 件が成立しない | — |
| 1 件 | member | `/settings/account` | そのまま表示を確認 | `user/member/0001`<br>`user-setting/member/0001`<br>`tenant/main/0001` |
| 大量 | — | — | **非適用 (N5)**: 単一フォームで、繰り返し要素のページング境界を持たない | — |
| 長文 | member | `/settings/account` | そのまま表示を確認 | `user/member/0001`<br>`user-setting/member/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | member | `/settings/account` | 停止テナントの資源を要求する | `user/member/0001`<br>`user-setting/member/0001`<br>`tenant/suspended/0001` |

### SCR-26 — `/settings/notion`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | workspace-admin | `/settings/notion` | 子データを持たないテナントで開く | `notion-integration/url/0001`<br>`tenant/empty/0001` |
| 1 件 | workspace-admin | `/settings/notion` | そのまま表示を確認 | `notion-integration/url/0001`<br>`tenant/main/0001` |
| 大量 | — | — | **非適用 (N5)**: 単一フォームで、繰り返し要素のページング境界を持たない | — |
| 長文 | workspace-admin | `/settings/notion` | そのまま表示を確認 | `notion-integration/url/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | workspace-admin | `/settings/notion` | 停止テナントの資源を要求する | `notion-integration/url/0001`<br>`tenant/suspended/0001` |

### SCR-27 — `/settings/auth`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | provider-admin | `/settings/auth` | 子データを持たないテナントで開く | `idp-connection/active/0001`<br>`idp-connection/disabled/0001`<br>`tenant/empty/0001` |
| 1 件 | provider-admin | `/settings/auth` | そのまま表示を確認 | `idp-connection/active/0001`<br>`idp-connection/disabled/0001`<br>`tenant/main/0001` |
| 大量 | — | — | **非適用 (N5)**: 単一フォームで、繰り返し要素のページング境界を持たない | — |
| 長文 | provider-admin | `/settings/auth` | そのまま表示を確認 | `idp-connection/active/0001`<br>`idp-connection/disabled/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | provider-admin | `/settings/auth` | 停止テナントの資源を要求する | `idp-connection/active/0001`<br>`idp-connection/disabled/0001`<br>`tenant/suspended/0001` |

### SCR-28 — `/settings/coefficients`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | workspace-admin | `/settings/coefficients` | 子データを持たないテナントで開く | `tenant-coefficient/main/0001`<br>`metrics-rollup/tenant-daily/0001`<br>`tenant/empty/0001` |
| 1 件 | workspace-admin | `/settings/coefficients` | そのまま表示を確認 | `tenant-coefficient/main/0001`<br>`metrics-rollup/tenant-daily/0001`<br>`tenant/main/0001` |
| 大量 | workspace-admin | `/settings/coefficients` | 既定の並び順のまま、DISPLAY_BOUNDARIES を跨ぐ件数まで送る | `tenant-coefficient/main/0001`<br>`metrics-rollup/tenant-daily/0001`<br>`tenant/main/0001` |
| 長文 | workspace-admin | `/settings/coefficients` | そのまま表示を確認 | `tenant-coefficient/main/0001`<br>`metrics-rollup/tenant-daily/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | workspace-admin | `/settings/coefficients` | 停止テナントの資源を要求する | `tenant-coefficient/main/0001`<br>`metrics-rollup/tenant-daily/0001`<br>`tenant/suspended/0001` |

### SCR-29 — `/settings/system`

配色の採用状況。行数は配色 × 明るさで上限が決まるが、母数 (利用者数) は件数で動くため 5 状態すべてを見る。

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | provider-admin | `/settings/system` | 子データを持たないテナントで開く | `user-setting/provider-admin/0001`<br>`user-setting/member/0001`<br>`tenant/empty/0001` |
| 1 件 | provider-admin | `/settings/system` | そのまま表示を確認 | `user-setting/provider-admin/0001`<br>`user-setting/member/0001`<br>`tenant/main/0001` |
| 大量 | provider-admin | `/settings/system` | 既定の並び順のまま、DISPLAY_BOUNDARIES を跨ぐ件数まで送る | `user-setting/provider-admin/0001`<br>`user-setting/member/0001`<br>`tenant/main/0001` |
| 長文 | provider-admin | `/settings/system` | そのまま表示を確認 | `user-setting/provider-admin/0001`<br>`user-setting/member/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | provider-admin | `/settings/system` | 停止テナントの資源を要求する | `user-setting/provider-admin/0001`<br>`user-setting/member/0001`<br>`tenant/suspended/0001` |

### SCR-30 — `/tracking`

週次の実行回数と削減効果。集計画面なので `/metrics/usage` (SCR-19) と同じ形で 5 状態を割り当てる。

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | member | `/tracking` | 子データを持たないテナントで開く | `metrics-event/base/0001`<br>`tenant-coefficient/main/0001`<br>`tenant/empty/0001` |
| 1 件 | member | `/tracking` | そのまま表示を確認 | `metrics-event/base/0001`<br>`tenant-coefficient/main/0001`<br>`tenant/main/0001` |
| 大量 | member | `/tracking` | 既定の並び順のまま、DISPLAY_BOUNDARIES を跨ぐ件数まで送る | `metrics-event/base/0001`<br>`tenant-coefficient/main/0001`<br>`tenant/main/0001` |
| 長文 | member | `/tracking` | そのまま表示を確認 | `metrics-event/base/0001`<br>`tenant-coefficient/main/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | member | `/tracking` | 停止テナントの資源を要求する | `metrics-event/base/0001`<br>`tenant-coefficient/main/0001`<br>`tenant/suspended/0001` |


## 5. 手順をなぞって確認した記録

本 runbook の作成にあたり、記載した手順を実際に実行して確認した。実測日 2026-08-16。

| # | なぞった手順 | 結果 |
|---|---|---|
| 1 | §2.1 の投入コマンド | 終了コード 0 / 36 テーブル 639 件を投入 |
| 2 | §2.3 の拒否確認 (`libsql://`) | 終了コード **2** / 「seed-coverage はローカル DB 専用です」 |
| 3 | §2.4 の対応表検査 | 終了コード 0 / 「未カバー 0 件」 |
| 4 | §4 の到達手順の生成 | 正本 `coverage-matrix.ts` から 28 route 全件を生成。手書き 0 件 |
| 5 | actor 別の監査用 session 発行 | 終了コード 0 / `member`・`workspace-admin`・`provider-admin` の3主体を demo/main 所属と照合し、Cookie値を記録せず発行 |
| 6 | actor 別 session を使った実 Next route 監査 | 168 キー要求 / 168 キー実行 / 到達不能 0 / UI 違反 0 |

実ブラウザ監査の 168 キーは 28 route × 3 viewport × 2 theme の表示軸であり、§4 の 140 state cell（適用 105 / 非適用 35）とは別の母数である。168 キーはすべて実走したが、適用 105 state cell の全状態を個別に実走したという意味ではない。本 runbook が保証する state 側の範囲は「到達手順が対応表と一致し、指す fixture が seed に実在すること」までであり、§2.4 の検査が担保する。

## 6. 困ったとき

| 症状 | 対処 |
|---|---|
| vitest が `@rollup/rollup-darwin-x64` を要求して落ちる | 既定の node が x64 スライスで起動している。arm64 の node で vitest を起動する |
| seed が終了コード 2 で止まる | 渡した URL がローカルでない。`file:` / `http://127.0.0.1` / `http://localhost` のいずれかにする (§2.3) |
| 画面にデータが出ない | seed 済みか確認する。§2.4 の検査が終了コード 0 なら表と fixture の対応は健全なので、DB の接続先を疑う |
| 表示が前回と違う | seed は冪等なので、同じ DB で再実行して差が出ることはない。DB を作り直して §2.1 からやり直す |
| 対応表と画面が食い違う | 画面が増減した可能性がある。`route-state-matrix.md` と `coverage-matrix.ts` を更新し、§2.4 の検査を通す |

## 7. 参照

- 対応表 (正本): `packages/db/scripts/demo-coverage/coverage-matrix.ts`
- 対応表 (文書): `route-state-matrix.md`
- エビデンス索引: `evidence/index.md`
- 投入 CLI: `packages/db/scripts/seed-coverage.ts`
- 検査 CLI: `packages/db/scripts/verify-demo-coverage-matrix.ts`
