---
status: confirmed
layer: operations
title: 確認用データセット 30 route 到達手順
feature_id: feat-demo-coverage-dataset
updated_at: "2026-08-15"
---

## 4. 手順 B — 30 route × 5 状態への到達

各表の読み方: **役割**でサインインし、**開く URL** を開き、**操作**を行うと、その状態の画面になる。**必要な fixture** はその状態を成立させているデータ行で、seed 済みなら必ず存在する (存在しなければ §2.4 の検査が落ちる)。

URL の動的部分 (テナント・ID) は決定論 ID へ解決済みのため、そのまま貼り付けて開ける。

### SCR-01 — `/`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | — | — | **非適用 (N1)**: 静的コンテンツのみで、件数に依存する表示を持たない | — |
| 1 件 | — | — | **非適用 (N1)**: 静的コンテンツのみで、件数に依存する表示を持たない | — |
| 大量 | — | — | **非適用 (N1)**: 静的コンテンツのみで、件数に依存する表示を持たない | — |
| 長文 | — | — | **非適用 (N1)**: 静的コンテンツのみで、件数に依存する表示を持たない | — |
| エラー | anonymous | `/` | 停止テナントの資源を要求する | `tenant/main/0001`<br>`tenant/suspended/0001` |

### SCR-02 — `/[tenant_slug]/signin`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | — | — | **非適用 (N2)**: 入力専用画面で、初期表示が常に未入力の 1 状態である | — |
| 1 件 | anonymous | `/demo/signin` | そのまま表示を確認 | `tenant/main/0001`<br>`idp-connection/active/0001`<br>`tenant/main/0001` |
| 大量 | — | — | **非適用 (N1)**: 静的コンテンツのみで、件数に依存する表示を持たない | — |
| 長文 | — | — | **非適用 (N1)**: 静的コンテンツのみで、件数に依存する表示を持たない | — |
| エラー | anonymous | `/demo/signin` | 停止テナントの資源を要求する | `tenant/main/0001`<br>`idp-connection/active/0001`<br>`tenant/suspended/0001` |

### SCR-03 — `/device`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | — | — | **非適用 (N2)**: 入力専用画面で、初期表示が常に未入力の 1 状態である | — |
| 1 件 | anonymous | `/device` | そのまま表示を確認 | `device-authorization/pending/0001`<br>`tenant/main/0001` |
| 大量 | — | — | **非適用 (N1)**: 静的コンテンツのみで、件数に依存する表示を持たない | — |
| 長文 | — | — | **非適用 (N1)**: 静的コンテンツのみで、件数に依存する表示を持たない | — |
| エラー | anonymous | `/device` | 停止テナントの資源を要求する | `device-authorization/pending/0001`<br>`tenant/suspended/0001` |

### SCR-04 — `/legal`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | — | — | **非適用 (N1)**: 静的コンテンツのみで、件数に依存する表示を持たない | — |
| 1 件 | — | — | **非適用 (N1)**: 静的コンテンツのみで、件数に依存する表示を持たない | — |
| 大量 | — | — | **非適用 (N1)**: 静的コンテンツのみで、件数に依存する表示を持たない | — |
| 長文 | anonymous | `/legal` | そのまま表示を確認 | `document/common-published/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | — | — | **非適用 (N3)**: データ取得を伴わないため取得失敗・権限不足・未同期が発生しない | — |

### SCR-05 — `/dashboard`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | member | `/dashboard` | 子データを持たないテナントで開く | `metrics-rollup/tenant-daily/0001`<br>`build/hearing/0001`<br>`tenant/empty/0001` |
| 1 件 | member | `/dashboard` | そのまま表示を確認 | `metrics-rollup/tenant-daily/0001`<br>`build/hearing/0001`<br>`tenant/main/0001` |
| 大量 | member | `/dashboard` | 既定の並び順のまま、DISPLAY_BOUNDARIES を跨ぐ件数まで送る | `metrics-rollup/tenant-daily/0001`<br>`build/hearing/0001`<br>`tenant/main/0001` |
| 長文 | member | `/dashboard` | そのまま表示を確認 | `metrics-rollup/tenant-daily/0001`<br>`build/hearing/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | member | `/dashboard` | 停止テナントの資源を要求する | `metrics-rollup/tenant-daily/0001`<br>`build/hearing/0001`<br>`tenant/suspended/0001` |

### SCR-06 — `/catalog`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | member | `/catalog` | 子データを持たないテナントで開く | `project/active/0001`<br>`catalog-entry/workspace/0001`<br>`tenant/empty/0001` |
| 1 件 | member | `/catalog` | そのまま表示を確認 | `project/active/0001`<br>`catalog-entry/workspace/0001`<br>`tenant/main/0001` |
| 大量 | member | `/catalog` | 既定の並び順のまま、DISPLAY_BOUNDARIES を跨ぐ件数まで送る | `project/active/0001`<br>`catalog-entry/workspace/0001`<br>`tenant/main/0001` |
| 長文 | member | `/catalog` | そのまま表示を確認 | `project/active/0001`<br>`catalog-entry/workspace/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | member | `/catalog` | 停止テナントの資源を要求する | `project/active/0001`<br>`catalog-entry/workspace/0001`<br>`tenant/suspended/0001` |

### SCR-07 — `/catalog/[projectId]`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | — | — | **非適用 (N4)**: 詳細画面は対象 1 件の存在が前提で、不在は「エラー」状態に含める | — |
| 1 件 | member | `/catalog/5MESXC670Q78A7MMMDXZVH3S6S` | そのまま表示を確認 | `project/active/0001`<br>`release/available/0001`<br>`tenant/main/0001` |
| 大量 | member | `/catalog/5MESXC670Q78A7MMMDXZVH3S6S` | 既定の並び順のまま、DISPLAY_BOUNDARIES を跨ぐ件数まで送る | `project/active/0001`<br>`release/available/0001`<br>`tenant/main/0001` |
| 長文 | member | `/catalog/5MESXC670Q78A7MMMDXZVH3S6S` | そのまま表示を確認 | `project/active/0001`<br>`release/available/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | member | `/catalog/5MESXC670Q78A7MMMDXZVH3S6S` | 停止テナントの資源を要求する | `project/active/0001`<br>`release/available/0001`<br>`tenant/suspended/0001` |

### SCR-08 — `/catalog/publish`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | — | — | **非適用 (N2)**: 入力専用画面で、初期表示が常に未入力の 1 状態である | — |
| 1 件 | workspace-admin | `/catalog/publish` | そのまま表示を確認 | `publish-request/ready/0001`<br>`target-channel/skill/0001`<br>`tenant/main/0001` |
| 大量 | — | — | **非適用 (N5)**: 単一フォームで、繰り返し要素のページング境界を持たない | — |
| 長文 | workspace-admin | `/catalog/publish` | そのまま表示を確認 | `publish-request/ready/0001`<br>`target-channel/skill/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | workspace-admin | `/catalog/publish` | 停止テナントの資源を要求する | `publish-request/ready/0001`<br>`target-channel/skill/0001`<br>`tenant/suspended/0001` |

### SCR-09 — `/catalog/releases`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | workspace-admin | `/catalog/releases` | 子データを持たないテナントで開く | `release/available/0001`<br>`release/deprecated/0001`<br>`tenant/empty/0001` |
| 1 件 | workspace-admin | `/catalog/releases` | そのまま表示を確認 | `release/available/0001`<br>`release/deprecated/0001`<br>`tenant/main/0001` |
| 大量 | workspace-admin | `/catalog/releases` | 既定の並び順のまま、DISPLAY_BOUNDARIES を跨ぐ件数まで送る | `release/available/0001`<br>`release/deprecated/0001`<br>`tenant/main/0001` |
| 長文 | workspace-admin | `/catalog/releases` | そのまま表示を確認 | `release/available/0001`<br>`release/deprecated/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | workspace-admin | `/catalog/releases` | 停止テナントの資源を要求する | `release/available/0001`<br>`release/deprecated/0001`<br>`tenant/suspended/0001` |

### SCR-10 — `/builds`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | member | `/builds` | 子データを持たないテナントで開く | `build/hearing/0001`<br>`build-stage-event/initial/0001`<br>`tenant/empty/0001` |
| 1 件 | member | `/builds` | そのまま表示を確認 | `build/hearing/0001`<br>`build-stage-event/initial/0001`<br>`tenant/main/0001` |
| 大量 | member | `/builds` | 既定の並び順のまま、DISPLAY_BOUNDARIES を跨ぐ件数まで送る | `build/hearing/0001`<br>`build-stage-event/initial/0001`<br>`tenant/main/0001` |
| 長文 | member | `/builds` | そのまま表示を確認 | `build/hearing/0001`<br>`build-stage-event/initial/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | member | `/builds` | 停止テナントの資源を要求する | `build/hearing/0001`<br>`build-stage-event/initial/0001`<br>`tenant/suspended/0001` |

### SCR-11 — `/docs`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | member | `/docs` | 子データを持たないテナントで開く | `document/tenant-published/0001`<br>`document/tenant-draft/0001`<br>`tenant/empty/0001` |
| 1 件 | member | `/docs` | そのまま表示を確認 | `document/tenant-published/0001`<br>`document/tenant-draft/0001`<br>`tenant/main/0001` |
| 大量 | member | `/docs` | 既定の並び順のまま、DISPLAY_BOUNDARIES を跨ぐ件数まで送る | `document/tenant-published/0001`<br>`document/tenant-draft/0001`<br>`tenant/main/0001` |
| 長文 | member | `/docs` | そのまま表示を確認 | `document/tenant-published/0001`<br>`document/tenant-draft/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | member | `/docs` | 停止テナントの資源を要求する | `document/tenant-published/0001`<br>`document/tenant-draft/0001`<br>`tenant/suspended/0001` |

### SCR-12 — `/docs/new`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | — | — | **非適用 (N2)**: 入力専用画面で、初期表示が常に未入力の 1 状態である | — |
| 1 件 | member | `/docs/new` | そのまま表示を確認 | `document/tenant-draft/0001`<br>`tenant/main/0001` |
| 大量 | — | — | **非適用 (N5)**: 単一フォームで、繰り返し要素のページング境界を持たない | — |
| 長文 | member | `/docs/new` | そのまま表示を確認 | `document/tenant-draft/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | member | `/docs/new` | 停止テナントの資源を要求する | `document/tenant-draft/0001`<br>`tenant/suspended/0001` |

### SCR-13 — `/docs/[id]`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | — | — | **非適用 (N4)**: 詳細画面は対象 1 件の存在が前提で、不在は「エラー」状態に含める | — |
| 1 件 | member | `/docs/07JBX1XEMRY7QAEX3C2BZ8HXBM` | そのまま表示を確認 | `document/tenant-published/0001`<br>`tenant/main/0001` |
| 大量 | — | — | **非適用 (N6)**: 単一ドキュメントの表示・編集で、一覧のページング境界を持たない | — |
| 長文 | member | `/docs/07JBX1XEMRY7QAEX3C2BZ8HXBM` | そのまま表示を確認 | `document/tenant-published/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | member | `/docs/07JBX1XEMRY7QAEX3C2BZ8HXBM` | 停止テナントの資源を要求する | `document/tenant-published/0001`<br>`tenant/suspended/0001` |

### SCR-14 — `/docs/[id]/edit`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | — | — | **非適用 (N4)**: 詳細画面は対象 1 件の存在が前提で、不在は「エラー」状態に含める | — |
| 1 件 | member | `/docs/07JBX1XEMRY7QAEX3C2BZ8HXBM/edit` | そのまま表示を確認 | `document/tenant-published/0001`<br>`tenant/main/0001` |
| 大量 | — | — | **非適用 (N6)**: 単一ドキュメントの表示・編集で、一覧のページング境界を持たない | — |
| 長文 | member | `/docs/07JBX1XEMRY7QAEX3C2BZ8HXBM/edit` | そのまま表示を確認 | `document/tenant-published/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | member | `/docs/07JBX1XEMRY7QAEX3C2BZ8HXBM/edit` | 停止テナントの資源を要求する | `document/tenant-published/0001`<br>`tenant/suspended/0001` |

後半 (SCR-15〜30) は [runbook-route-reach-part2.md](docs/features/feat-demo-coverage-dataset/runbook-route-reach-part2.md) を参照する。
