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

  it('本番runtimeの必須Secret名だけを宣言する', () => {
    expect(config.secrets.required.sort()).toEqual(
      [
        'AUTH_ACCESS_TOKEN_SECRET',
        'AUTH_SESSION_SECRET',
        'CWV_PROBE_SECRET',
        'CWV_PROBE_TENANT_ID',
        'CWV_PROBE_WORKSPACE_ID',
        'ENCRYPTION_KEK',
        'TURSO_AUTH_TOKEN',
        'TURSO_DATABASE_URL',
      ].sort(),
    );
    expect(config.secrets.required.some((name) => name.startsWith('IDP_SECRET_'))).toBe(false);
    expect(config.secrets.required).not.toContain('OIDC_CLIENT_SECRET');
  });
});
