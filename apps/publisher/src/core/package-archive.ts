/**
 * package の `InspectionFile[]` を無圧縮 (STORED) ZIP へ組み立てる (AD-1 core/, `PUT /publish/:id/package` 用)。
 *
 * バイトレイアウトは Hub 側 `packages/inspection` の `inspectArchiveHeader` が読む central directory 形式
 * (`packages/inspection/src/archive.ts`) に厳密に合わせる。同パッケージのテスト専用 `buildZipFixture`
 * (`archive-fixture.ts`) と同一レイアウトだが、あちらは `index.ts` から export されておらず
 * (test-only ユーティリティ)、かつ「壊れた ZIP をわざと作る」ための引数を持つため、
 * 正常系専用のこの実装を別に持つ。圧縮しないのは skills-package が小さく
 * (`ARCHIVE_LIMITS.maxCompressedBytes` = 10MiB)、圧縮実装のコストに見合わないため。
 */
import type { InspectionFile } from '@harness-hub/inspection';

const LOCAL_SIGNATURE = 0x04034b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const EOCD_SIGNATURE = 0x06054b50;
/** unix の st_mode (通常ファイル, rw-r--r--)。central directory の external attributes 上位 16bit に書く。 */
const UNIX_FILE_MODE = 0o100644;

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

export function buildPackageArchive(files: readonly InspectionFile[]): Uint8Array {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.path);
    const data = encoder.encode(file.content);

    const local = new Uint8Array(30 + name.byteLength + data.byteLength);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, LOCAL_SIGNATURE, true);
    localView.setUint16(4, 20, true);
    // 14..17 (crc32) は 0 のまま。inspectArchiveHeader/展開側のどちらも crc32 を検査しない。
    localView.setUint32(18, data.byteLength, true);
    localView.setUint32(22, data.byteLength, true);
    localView.setUint16(26, name.byteLength, true);
    local.set(name, 30);
    local.set(data, 30 + name.byteLength);
    locals.push(local);

    const central = new Uint8Array(46 + name.byteLength);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, CENTRAL_SIGNATURE, true);
    // version made by: 上位バイトを 3 (unix) にする。external attributes を mode として読ませるために要る。
    centralView.setUint16(4, 0x0314, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint32(20, data.byteLength, true);
    centralView.setUint32(24, data.byteLength, true);
    centralView.setUint16(28, name.byteLength, true);
    centralView.setUint32(38, UNIX_FILE_MODE << 16, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);

    offset += local.byteLength;
  }

  const centralBytes = concat(centrals);
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, EOCD_SIGNATURE, true);
  eocdView.setUint16(8, files.length, true);
  eocdView.setUint16(10, files.length, true);
  eocdView.setUint32(12, centralBytes.byteLength, true);
  eocdView.setUint32(16, offset, true);

  return concat([...locals, centralBytes, eocd]);
}
