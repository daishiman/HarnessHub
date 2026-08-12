import { describe, expect, it } from 'vitest';
import { upsertNotionIntegrationRequestSchema } from './contracts.js';

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
