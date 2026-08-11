/** GitHub Actions と pnpm package cwd の境界で production smoke のpathがずれないことを検証する。 */

import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { WRANGLER_CONFIG } from '../../scripts/smoke-production-publish-support.js';

const HUB_ROOT = resolve(import.meta.dirname, '..', '..');
const REPO_ROOT = resolve(HUB_ROOT, '..', '..');
const CI_WORKFLOW = resolve(REPO_ROOT, '.github/workflows/ci.yml');
const SWEEPER_WORKFLOW = resolve(REPO_ROOT, '.github/workflows/smoke-fixture-sweeper.yml');
const REPORT_ARG = '--report "$GITHUB_WORKSPACE/artifacts/smoke-fixture-sweep.json"';

describe('production publish smoke path contract', () => {
  it('Wrangler configをpnpm filter後のcwdに依存しない絶対pathで渡す', () => {
    expect(isAbsolute(WRANGLER_CONFIG)).toBe(true);
    expect(WRANGLER_CONFIG).toBe(resolve(HUB_ROOT, 'wrangler.jsonc'));
    expect(existsSync(WRANGLER_CONFIG)).toBe(true);
  });

  it.each([CI_WORKFLOW, SWEEPER_WORKFLOW])('%s はrepository artifactへ絶対pathでreportを書く', (path) => {
    const workflow = readFileSync(path, 'utf8');
    expect(workflow).toContain(REPORT_ARG);
    expect(workflow).not.toContain('--report artifacts/smoke-fixture-sweep.json');
  });
});
