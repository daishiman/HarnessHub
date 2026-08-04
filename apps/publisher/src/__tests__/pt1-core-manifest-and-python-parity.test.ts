/**
 * PT1: core/ package 収集 + manifest 補完、Python 資産との挙動同値。
 * 対応: docs/features/feat-publisher-plugin/test-design.md §PT1, AD-1。
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { completePackageManifest } from '../core/manifest.js';

const CORE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'core');

function manifestFile(content: unknown) {
  return { path: 'plugin.json', content: JSON.stringify(content) };
}

describe('PT1-A manifest 補完のフィールド単位テスト', () => {
  it('必須メタ (name/version/description) が欠けた package はエラー化する', () => {
    const result = completePackageManifest([manifestFile({ name: 'demo' })]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missingFields).toContain('version');
      expect(result.missingFields).toContain('description');
    }
  });

  it('必須メタが揃っていれば補完済み manifest を返す', () => {
    const result = completePackageManifest([manifestFile({ name: 'demo', version: '1.0.0', description: 'd' })]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.manifest).toEqual({
        name: 'demo',
        version: '1.0.0',
        description: 'd',
        owner: null,
        visibility: 'private',
        summary: 'd',
      });
    }
  });

  it('semver 形式でない version を検出しエラー化する (packages/inspection PKG-SEMVER と同じ判定)', () => {
    const result = completePackageManifest([manifestFile({ name: 'demo', version: 'not-a-semver', description: 'd' })]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missingFields.some((field) => field.includes('semver'))).toBe(true);
    }
  });
});

describe('PT1-B Python 資産との挙動同値 (収集・カタログ部分)', () => {
  it.todo(
    '対象外: packages/inspection の PKG-xxx 判定同値は feat-publish-pipeline T2-D の責務。' +
      '本 PT1-B は package 収集・marketplace catalog 生成部分のみを対象とする',
  );

  it('必須メタキー集合が Python 側 (validate-plugin-package.py PLUGIN_JSON_REQUIRED) と一致する', () => {
    // Python 側は `.claude-plugin/plugin.json` という別 path・別収集方式 (個別ファイルグロブ) を対象にしており、
    // ファイル一覧そのものは TS 側の汎用再帰 walk と形が異なるため直接比較できない (P05 設計調査で確認済み)。
    // 両側で唯一比較可能なのは「必須メタキーの集合」だけなので、そこに絞って同値を確認する。
    const result = completePackageManifest([manifestFile({})]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const requiredKeys = result.missingFields.filter((field) => !field.includes(' '));
      expect(new Set(requiredKeys)).toEqual(new Set(['name', 'version', 'description']));
    }
  });
});

describe('PT1-C 5 サブディレクトリの責務境界 (構造テスト)', () => {
  const coreSourceFiles = readdirSync(CORE_DIR)
    .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
    .map((name) => readFileSync(join(CORE_DIR, name), 'utf-8'));

  it('core/ が auth/ の実装詳細 (OS credential adapter) に直接依存しない', () => {
    for (const source of coreSourceFiles) {
      expect(source).not.toMatch(/from ['"].*\/auth\//);
    }
  });

  it('core/ が deploy/ の実装詳細 (wrangler 実行) に直接依存しない', () => {
    for (const source of coreSourceFiles) {
      expect(source).not.toMatch(/from ['"].*\/deploy\//);
    }
  });
});
