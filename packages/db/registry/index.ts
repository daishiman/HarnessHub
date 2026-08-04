// R2 content-addressed PackageRegistry (C4 / ADR §4)。
// 公開は putPackage / getPackage の 2 関数のみ。key は content hash から決定的に導出し、
// 同一 content_hash への再書き込みは既存確認によりスキップする (冪等・immutable。上書き禁止)。
// workers-types への hard 依存を避けるため、R2 バケットは構造型で受ける。

import { toHex } from '../repository/bytes';

/** R2Bucket の構造互換型。実バインディング (Workers) とテスト fake の双方が満たす。 */
export interface R2BucketLike {
  put(key: string, value: ArrayBuffer | Uint8Array): Promise<unknown>;
  get(key: string): Promise<{ readonly body: ReadableStream<Uint8Array> } | null>;
  head(key: string): Promise<unknown | null>;
}

export interface PutPackageResult {
  readonly contentHash: string;
  readonly r2Key: string;
  readonly sizeBytes: number;
}

export function packageR2Key(contentHash: string): string {
  return `packages/${contentHash}`;
}

export interface PackageRegistry {
  putPackage(buffer: Uint8Array): Promise<PutPackageResult>;
  getPackage(contentHash: string): Promise<ReadableStream<Uint8Array> | null>;
}

export function createPackageRegistry(bucket: R2BucketLike): PackageRegistry {
  return {
    async putPackage(buffer) {
      const digest = await crypto.subtle.digest('SHA-256', buffer as BufferSource);
      const contentHash = toHex(new Uint8Array(digest));
      const r2Key = packageR2Key(contentHash);
      const existing = await bucket.head(r2Key);
      if (existing === null) {
        await bucket.put(r2Key, buffer);
      }
      return { contentHash, r2Key, sizeBytes: buffer.byteLength };
    },

    async getPackage(contentHash) {
      const object = await bucket.get(packageR2Key(contentHash));
      return object === null ? null : object.body;
    },
  };
}
