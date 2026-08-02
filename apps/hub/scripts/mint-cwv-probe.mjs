#!/usr/bin/env node
// protected `/catalog` の Lighthouse 実測だけに使う、短命・scope 固定 JWT を発行する。
// Node 専用 script のため node:crypto を使うが、Worker 側の検証実装とは同じ HS256 compact JWT 契約に揃える。

import { createHmac } from 'node:crypto';
import { appendFileSync } from 'node:fs';

export const CWV_PROBE_AUDIENCE = 'harness-hub-cwv';
export const CWV_PROBE_TTL_SECONDS = 5 * 60;

export function normalizeCwvOrigin(rawOrigin) {
  if (typeof rawOrigin !== 'string' || rawOrigin.trim() === '') throw new Error('HUB_PUBLIC_URL が未設定です');
  const parsed = new URL(rawOrigin.trim());
  if (
    parsed.protocol !== 'https:' ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.pathname !== '/' ||
    parsed.search !== '' ||
    parsed.hash !== ''
  ) {
    throw new Error('HUB_PUBLIC_URL は query/path/credential を含まない https origin である必要があります');
  }
  return parsed.origin;
}

export function mintCwvProbe({ secret, origin, tenantId, workspaceId, nowSeconds = Math.floor(Date.now() / 1000) }) {
  for (const [name, value] of Object.entries({
    HUB_CWV_PROBE_SECRET: secret,
    HUB_CWV_PROBE_TENANT_ID: tenantId,
    HUB_CWV_PROBE_WORKSPACE_ID: workspaceId,
  })) {
    if (typeof value !== 'string' || value.trim() === '') throw new Error(`${name} が未設定です`);
  }
  const payload = {
    typ: 'cwv_probe',
    aud: CWV_PROBE_AUDIENCE,
    origin: normalizeCwvOrigin(origin),
    tenant_id: tenantId.trim(),
    workspace_id: workspaceId.trim(),
    iat: nowSeconds,
    exp: nowSeconds + CWV_PROBE_TTL_SECONDS,
  };
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64Url(JSON.stringify(payload));
  const signature = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return { ticket: `${header}.${body}.${signature}`, payload };
}

export function buildCwvTargetUrl({ origin, tenantId, workspaceId, ticket }) {
  const target = new URL('/catalog', normalizeCwvOrigin(origin));
  target.searchParams.set('tenant', tenantId.trim());
  target.searchParams.set('workspace', workspaceId.trim());
  target.searchParams.set('__cwv_probe', ticket);
  return target.toString();
}

export function buildSafeCwvTargetUrl({ origin, tenantId, workspaceId }) {
  const target = new URL('/catalog', normalizeCwvOrigin(origin));
  target.searchParams.set('tenant', tenantId.trim());
  target.searchParams.set('workspace', workspaceId.trim());
  return target.toString();
}

function base64Url(value) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function main() {
  const githubEnvIndex = process.argv.indexOf('--github-env');
  const githubEnv = githubEnvIndex < 0 ? null : process.argv[githubEnvIndex + 1];
  if (githubEnvIndex < 0 || githubEnv === undefined || process.argv.length !== 4) {
    throw new Error('使用法: mint-cwv-probe.mjs --github-env <GITHUB_ENV>');
  }

  const { ticket } = mintCwvProbe({
    secret: process.env.HUB_CWV_PROBE_SECRET,
    origin: process.env.HUB_PUBLIC_URL,
    tenantId: process.env.HUB_CWV_PROBE_TENANT_ID,
    workspaceId: process.env.HUB_CWV_PROBE_WORKSPACE_ID,
  });
  const targetUrl = buildCwvTargetUrl({
    origin: process.env.HUB_PUBLIC_URL,
    tenantId: process.env.HUB_CWV_PROBE_TENANT_ID,
    workspaceId: process.env.HUB_CWV_PROBE_WORKSPACE_ID,
    ticket,
  });
  const safeTargetUrl = buildSafeCwvTargetUrl({
    origin: process.env.HUB_PUBLIC_URL,
    tenantId: process.env.HUB_CWV_PROBE_TENANT_ID,
    workspaceId: process.env.HUB_CWV_PROBE_WORKSPACE_ID,
  });

  // GitHub command は値をログへ露出せず mask 登録する。token を stdout の通常出力にしない。
  process.stdout.write(`::add-mask::${ticket}\n`);
  appendFileSync(githubEnv, `CWV_PROBE_TICKET=${ticket}\nTARGET_URL=${targetUrl}\nSAFE_TARGET_URL=${safeTargetUrl}\n`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) main();
