// @vitest-environment jsdom
/**
 * DC-POLL-LC-01..06 と 03B: S03 / S01 ポーリング hook の実 lifecycle 契約
 * (issue-dual-catalog-polling-terminal-visibility-20260810 の受入 1..3)。
 *
 * 純関数側の契約は `polling-contract.test.ts` が押さえている。ここで測るのは
 * **「その判定が実際に timer と listener の増減へ配線されているか」**。
 * 判定関数だけを検査すると、hook が結果を無視していても緑になるため分離できない。
 *
 * 検査の主軸は肯定ではなく否定的事実 —「次の request が発生しないこと」
 * 「unmount 後に listener が残らないこと」— なので、request 回数と
 * addEventListener/removeEventListener の対を数える形にしてある。
 */
import type { PublishRequestView } from '@harness-hub/schemas';
import { UiProvider } from '@harness-hub/ui';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CatalogPublishStatus } from '../../components/catalog/CatalogPublishStatus.js';
import { PublishWizard } from '../../components/publish/PublishWizard.js';
import type { CatalogFailure, CatalogPort, CatalogResult, CatalogScope } from '../../lib/catalog/index.js';
import type { PublishJourneyPort } from '../../lib/publish-journey/index.js';

const SCOPE: CatalogScope = { tenantId: 'tnt_test', workspaceId: 'wsp_test' };

/** `validating` は pollable。これを返し続ける限り hook は叩き続けるのが正しい。 */
function publishRequest(): PublishRequestView {
  return {
    id: 'pub_1',
    project_id: 'prj_1',
    status: 'validating',
    verdict: null,
    findings: [],
  } as unknown as PublishRequestView;
}

function failure(status: number | null): CatalogFailure {
  // kind は本番と同じ分類器の値域に合わせる。ここで独自値を作ると実装との乖離を検出できない
  const kind = status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : status === 400 ? 'fatal' : 'degraded';
  return { kind, status, retryAfterSeconds: null, message: `stub failure ${String(status)}` };
}

/** 呼ばれた回数を数えるだけの port。応答列は呼び出し側が決める。 */
function stubPort(responses: readonly CatalogResult<PublishRequestView>[]): {
  port: CatalogPort;
  calls: () => number;
} {
  let calls = 0;
  const port = {
    getPublishRequest: async (): Promise<CatalogResult<PublishRequestView>> => {
      const response = responses[Math.min(calls, responses.length - 1)];
      calls += 1;
      return response as CatalogResult<PublishRequestView>;
    },
  } as unknown as CatalogPort;
  return { port, calls: () => calls };
}

/** jsdom の visibilityState は読み取り専用。getter を差し替えて可視性を制御する。 */
function setVisibility(value: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value });
}

let container: HTMLDivElement;
let root: Root;

/**
 * React に「ここは act で囲まれたテスト環境だ」と宣言する。
 *
 * 未設定でも警告が出るだけでテストは通ってしまうが、その状態では
 * act() が effect と state 更新を確実に流し切る保証が無い —
 * 「本当は再開していないのに回数が合っているだけ」の緑を作りうるため必ず立てる。
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  vi.useFakeTimers();
  setVisibility('visible');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function mount(port: CatalogPort): Promise<void> {
  await act(async () => {
    root.render(
      createElement(UiProvider, null, createElement(CatalogPublishStatus, { scope: SCOPE, publishId: 'pub_1', port })),
    );
  });
}

/** 予約済み timer をすべて発火させ、その結果生じた fetch も解決させる。 */
async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('DC-POLL-LC / 終端失敗の即時停止', () => {
  it.each([
    ['401 unauthorized', 401],
    ['403 forbidden', 403],
    ['400 契約不正 (fatal)', 400],
  ])('DC-POLL-LC-01: %s では次の poll timer を予約しない', async (_label, status) => {
    const { port, calls } = stubPort([{ ok: false, failure: failure(status) }]);
    await mount(port);

    expect(calls()).toBe(1);

    // backoff 上限 30s の倍以上進めても、2 回目の request は発生しない
    await advance(120_000);
    expect(calls()).toBe(1);
  });

  it('DC-POLL-LC-02: 一過性失敗 (500 degraded) では従来どおり再試行する', async () => {
    const { port, calls } = stubPort([{ ok: false, failure: failure(500) }]);
    await mount(port);

    expect(calls()).toBe(1);

    // 初回 backoff は 2s。進めれば 2 回目が起きる = 終端扱いで潰していない
    await advance(2_000);
    expect(calls()).toBeGreaterThan(1);
  });
});

describe('DC-POLL-LC / 可視性の停止と再開', () => {
  it('DC-POLL-LC-03: hidden 中は poll せず、visible 復帰で一度だけ再開する', async () => {
    const { port, calls } = stubPort([{ ok: true, value: publishRequest() }]);
    await mount(port);
    expect(calls()).toBe(1);

    // 不可視化してから次の timer を発火させる → 追加 request は起きない
    const beforeHidden = calls();
    setVisibility('hidden');
    await advance(2_000);
    const afterHidden = calls();
    expect(afterHidden).toBe(beforeHidden);

    await advance(120_000);
    expect(calls()).toBe(afterHidden);

    // 復帰で即時に 1 回だけ再開する
    setVisibility('visible');
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(calls()).toBe(afterHidden + 1);
  });

  it('DC-POLL-LC-03B: S01 の公開ウィザードも hidden 中は通信せず、visible 復帰で一度だけ再開する', async () => {
    let calls = 0;
    const port: PublishJourneyPort = {
      createProject: async () => ({ ok: false, failure: { stage: 'project', status: 500, message: 'not used' } }),
      submitPackage: async () => ({ ok: false, failure: { stage: 'request', status: 500, message: 'not used' } }),
      getRequest: async () => {
        calls += 1;
        return { ok: true, value: publishRequest() };
      },
    };

    await act(async () => {
      root.render(
        createElement(
          UiProvider,
          null,
          createElement(PublishWizard, { scope: SCOPE, initialPublishId: 'pub_1', port }),
        ),
      );
    });
    expect(calls).toBe(1);

    setVisibility('hidden');
    await advance(2_000);
    expect(calls).toBe(1);

    setVisibility('visible');
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(calls).toBe(2);
  });

  it('DC-POLL-LC-04: 連続した visibilitychange でも再開は多重起動しない', async () => {
    const { port, calls } = stubPort([{ ok: true, value: publishRequest() }]);
    await mount(port);

    setVisibility('hidden');
    await advance(2_000);
    const afterHidden = calls();

    setVisibility('visible');
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      document.dispatchEvent(new Event('visibilitychange'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(calls()).toBe(afterHidden + 1);
  });

  it('DC-POLL-LC-05: 終端失敗のあとは visible 復帰でも再開しない', async () => {
    const { port, calls } = stubPort([{ ok: false, failure: failure(403) }]);
    await mount(port);
    expect(calls()).toBe(1);

    setVisibility('hidden');
    await advance(2_000);
    setVisibility('visible');
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(calls()).toBe(1);
  });
});

describe('DC-POLL-LC / 後片付け', () => {
  it('DC-POLL-LC-06: unmount 後に timer も listener も残らない', async () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    const { port, calls } = stubPort([{ ok: true, value: publishRequest() }]);
    await mount(port);
    const beforeUnmount = calls();

    const added = addSpy.mock.calls.filter(([type]) => type === 'visibilitychange');
    expect(added.length).toBe(1);

    await act(async () => {
      root.unmount();
    });

    const removed = removeSpy.mock.calls.filter(([type]) => type === 'visibilitychange');
    expect(removed.length).toBe(1);
    // 同一 handler 参照で解除している (別関数を渡すと解除されず listener が残る)
    expect(removed[0]?.[1]).toBe(added[0]?.[1]);

    // 残存 timer からの再入も無い
    await advance(120_000);
    expect(calls()).toBe(beforeUnmount);

    // afterEach の二重 unmount を避ける
    root = createRoot(document.createElement('div'));
  });
});
