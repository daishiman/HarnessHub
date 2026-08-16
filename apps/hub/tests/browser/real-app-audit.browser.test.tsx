/**
 * 28 実 route の UI 監査契約。
 *
 * 既存の 5 合成 fixture は detector 自身の回帰確認に使うもので、
 * 実アプリの route 母数ではない。route/state の正本は DB seed 側の
 * COVERAGE_MATRIX だけとし、そこから実走キーと到達 URL を導出する。
 */
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';

import { UiProvider } from '@harness-hub/ui';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ScreenshotsPanel } from '../../src/features/hearing-intake/components/screenshots-panel.js';
import {
  auditRealAppKeys,
  buildRealAppAuditPlan,
  discoverNextPageRoutes,
  formatAuditKey,
  type RealAppAuditKey,
} from './real-app-audit.js';

const appRoot = fileURLToPath(new URL('../../src/app', import.meta.url));

describe('COVERAGE_MATRIX と実 Next route の契約', () => {
  it('route・実走キー・applicable state cell を別の母数として固定する', () => {
    const plan = buildRealAppAuditPlan();

    expect(plan.routes).toHaveLength(28);
    expect(plan.keys).toHaveLength(168);
    expect(plan.stateCells).toHaveLength(105);
    expect(plan.totalStateCells).toBe(140);
    expect(new Set(plan.keys.map(formatAuditKey)).size).toBe(168);
    expect(countBy(plan.routes, (route) => route.actor)).toEqual({
      anonymous: 4,
      member: 17,
      'provider-admin': 1,
      'workspace-admin': 6,
    });
  });

  it('route 母数 0 を PASS にしない', () => {
    expect(() => buildRealAppAuditPlan([])).toThrow(/route 母数が 0/);
  });

  it('COVERAGE_MATRIX と page.tsx から導出した route 集合が一致する', () => {
    const matrixRoutes = buildRealAppAuditPlan()
      .routes.map((route) => route.route)
      .sort();
    const nextRoutes = discoverNextPageRoutes(appRoot);

    expect(nextRoutes.length).toBeGreaterThan(0);
    expect(matrixRoutes).toEqual(nextRoutes);
  });
});

describe('実アプリ browser runner の契約', () => {
  it('同一 route は 1 回だけ開き、幅・theme の全軸を実 DOM で計測する', async () => {
    const requestedPaths: string[] = [];
    const server = createServer((request, response) => {
      requestedPaths.push(request.url ?? '');
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end('<!doctype html><html lang="ja"><body><main><h1>利用規約</h1></main></body></html>');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    try {
      const address = server.address() as AddressInfo;
      const key: RealAppAuditKey = {
        screenCode: 'SCR-04',
        route: '/legal',
        url: '/legal',
        actor: 'anonymous',
        width: 360,
        theme: 'light',
      };
      const report = await auditRealAppKeys({
        origin: `http://127.0.0.1:${address.port}`,
        keys: [key, { ...key, width: 1280, theme: 'dark' }],
      });

      // Chrome はページ本体とは別に favicon を自動取得する場合がある。
      // 監査対象の遷移先だけを固定し、ブラウザ実装の補助リソース差と分離する。
      expect(requestedPaths.filter((path) => path !== '/favicon.ico')).toEqual(['/legal']);
      expect(report.requestedKeyCount).toBe(2);
      expect(report.executedKeyCount).toBe(2);
      expect(report.unreachable).toEqual([]);
      expect(report.violations).toEqual([]);
      expect(report.status).toBe('pass');
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error === undefined ? resolve() : reject(error))),
      );
    }
  });

  it('全 route が未到達な run を違反 0 の PASS にしない', async () => {
    const server = createServer((_request, response) => {
      response.writeHead(401, { 'content-type': 'text/html; charset=utf-8' });
      response.end('<!doctype html><html lang="ja"><body>認証が必要です</body></html>');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    try {
      const address = server.address() as AddressInfo;
      const report = await auditRealAppKeys({
        origin: `http://127.0.0.1:${address.port}`,
        keys: [
          {
            screenCode: 'SCR-20',
            route: '/sheets',
            url: '/sheets',
            actor: 'member',
            width: 1280,
            theme: 'dark',
          },
        ],
      });

      expect(report.requestedKeyCount).toBe(1);
      expect(report.executedKeyCount).toBe(0);
      expect(report.unreachable).toHaveLength(1);
      expect(report.violations).toEqual([]);
      expect(report.status).toBe('blocked');
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error === undefined ? resolve() : reject(error))),
      );
    }
  });

  it('route の actor ごとに Cookie を分離し、匿名 route へ認証Cookieを送らない', async () => {
    const requests: Array<{ readonly path: string; readonly cookie: string }> = [];
    const server = createServer((request, response) => {
      requests.push({ path: request.url ?? '', cookie: request.headers.cookie ?? '' });
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end('<!doctype html><html lang="ja"><body><main><h1>actor別監査</h1></main></body></html>');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    try {
      const address = server.address() as AddressInfo;
      const report = await auditRealAppKeys({
        origin: `http://127.0.0.1:${address.port}`,
        keys: [
          {
            screenCode: 'PUBLIC',
            route: '/public',
            url: '/public',
            actor: 'anonymous',
            width: 360,
            theme: 'light',
          },
          {
            screenCode: 'MEMBER',
            route: '/member',
            url: '/member',
            actor: 'member',
            width: 360,
            theme: 'light',
          },
        ],
        cookieHeaders: { member: 'audit_session=member-token' },
      });

      const navigations = requests.filter((request) => request.path !== '/favicon.ico');
      expect(navigations).toEqual([
        { path: '/public', cookie: '' },
        { path: '/member', cookie: 'audit_session=member-token' },
      ]);
      expect(report).toMatchObject({ status: 'pass', requestedKeyCount: 2, executedKeyCount: 2, unreachable: [] });
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error === undefined ? resolve() : reject(error))),
      );
    }
  });

  it('保護 route の actor Cookie が無ければ navigation 前に blocked とする', async () => {
    let requestCount = 0;
    const server = createServer((_request, response) => {
      requestCount += 1;
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end('<!doctype html><html lang="ja"><body>誤到達</body></html>');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    try {
      const address = server.address() as AddressInfo;
      const report = await auditRealAppKeys({
        origin: `http://127.0.0.1:${address.port}`,
        keys: [
          {
            screenCode: 'ADMIN',
            route: '/admin',
            url: '/admin',
            actor: 'workspace-admin',
            width: 1280,
            theme: 'dark',
          },
        ],
      });

      expect(requestCount).toBe(0);
      expect(report).toMatchObject({ status: 'blocked', requestedKeyCount: 1, executedKeyCount: 0 });
      expect(report.unreachable).toEqual([
        expect.objectContaining({
          key: '/admin|1280|dark',
          status: null,
          reason: expect.stringMatching(/workspace-admin.*Cookie/),
        }),
      ]);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error === undefined ? resolve() : reject(error))),
      );
    }
  });

  it('radio は関連付けた label の実操作領域で判定する', async () => {
    const server = createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(`<!doctype html><html lang="ja"><body>
        <label for="stage" style="display:inline-flex;align-items:center;min-width:44px;min-height:44px">
          <input id="stage" type="radio" style="width:13px;height:13px"> ビルド
        </label>
      </body></html>`);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    try {
      const address = server.address() as AddressInfo;
      const report = await auditRealAppKeys({
        origin: `http://127.0.0.1:${address.port}`,
        keys: [
          {
            screenCode: 'LABEL',
            route: '/label',
            url: '/label',
            actor: 'anonymous',
            width: 360,
            theme: 'light',
          },
        ],
      });

      expect(report.violations).toEqual([]);
      expect(report.status).toBe('pass');
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error === undefined ? resolve() : reject(error))),
      );
    }
  });

  it('遅れて描画されるclient contentが安定してから最初の軸を計測する', async () => {
    const server = createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(`<!doctype html><html lang="ja"><body><main><h1>遅延描画</h1></main>
        <script>
          window.setTimeout(() => {
            const link = document.createElement('a');
            link.href = '/late';
            link.textContent = '遅れて現れる小さなリンク';
            link.style.cssText = 'display:inline-block;width:20px;height:20px;overflow:hidden';
            document.querySelector('main').append(link);
          }, 1_500);
        </script>
      </body></html>`);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    try {
      const address = server.address() as AddressInfo;
      const report = await auditRealAppKeys({
        origin: `http://127.0.0.1:${address.port}`,
        keys: [
          {
            screenCode: 'LATE',
            route: '/late',
            url: '/late',
            actor: 'anonymous',
            width: 360,
            theme: 'light',
          },
        ],
      });

      expect(report.violations).toEqual([expect.objectContaining({ code: 'tap-target-under-44', element: 'a' })]);
      expect(report.status).toBe('fail');
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error === undefined ? resolve() : reject(error))),
      );
    }
  });

  it('添付ファイル入力群は360pxで画面全体を横へ押し広げない', async () => {
    const markup = renderToStaticMarkup(
      <UiProvider>
        <main style={{ marginInline: '33px', width: '294px' }}>
          <ScreenshotsPanel id="sheet-1" tenantId="tenant-1" workspaceId="workspace-1" />
        </main>
      </UiProvider>,
    );
    const server = createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(`<!doctype html><html lang="ja"><body style="margin:0">${markup}</body></html>`);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    try {
      const address = server.address() as AddressInfo;
      const report = await auditRealAppKeys({
        origin: `http://127.0.0.1:${address.port}`,
        keys: [
          {
            screenCode: 'ATTACHMENTS',
            route: '/attachments',
            url: '/attachments',
            actor: 'anonymous',
            width: 360,
            theme: 'light',
          },
        ],
      });

      expect(report.violations.filter((violation) => violation.code === 'horizontal-overflow')).toEqual([]);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error === undefined ? resolve() : reject(error))),
      );
    }
  });
});

describe('UI 崩れ detector の liveness', () => {
  it('横溢れ・44px 未満操作域・意味 segment 内改行をそれぞれ検出する', async () => {
    const server = createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(`<!doctype html>
        <html lang="ja">
          <body style="margin:0">
            <main>
              <div data-negative-overflow style="width:720px">横溢れ</div>
              <button data-negative-tap style="width:20px;height:20px;padding:0">小</button>
              <p style="width:2em">
                <span data-hh-meaning-segment style="font-size:16px;line-height:20px">使用状況</span>
              </p>
            </main>
          </body>
        </html>`);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    try {
      const address = server.address() as AddressInfo;
      const report = await auditRealAppKeys({
        origin: `http://127.0.0.1:${address.port}`,
        keys: [
          {
            screenCode: 'NEG-01',
            route: '/negative',
            url: '/negative',
            actor: 'anonymous',
            width: 360,
            theme: 'light',
          },
        ],
      });
      const codes = new Set(report.violations.map((violation) => violation.code));

      expect(codes).toEqual(new Set(['horizontal-overflow', 'tap-target-under-44', 'meaning-segment-word-break']));
      expect(report.status).toBe('fail');
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error === undefined ? resolve() : reject(error))),
      );
    }
  });
});

function countBy<T>(values: readonly T[], keyOf: (value: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    const key = keyOf(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
