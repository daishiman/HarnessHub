/**
 * アップロード ZIP の**展開前**検査 (security-spec-request-controls.md §6.3)。
 *
 * 展開してから判定すると zip bomb を先に食らうため、判定材料は
 * **central directory (目録) だけ**に限る。目録には各エントリの圧縮前後サイズ・名前・属性が
 * 入っており、展開せずに上限違反と path traversal を判定できる。
 *
 * この module は `packages/inspection` の他ルールと同じく**純関数**である。
 * バイト列は呼び出し側が読み終えた状態で渡す (I/O をここへ持ち込まない)。
 * Hub 側の正式検査と Publisher CLI のローカル pre-check が同じ結論になることが成立条件のため
 * (qa-010 / qa-020: 二重実装禁止)。
 *
 * **目録の値を信用してよいのは「拒否の判断」だけ**である。合格したあとに実際へ展開するときは、
 * 展開しながら実サイズを再計測しなければならない (目録は偽装できる)。再計測は展開側の責務。
 */

import type { Finding } from './types';

/** security-spec-request-controls.md §6.3 の確定値。ここが数値の正本。 */
export const ARCHIVE_LIMITS = {
  /** 最大圧縮サイズ 10 MiB。 */
  maxCompressedBytes: 10 * 1024 * 1024,
  /** 最大展開サイズ 50 MiB。 */
  maxUncompressedBytes: 50 * 1024 * 1024,
  /** 最大圧縮比 100:1。 */
  maxCompressionRatio: 100,
  maxEntries: 1000,
  maxPathLength: 255,
  maxDirectoryDepth: 10,
} as const;

export const ARCHIVE_RULE_IDS = [
  'ARCHIVE-FORMAT',
  'ARCHIVE-MAX-COMPRESSED',
  'ARCHIVE-MAX-UNCOMPRESSED',
  'ARCHIVE-MAX-RATIO',
  'ARCHIVE-MAX-ENTRIES',
  'ARCHIVE-PATH-LENGTH',
  'ARCHIVE-PATH-DEPTH',
  'ARCHIVE-PATH-TRAVERSAL',
  'ARCHIVE-ENTRY-TYPE',
] as const;

export interface ArchiveEntry {
  readonly path: string;
  readonly compressedSize: number;
  readonly uncompressedSize: number;
  /** ZIP の compression method。0=stored / 8=deflate。 */
  readonly compressionMethod: number;
  readonly localHeaderOffset: number;
  readonly isDirectory: boolean;
  readonly isSymlink: boolean;
}

export interface ArchiveHeaderReport {
  /** 展開してよいか。false のとき entries は「読めた範囲」でしかない。 */
  readonly ok: boolean;
  readonly entries: readonly ArchiveEntry[];
  readonly findings: readonly Finding[];
}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
/** EOCD は最大 22 + 65535 バイト後方にある (comment 長の上限が 65535)。 */
const EOCD_MAX_SEARCH = 22 + 0xffff;
/** unix の st_mode 上位 4 bit。0xA = S_IFLNK (シンボリックリンク)。 */
const S_IFLNK = 0xa;
/** NUL バイト。生の制御文字をソースへ埋めると git/grep がバイナリ扱いするためエスケープ表記で書く。 */
const NUL_BYTE = '\u0000';

function error(ruleId: string, message: string, path?: string): Finding {
  return {
    ruleId,
    stage: 'static-validation',
    severity: 'error',
    message,
    ...(path === undefined ? {} : { location: { path } }),
  };
}

/**
 * path traversal (zip slip) の判定。
 *
 * 「`..` を含むか」だけを見ると `a/../../b` のような打ち消しを取りこぼす。
 * セグメント単位で正規化し、**途中で一度でも起点より上に出たら拒否**する。
 * 深さが戻っても、その時点で展開先の外を指した事実は消えない。
 */
function isTraversal(path: string): boolean {
  if (path.startsWith('/') || path.startsWith('\\')) return true;
  // Windows のドライブ指定 (C:foo) と UNC を絶対パスとして扱う
  if (/^[A-Za-z]:/.test(path)) return true;
  // NUL 埋め込みは途中で切れる実装を突く古典的な細工。生の制御文字を書くと
  // ファイル全体がバイナリ扱いになるため必ずエスケープ表記にする
  if (path.includes(NUL_BYTE)) return true;

  let depth = 0;
  for (const segment of path.split(/[/\\]/)) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      depth -= 1;
      if (depth < 0) return true;
      continue;
    }
    depth += 1;
  }
  return false;
}

function directoryDepth(path: string): number {
  return path.split('/').filter((segment) => segment.length > 0).length;
}

function readUint16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function readUint32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

/** EOCD の位置。見つからなければ -1 (= ZIP ではない)。 */
function findEndOfCentralDirectory(view: DataView): number {
  const start = Math.max(0, view.byteLength - EOCD_MAX_SEARCH);
  for (let offset = view.byteLength - 22; offset >= start; offset -= 1) {
    if (readUint32(view, offset) === EOCD_SIGNATURE) return offset;
  }
  return -1;
}

/**
 * ZIP の目録を読み、上限と path の安全性を判定する。
 *
 * 例外を投げず report で返すのは、壊れた ZIP も「拒否理由つきの検査結果」として
 * 利用者へ返したいため。例外にすると呼び出し側が 500 に落とす経路を書くことになり、
 * 利用者は何が悪いのか分からないまま再送を繰り返す。
 */
export function inspectArchiveHeader(bytes: Uint8Array): ArchiveHeaderReport {
  const findings: Finding[] = [];

  if (bytes.byteLength > ARCHIVE_LIMITS.maxCompressedBytes) {
    findings.push(
      error(
        'ARCHIVE-MAX-COMPRESSED',
        `圧縮サイズが上限を超えています (${bytes.byteLength} bytes > ${ARCHIVE_LIMITS.maxCompressedBytes} bytes)`,
      ),
    );
    // サイズ超過の時点で目録を読みに行かない。読む行為自体が資源消費になる
    return { ok: false, entries: [], findings };
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEndOfCentralDirectory(view);
  if (eocd < 0) {
    return { ok: false, entries: [], findings: [error('ARCHIVE-FORMAT', 'ZIP アーカイブとして解析できません')] };
  }

  const entryCount = readUint16(view, eocd + 10);
  if (entryCount > ARCHIVE_LIMITS.maxEntries) {
    findings.push(
      error('ARCHIVE-MAX-ENTRIES', `エントリ数が上限を超えています (${entryCount} > ${ARCHIVE_LIMITS.maxEntries})`),
    );
    return { ok: false, entries: [], findings };
  }

  const entries: ArchiveEntry[] = [];
  let cursor = readUint32(view, eocd + 16);
  let totalUncompressed = 0;
  let totalCompressed = 0;

  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > view.byteLength || readUint32(view, cursor) !== CENTRAL_DIRECTORY_SIGNATURE) {
      findings.push(error('ARCHIVE-FORMAT', `central directory の ${index + 1} 件目を解析できません`));
      return { ok: false, entries, findings };
    }

    const method = readUint16(view, cursor + 10);
    const compressedSize = readUint32(view, cursor + 20);
    const uncompressedSize = readUint32(view, cursor + 24);
    const nameLength = readUint16(view, cursor + 28);
    const extraLength = readUint16(view, cursor + 30);
    const commentLength = readUint16(view, cursor + 32);
    const externalAttributes = readUint32(view, cursor + 38);
    const localHeaderOffset = readUint32(view, cursor + 42);
    const rawName = bytes.subarray(cursor + 46, cursor + 46 + nameLength);
    const path = new TextDecoder('utf-8').decode(rawName);

    const isDirectory = path.endsWith('/');
    // 上位 16 bit が unix mode。0 のときは Windows 作成で mode 情報が無い
    const unixMode = externalAttributes >>> 16;
    const isSymlink = ((unixMode >>> 12) & 0xf) === S_IFLNK;

    if (path.length > ARCHIVE_LIMITS.maxPathLength) {
      findings.push(
        error('ARCHIVE-PATH-LENGTH', `パスが長すぎます (${path.length} > ${ARCHIVE_LIMITS.maxPathLength})`, path),
      );
    }
    if (directoryDepth(path) > ARCHIVE_LIMITS.maxDirectoryDepth) {
      findings.push(error('ARCHIVE-PATH-DEPTH', `ディレクトリ階層が深すぎます`, path));
    }
    if (isTraversal(path)) {
      findings.push(error('ARCHIVE-PATH-TRAVERSAL', `展開先の外を指すパスです`, path));
    }
    if (isSymlink) {
      findings.push(error('ARCHIVE-ENTRY-TYPE', `シンボリックリンクは同梱できません`, path));
    }

    totalUncompressed += uncompressedSize;
    totalCompressed += compressedSize;
    entries.push({
      path,
      compressedSize,
      uncompressedSize,
      compressionMethod: method,
      localHeaderOffset,
      isDirectory,
      isSymlink,
    });

    cursor += 46 + nameLength + extraLength + commentLength;
  }

  if (totalUncompressed > ARCHIVE_LIMITS.maxUncompressedBytes) {
    findings.push(
      error(
        'ARCHIVE-MAX-UNCOMPRESSED',
        `展開後サイズが上限を超えています (${totalUncompressed} bytes > ${ARCHIVE_LIMITS.maxUncompressedBytes} bytes)`,
      ),
    );
  }
  // 圧縮比は「圧縮後 0 バイト」で無限大になるため、分母が 0 のときは比を見ない
  // (その場合は展開後サイズの上限が先に効く)
  if (totalCompressed > 0 && totalUncompressed / totalCompressed > ARCHIVE_LIMITS.maxCompressionRatio) {
    findings.push(
      error(
        'ARCHIVE-MAX-RATIO',
        `圧縮比が上限を超えています (${Math.round(totalUncompressed / totalCompressed)}:1 > ${ARCHIVE_LIMITS.maxCompressionRatio}:1)`,
      ),
    );
  }

  return { ok: findings.length === 0, entries, findings };
}
