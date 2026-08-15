---
status: confirmed
layer: feature-evidence
---

# リファクタリング / マイグレーション判定 (feat-demo-coverage-dataset / P08)

本 feature がスキーマ移行 (migration＝既存の表定義を変更して既存データを移し替える作業) を必要としないことの確認記録である。判定が「不要」であっても工程を省略せず、根拠を機械で再確認できる形で残す。

- 判定日: 2026-08-15
- **判定: migration 不要 (N/A)。リファクタリング対象の既存コードも 0 件。**
- 前提: `acceptance-report.md` (P07) が 7 項目全件 pass

## 1. 判定

| 観点 | 判定 | 根拠 |
|---|---|---|
| 既存 schema の変更 | **なし** | §2.1 (差分 0 件) |
| migration ファイルの追加 | **なし** | §2.1 (差分 0 件) |
| データの移し替え (backfill) | **不要** | §2.2 (既存行を書き換えない) |
| 既存コードのリファクタリング | **なし** | §2.3 (変更は追加のみ) |

## 2. 根拠

### 2.1 schema / migrations 配下の変更が 0 件

```bash
git status --porcelain -- packages/db/schema/ packages/db/migrations/ | wc -l
#=> 0
```

本 feature の作業ツリーにおいて、`packages/db/schema/**` (17 ファイル) と `packages/db/migrations/**` (15 SQL) はいずれも変更されていない。

本 feature が `packages/db/` 配下に加えた変更は次の 5 点だけで、すべて新規追加か試験設定の追記である。

```
 M packages/db/vitest.config.ts                    # coverage.include に 1 行追加 (P05 / H3)
?? packages/db/__tests__/seed-coverage/            # 新規テスト 6 ファイル
?? packages/db/scripts/demo-coverage/              # 新規 fixture/表/seed 本体
?? packages/db/scripts/seed-coverage.ts            # 新規 CLI
?? packages/db/scripts/verify-demo-coverage-matrix.ts  # 新規検査 CLI
```

P05 の write scope (`seed-coverage.ts` / `verify-demo-coverage-matrix.ts` / `demo-coverage/**`) は `packages/db/schema/**` を 1 ファイルも含まない。

### 2.2 seed は既存 schema の消費者であり、定義者ではない

`seed-coverage.ts` は表定義を自前で持たない。schema barrel (`packages/db/schema/index`) を唯一の入力として CREATE 文を導出する。

```ts
/** schema barrel を唯一の入力として CREATE 文を導出する (canonical migration に依存しない)。 */
async function schemaDdl(): Promise<string[]> {
  const empty = await generateSQLiteDrizzleJson({});
  const current = await generateSQLiteDrizzleJson(schema as unknown as Record<string, unknown>);
  return generateSQLiteMigration(empty, current);
}
```

投入本体 (`demo-coverage/seed.ts`) も `import * as schema from '../../schema/index'` で既存定義を参照するだけである。したがって schema 側に新しい表・カラム・enum 値を要求していない。

この向きは検査でも固定されている。`DOMAIN_ENUMS` の宣言 (40 カラム / 129 値) が schema の実定義と完全一致することを T2-2 が突き合わせており、seed のために enum を増やしていれば不一致として落ちる。

> **設計上の含意:** DDL を canonical migration から作らず schema barrel から導出しているのは、手元の空 DB へ「今の schema」をそのまま起こすためである。migration の適用順序を再現するのが目的ではないので、本 feature が migration 履歴に手を入れる必要は構造的に生じない。

### 2.3 既存行を書き換えないため backfill が不要

seed は 4 つの専用テナント (`tenant/main` / `suspended` / `empty` / `secondary`) の配下にだけ行を作り、削除条件もテナント境界を含む (`purge()` が `inArray(table.tenantId, TENANT_IDS)`)。既存データの意味を変える更新を行わないので、移行に伴うデータ変換 (backfill) の対象がない。

また CLI はローカル DB URL しか受け付けない (非ローカルは exit 2)。本番・staging の既存データへ到達する経路自体を持たないため、運用データの移行計画も発生しない。

### 2.4 リファクタリング対象がない

本 feature は既存モジュールの内部構造を作り替えていない。既存ファイルへの変更は `vitest.config.ts` の `coverage.include` に 1 行足しただけで、振る舞いの変更を伴わない。新規コードはすべて `scripts/demo-coverage/` と `__tests__/seed-coverage/` に閉じており、既存の repository/schema 層から参照されていない (依存の向きは新規 → 既存の一方向)。

## 3. 将来 migration が必要になる条件

次のいずれかが起きたときは、本判定は無効になり P08 相当の作業が実際に発生する。

1. デモデータのために **新しい enum 値** が必要になったとき — T2-1/T2-2 が宣言と schema の不一致として検出する。
2. デモデータのために **新しいカラム・表** が必要になったとき — schema 変更を伴うため通常の migration 手順に乗る。
3. `DISPLAY_BOUNDARIES` が参照する実コード定数が移動・改名されたとき — T6-1 が定義ファイルを読めず落ちる。migration ではないが、対応表の追随が必要になる。

いずれも既存の検査が先に赤くなる設計なので、判定が黙って陳腐化することはない。

## 4. 検証

```bash
python3 plugins/system-dev-planner/scripts/validate-system-plan.py \
  --repo-root . --feature-package feature-package/feat-demo-coverage-dataset
```

`exit 0` / `violations: []` / contract 1.3.0 / P01..P13 exact-13。

## 5. 参照

- 受入判定: `docs/features/feat-demo-coverage-dataset/acceptance-report.md`
- 設計判断: `docs/features/feat-demo-coverage-dataset/architecture-decision-record.md`
- 投入 CLI: `packages/db/scripts/seed-coverage.ts`
- 投入本体: `packages/db/scripts/demo-coverage/seed.ts`
