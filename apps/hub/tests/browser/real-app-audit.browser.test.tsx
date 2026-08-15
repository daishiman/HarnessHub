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

import { describe, expect, it } from 'vitest';

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
  it('実 origin の URL を開き、実行数 1 の最小 smoke を証明する', async () => {
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
        width: 360,
        theme: 'light',
      };
      const report = await auditRealAppKeys({
        origin: `http://127.0.0.1:${address.port}`,
        keys: [key],
      });

      expect(requestedPaths).toEqual(['/legal']);
      expect(report.requestedKeyCount).toBe(1);
      expect(report.executedKeyCount).toBe(1);
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
