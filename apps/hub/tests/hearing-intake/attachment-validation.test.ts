import { describe, expect, it } from 'vitest';

import {
  ATTACHMENT_MAX_UPLOAD_BYTES,
  partitionAttachmentFiles,
  validateAttachmentFile,
} from '../../src/features/hearing-intake/attachment-validation.js';

function makeFile(name: string, type: string, size: number): File {
  // File のコンストラクタは実サイズをコンテンツ長から決めるため、必要バイト数のダミー配列を渡す。
  return new File([new Uint8Array(size)], name, { type });
}

describe('HI-ATTACHMENT-VALIDATION: 添付ファイルのクライアント側事前検証', () => {
  it('対応形式かつサイズ内のファイルは合格(null) を返す', () => {
    expect(validateAttachmentFile(makeFile('screenshot.png', 'image/png', 1024))).toBeNull();
    expect(validateAttachmentFile(makeFile('memo.csv', 'text/csv', 1024))).toBeNull();
  });

  it('25MB を超えるファイルはサイズ超過の理由を返す', () => {
    const oversized = makeFile('video.mp4', 'video/mp4', ATTACHMENT_MAX_UPLOAD_BYTES + 1);
    const message = validateAttachmentFile(oversized);
    expect(message).not.toBeNull();
    expect(message).toContain('25MB');
  });

  it('ちょうど25MBのファイルは合格する（境界値）', () => {
    const exact = makeFile('video.mp4', 'video/mp4', ATTACHMENT_MAX_UPLOAD_BYTES);
    expect(validateAttachmentFile(exact)).toBeNull();
  });

  it('対応していない MIME 型は非対応形式の理由を返す', () => {
    const message = validateAttachmentFile(makeFile('archive.zip', 'application/zip', 1024));
    expect(message).not.toBeNull();
    expect(message).toContain('対応していない形式');
  });

  it('partitionAttachmentFiles は合格分と却下分を分ける', () => {
    const ok = makeFile('a.png', 'image/png', 1024);
    const badType = makeFile('b.zip', 'application/zip', 1024);
    const badSize = makeFile('c.mp4', 'video/mp4', ATTACHMENT_MAX_UPLOAD_BYTES + 1);

    const { accepted, rejected } = partitionAttachmentFiles([ok, badType, badSize]);
    expect(accepted).toEqual([ok]);
    expect(rejected).toHaveLength(2);
    expect(rejected.map((entry) => entry.file)).toEqual([badType, badSize]);
  });
});
