// tenant_data 用 R2 レジストリ (AD-3: 行単位一意 key、他行に影響しない削除)。
// PackageRegistry (content-addressed / immutable) とは異なり、削除を一級の操作として持つ。

/** R2Bucket の構造互換型。put/get に加えて delete を持つ点が PackageRegistry の R2BucketLike と異なる。 */
export interface TenantDataBucketLike {
  put(key: string, value: ArrayBuffer | Uint8Array): Promise<unknown>;
  get(key: string): Promise<{ readonly body: ReadableStream<Uint8Array> } | null>;
  delete(key: string): Promise<void>;
}

/** 行単位で一意な R2 key (AD-3)。同一 tenant/workspace/kind 内でも object id ごとに分離される。 */
export function tenantDataR2Key(input: {
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly kind: string;
  readonly objectId: string;
}): string {
  return `tenant/${input.tenantId}/${input.workspaceId}/${input.kind}/${input.objectId}`;
}

export interface TenantDataRegistry {
  put(key: string, buffer: Uint8Array): Promise<void>;
  get(key: string): Promise<ReadableStream<Uint8Array> | null>;
  delete(key: string): Promise<void>;
}

export function createTenantDataRegistry(bucket: TenantDataBucketLike): TenantDataRegistry {
  return {
    async put(key, buffer) {
      await bucket.put(key, buffer);
    },
    async get(key) {
      const object = await bucket.get(key);
      return object === null ? null : object.body;
    },
    async delete(key) {
      await bucket.delete(key);
    },
  };
}
