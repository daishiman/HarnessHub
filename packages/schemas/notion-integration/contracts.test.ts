import { describe, expect, it } from 'vitest';
import { notionIntegrationResponseSchema, upsertNotionIntegrationRequestSchema } from './contracts.js';

describe('Notion integration URL contract', () => {
  it.each([
    'https://www.notion.so/workspace/page-id',
    'https://notion.so/workspace/page-id',
    'https://team.notion.site/public-page',
  ])('HTTPS の正当な Notion host を受け付ける: %s', (pageUrl) => {
    expect(upsertNotionIntegrationRequestSchema.safeParse({ mode: 'url', page_url: pageUrl }).success).toBe(true);
  });

  it.each([
    'http://www.notion.so/insecure',
    'https://notion.so.evil.example/phishing',
    'https://evil.example/notion.so/page',
    'javascript:alert(1)',
    'https://www.notion.so:8443/unexpected-port',
  ])('非 HTTPS・偽装 host・不正 scheme を拒否する: %s', (pageUrl) => {
    expect(upsertNotionIntegrationRequestSchema.safeParse({ mode: 'url', page_url: pageUrl }).success).toBe(false);
  });
});

describe('Notion integration response contract', () => {
  const response = {
    workspace_id: 'workspace-a',
    mode: 'api_key',
    page_url: 'https://team.notion.site/public-page',
    api_key_masked: '****1234',
    api_key_status: 'stored_unverified',
    updated_at: 1,
  };

  it('APIキーを接続済みと誤認させず、保存・未検証の状態を返す', () => {
    expect(notionIntegrationResponseSchema.safeParse(response).success).toBe(true);
  });

  it.each([
    { ...response, page_url: 'https://notion.so.evil.example/phishing' },
    { ...response, api_key_status: 'connected' },
    { ...response, api_key_masked: null },
  ])('応答側でも危険な URL と未定義の接続状態を拒否する', (value) => {
    expect(notionIntegrationResponseSchema.safeParse(value).success).toBe(false);
  });
});
