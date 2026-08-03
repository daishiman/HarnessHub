import type { PublishFinding } from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';

import {
  decodePublishPayload,
  EMPTY_PUBLISH_PAYLOAD,
  encodePublishPayload,
  PUBLISH_PAYLOAD_VERSION,
} from '@/lib/publish/payload';

const FINDING: PublishFinding = {
  rule_id: 'PKG-SEMVER',
  stage: 'static-validation',
  severity: 'error',
  message: 'version が semver 形式ではありません',
  path: 'plugin.json',
  line: null,
};

describe('封筒の往復', () => {
  it('encode → decode で内容が保たれる', () => {
    const payload = { contentHash: 'abc123', findings: [FINDING] };

    expect(decodePublishPayload(encodePublishPayload(payload))).toEqual(payload);
  });

  it('書き込みは常に現行版で行われる', () => {
    const encoded = JSON.parse(encodePublishPayload({ contentHash: null, findings: [] })) as Record<string, unknown>;

    expect(encoded).toEqual({ v: PUBLISH_PAYLOAD_VERSION, content_hash: null, findings: [] });
  });

  it('contentHash が null でも往復する', () => {
    const payload = { contentHash: null, findings: [FINDING] };

    expect(decodePublishPayload(encodePublishPayload(payload))).toEqual(payload);
  });
});

describe('読み取りの寛容さ', () => {
  it.each([
    ['null', null],
    ['空文字', ''],
    ['空白だけ', '   '],
  ])('%s は空の封筒として扱う', (_label, raw) => {
    expect(decodePublishPayload(raw)).toEqual(EMPTY_PUBLISH_PAYLOAD);
  });

  it.each([
    ['壊れた JSON', '{ not json'],
    ['想定外のオブジェクト', '{"foo":1}'],
    ['数値', '42'],
    ['版番号が違う封筒', '{"v":99,"content_hash":null,"findings":[]}'],
    ['findings の形が違う', '{"v":1,"content_hash":null,"findings":[{"rule_id":1}]}'],
  ])('%s でも例外を投げず空扱いにする', (_label, raw) => {
    // ここで落とすと、過去の行が 1 件でも想定外の形だった瞬間に一覧 API 全体が 500 になる
    expect(() => decodePublishPayload(raw)).not.toThrow();
    expect(decodePublishPayload(raw)).toEqual(EMPTY_PUBLISH_PAYLOAD);
  });

  it('旧形式 (裸の finding 配列) を読み替える', () => {
    // 封筒導入前に書かれた行を切り捨てないため。contentHash は当時存在しないので null
    const legacy = JSON.stringify([FINDING]);

    expect(decodePublishPayload(legacy)).toEqual({ contentHash: null, findings: [FINDING] });
  });

  it('空の contentHash は封筒として認めない (空文字を hash として扱わない)', () => {
    const raw = '{"v":1,"content_hash":"","findings":[]}';

    expect(decodePublishPayload(raw)).toEqual(EMPTY_PUBLISH_PAYLOAD);
  });
});

describe('空の封筒', () => {
  it('作成直後の要求が持つ値である', () => {
    expect(EMPTY_PUBLISH_PAYLOAD).toEqual({ contentHash: null, findings: [] });
  });
});
