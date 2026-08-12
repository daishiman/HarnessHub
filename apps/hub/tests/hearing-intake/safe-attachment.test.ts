import { describe, expect, it } from 'vitest';

import {
  attachmentContentDisposition,
  normalizeSafeAttachmentContentType,
  validateSafeAttachment,
} from '../../src/lib/hearing-share/safe-attachment.js';
import { PNG_IMAGE_BYTES } from './support/handoff-route-context.js';

// Decoder の代替ではなく、magic/container 検査の marker 境界を固定する最小 envelope。
const JPEG_ENVELOPE = new Uint8Array([
  0xff, 0xd8,
  // SOF0: length 8 + 6-byte minimal frame payload for the structural validator.
  0xff, 0xc0, 0x00, 0x08, 0x08, 0x00, 0x01, 0x00, 0x01, 0x00,
  // SOS: length 6 + 4-byte scan header, one entropy byte, EOI.
  0xff, 0xda, 0x00, 0x06, 0x00, 0x00, 0x00, 0x00, 0x01, 0xff, 0xd9,
]);
const WEBP_ENVELOPE = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x16, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20, 0x0a, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x9d, 0x01, 0x2a, 0x00, 0x00, 0x00, 0x00,
]);

function isoBmffEnvelope(brand: string): Uint8Array {
  const encoder = new TextEncoder();
  // box size(4) + 'ftyp'(4) + major brand(4) + minor version(4) = 16 bytes, no compatible brands.
  return new Uint8Array([
    0x00,
    0x00,
    0x00,
    0x10,
    ...encoder.encode('ftyp'),
    ...encoder.encode(brand),
    0x00,
    0x00,
    0x00,
    0x00,
  ]);
}
const MP4_ENVELOPE = isoBmffEnvelope('isom');
const MOV_ENVELOPE = isoBmffEnvelope('qt  ');

const CSV_BYTES = new TextEncoder().encode('項目,金額\n交通費,1200\n');

function xlsxEnvelope(): Uint8Array {
  const encoder = new TextEncoder();
  const marker = encoder.encode('[Content_Types].xml');
  return new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...new Array(20).fill(0), ...marker]);
}
const XLSX_ENVELOPE = xlsxEnvelope();
const XLS_ENVELOPE = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00]);

describe('hearing 添付ファイルの安全な境界', () => {
  it.each([
    ['image/png', PNG_IMAGE_BYTES],
    ['image/jpeg', JPEG_ENVELOPE],
    ['image/webp', WEBP_ENVELOPE],
    ['video/mp4', MP4_ENVELOPE],
    ['video/quicktime', MOV_ENVELOPE],
    ['text/csv', CSV_BYTES],
    ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', XLSX_ENVELOPE],
    ['application/vnd.ms-excel', XLS_ENVELOPE],
  ] as const)('%s は MIME と magic/container が一致すると許可する', (contentType, bytes) => {
    expect(validateSafeAttachment(contentType, bytes)).toEqual({ ok: true, contentType });
  });

  it('MIME allowlist は対応形式のみに限定する', () => {
    expect(normalizeSafeAttachmentContentType(' IMAGE/PNG ')).toBe('image/png');
    expect(normalizeSafeAttachmentContentType('image/svg+xml')).toBeNull();
    expect(normalizeSafeAttachmentContentType('text/html')).toBeNull();
    expect(normalizeSafeAttachmentContentType('image/gif')).toBeNull();
    expect(normalizeSafeAttachmentContentType('application/zip')).toBeNull();
  });

  it('申告 MIME と magic bytes の不一致を拒否する', () => {
    expect(validateSafeAttachment('image/jpeg', PNG_IMAGE_BYTES)).toEqual({
      ok: false,
      reason: 'invalid_attachment_bytes',
    });
    expect(validateSafeAttachment('video/mp4', PNG_IMAGE_BYTES)).toEqual({
      ok: false,
      reason: 'invalid_attachment_bytes',
    });
    expect(validateSafeAttachment('application/vnd.ms-excel', XLSX_ENVELOPE)).toEqual({
      ok: false,
      reason: 'invalid_attachment_bytes',
    });
  });

  it('SVG/HTML と画像末尾へ連結した polyglot を container 検査で拒否する', () => {
    const activeContents = [
      new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'),
      new TextEncoder().encode('<!doctype html><html></html>'),
      new Uint8Array([...PNG_IMAGE_BYTES, ...new TextEncoder().encode('<script>alert(1)</script>')]),
    ];

    for (const bytes of activeContents) {
      expect(validateSafeAttachment('image/png', bytes)).toEqual({ ok: false, reason: 'invalid_attachment_bytes' });
    }
  });

  it('能動的 markup が無くても、画像終端より後ろの付加 bytes を拒否する', () => {
    const appended = new Uint8Array([...PNG_IMAGE_BYTES, 0x00, 0x01]);
    expect(validateSafeAttachment('image/png', appended)).toEqual({ ok: false, reason: 'invalid_attachment_bytes' });
  });

  it('NUL byte を含む CSV 申告はバイナリ混入として拒否する', () => {
    const withNul = new Uint8Array([...CSV_BYTES, 0x00]);
    expect(validateSafeAttachment('text/csv', withNul)).toEqual({ ok: false, reason: 'invalid_attachment_bytes' });
  });

  it('xlsx 固有のエントリ名を含まない ZIP は拒否する', () => {
    const genericZip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...new Array(30).fill(0)]);
    expect(
      validateSafeAttachment('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', genericZip),
    ).toEqual({ ok: false, reason: 'invalid_attachment_bytes' });
  });

  it('Content-Disposition は attachment 固定で、利用者入力を RFC 5987 encode する', () => {
    const header = attachmentContentDisposition('画面"\r\nX-Evil: yes/../capture.png', 'image/png');

    expect(header).toContain('attachment;');
    expect(header).toContain('filename="hearing-attachment.png"');
    expect(header).toContain("filename*=UTF-8''");
    expect(header).not.toContain('\r');
    expect(header).not.toContain('\n');
    expect(header).not.toContain('X-Evil: yes/');
    expect(header).toContain('%E7%94%BB%E9%9D%A2');
  });
});
