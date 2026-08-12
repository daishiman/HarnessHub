/**
 * hearing sheet 添付ファイルの upload / public download が共有する境界。
 *
 * ブラウザ申告の MIME だけは信用せず、MIME allowlist・実バイトの signature を必ず突き合わせる。
 * 画像 (png/jpeg/webp) は container の終端まで検査し polyglot を拒否する。動画 (mp4/mov) は
 * ISO BMFF の先頭 box、Excel (xlsx) は ZIP container の signature + 内部エントリ名の痕跡、
 * 旧 Excel (xls) は OLE2 signature を検査する。CSV はバイナリ埋め込みや別形式偽装を弾く
 * テキスト健全性チェックに留める (署名を持たない形式のため)。
 */

export const SAFE_ATTACHMENT_CONTENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
] as const;

export type SafeAttachmentContentType = (typeof SAFE_ATTACHMENT_CONTENT_TYPES)[number];

export type SafeAttachmentValidationResult =
  | { readonly ok: true; readonly contentType: SafeAttachmentContentType }
  | {
      readonly ok: false;
      readonly reason: 'unsupported_content_type' | 'invalid_attachment_bytes';
    };

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

function byteAt(bytes: Uint8Array, index: number): number {
  return bytes[index] ?? -1;
}

function hasBytesAt(bytes: Uint8Array, offset: number, expected: readonly number[]): boolean {
  if (offset < 0 || offset + expected.length > bytes.byteLength) return false;
  return expected.every((value, index) => byteAt(bytes, offset + index) === value);
}

function asciiAt(bytes: Uint8Array, offset: number, length: number): string {
  let value = '';
  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(byteAt(bytes, offset + index));
  }
  return value;
}

function readUint16Be(bytes: Uint8Array, offset: number): number {
  return byteAt(bytes, offset) * 0x100 + byteAt(bytes, offset + 1);
}

function readUint32Be(bytes: Uint8Array, offset: number): number {
  return (
    ((byteAt(bytes, offset) * 0x100 + byteAt(bytes, offset + 1)) * 0x100 + byteAt(bytes, offset + 2)) * 0x100 +
    byteAt(bytes, offset + 3)
  );
}

function readUint32Le(bytes: Uint8Array, offset: number): number {
  return (
    byteAt(bytes, offset) +
    byteAt(bytes, offset + 1) * 0x100 +
    byteAt(bytes, offset + 2) * 0x1_0000 +
    byteAt(bytes, offset + 3) * 0x100_0000
  );
}

function isPng(bytes: Uint8Array): boolean {
  if (!hasBytesAt(bytes, 0, PNG_SIGNATURE)) return false;

  let offset: number = PNG_SIGNATURE.length;
  let sawHeader = false;
  let sawImageData = false;

  while (offset + 12 <= bytes.byteLength) {
    const chunkLength = readUint32Be(bytes, offset);
    // length + type + payload + CRC。減算形にして巨大 length の加算 overflow/越境を避ける。
    if (chunkLength > bytes.byteLength - offset - 12) return false;

    const chunkType = asciiAt(bytes, offset + 4, 4);
    const nextOffset = offset + 12 + chunkLength;
    if (!sawHeader) {
      if (chunkType !== 'IHDR' || chunkLength !== 13) return false;
      sawHeader = true;
    } else if (chunkType === 'IHDR') {
      return false;
    }

    if (chunkType === 'IDAT') sawImageData = true;
    if (chunkType === 'IEND') {
      // IEND の後ろに HTML 等を連結した PNG polyglot を受け付けない。
      return chunkLength === 0 && sawImageData && nextOffset === bytes.byteLength;
    }
    offset = nextOffset;
  }

  return false;
}

const JPEG_START_OF_FRAME_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function isStandaloneJpegMarker(marker: number): boolean {
  return marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7);
}

function isJpeg(bytes: Uint8Array): boolean {
  if (!hasBytesAt(bytes, 0, [0xff, 0xd8])) return false;

  let offset = 2;
  let sawFrame = false;
  let sawScan = false;

  while (offset < bytes.byteLength) {
    if (byteAt(bytes, offset) !== 0xff) return false;
    while (byteAt(bytes, offset) === 0xff) offset += 1;
    const marker = byteAt(bytes, offset);
    if (marker < 0) return false;
    offset += 1;

    if (marker === 0xd9) {
      // EOI 後の bytes を許さず、末尾連結型 polyglot を拒否する。
      return sawFrame && sawScan && offset === bytes.byteLength;
    }
    if (marker === 0x00 || marker === 0xd8) return false;
    if (isStandaloneJpegMarker(marker)) continue;
    if (offset + 2 > bytes.byteLength) return false;

    const segmentLength = readUint16Be(bytes, offset);
    if (segmentLength < 2 || segmentLength > bytes.byteLength - offset) return false;
    if (JPEG_START_OF_FRAME_MARKERS.has(marker)) {
      if (segmentLength < 8) return false;
      sawFrame = true;
    }
    const segmentEnd = offset + segmentLength;

    if (marker !== 0xda) {
      offset = segmentEnd;
      continue;
    }

    sawScan = true;
    if (segmentLength < 6) return false;
    offset = segmentEnd;
    // entropy-coded data 内では FF 00 が byte stuffing、FF D0..D7 が restart marker。
    // それ以外の marker が現れたら外側の segment parser へ戻す。
    while (offset < bytes.byteLength) {
      if (byteAt(bytes, offset) !== 0xff) {
        offset += 1;
        continue;
      }

      const markerOffset = offset;
      while (byteAt(bytes, offset) === 0xff) offset += 1;
      const entropyMarker = byteAt(bytes, offset);
      if (entropyMarker === 0x00 || (entropyMarker >= 0xd0 && entropyMarker <= 0xd7)) {
        offset += 1;
        continue;
      }
      offset = markerOffset;
      break;
    }
  }

  return false;
}

function isWebp(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 20) return false;
  if (asciiAt(bytes, 0, 4) !== 'RIFF' || asciiAt(bytes, 8, 4) !== 'WEBP') return false;
  // RIFF size は先頭 8 bytes を除く file size。末尾連結型 polyglot を拒否する。
  if (readUint32Le(bytes, 4) + 8 !== bytes.byteLength) return false;

  let offset = 12;
  let sawImageChunk = false;
  while (offset + 8 <= bytes.byteLength) {
    const chunkType = asciiAt(bytes, offset, 4);
    const chunkLength = readUint32Le(bytes, offset + 4);
    const paddedLength = chunkLength + (chunkLength % 2);
    if (paddedLength > bytes.byteLength - offset - 8) return false;

    const payloadOffset = offset + 8;
    if (chunkType === 'VP8 ') {
      if (chunkLength < 10 || !hasBytesAt(bytes, payloadOffset + 3, [0x9d, 0x01, 0x2a])) return false;
      sawImageChunk = true;
    } else if (chunkType === 'VP8L') {
      if (chunkLength < 5 || byteAt(bytes, payloadOffset) !== 0x2f) return false;
      sawImageChunk = true;
    } else if (chunkType === 'VP8X') {
      if (chunkLength !== 10) return false;
    } else if (chunkType === 'ANMF') {
      if (chunkLength < 16) return false;
      sawImageChunk = true;
    }

    offset += 8 + paddedLength;
  }

  return sawImageChunk && offset === bytes.byteLength;
}

const ISO_BMFF_BRANDS_MP4 = new Set(['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'MSNV', 'M4V ', 'M4A ']);
const ISO_BMFF_BRAND_MOV = 'qt  ';

/** ISO Base Media File Format (mp4/mov 共通のコンテナ) の先頭 `ftyp` box を検査する。 */
function readIsoBmffMajorBrand(bytes: Uint8Array): string | null {
  if (bytes.byteLength < 12) return null;
  const boxSize = readUint32Be(bytes, 0);
  if (boxSize < 8 || boxSize > bytes.byteLength) return null;
  if (asciiAt(bytes, 4, 4) !== 'ftyp') return null;
  return asciiAt(bytes, 8, 4);
}

function isMp4(bytes: Uint8Array): boolean {
  const brand = readIsoBmffMajorBrand(bytes);
  if (brand === null) return false;
  // major brand が mp4 系そのものでなくても、compatible brands に mp4 系が並ぶ実装が多いため
  // 先頭が 'qt  ' (QuickTime 専用) でない ISO BMFF は mp4 として扱う (保守的すぎる拒否をしない)。
  return brand !== ISO_BMFF_BRAND_MOV || ISO_BMFF_BRANDS_MP4.has(brand);
}

function isQuickTimeMov(bytes: Uint8Array): boolean {
  const brand = readIsoBmffMajorBrand(bytes);
  return brand !== null;
}

const ZIP_LOCAL_FILE_SIGNATURE = [0x50, 0x4b, 0x03, 0x04] as const;
const ZIP_EMPTY_ARCHIVE_SIGNATURE = [0x50, 0x4b, 0x05, 0x06] as const;

/**
 * xlsx は OOXML (ZIP container)。フル ZIP パースはせず、ZIP signature に加えて
 * 先頭数十KB以内に xlsx 固有のエントリ名 (`[Content_Types].xml` / `xl/`) が
 * 見つかることを要求し、任意の zip ファイルを xlsx として通さない。
 */
function isXlsx(bytes: Uint8Array): boolean {
  const hasZipSignature =
    hasBytesAt(bytes, 0, ZIP_LOCAL_FILE_SIGNATURE) || hasBytesAt(bytes, 0, ZIP_EMPTY_ARCHIVE_SIGNATURE);
  if (!hasZipSignature) return false;

  const scanLength = Math.min(bytes.byteLength, 65_536);
  const prefix = asciiAt(bytes, 0, scanLength);
  return (
    prefix.includes('[Content_Types].xml') || prefix.includes('xl/workbook.xml') || prefix.includes('xl/worksheets/')
  );
}

const OLE2_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] as const;

/** 旧形式 xls (OLE2 Compound File Binary)。内部 stream 名までは検査せず signature のみ。 */
function isXls(bytes: Uint8Array): boolean {
  return hasBytesAt(bytes, 0, OLE2_SIGNATURE);
}

const CSV_BINARY_SCAN_LENGTH = 8192;

/**
 * CSV はファイル形式としての signature を持たないため、他形式との混同・バイナリ埋め込みを
 * 拒否する健全性チェックに留める: 先頭 8KB に NUL byte が無く、UTF-8 として decode できること。
 */
function isPlausibleCsv(bytes: Uint8Array): boolean {
  const scanLength = Math.min(bytes.byteLength, CSV_BINARY_SCAN_LENGTH);
  for (let index = 0; index < scanLength; index += 1) {
    if (byteAt(bytes, index) === 0x00) return false;
  }
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, scanLength));
    return true;
  } catch {
    return false;
  }
}

export function normalizeSafeAttachmentContentType(contentType: string): SafeAttachmentContentType | null {
  const normalized = contentType.trim().toLowerCase();
  return SAFE_ATTACHMENT_CONTENT_TYPES.includes(normalized as SafeAttachmentContentType)
    ? (normalized as SafeAttachmentContentType)
    : null;
}

/** 申告 MIME と実体 format の両方が一致した場合だけ保存・配信を許可する。 */
export function validateSafeAttachment(contentType: string, bytes: Uint8Array): SafeAttachmentValidationResult {
  const normalizedContentType = normalizeSafeAttachmentContentType(contentType);
  if (normalizedContentType === null) return { ok: false, reason: 'unsupported_content_type' };

  const validBytes: boolean = (() => {
    switch (normalizedContentType) {
      case 'image/png':
        return isPng(bytes);
      case 'image/jpeg':
        return isJpeg(bytes);
      case 'image/webp':
        return isWebp(bytes);
      case 'video/mp4':
        return isMp4(bytes);
      case 'video/quicktime':
        return isQuickTimeMov(bytes);
      case 'text/csv':
        return isPlausibleCsv(bytes);
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        return isXlsx(bytes);
      case 'application/vnd.ms-excel':
        return isXls(bytes);
    }
  })();

  return validBytes
    ? { ok: true, contentType: normalizedContentType }
    : { ok: false, reason: 'invalid_attachment_bytes' };
}

const EXTENSION_BY_CONTENT_TYPE: Record<SafeAttachmentContentType, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'text/csv': 'csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
};

function encodeRfc5987(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let encoded = '';
  for (const byte of bytes) {
    const isAlphaNumeric =
      (byte >= 0x41 && byte <= 0x5a) || (byte >= 0x61 && byte <= 0x7a) || (byte >= 0x30 && byte <= 0x39);
    const isAttrChar = [0x21, 0x23, 0x24, 0x26, 0x2b, 0x2d, 0x2e, 0x5e, 0x5f, 0x60, 0x7c, 0x7e].includes(byte);
    encoded +=
      isAlphaNumeric || isAttrChar ? String.fromCharCode(byte) : `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
  }
  return encoded;
}

function sanitizeDownloadTitle(title: string): string {
  let cleaned = '';
  for (const character of title) {
    const codePoint = character.codePointAt(0) ?? 0;
    const isControl = codePoint <= 0x1f || codePoint === 0x7f;
    const isBidirectionalControl =
      (codePoint >= 0x202a && codePoint <= 0x202e) || (codePoint >= 0x2066 && codePoint <= 0x2069);
    if (isControl || isBidirectionalControl) continue;
    cleaned += character === '/' || character === '\\' ? '_' : character;
    if (cleaned.length >= 160) break;
  }
  return cleaned.trim();
}

const EXTENSION_STRIP_PATTERN = /\.(?:png|jpe?g|webp|mp4|mov|csv|xlsx|xls)$/i;

/** CR/LF・path separator・双方向制御文字を filename から除き、header injection を防ぐ。 */
export function attachmentContentDisposition(title: string, contentType: SafeAttachmentContentType): string {
  const extension = EXTENSION_BY_CONTENT_TYPE[contentType];
  const cleaned = sanitizeDownloadTitle(title);
  const stem = cleaned.replace(EXTENSION_STRIP_PATTERN, '').trim() || 'hearing-attachment';
  const downloadName = `${stem}.${extension}`;
  // ASCII fallback は固定値にし、利用者入力は RFC 5987 の percent-encoded 値だけへ載せる。
  return `attachment; filename="hearing-attachment.${extension}"; filename*=UTF-8''${encodeRfc5987(downloadName)}`;
}

/** 公開・認証済みの両経路で共有する、安全な添付ファイルダウンロード応答。 */
export function createSafeAttachmentDownloadResponse(
  title: string,
  declaredContentType: string,
  content: Uint8Array,
): Response | null {
  const validated = validateSafeAttachment(declaredContentType, content);
  if (!validated.ok) return null;

  return new Response(content as unknown as BodyInit, {
    headers: {
      'content-type': validated.contentType,
      'content-disposition': attachmentContentDisposition(title, validated.contentType),
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'content-security-policy':
        "sandbox; default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    },
  });
}
