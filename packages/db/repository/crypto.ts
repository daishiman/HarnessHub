// 封筒暗号化 (KEK/DEK) プリミティブと encryption_keys 台帳の owner 実装 (security-spec §4.1 / ADR §5)。
// users.salary と idp_connections.client_secret_enc が同一プリミティブを再利用する。
// 消費 feature (feat-user-org-admin 等) は encryptColumn/decryptColumn 経由でのみ暗号列に触れる。

import { and, desc, eq, isNull } from 'drizzle-orm';
import { encryptionKeys } from '../schema/core/security';
import { fromBase64, toBase64 } from './bytes';
import { guardedWrite } from './conflict';
import type { CoreAdapter } from './db';
import { serverNow } from './time';
import { newUlid } from './ulid';

export type EncryptionPurpose = 'salary' | 'idp_secret' | 'tenant_data';

/** tenant_data 以外は常に tenant 非スコープ (tenant_id は NULL) であることを型で強制する。 */
type TenantIdFor<P extends EncryptionPurpose> = P extends 'tenant_data' ? string : undefined;

/** AAD (`"{table}:{column}:{row_id}"`) の材料。暗号文の他行への移植 (cut-and-paste) を防ぐ。 */
export interface ColumnRef {
  readonly table: string;
  readonly column: string;
  readonly rowId: string;
}

const GCM_IV_BYTES = 12; // 96bit random。GCM の nonce 再利用は致命的なためレコードごとに生成する。
const GCM_TAG_BYTES = 16;
const DEK_BYTES = 32; // AES-256
const KEY_WRITE_ATTEMPTS = 5;

/** 保存形式 `{key_version}:{iv_b64}:{ciphertext_b64}:{tag_b64}` (security-spec §4.1)。 */
export const ENCRYPTED_COLUMN_PATTERN = /^\d+:[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]*=*:[A-Za-z0-9+/]+=*$/;

export class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

function aadBytes(ref: ColumnRef): Uint8Array {
  return new TextEncoder().encode(`${ref.table}:${ref.column}:${ref.rowId}`);
}

/**
 * `tenant_data` は必ずテナント単位の DEK を使う。型だけに依存すると、JavaScript 呼出や
 * `any` 経由で tenant_id=NULL の鍵を作れてしまうため、境界でも fail-closed にする。
 */
function resolveKeyScope(purpose: EncryptionPurpose, tenantId: string | undefined): string | undefined {
  if (purpose === 'tenant_data') {
    if (typeof tenantId !== 'string' || tenantId.trim().length === 0) {
      throw new EncryptionError('tenant_data の DEK には tenantId が必要です');
    }
    return tenantId;
  }
  if (tenantId !== undefined) {
    throw new EncryptionError(`${purpose} の DEK は tenantId を受け取りません`);
  }
  return undefined;
}

function isRetryableKeyWrite(error: unknown): boolean {
  const details: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current !== null && current !== undefined; depth += 1) {
    if (current instanceof Error) details.push(`${current.name}: ${current.message}`);
    if (typeof current !== 'object') break;
    const wrapped = current as { readonly cause?: unknown; readonly code?: unknown; readonly rawCode?: unknown };
    if (wrapped.code !== undefined) details.push(String(wrapped.code));
    if (wrapped.rawCode !== undefined) details.push(String(wrapped.rawCode));
    current = wrapped.cause;
  }
  return /SQLITE_BUSY|database is locked|SQLITE_CONSTRAINT|UNIQUE constraint|unique constraint/i.test(
    details.join(' '),
  );
}

async function gcmEncrypt(
  key: CryptoKey,
  plaintext: Uint8Array,
  aad: Uint8Array,
): Promise<{ iv: Uint8Array; ciphertext: Uint8Array; tag: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(GCM_IV_BYTES));
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource, additionalData: aad as BufferSource },
      key,
      plaintext as BufferSource,
    ),
  );
  return {
    iv,
    ciphertext: sealed.slice(0, sealed.length - GCM_TAG_BYTES),
    tag: sealed.slice(sealed.length - GCM_TAG_BYTES),
  };
}

async function gcmDecrypt(
  key: CryptoKey,
  iv: Uint8Array,
  ciphertext: Uint8Array,
  tag: Uint8Array,
  aad: Uint8Array,
): Promise<Uint8Array> {
  const sealed = new Uint8Array(ciphertext.length + tag.length);
  sealed.set(ciphertext, 0);
  sealed.set(tag, ciphertext.length);
  try {
    return new Uint8Array(
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as BufferSource, additionalData: aad as BufferSource },
        key,
        sealed as BufferSource,
      ),
    );
  } catch {
    throw new EncryptionError('復号に失敗しました (鍵・IV・AAD のいずれかが不一致)');
  }
}

/**
 * 列暗号化の実装体。KEK (Workers Secret `ENCRYPTION_KEK`, base64 32byte) は 1 本のみで、
 * DEK は purpose 別に encryption_keys へ KEK-wrap して保存する。DEK 平文は保存しない。
 */
export class ColumnCipher {
  private kekPromise: Promise<CryptoKey> | null = null;
  private readonly dekCache = new Map<string, CryptoKey>();

  constructor(
    private readonly adapter: CoreAdapter,
    private readonly kekBase64: string,
  ) {}

  private kek(): Promise<CryptoKey> {
    if (this.kekPromise === null) {
      const raw = fromBase64(this.kekBase64);
      if (raw.length !== DEK_BYTES) {
        throw new EncryptionError('KEK は base64 の 32 byte である必要があります');
      }
      this.kekPromise = crypto.subtle.importKey('raw', raw as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt']);
    }
    return this.kekPromise;
  }

  /**
   * KEK-wrap 用 AAD。tenant_data はテナントを含めて行を束縛する (AD-1 是正 C1)。
   * 既存の global purpose は migration 前から `${purpose}:v${keyVersion}` で wrap 済みなので、
   * 形式を変えずに既存 DEK の復号互換を保つ。
   */
  private wrapAad(purpose: EncryptionPurpose, tenantId: string | undefined, keyVersion: number): ColumnRef {
    if (purpose !== 'tenant_data') {
      return { table: 'encryption_keys', column: 'dek_wrapped', rowId: `${purpose}:v${keyVersion}` };
    }
    if (tenantId === undefined) throw new EncryptionError('tenant_data の DEK には tenantId が必要です');
    return { table: 'encryption_keys', column: 'dek_wrapped', rowId: `${purpose}:${tenantId}:v${keyVersion}` };
  }

  private tenantScope(tenantId: string | undefined) {
    return tenantId === undefined ? isNull(encryptionKeys.tenantId) : eq(encryptionKeys.tenantId, tenantId);
  }

  private async activeDekVersion(purpose: EncryptionPurpose, tenantId: string | undefined): Promise<number | null> {
    const rows = await this.adapter.client
      .select({ keyVersion: encryptionKeys.keyVersion })
      .from(encryptionKeys)
      .where(and(eq(encryptionKeys.purpose, purpose), this.tenantScope(tenantId), eq(encryptionKeys.status, 'active')))
      .orderBy(desc(encryptionKeys.keyVersion))
      .limit(1);
    return rows[0]?.keyVersion ?? null;
  }

  private async latestDekVersion(purpose: EncryptionPurpose, tenantId: string | undefined): Promise<number> {
    const rows = await this.adapter.client
      .select({ keyVersion: encryptionKeys.keyVersion })
      .from(encryptionKeys)
      .where(and(eq(encryptionKeys.purpose, purpose), this.tenantScope(tenantId)))
      .orderBy(desc(encryptionKeys.keyVersion))
      .limit(1);
    return rows[0]?.keyVersion ?? 0;
  }

  private async insertActiveDek(
    purpose: EncryptionPurpose,
    tenantId: string | undefined,
    keyVersion: number,
  ): Promise<void> {
    const dekRaw = crypto.getRandomValues(new Uint8Array(DEK_BYTES));
    const kek = await this.kek();
    const { iv, ciphertext, tag } = await gcmEncrypt(
      kek,
      dekRaw,
      aadBytes(this.wrapAad(purpose, tenantId, keyVersion)),
    );
    await guardedWrite(this.adapter, () =>
      this.adapter.client.insert(encryptionKeys).values({
        id: newUlid(),
        tenantId: tenantId ?? null,
        purpose,
        keyVersion,
        dekWrapped: `${toBase64(iv)}:${toBase64(ciphertext)}:${toBase64(tag)}`,
        status: 'active',
        createdAt: serverNow(),
      }),
    );
  }

  /** active な DEK が無ければ新 version を発行する。UNIQUE 競合は再読込して収束させる。 */
  async ensureActiveDek<P extends EncryptionPurpose>(purpose: P, tenantId?: TenantIdFor<P>): Promise<number> {
    const scope = resolveKeyScope(purpose, tenantId as string | undefined);
    for (let attempt = 0; attempt < KEY_WRITE_ATTEMPTS; attempt += 1) {
      const active = await this.activeDekVersion(purpose, scope);
      if (active !== null) return active;

      const nextVersion = (await this.latestDekVersion(purpose, scope)) + 1;
      try {
        await this.insertActiveDek(purpose, scope, nextVersion);
        return nextVersion;
      } catch (error) {
        if (!isRetryableKeyWrite(error)) throw error;
      }
    }
    throw new EncryptionError(`active DEK の発行が競合しました (purpose=${purpose}, tenant=${scope ?? 'global'})`);
  }

  private async dekByVersion(
    purpose: EncryptionPurpose,
    tenantId: string | undefined,
    keyVersion: number,
  ): Promise<CryptoKey> {
    const cacheKey = `${purpose}:${tenantId ?? 'global'}:${keyVersion}`;
    const cached = this.dekCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const rows = await this.adapter.client
      .select()
      .from(encryptionKeys)
      .where(
        and(eq(encryptionKeys.purpose, purpose), this.tenantScope(tenantId), eq(encryptionKeys.keyVersion, keyVersion)),
      )
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      throw new EncryptionError(
        `DEK が存在しません (purpose=${purpose}, tenant=${tenantId ?? 'global'}, key_version=${keyVersion})`,
      );
    }
    const [ivB64, ctB64, tagB64] = row.dekWrapped.split(':');
    if (ivB64 === undefined || ctB64 === undefined || tagB64 === undefined) {
      throw new EncryptionError('dek_wrapped の形式が不正です');
    }
    const kek = await this.kek();
    const dekRaw = await gcmDecrypt(
      kek,
      fromBase64(ivB64),
      fromBase64(ctB64),
      fromBase64(tagB64),
      aadBytes(this.wrapAad(purpose, tenantId, keyVersion)),
    );
    const dek = await crypto.subtle.importKey('raw', dekRaw as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt']);
    this.dekCache.set(cacheKey, dek);
    return dek;
  }

  /** 平文を active DEK で暗号化し、保存形式 `{key_version}:{iv}:{ct}:{tag}` を返す。 */
  async encryptColumn<P extends EncryptionPurpose>(
    purpose: P,
    plaintext: string,
    ref: ColumnRef,
    tenantId?: TenantIdFor<P>,
  ): Promise<string> {
    const scope = resolveKeyScope(purpose, tenantId as string | undefined);
    const keyVersion = await this.ensureActiveDek(purpose, tenantId);
    const dek = await this.dekByVersion(purpose, scope, keyVersion);
    const { iv, ciphertext, tag } = await gcmEncrypt(dek, new TextEncoder().encode(plaintext), aadBytes(ref));
    return `${keyVersion}:${toBase64(iv)}:${toBase64(ciphertext)}:${toBase64(tag)}`;
  }

  /** 保存形式から key_version を読み、旧版 DEK でも常に復号できる (§4.1.2 復号互換)。 */
  async decryptColumn<P extends EncryptionPurpose>(
    purpose: P,
    stored: string,
    ref: ColumnRef,
    tenantId?: TenantIdFor<P>,
  ): Promise<string> {
    const [versionStr, ivB64, ctB64, tagB64] = stored.split(':');
    if (versionStr === undefined || ivB64 === undefined || ctB64 === undefined || tagB64 === undefined) {
      throw new EncryptionError('暗号化列の保存形式が不正です');
    }
    const keyVersion = Number.parseInt(versionStr, 10);
    if (!Number.isInteger(keyVersion) || keyVersion < 1) {
      throw new EncryptionError('key_version が不正です');
    }
    const scope = resolveKeyScope(purpose, tenantId as string | undefined);
    const dek = await this.dekByVersion(purpose, scope, keyVersion);
    const plain = await gcmDecrypt(dek, fromBase64(ivB64), fromBase64(ctB64), fromBase64(tagB64), aadBytes(ref));
    return new TextDecoder().decode(plain);
  }

  /**
   * DEK ローテーション (§4.1.2): 新 version を先に発行し、現 active を retiring へ落とす。
   * UNIQUE 競合時は勝者の version を再読込するため、同時実行でも active key 不在にならない。
   * 旧 version 行の再暗号化バッチは運用手順 (P12 runbook) の責務。
   */
  async rotateDek<P extends EncryptionPurpose>(purpose: P, tenantId?: TenantIdFor<P>): Promise<number> {
    const scope = resolveKeyScope(purpose, tenantId as string | undefined);
    for (let attempt = 0; attempt < KEY_WRITE_ATTEMPTS; attempt += 1) {
      const current = await this.ensureActiveDek(purpose, tenantId);
      const nextVersion = current + 1;
      try {
        await this.insertActiveDek(purpose, scope, nextVersion);
      } catch (error) {
        if (!isRetryableKeyWrite(error)) throw error;
        const winner = await this.activeDekVersion(purpose, scope);
        if (winner !== null && winner > current) return winner;
        continue;
      }
      await guardedWrite(this.adapter, () =>
        this.adapter.client
          .update(encryptionKeys)
          .set({ status: 'retiring' })
          .where(
            and(
              eq(encryptionKeys.purpose, purpose),
              this.tenantScope(scope),
              eq(encryptionKeys.keyVersion, current),
              eq(encryptionKeys.status, 'active'),
            ),
          ),
      );
      return nextVersion;
    }
    throw new EncryptionError(`DEK rotation が競合しました (purpose=${purpose}, tenant=${scope ?? 'global'})`);
  }
}
