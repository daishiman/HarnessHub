# duplicate-violation fixture (HF-A4-DUP-002)

duplicate implementation detector 自体の実効性を検証するための **意図的な違反** を置く。

- 通常の detector 実行では走査対象外（`scripts/ci/check-shared-layer-duplicates.mjs` の `DEFAULT_EXCLUDES` にディレクトリ名 `duplicate-violation` が入っている）。
- 実効性検証は走査起点を差し替えて実行する:

  ```bash
  node scripts/ci/check-shared-layer-duplicates.mjs \
    --include-fixtures --root apps/hub/tests/fixtures/duplicate-violation
  ```

  この実行が **非ゼロ終了しなければ detector が壊れている**（ゲートが常時緑になる Goodhart 化）。

## 中身

detector は `--root` 配下の `apps/` と `packages/` を走査し、owner package の `src/index.ts` から公開 API 名を集める。
そのため fixture 側にも owner package の代役を置いてある。

| ファイル | 役割 |
|---|---|
| `packages/schemas/src/index.ts` | owner package の代役。公開 API 名 `duplicatedContractSchema` を定義する |
| `apps/hub/src/duplicated-schema.ts` | 検出 1（owner 外の同名 export）と 検出 2（deep import による境界迂回）の違反元 |

これらは TypeScript のビルド・テスト対象から除外している（`apps/hub/tsconfig.json` の `exclude` と `vitest.config.ts` の `exclude`）。
