/**
 * テスト用の最小 ZIP ライター (無圧縮のみ)。
 *
 * fixture ファイルを置かずにコードで組み立てるのは、上限違反・zip slip・symlink といった
 * **壊れた入力**を確かめるため。正常な ZIP は zip コマンドで作れるが、
 * 「目録のサイズ欄だけ嘘をついた ZIP」は既存ツールでは作れない。
 *
 * CRC は 0 で埋める。`inspectArchiveHeader` も展開側も CRC を検査しないため、
 * ここで正しい値を計算しても何も強くならない (検査したくなったら合わせて実装する)。
 */

export interface ZipFixtureEntry {
  readonly path: string;
  readonly content?: string;
  /** unix の st_mode。symlink を作るときは 0o120000 を渡す。 */
  readonly unixMode?: number;
  /** 目録に書く展開後サイズ。省略時は実サイズ。**嘘をつく**ためだけの穴。 */
  readonly declaredUncompressedSize?: number;
}

const LOCAL_SIGNATURE = 0x04034b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const EOCD_SIGNATURE = 0x06054b50;

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

export function buildZipFixture(entries: readonly ZipFixtureEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.path);
    const data = encoder.encode(entry.content ?? '');
    const declared = entry.declaredUncompressedSize ?? data.byteLength;

    const local = new Uint8Array(30 + name.byteLength + data.byteLength);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, LOCAL_SIGNATURE, true);
    localView.setUint16(4, 20, true);
    // 14..17 の crc32 は 0 のまま (読み手が検査しないため)
    localView.setUint32(18, data.byteLength, true);
    localView.setUint32(22, declared, true);
    localView.setUint16(26, name.byteLength, true);
    local.set(name, 30);
    local.set(data, 30 + name.byteLength);
    locals.push(local);

    const central = new Uint8Array(46 + name.byteLength);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, CENTRAL_SIGNATURE, true);
    // version made by: 上位バイト 3 = unix。external attributes を mode として読ませるために要る
    centralView.setUint16(4, 0x0314, true);
    centralView.setUint16(6, 20, true);
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
