/**
 * テスト用の ZIP ライター (stored / deflate 両対応)。
 *
 * `packages/inspection` 側の fixture と別に持つのは、そちらが header 検査だけを対象にしていて
 * 無圧縮しか作らないため。ここでは**展開経路**を通すので deflate を作れる必要がある。
 * 共有したくなるが、そのために `@harness-hub/inspection` の非公開 module を deep import すると
 * 共通層 detector (`scripts/ci/check-shared-layer-duplicates.mjs`) が落とす。
 */

export interface ZipEntryInput {
  readonly path: string;
  readonly content?: string;
  /**
   * 既定は deflate。
   *
   * 文字列で指定したときだけ**中身も**その方式で書く (`'deflate'` なら実際に圧縮する)。
   * 数値で指定したときは中身を圧縮せずそのまま置き、header の method 欄だけをその値にする。
   * これで「未対応 method」と「deflate と名乗るのに壊れているストリーム」の両方を作れる。
   */
  readonly method?: 'stored' | 'deflate' | number;
  readonly unixMode?: number;
  /** 目録に書く展開後サイズ。省略時は実サイズ。上限違反の申告を作るための穴。 */
  readonly declaredUncompressedSize?: number;
}

const LOCAL_SIGNATURE = 0x04034b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const EOCD_SIGNATURE = 0x06054b50;
const METHOD_STORED = 0;
const METHOD_DEFLATE = 8;

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const owned = new Uint8Array(bytes.byteLength);
  owned.set(bytes);
  const source = new ReadableStream<BufferSource>({
    start(controller) {
      controller.enqueue(owned);
      controller.close();
    },
  });
  const compressed = source.pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(compressed).arrayBuffer());
}

function methodCodeOf(method: ZipEntryInput['method']): number {
  if (typeof method === 'number') return method;
  return method === 'stored' ? METHOD_STORED : METHOD_DEFLATE;
}

/** ZIP バイト列を組み立てる。CRC は 0 埋め (読み手が検査しないため)。 */
export async function buildTestZip(entries: readonly ZipEntryInput[]): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.path);
    const plain = encoder.encode(entry.content ?? '');
    const method = methodCodeOf(entry.method);
    // 圧縮するのは「文字列で deflate と指定された (= 既定を含む)」ときだけ。
    // 数値指定は header の申告と中身を意図的にずらすための経路なので、そのまま置く
    const compresses = entry.method === undefined || entry.method === 'deflate';
    const data = compresses ? await deflateRaw(plain) : plain;
    const declared = entry.declaredUncompressedSize ?? plain.byteLength;

    const local = new Uint8Array(30 + name.byteLength + data.byteLength);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, LOCAL_SIGNATURE, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(8, method, true);
    localView.setUint32(18, data.byteLength, true);
    localView.setUint32(22, declared, true);
    localView.setUint16(26, name.byteLength, true);
    local.set(name, 30);
    local.set(data, 30 + name.byteLength);
    locals.push(local);

    const central = new Uint8Array(46 + name.byteLength);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, CENTRAL_SIGNATURE, true);
    // version made by の上位バイト 3 = unix。external attributes を mode として読ませるため
    centralView.setUint16(4, 0x0314, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(10, method, true);
    centralView.setUint32(20, data.byteLength, true);
    centralView.setUint32(24, declared, true);
    centralView.setUint16(28, name.byteLength, true);
    centralView.setUint32(38, (entry.unixMode ?? 0o100644) << 16, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);

    offset += local.byteLength;
  }

  const centralBytes = concat(centrals);
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, EOCD_SIGNATURE, true);
  eocdView.setUint16(8, entries.length, true);
  eocdView.setUint16(10, entries.length, true);
  eocdView.setUint32(12, centralBytes.byteLength, true);
  eocdView.setUint32(16, offset, true);

  return concat([...locals, centralBytes, eocd]);
}

/** 検査に通る最小の skills-package。個別の違反を 1 つだけ足して差分を見るための基準点。 */
export const VALID_MANIFEST = JSON.stringify({
  name: 'demo-skills',
  version: '1.0.0',
  description: 'デモ用の skills package',
  owner: 'acme',
  visibility: 'workspace',
  summary: 'Catalog 表示用の短い説明',
});

export async function buildValidPackage(extra: readonly ZipEntryInput[] = []): Promise<Uint8Array> {
  return buildTestZip([
    { path: 'plugin.json', content: VALID_MANIFEST },
    { path: 'skills/demo/SKILL.md', content: '# demo\n\n手順を書く。\n' },
    ...extra,
  ]);
}
