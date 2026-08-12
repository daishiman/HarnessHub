import { describe, expect, it } from 'vitest';

import {
  attachmentContentDisposition,
  normalizeSafeImageContentType,
  validateSafeImage,
} from '../../src/lib/hearing-share/safe-image.js';
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

describe('hearing screenshot の安全な画像境界', () => {
  it.each([
    ['image/png', PNG_IMAGE_BYTES],
    ['image/jpeg', JPEG_ENVELOPE],
    ['image/webp', WEBP_ENVELOPE],
  ] as const)('%s は MIME と magic/container が一致すると許可する', (contentType, bytes) => {
    expect(validateSafeImage(contentType, bytes)).toEqual({ ok: true, contentType });
  });

  it('MIME allowlist は PNG/JPEG/WebP のみに限定する', () => {
    expect(normalizeSafeImageContentType(' IMAGE/PNG ')).toBe('image/png');
    expect(normalizeSafeImageContentType('image/svg+xml')).toBeNull();
    expect(normalizeSafeImageContentType('text/html')).toBeNull();
    expect(normalizeSafeImageContentType('image/gif')).toBeNull();
  });

  it('申告 MIME と magic bytes の不一致を拒否する', () => {
    expect(validateSafeImage('image/jpeg', PNG_IMAGE_BYTES)).toEqual({
      ok: false,
      reason: 'invalid_image_bytes',
    });
  });

  it('SVG/HTML と画像末尾へ連結した polyglot を container 検査で拒否する', () => {
    const activeContents = [
      new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'),
      new TextEncoder().encode('<!doctype html><html></html>'),
      new Uint8Array([...PNG_IMAGE_BYTES, ...new TextEncoder().encode('<script>alert(1)</script>')]),
    ];

    for (const bytes of activeContents) {
      expect(validateSafeImage('image/png', bytes)).toEqual({ ok: false, reason: 'invalid_image_bytes' });
    }
  });

  it('能動的 markup が無くても、画像終端より後ろの付加 bytes を拒否する', () => {
    const appended = new Uint8Array([...PNG_IMAGE_BYTES, 0x00, 0x01]);
    expect(validateSafeImage('image/png', appended)).toEqual({ ok: false, reason: 'invalid_image_bytes' });
  });

  it('Content-Disposition は attachment 固定で、利用者入力を RFC 5987 encode する', () => {
    const header = attachmentContentDisposition('画面"\r\nX-Evil: yes/../capture.png', 'image/png');

    expect(header).toContain('attachment;');
    expect(header).toContain('filename="hearing-screenshot.png"');
    expect(header).toContain("filename*=UTF-8''");
    expect(header).not.toContain('\r');
    expect(header).not.toContain('\n');
    expect(header).not.toContain('X-Evil: yes/');
    expect(header).toContain('%E7%94%BB%E9%9D%A2');
  });
});
