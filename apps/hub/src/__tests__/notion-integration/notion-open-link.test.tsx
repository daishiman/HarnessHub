// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotionOpenLink } from '../../components/notion/notion-open-link.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('NotionOpenLink external navigation contract', () => {
  it('Notion ページは noopener/noreferrer 付きの別タブで開く', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            workspace_id: 'workspace-a',
            mode: 'url',
            page_url: 'https://team.notion.site/workspace',
            api_key_masked: null,
            api_key_status: 'not_configured',
            updated_at: 1,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    render(<NotionOpenLink tenantId="tenant-a" workspaceId="workspace-a" />);

    const link = await screen.findByRole('link', { name: 'Notionで開く' });
    expect(link.getAttribute('href')).toBe('https://team.notion.site/workspace');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it.each(['http://www.notion.so/insecure', 'https://notion.so.evil.example/phishing', 'javascript:alert(1)'])(
    '保存データが壊れていても信頼できない URL をリンクとして描画しない: %s',
    async (pageUrl) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              workspace_id: 'workspace-a',
              mode: 'api_key',
              page_url: pageUrl,
              api_key_masked: '****1234',
              api_key_status: 'stored_unverified',
              updated_at: 1,
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        ),
      );

      render(<NotionOpenLink tenantId="tenant-a" workspaceId="workspace-a" />);

      expect(await screen.findByRole('link', { name: 'Notion連携の設定' })).toBeTruthy();
      expect(screen.queryByRole('link', { name: 'Notionで開く' })).toBeNull();
    },
  );
});
