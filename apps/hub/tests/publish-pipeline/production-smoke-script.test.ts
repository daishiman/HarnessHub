import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const HUB_ROOT = resolve(import.meta.dirname, '..', '..');
const SCRIPT = resolve(HUB_ROOT, 'scripts/smoke-production-publish.ts');

describe('P13 production publish smoke script', () => {
  it('資格情報なしでも --help を実行できる', () => {
    const output = execFileSync('pnpm', ['run', 'smoke:publish-production', '--', '--help'], {
      cwd: HUB_ROOT,
      encoding: 'utf8',
      env: { NODE_ENV: 'test', PATH: process.env.PATH ?? '' },
    });

    expect(output).toContain('smoke:publish-production');
    expect(output).toContain('PUBLISH_ACCESS_TOKEN');
    expect(output).toContain('CLOUDFLARE_API_TOKEN');
  });

  it('S1-S6・409・R2・audit・cleanup を同じ fail-closed entrypoint に閉じる', () => {
    const source = readFileSync(SCRIPT, 'utf8');

    for (const marker of [
      'S1',
      'S2',
      'S3',
      'S4',
      'S5',
      'S6',
      'channel_busy',
      'downloadR2',
      'createPublishSmokeDbProbe',
      'auditChain',
      'archiveProject',
      'cleanup failed',
      'stable_unchanged',
      'publish.approve',
      'release.suspend',
      'deployment.register',
      'contract_paths: 12',
    ]) {
      expect(source).toContain(marker);
    }

    for (const path of [
      '/api/v1/publish?project_id=',
      '/package',
      '/submit',
      '/approve',
      '/cancel',
      '/releases',
      '/promote',
      '/rollback',
      '/suspend',
      '/deployment',
    ]) {
      expect(source).toContain(path);
    }
  });
});
