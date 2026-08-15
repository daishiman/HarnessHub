---
status: confirmed
layer: operations
---

# 運用手順書 (runbook) — デモデータの投入と 28 route × 5 状態への到達 (feat-demo-coverage-dataset / P12)

本 feature が用意したデモデータを手元へ投入し、対象 28 画面それぞれについて **空 / 1 件 / 大量 / 長文 / エラー** の 5 状態を目視確認するための手順書である。実ブラウザ検査を行う後続 feature `feat-ui-integrity-audit-harness` の担当者、および人手で画面を確認する担当者を読者に想定している。

- 作成日: 2026-08-15
- 前提: `evidence/index.md` (P11) が参照切れ 0 件
- **§4 の到達手順は `packages/db/scripts/demo-coverage/coverage-matrix.ts` から生成したものである。** 手で書き写すと表と手順書が別々に育ち、どちらが正しいか分からなくなるため、正本は常に対応表とする。

## 1. 前提と用語

| 語 | 意味 |
|---|---|
| seed (シード) | 空の DB へ検査用のデータをまとめて流し込むこと。ここでは `seed-coverage.ts` の実行を指す |
| 5 状態 | 空 (`empty`) / 1 件 (`single`) / 大量 (`bulk`) / 長文 (`longText`) / エラー (`error`) |
| 非適用 | その画面ではその状態が原理的に起きないこと。理由記号 N1〜N7 が付く (§3) |
| fixture (フィクスチャ) | 状態を成立させるために必要な特定のデータ行。論理キー (例 `tenant/main/0001`) で指す |
| 論理キー | データ行を人が読める形で指す名前。決定論 ID へ 1 対 1 で対応し、何度 seed しても同じ行を指す |

必要なもの: このリポジトリ、`pnpm install --frozen-lockfile` 済みの `node_modules`、ローカルに書けるディレクトリ。**外部の DB は不要で、また使ってはならない** (§2.3)。

## 2. 手順 A — デモデータを投入する

### 2.1 投入する

```bash
pnpm --filter @harness-hub/db exec tsx scripts/seed-coverage.ts --url file:./local.db
```

`--url` を省略すると環境変数 `TURSO_DATABASE_URL` が読まれる。事故を防ぐため、**手順書としては常に `--url` を明示することを推奨する**。

成功すると投入件数の内訳と合計が出て終了コード 0 で終わる。実測 (2026-08-15):

```
  tenants: 4 件
  user_settings: 4 件
  user_workspaces: 4 件
  users: 59 件
  workspaces: 2 件
合計 35 テーブル / 637 件を投入しました。
```

### 2.2 何度実行してもよい

この seed は冪等 (べきとう＝何回実行しても結果が同じになる性質) である。テナント単位で削除してから再投入するため、2 回目以降も同じ状態に収束する。状態が怪しくなったら、消し方を考えずにもう一度実行してよい。

### 2.3 ローカル以外の DB へは投入できない (安全装置)

`file:` / `http://127.0.0.1` / `http://localhost` 以外の URL は**終了コード 2 で拒否**され、DB には一切書き込まれない。これは不具合ではなく本 feature の安全装置である。動作確認:

```bash
pnpm --filter @harness-hub/db exec tsx scripts/seed-coverage.ts --url libsql://harness-hub-prod.turso.io
```

実測 (2026-08-15) — 終了コード **2**、標準エラーへ次の 1 行:

```
seed-coverage はローカル DB 専用です (file: / http://127.0.0.1 / http://localhost。受け取った URL: libsql://harness-hub-prod.turso.io)
```

> **本番・staging の DB URL をこのコマンドに渡してはならない。** 拒否されるとはいえ、URL の形だけで判定しているため、ローカルに見えて外部を指す接続 (トンネル等) は防げない。渡さないことが第一の防御である。

### 2.4 対応表が壊れていないか確認する

画面を開く前に、到達手順の表そのものが健全かを確認できる。DB へは接続しない静的な検査である。

```bash
pnpm --filter @harness-hub/db exec tsx scripts/verify-demo-coverage-matrix.ts
```

実測 (2026-08-15) — 終了コード **0**、末尾に「未カバー 0 件。表の全セルが到達手順または理由記号へ解決しました。」

この検査が落ちる (終了コード 1) のは、未割当セル・未知の理由記号・空の到達手順・絶対 path でない URL・seed に存在しない fixture のいずれかがあるときである。落ちた場合、§4 の手順は信用できない状態なので、先にそちらを直す。

## 3. 状態の読み方と非適用の理由記号

| 状態 | 何を見るか |
|---|---|
| 空 | 1 件もないときの表示 (「データがありません」等) が崩れていないか |
| 1 件 | 最小構成での表示。余白・整列が破綻していないか |
| 大量 | 表示件数の境界 (`DISPLAY_BOUNDARIES`) を跨ぐ件数での表示。ページング・省略・スクロールが働くか |
| 長文 | 見出し・本文・タグ名・人名が規定の最小長を超えたときの折返し・省略 |
| エラー | 取得失敗・権限不足・停止テナントなどの失敗系表示 |

非適用の理由記号は次のとおり。**「その画面ではその状態が原理的に起きない」ことを示すもので、確認をさぼってよいという意味ではない。**

| 記号 | 理由 | 件数 |
|---|---|---|
| N1 | 静的コンテンツのみで、件数に依存する表示を持たない | 11 |
| N2 | 入力専用画面で、初期表示が常に未入力の 1 状態である | 6 |
| N3 | データ取得を伴わないため取得失敗・権限不足・未同期が発生しない | 1 |
| N4 | 詳細画面は対象 1 件の存在が前提で、不在は「エラー」状態に含める | 6 |
| N5 | 単一フォームで、繰り返し要素のページング境界を持たない | 7 |
| N6 | 単一ドキュメントの表示・編集で、一覧のページング境界を持たない | 2 |
| N7 | 認証済み利用者が必ず 1 件以上存在するため 0 件が成立しない | 2 |

合計: 140 セル = 適用 105 件 + 非適用 35 件 + 未割当 0 件。

## 4. 手順 B — 28 route × 5 状態への到達

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
| 空 | workspace-admin | `/settings/auth` | 子データを持たないテナントで開く | `idp-connection/active/0001`<br>`idp-connection/disabled/0001`<br>`tenant/empty/0001` |
| 1 件 | workspace-admin | `/settings/auth` | そのまま表示を確認 | `idp-connection/active/0001`<br>`idp-connection/disabled/0001`<br>`tenant/main/0001` |
| 大量 | — | — | **非適用 (N5)**: 単一フォームで、繰り返し要素のページング境界を持たない | — |
| 長文 | workspace-admin | `/settings/auth` | そのまま表示を確認 | `idp-connection/active/0001`<br>`idp-connection/disabled/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | workspace-admin | `/settings/auth` | 停止テナントの資源を要求する | `idp-connection/active/0001`<br>`idp-connection/disabled/0001`<br>`tenant/suspended/0001` |

### SCR-28 — `/settings/coefficients`

| 状態 | 役割 | 開く URL | 操作 | 必要な fixture |
|---|---|---|---|---|
| 空 | workspace-admin | `/settings/coefficients` | 子データを持たないテナントで開く | `tenant-coefficient/main/0001`<br>`metrics-rollup/tenant-daily/0001`<br>`tenant/empty/0001` |
| 1 件 | workspace-admin | `/settings/coefficients` | そのまま表示を確認 | `tenant-coefficient/main/0001`<br>`metrics-rollup/tenant-daily/0001`<br>`tenant/main/0001` |
| 大量 | workspace-admin | `/settings/coefficients` | 既定の並び順のまま、DISPLAY_BOUNDARIES を跨ぐ件数まで送る | `tenant-coefficient/main/0001`<br>`metrics-rollup/tenant-daily/0001`<br>`tenant/main/0001` |
| 長文 | workspace-admin | `/settings/coefficients` | そのまま表示を確認 | `tenant-coefficient/main/0001`<br>`metrics-rollup/tenant-daily/0001`<br>`long-text/heading/0001`<br>`long-text/body/0001` |
| エラー | workspace-admin | `/settings/coefficients` | 停止テナントの資源を要求する | `tenant-coefficient/main/0001`<br>`metrics-rollup/tenant-daily/0001`<br>`tenant/suspended/0001` |


## 5. 手順をなぞって確認した記録

本 runbook の作成にあたり、記載した手順を実際に実行して確認した。実測日 2026-08-15。

| # | なぞった手順 | 結果 |
|---|---|---|
| 1 | §2.1 の投入コマンド | 終了コード 0 / 35 テーブル 637 件を投入 |
| 2 | §2.3 の拒否確認 (`libsql://`) | 終了コード **2** / 「seed-coverage はローカル DB 専用です」 |
| 3 | §2.4 の対応表検査 | 終了コード 0 / 「未カバー 0 件」 |
| 4 | §4 の到達手順の生成 | 正本 `coverage-matrix.ts` から 28 route 全件を生成。手書き 0 件 |

§4 の 140 セルすべてを実ブラウザで開く確認は行っていない。それは本 feature の scope 外 (実ブラウザ検査は `feat-ui-integrity-audit-harness` の責務) であり、本 runbook が保証するのは「到達手順が対応表と一致し、指す fixture が seed に実在すること」までである。後者は §2.4 の検査が担保する。

## 6. 困ったとき

| 症状 | 対処 |
|---|---|
| vitest が `@rollup/rollup-darwin-x64` を要求して落ちる | 既定の node が x64 スライスで起動している。arm64 の node を直接指定する: `cd packages/db && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run` |
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
