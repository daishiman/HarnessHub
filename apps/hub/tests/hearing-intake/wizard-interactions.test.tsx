// @vitest-environment jsdom
/**
 * HI-WIZ-*: ヒアリングウィザードの実インタラクション。
 *
 * a11y-screens.test.tsx は SSR 初期状態 (useEffect も onClick も走らない静的 HTML) しか
 * 検証しないため、「次へ」でステップを進める・添付ファイルをステージングする・却下理由を
 * 表示する・送信後に添付を順番にアップロードし一部失敗を警告するといった実際の挙動は
 * 未検証のまま残っていた。ここでは feedback-loop/screen-interactions.test.tsx と同じ
 * createRoot + act パターンで、global fetch を stub して実際に画面を動かす。
 */
import type { CreateSheetResponse } from '@harness-hub/schemas';
import { UiProvider } from '@harness-hub/ui';
import { act, createElement, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HearingIntakeWizard } from '../../src/app/(dashboard)/sheets/new/hearing-intake-wizard.js';

const TENANT_ID = 'tenant-a';
const WORKSPACE_ID = 'ws-a1';

let container: HTMLDivElement;
let root: Root;

async function render(element: ReactElement): Promise<void> {
  await act(async () => {
    root.render(createElement(UiProvider, null, element));
  });
  await flush();
}

async function flush(): Promise<void> {
  for (let index = 0; index < 4; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

function jsonResponse(body: unknown, init: { readonly ok?: boolean; readonly status?: number } = {}): Response {
  const ok = init.ok ?? true;
  const status = init.status ?? (ok ? 200 : 500);
  return { ok, status, json: async () => body } as Response;
}

/** ラベルの表示テキストから、FormField が発行した id 経由で対応する入力欄を引く。 */
function getControlByLabel<T extends Element>(labelText: string): T {
  const labels = Array.from(container.querySelectorAll('label'));
  const label = labels.find((candidate) => candidate.textContent?.startsWith(labelText));
  if (label === undefined) throw new Error(`ラベルが見つかりません: ${labelText}`);
  const id = label.getAttribute('for');
  if (id === null) throw new Error(`ラベルに for がありません: ${labelText}`);
  const control = container.querySelector<T>(`#${id}`);
  if (control === null) throw new Error(`入力欄が見つかりません: ${labelText}`);
  return control;
}

async function setValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): Promise<void> {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  if (setter === undefined) throw new Error('value setter がありません');
  await act(async () => {
    setter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function findButtonByText(text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === text);
  if (button === undefined) throw new Error(`ボタンが見つかりません: ${text}`);
  return button;
}

async function clickButton(text: string): Promise<void> {
  const button = findButtonByText(text);
  await act(async () => {
    button.click();
  });
  await flush();
}

async function addFileToInput(file: File): Promise<void> {
  const input = getControlByLabel<HTMLInputElement>('ファイルを選択');
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

/** 基本情報〜要望まで、7画面ウィザードの必須項目をすべて埋めて review ステップまで進める。 */
async function fillAllStepsUpToReview(): Promise<void> {
  await setValue(getControlByLabel('業務名'), '請求書処理');
  await setValue(getControlByLabel('会社名'), 'サンプル社');
  await setValue(getControlByLabel('申請者'), '山田');
  await setValue(getControlByLabel('業務領域'), '経理');
  await clickButton('次へ');

  await setValue(getControlByLabel('現在の課題'), '手入力が多い');
  await setValue(getControlByLabel('利用中のツール'), '表計算');
  await setValue(getControlByLabel('月間工数（時間）'), '40');
  await setValue(getControlByLabel('対象人数'), '5');
  await setValue(getControlByLabel('想定年収（円）'), '6000000');
  await clickButton('次へ');

  await setValue(getControlByLabel('共有相手'), 'チーム内');
  await setValue(getControlByLabel('ナレッジ資産'), '経理マニュアル');
  await clickButton('次へ');

  await clickButton('次へ'); // request-pattern -> reference
  await clickButton('次へ'); // reference -> request
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.replaceChildren(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('HI-WIZ: ステップ移動と入力', () => {
  it('HI-WIZ-001: 必須項目を埋めると次のステップへ進み、整理・確認ステップの内容へ反映される', async () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    });
    await render(<HearingIntakeWizard tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} />);

    await fillAllStepsUpToReview();
    await setValue(getControlByLabel('ほしい機能'), 'OCR と確認画面');
    await setValue(getControlByLabel('希望する出力'), 'CSV');
    await clickButton('次へ');

    expect(container.textContent).toContain('業務名: 請求書処理');
    expect(container.textContent).toContain('これまでの入力内容を確認し');
  });
});

describe('HI-WIZ: 添付ファイルのステージング (参考URL・添付ステップ)', () => {
  it('HI-WIZ-002: 対応形式のファイルはステージング一覧へ追加され、非対応形式は却下理由を表示する', async () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    });
    await render(<HearingIntakeWizard tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} />);

    await setValue(getControlByLabel('業務名'), '請求書処理');
    await setValue(getControlByLabel('会社名'), 'サンプル社');
    await setValue(getControlByLabel('申請者'), '山田');
    await setValue(getControlByLabel('業務領域'), '経理');
    await clickButton('次へ');
    await setValue(getControlByLabel('現在の課題'), '手入力が多い');
    await setValue(getControlByLabel('利用中のツール'), '表計算');
    await setValue(getControlByLabel('月間工数（時間）'), '40');
    await setValue(getControlByLabel('対象人数'), '5');
    await setValue(getControlByLabel('想定年収（円）'), '6000000');
    await clickButton('次へ');
    await setValue(getControlByLabel('共有相手'), 'チーム内');
    await setValue(getControlByLabel('ナレッジ資産'), '経理マニュアル');
    await clickButton('次へ');
    await clickButton('次へ'); // request-pattern -> reference

    const badFile = new File([new Uint8Array(10)], 'archive.zip', { type: 'application/zip' });
    await addFileToInput(badFile);
    expect(container.textContent).toContain('追加できなかったファイルがあります');
    expect(container.textContent).toContain('archive.zip');

    const goodFile = new File([new Uint8Array(10)], 'screenshot.png', { type: 'image/png' });
    await addFileToInput(goodFile);
    expect(container.textContent).toContain('screenshot.png');

    const removeButton = Array.from(container.querySelectorAll('li'))
      .find((item) => item.textContent?.includes('screenshot.png'))
      ?.querySelector('button');
    if (removeButton === null || removeButton === undefined) throw new Error('削除ボタンが見つかりません');
    await act(async () => {
      removeButton.click();
    });
    expect(container.textContent).toContain('まだ添付ファイルは追加されていません。');
  });
});

describe('HI-WIZ: 送信と添付アップロード', () => {
  function stubFetch(screenshotOk: boolean): ReturnType<typeof vi.fn> {
    return vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/v1/sheets') {
        return jsonResponse({
          id: 'sheet-1',
          revision: 1,
          code: 'HS-0001',
          status: 'generating',
        } satisfies CreateSheetResponse);
      }
      if (url === '/api/v1/sheets/sheet-1/screenshots') {
        return jsonResponse({}, { ok: screenshotOk, status: screenshotOk ? 201 : 500 });
      }
      throw new Error(`想定外の fetch: ${url}`);
    });
  }

  async function reachReviewWithAttachment(): Promise<void> {
    await setValue(getControlByLabel('業務名'), '請求書処理');
    await setValue(getControlByLabel('会社名'), 'サンプル社');
    await setValue(getControlByLabel('申請者'), '山田');
    await setValue(getControlByLabel('業務領域'), '経理');
    await clickButton('次へ');
    await setValue(getControlByLabel('現在の課題'), '手入力が多い');
    await setValue(getControlByLabel('利用中のツール'), '表計算');
    await setValue(getControlByLabel('月間工数（時間）'), '40');
    await setValue(getControlByLabel('対象人数'), '5');
    await setValue(getControlByLabel('想定年収（円）'), '6000000');
    await clickButton('次へ');
    await setValue(getControlByLabel('共有相手'), 'チーム内');
    await setValue(getControlByLabel('ナレッジ資産'), '経理マニュアル');
    await clickButton('次へ');
    await clickButton('次へ');
    await addFileToInput(new File([new Uint8Array(10)], 'screenshot.png', { type: 'image/png' }));
    await clickButton('次へ');
    await setValue(getControlByLabel('ほしい機能'), 'OCR と確認画面');
    await setValue(getControlByLabel('希望する出力'), 'CSV');
    await clickButton('次へ');
  }

  it('HI-WIZ-003: 送信成功後、ステージング済みの添付を順番にアップロードし受付完了画面を出す', async () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    });
    const fetchMock = stubFetch(true);
    vi.stubGlobal('fetch', fetchMock);

    await render(<HearingIntakeWizard tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} />);
    await reachReviewWithAttachment();
    await clickButton('完了');

    expect(container.textContent).toContain('受付が完了しました');
    expect(container.textContent).toContain('HS-0001');
    expect(container.textContent).not.toContain('一部の添付ファイルをアップロードできませんでした');

    const screenshotCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/screenshots'));
    expect(screenshotCalls).toHaveLength(1);
    const createCall = fetchMock.mock.calls.find(([url]) => String(url) === '/api/v1/sheets');
    expect(new Headers(createCall?.[1]?.headers).get('idempotency-key')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('CARD-MUTATION-UI-SHEETS-001: 通信失敗後の再送でフォーム開始時の Idempotency-Key を保持する', async () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    });
    let attempts = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      if (String(input) !== '/api/v1/sheets') return jsonResponse({});
      attempts += 1;
      if (attempts === 1) throw new TypeError('network error');
      return jsonResponse({ id: 'sheet-1', revision: 1, code: 'HS-0001', status: 'generating' });
    });
    vi.stubGlobal('fetch', fetchMock);

    await render(<HearingIntakeWizard tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} />);
    await reachReviewWithAttachment();
    await clickButton('完了');
    expect(container.textContent).toContain('network error');
    await clickButton('完了');

    const createCalls = fetchMock.mock.calls.filter(([url]) => String(url) === '/api/v1/sheets');
    expect(createCalls).toHaveLength(2);
    const keys = createCalls.map(([, init]) => new Headers(init?.headers).get('idempotency-key'));
    expect(keys[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(keys[1]).toBe(keys[0]);
  });

  it('HI-WIZ-004: 添付アップロードが失敗しても、シート作成自体は成功として扱い失敗ファイル名を知らせる', async () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    });
    vi.stubGlobal('fetch', stubFetch(false));

    await render(<HearingIntakeWizard tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} />);
    await reachReviewWithAttachment();
    await clickButton('完了');

    expect(container.textContent).toContain('受付が完了しました');
    expect(container.textContent).toContain('一部の添付ファイルをアップロードできませんでした');
    expect(container.textContent).toContain('screenshot.png');
  });
});
