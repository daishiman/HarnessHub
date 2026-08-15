---
status: confirmed
layer: feature-design
---

# route × 状態 対応表 (feat-demo-coverage-dataset / P05)

網羅確認用デモデータが、どの画面のどの状態まで届くかを 1 枚にした表である。表の正本は `packages/db/scripts/demo-coverage/coverage-matrix.ts` の `COVERAGE_MATRIX` で、この文書はその投影と、実装時に確定した判断の記録である。表と実装がずれていないことは次のコマンドで機械検査する。

```bash
pnpm --filter @harness-hub/db exec tsx scripts/verify-demo-coverage-matrix.ts
```

## 1. 状態の定義

| 状態 | 意味 | 崩れの検出対象 |
|---|---|---|
| 空 | 対象データが 0 件 | 空状態の案内文・余白の潰れ |
| 1件 | 対象データが 1 件だけ | 単票レイアウト・区切り線の孤立 |
| 大量 | 表示区切り (`DISPLAY_BOUNDARIES`) を跨ぐ件数 | ページング・スクロール・件数表示の桁あふれ |
| 長文 | 見出し・本文・タグ名・氏名が長い | 折返し位置・横溢れ・省略記号 |
| エラー | 取得失敗・権限不足・未同期 | エラー表示の占有領域・復帰導線 |

## 2. 非適用の理由記号

「その画面ではその状態が原理的に起こらない」ものだけを非適用とする。手を抜いた箇所と区別するために、理由を記号で固定し、検査 CLI が未知の記号を弾く。

| 記号 | 理由 |
|---|---|
| N1 | 静的コンテンツのみで、件数に依存する表示を持たない |
| N2 | 入力専用画面で、初期表示が常に未入力の 1 状態である |
| N3 | データ取得を伴わないため取得失敗・権限不足・未同期が発生しない |
| N4 | 詳細画面は対象 1 件の存在が前提で、不在は「エラー」状態に含める |
| N5 | 単一フォームで、繰り返し要素のページング境界を持たない |
| N6 | 単一ドキュメントの表示・編集で、一覧のページング境界を持たない |
| N7 | 認証済み利用者が必ず 1 件以上存在するため 0 件が成立しない |

## 3. 対応表 (28 画面 × 5 状態 = 140 セル)

`✓` は到達手順と fixture を持つセル、`— Nn` は上表の理由による非適用である。未割当は 0 件。

| 画面 | route | 空 | 1件 | 大量 | 長文 | エラー |
|---|---|---|---|---|---|---|
| SCR-01 | `/` | — N1 | — N1 | — N1 | — N1 | ✓ |
| SCR-02 | `/[tenant_slug]/signin` | — N2 | ✓ | — N1 | — N1 | ✓ |
| SCR-03 | `/device` | — N2 | ✓ | — N1 | — N1 | ✓ |
| SCR-04 | `/legal` | — N1 | — N1 | — N1 | ✓ | — N3 |
| SCR-05 | `/dashboard` | ✓ | ✓ | ✓ | ✓ | ✓ |
| SCR-06 | `/catalog` | ✓ | ✓ | ✓ | ✓ | ✓ |
| SCR-07 | `/catalog/[projectId]` | — N4 | ✓ | ✓ | ✓ | ✓ |
| SCR-08 | `/catalog/publish` | — N2 | ✓ | — N5 | ✓ | ✓ |
| SCR-09 | `/catalog/releases` | ✓ | ✓ | ✓ | ✓ | ✓ |
| SCR-10 | `/builds` | ✓ | ✓ | ✓ | ✓ | ✓ |
| SCR-11 | `/docs` | ✓ | ✓ | ✓ | ✓ | ✓ |
| SCR-12 | `/docs/new` | — N2 | ✓ | — N5 | ✓ | ✓ |
| SCR-13 | `/docs/[id]` | — N4 | ✓ | — N6 | ✓ | ✓ |
| SCR-14 | `/docs/[id]/edit` | — N4 | ✓ | — N6 | ✓ | ✓ |
| SCR-15 | `/feedback` | ✓ | ✓ | ✓ | ✓ | ✓ |
| SCR-16 | `/feedback/new` | — N2 | ✓ | — N5 | ✓ | ✓ |
| SCR-17 | `/feedback/[id]` | — N4 | ✓ | ✓ | ✓ | ✓ |
| SCR-18 | `/metrics` | ✓ | ✓ | ✓ | ✓ | ✓ |
| SCR-19 | `/metrics/usage` | ✓ | ✓ | ✓ | ✓ | ✓ |
| SCR-20 | `/sheets` | ✓ | ✓ | ✓ | ✓ | ✓ |
| SCR-21 | `/sheets/new` | — N2 | ✓ | — N5 | ✓ | ✓ |
| SCR-22 | `/sheets/[id]` | — N4 | ✓ | ✓ | ✓ | ✓ |
| SCR-23 | `/users` | — N7 | ✓ | ✓ | ✓ | ✓ |
| SCR-24 | `/users/[id]` | — N4 | ✓ | ✓ | ✓ | ✓ |
| SCR-25 | `/settings/account` | — N7 | ✓ | — N5 | ✓ | ✓ |
| SCR-26 | `/settings/notion` | ✓ | ✓ | — N5 | ✓ | ✓ |
| SCR-27 | `/settings/auth` | ✓ | ✓ | — N5 | ✓ | ✓ |
| SCR-28 | `/settings/coefficients` | ✓ | ✓ | ✓ | ✓ | ✓ |

集計: 適用 105 件 / 非適用 35 件 (N1 11・N2 6・N3 1・N4 6・N5 7・N6 2・N7 2) / 未割当 0 件。

## 4. 実装時に確定した判断

### 4.1 テナントを 4 件へ拡張した

ADR §10.1 は、動作前提と衝突する enum 値 (`tenants.status=suspended` など) の受け皿として「主テナント + 停止テナント」の 2 件を挙げていた。実装では 4 件へ増やした。

| テナント | 役割 |
|---|---|
| `tenant/main/0001` | サインインに使う主テナント。1件・大量・長文・エラーの土台 |
| `tenant/suspended/0001` | `status=suspended` の受け皿 (ADR §10.1) |
| `tenant/empty/0001` | **「空」状態の受け皿。子データを一切持たない** |
| `tenant/secondary/0001` | テナント越境が起きていないことの対照。主テナントと同名の行を持つ |

増やした理由は 2 つある。第一に、「空」状態を主テナントの中で作ろうとすると、同じ画面の「大量」状態と両立しない。テナントを分ければ、同じ seed の中で両方を同時に持てる。第二に、テナント境界の漏れは 1 テナントだけの検査では原理的に見つからない。対照テナントを置いて初めて「隣のテナントの行が見えていないこと」を確認できる。

削除条件がテナント境界を含むという ADR §4.3 の制約は、この 4 件すべてへ適用している (`seed.ts` の `purge()` が `inArray(table.tenantId, TENANT_IDS)` で 4 件を対象にする)。

### 4.2 長文パターンは行ではなく「文面の指定」として扱う

表の「長文」セルが指す `long-text/heading/0001` などは、独立した行の論理キーではない。`fixtures.ts` の `LONG_TEXT` にある文面パターンの番号である。既存の行 (ドキュメント・利用者など) にこの文面を載せることで長文状態を作る。

検査 CLI はこの区別を明示的に扱う。`LONG_TEXT` の配列長から論理キーを導出して既知集合へ加えるため、表が存在しない番号を指せば検出される。

### 4.3 「詳細画面の空」はエラーへ寄せた (N4)

詳細画面 (`/docs/[id]` など) で対象が 1 件も無い状況は、「空の一覧」ではなく「存在しない ID を開いた」状態である。空状態として別に用意すると、実際の表示 (404 相当) と食い違う。よって N4 として非適用にし、エラー状態の中で検査する。

## 5. 参照

- 表の正本: `packages/db/scripts/demo-coverage/coverage-matrix.ts`
- fixture の論理キー: `packages/db/scripts/demo-coverage/fixtures.ts`
- 投入 CLI: `packages/db/scripts/seed-coverage.ts`
- 検査 CLI: `packages/db/scripts/verify-demo-coverage-matrix.ts`
- 設計判断: `docs/features/feat-demo-coverage-dataset/architecture-decision-record.md`
- 検査設計: `docs/features/feat-demo-coverage-dataset/test-design.md`
