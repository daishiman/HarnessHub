// R2BucketLike の in-memory fake (DMDB-T05)。書込回数を記録し、immutable (再書込スキップ) を検証可能にする。

import type { R2BucketLike } from '../../registry/index';

export interface FakeR2Bucket extends R2BucketLike {
  readonly putCalls: string[];
  readonly objects: Map<string, Uint8Array>;
}

export function createFakeR2Bucket(): FakeR2Bucket {
  const objects = new Map<string, Uint8Array>();
  const putCalls: string[] = [];
  return {
    objects,
    putCalls,
    put(key, value) {
      putCalls.push(key);
      const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
      objects.set(key, new Uint8Array(bytes));
      return Promise.resolve({ key });
    },
    get(key) {
      const bytes = objects.get(key);
      if (bytes === undefined) return Promise.resolve(null);
      return Promise.resolve({ body: new Blob([bytes]).stream() });
    },
    head(key) {
      return Promise.resolve(objects.has(key) ? { key } : null);
    },
  };
}

export async function streamToBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}
