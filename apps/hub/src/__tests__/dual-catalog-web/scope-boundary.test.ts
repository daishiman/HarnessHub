/**
 * DC-SCOPE-01..04: feat-publish-pipeline 責務への非侵食と Stage 1 スコープ境界 (I4 / U7)。
 *
 * 「実装していないこと」を守るテスト。放っておくと便利さを理由に少しずつ越境し、
 * 同じ状態遷移が 2 か所に生まれる。境界を機械的に固定する。
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { httpCatalogPort } from '../../lib/catalog/http-adapter.js';

const COMPONENTS_DIR = path.resolve(import.meta.dirname, '../../components/catalog');
const CATALOG_ROUTE_DIR = path.resolve(import.meta.dirname, '../../app/(workspace)/catalog');

async function readAllSources(dir: string): Promise<{ file: string; source: string }[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  const files = entries.filter((item) => item.isFile() && /\.tsx?$/.test(item.name));
  return Promise.all(
    files.map(async (item) => ({
      file: path.join(item.parentPath, item.name),
      source: await readFile(path.join(item.parentPath, item.name), 'utf8'),
    })),
  );
}

describe('DC-SCOPE / 状態を変える導線を持たない', () => {
  it('DC-SCOPE-01: promote / rollback / 検査実行 / pointer 更新の導線を持たない', async () => {
    const sources = [...(await readAllSources(COMPONENTS_DIR)), ...(await readAllSources(CATALOG_ROUTE_DIR))];
    expect(sources.length).toBeGreaterThan(0);

    // これらは feat-publish-pipeline 所有の操作。UI から直接叩くと状態機械が二重管理になる
    const forbidden = ['/promote', '/rollback', '/suspend', '/submit', '/approve', '/cancel', '/package'];
    for (const { file, source } of sources) {
      for (const token of forbidden) {
        expect(source, `${file} が越境操作 (${token}) を呼んでいる`).not.toContain(token);
      }
    }
  });

  it('DC-SCOPE-02: 承認キュー UI (Stage 2) を実装していない', async () => {
    const files = await readdir(COMPONENTS_DIR, { recursive: true });
    for (const file of files) {
      expect(String(file).toLowerCase()).not.toContain('approval');
      expect(String(file).toLowerCase()).not.toContain('queue');
    }
  });
});

describe('DC-SCOPE / port の操作種別', () => {
  it('DC-SCOPE-03: CatalogPort は読み取りと install descriptor 取得のみ', () => {
    // 実装 (httpCatalogPort) のキーが契約の実体。増えた操作はここに必ず現れる
    expect(Object.keys(httpCatalogPort).sort()).toEqual([
      'getDetail',
      'getPublishRequest',
      'listEntries',
      'listReleases',
      'requestInstall',
    ]);
  });

  it('DC-SCOPE-03: 書込メソッドは install 要求のみで、それも descriptor 取得に閉じる', async () => {
    const source = await readFile(path.resolve(import.meta.dirname, '../../lib/catalog/http-adapter.ts'), 'utf8');
    const methods = [...source.matchAll(/method: '(\w+)'/g)].map((match) => match[1]);
    // POST は install descriptor 取得の 1 本だけ。PUT/PATCH/DELETE は持たない
    expect(methods.filter((method) => method === 'POST')).toHaveLength(1);
    for (const method of ['PUT', 'PATCH', 'DELETE']) {
      expect(methods).not.toContain(method);
    }
  });
});

describe('DC-SCOPE / descriptor の組み立て', () => {
  it('DC-SCOPE-04: install descriptor を UI 側で組み立てない', async () => {
    const source = await readFile(path.join(COMPONENTS_DIR, 'CatalogInstallPanel.tsx'), 'utf8');

    // R2 key・配布 URL・導入コマンドをクライアントで合成しない。
    // 合成すると pointer 切替の瞬間に「画面には出るが取得できない」導線になる
    for (const token of ['https://', 'r2.', '.zip', 'npx ', 'claude plugin']) {
      expect(source, `descriptor を UI で合成している (${token})`).not.toContain(token);
    }
    // 表示はサーバ応答のフィールドをそのまま出す形であること
    for (const field of ['descriptor.command', 'descriptor.download_url', 'descriptor.launch_url']) {
      expect(source).toContain(field);
    }
  });
});
