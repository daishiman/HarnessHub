/**
 * production publish smoke 用の ZIP fixture 生成。
 *
 * 検査用 ZIP の組み立てだけを担い、HTTP / DB / 資格情報は扱わない。
 * `smoke-production-publish-support.ts` が 500 行を超えないよう分離する (HarnessHub-aauo)。
 */

import { createHash, randomBytes } from 'node:crypto';

interface ZipEntry {
  readonly path: string;
  readonly content: string;
}

function smokeId(kind: string): string {
  return `smoke_${kind}_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`;
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

/** packages/inspection の展開経路が受理する stored ZIP を fixture file 無しで作る。 */
function buildZip(entries: readonly ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.path);
    const data = encoder.encode(entry.content);
    const local = new Uint8Array(30 + name.byteLength + data.byteLength);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint32(18, data.byteLength, true);
    localView.setUint32(22, data.byteLength, true);
    localView.setUint16(26, name.byteLength, true);
    local.set(name, 30);
    local.set(data, 30 + name.byteLength);
    locals.push(local);

    const central = new Uint8Array(46 + name.byteLength);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 0x0314, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint32(20, data.byteLength, true);
    centralView.setUint32(24, data.byteLength, true);
    centralView.setUint16(28, name.byteLength, true);
    centralView.setUint32(38, 0o100644 << 16, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);
    offset += local.byteLength;
  }

  const directory = concat(centrals);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, directory.byteLength, true);
  endView.setUint32(16, offset, true);
  return concat([...locals, directory, end]);
}

function greenZip(version: string): Uint8Array {
  return buildZip([
    {
      path: 'plugin.json',
      content: JSON.stringify({
        name: `production-smoke-${version}`,
        version,
        description: 'P13 production smoke fixture',
        owner: 'harness-hub-smoke',
        visibility: 'workspace',
        summary: 'Disposable production smoke package',
      }),
    },
    { path: 'skills/smoke/SKILL.md', content: `# smoke ${version}\n\nproduction smoke fixture\n` },
  ]);
}

function secretZip(): Uint8Array {
  // リポジトリ自体の secret scan は通し、生成した ZIP の中だけで検知対象を作る。
  const syntheticAwsAccessKeyId = ['AKIA', '0123456789ABCDEF'].join('');
  return buildZip([
    {
      path: 'plugin.json',
      content: JSON.stringify({
        name: 'production-smoke-secret',
        version: '1.0.0',
        description: 'P13 rejection fixture',
        owner: 'harness-hub-smoke',
        visibility: 'workspace',
        summary: 'Must be rejected by secret scan',
      }),
    },
    { path: 'skills/smoke/SKILL.md', content: `# reject\n\nAWS_ACCESS_KEY_ID=${syntheticAwsAccessKeyId}\n` },
  ]);
}

export { greenZip, secretZip, sha256, smokeId };
