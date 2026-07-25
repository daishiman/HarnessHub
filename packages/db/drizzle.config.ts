// 単一 migration lineage の正本設定 (quality_constraint: single-migration-pipeline-drizzle-repository-package)。
// 入力は schema barrel のみ、出力は ./migrations のみ。第 2 の出力先を作らないこと (CI: DMDB-T07)。

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './schema/index.ts',
  out: './migrations',
});
