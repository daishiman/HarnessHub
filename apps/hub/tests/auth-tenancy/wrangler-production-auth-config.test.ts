import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const APP_ROOT = path.resolve(import.meta.dirname, '../..');

function readWranglerConfig(): {
  vars: Record<string, string>;
  secrets: { required: string[] };
} {
  const raw = readFileSync(path.join(APP_ROOT, 'wrangler.jsonc'), 'utf8');
  return JSON.parse(raw.replace(/^\s*\/\/.*$/gm, ''));
}

describe('production auth bindings', () => {
  const config = readWranglerConfig();
  const origin = 'https://harness-hub.daishimanju.workers.dev';

  it('公開URL 3件をwrangler設定で一元管理する', () => {
    expect(config.vars.AUTH_CANONICAL_ORIGIN).toBe(origin);
    expect(config.vars.AUTH_ALLOWED_ORIGINS).toBe(origin);
    expect(config.vars.AUTH_DEVICE_VERIFICATION_URI).toBe(`${origin}/device`);
  });

  // ここが検査するのは**宣言**であって実投入ではない。実投入は scripts/ci/check-worker-secrets.mjs --live が
  // deploy 前に見る (HarnessHub-o2i.13)。両者が乖離しないよう、台帳の required 集合との一致は
  // tests/ci/worker-secrets.test.ts が固定している。
  it('本番で欠落したら落とすSecret名だけを宣言する', () => {
    expect(config.secrets.required.sort()).toEqual(
      [
        // readAuthRuntimeEnv が required() で読む = 欠けると Worker の該当経路が起動しない
        'AUTH_ACCESS_TOKEN_SECRET',
        'AUTH_SESSION_SECRET',
        'ENCRYPTION_KEK',
        'TURSO_AUTH_TOKEN',
        'TURSO_DATABASE_URL',
        // 起動要件ではない (readSharedGoogleCredentials は欠落を null に倒し、顧客持ち込み方式は動く) が、
        // 2026-08-02 に本番投入済みなので runbook S-02 に従い宣言する。消えたことを deploy 前に検知する対象。
        'SHARED_GOOGLE_OAUTH_CLIENT_ID',
        'SHARED_GOOGLE_OAUTH_CLIENT_SECRET',
      ].sort(),
    );
    expect(config.secrets.required.some((name) => name.startsWith('IDP_SECRET_'))).toBe(false);
    expect(config.secrets.required).not.toContain('OIDC_CLIENT_SECRET');
  });
});
