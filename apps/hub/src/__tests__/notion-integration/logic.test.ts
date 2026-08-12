import { describe, expect, it } from 'vitest';
import {
  canOpenNotionPage,
  checkNotionIntegrationRequirements,
  maskNotionApiKey,
} from '../../features/notion-integration/logic.js';

describe('maskNotionApiKey', () => {
  it('末尾4文字だけを見せてマスクする', () => {
    expect(maskNotionApiKey('secret_abcdefghijklmnop1234')).toBe('****1234');
  });

  it('4文字以下のキーは末尾すら見せない', () => {
    expect(maskNotionApiKey('abcd')).toBe('****');
    expect(maskNotionApiKey('a')).toBe('****');
    expect(maskNotionApiKey('')).toBe('****');
  });
});

describe('checkNotionIntegrationRequirements', () => {
  it('url方式でpage_urlが無ければ拒否する', () => {
    const result = checkNotionIntegrationRequirements({
      mode: 'url',
      pageUrl: undefined,
      hasApiKeyInput: false,
      hasExistingApiKey: false,
    });
    expect(result).toEqual({ ok: false, field: 'page_url', message: expect.any(String) });
  });

  it('url方式で空白のみのpage_urlも拒否する', () => {
    const result = checkNotionIntegrationRequirements({
      mode: 'url',
      pageUrl: '   ',
      hasApiKeyInput: false,
      hasExistingApiKey: false,
    });
    expect(result.ok).toBe(false);
  });

  it('url方式でpage_urlがあれば許可する', () => {
    const result = checkNotionIntegrationRequirements({
      mode: 'url',
      pageUrl: 'https://www.notion.so/example',
      hasApiKeyInput: false,
      hasExistingApiKey: false,
    });
    expect(result).toEqual({ ok: true });
  });

  it('api_key方式で入力も既存キーも無ければ拒否する', () => {
    const result = checkNotionIntegrationRequirements({
      mode: 'api_key',
      pageUrl: undefined,
      hasApiKeyInput: false,
      hasExistingApiKey: false,
    });
    expect(result).toEqual({ ok: false, field: 'api_key', message: expect.any(String) });
  });

  it('api_key方式で新規入力があれば許可する (page_urlは任意)', () => {
    const result = checkNotionIntegrationRequirements({
      mode: 'api_key',
      pageUrl: undefined,
      hasApiKeyInput: true,
      hasExistingApiKey: false,
    });
    expect(result).toEqual({ ok: true });
  });

  it('api_key方式で既存キーがあり今回入力が無くても許可する (再保存で維持)', () => {
    const result = checkNotionIntegrationRequirements({
      mode: 'api_key',
      pageUrl: null,
      hasApiKeyInput: false,
      hasExistingApiKey: true,
    });
    expect(result).toEqual({ ok: true });
  });
});

describe('canOpenNotionPage', () => {
  it('page_urlがnullなら開けない', () => {
    expect(canOpenNotionPage(null)).toBe(false);
  });

  it('page_urlが空文字/空白のみなら開けない', () => {
    expect(canOpenNotionPage('')).toBe(false);
    expect(canOpenNotionPage('   ')).toBe(false);
  });

  it('page_urlに値があれば開ける', () => {
    expect(canOpenNotionPage('https://www.notion.so/example')).toBe(true);
  });
});
