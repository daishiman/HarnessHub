// DMDB-T11: 封筒暗号化 (security-spec §4.1 / T-4, T-5)。round-trip・IV 非再利用・AAD 検証・key rotation。

import { beforeEach, describe, expect, it } from 'vitest';
import type { TursoAdapter } from '../connection/turso';
import { toBase64 } from '../repository/bytes';
import { ColumnCipher, ENCRYPTED_COLUMN_PATTERN, EncryptionError, type EncryptionPurpose } from '../repository/crypto';
import { encryptionKeys } from '../schema/core/security';
import { asCore, createLibsqlTestDb, OTHER_KEK_B64, TEST_KEK_B64 } from './support/test-db';

let adapter: TursoAdapter;
let cipher: ColumnCipher;
const REF = { table: 'users', column: 'salary', rowId: 'row-1' };

/** migration 前の global DEK wrap 形式。実装と独立に固定して互換性を回帰検査する。 */
async function wrapLegacyGlobalDek(purpose: 'salary' | 'idp_secret', keyVersion: number): Promise<string> {
  const kek = await crypto.subtle.importKey(
    'raw',
    Buffer.from(TEST_KEK_B64, 'base64') as BufferSource,
    'AES-GCM',
    false,
    ['encrypt'],
  );
  const dek = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aad = new TextEncoder().encode(`encryption_keys:dek_wrapped:${purpose}:v${keyVersion}`);
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource, additionalData: aad as BufferSource },
      kek,
      dek as BufferSource,
    ),
  );
  return `${toBase64(iv)}:${toBase64(sealed.slice(0, -16))}:${toBase64(sealed.slice(-16))}`;
}

beforeEach(async () => {
  adapter = await createLibsqlTestDb();
  cipher = new ColumnCipher(asCore(adapter), TEST_KEK_B64);
});

describe('DMDB-T11 envelope encryption', () => {
  it('encrypt → decrypt round-trip が成立し、保存形式が {v}:{iv}:{ct}:{tag}', async () => {
    const stored = await cipher.encryptColumn('salary', '8000000', REF);
    expect(stored).toMatch(ENCRYPTED_COLUMN_PATTERN);
    expect(stored.startsWith('1:')).toBe(true);
    expect(stored).not.toContain('8000000');
    expect(await cipher.decryptColumn('salary', stored, REF)).toBe('8000000');
  });

  it('同一平文でも IV がレコードごとに異なる (nonce 再利用なし)', async () => {
    const stored = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        cipher.encryptColumn('idp_secret', 'same-plain', { ...REF, rowId: `parallel-${index}` }),
      ),
    );
    expect(stored.every((value) => value.startsWith('1:'))).toBe(true);
    expect(new Set(stored.map((value) => value.split(':')[1])).size).toBe(stored.length);
    await Promise.all(
      stored.map(async (value, index) => {
        expect(await cipher.decryptColumn('idp_secret', value, { ...REF, rowId: `parallel-${index}` })).toBe(
          'same-plain',
        );
      }),
    );
  });

  it('AAD 不一致 (別 row への移植 = cut-and-paste) で復号が失敗する', async () => {
    const stored = await cipher.encryptColumn('salary', 'secret', REF);
    await expect(cipher.decryptColumn('salary', stored, { ...REF, rowId: 'row-2' })).rejects.toThrow(EncryptionError);
  });

  it('purpose が異なれば DEK も異なる (salary の暗号文を idp_secret では復号できない)', async () => {
    const stored = await cipher.encryptColumn('salary', 'secret', REF);
    await expect(cipher.decryptColumn('idp_secret', stored, REF)).rejects.toThrow(EncryptionError);
  });

  it('DEK ローテーション後も旧 version の暗号文を復号でき、新規暗号化は新 version を使う (§4.1.2)', async () => {
    const oldStored = await cipher.encryptColumn('salary', 'old-value', REF);
    expect(oldStored.startsWith('1:')).toBe(true);

    const newVersion = await cipher.rotateDek('salary');
    expect(newVersion).toBe(2);

    // 復号互換: key_version 列により旧版の復号は常に可能
    expect(await cipher.decryptColumn('salary', oldStored, REF)).toBe('old-value');

    const newStored = await cipher.encryptColumn('salary', 'new-value', REF);
    expect(newStored.startsWith('2:')).toBe(true);
    expect(await cipher.decryptColumn('salary', newStored, REF)).toBe('new-value');
  });

  it('不正な KEK では復号できない (wrap の実効性)', async () => {
    const stored = await cipher.encryptColumn('salary', 'guarded', REF);
    const wrongKek = new ColumnCipher(asCore(adapter), OTHER_KEK_B64);
    await expect(wrongKek.decryptColumn('salary', stored, REF)).rejects.toThrow(EncryptionError);
  });

  it('migration 前の global DEK wrap AAD を維持し、既存 salary データを復号できる', async () => {
    await adapter.client.insert(encryptionKeys).values({
      id: 'legacy-salary-dek-v1',
      tenantId: null,
      purpose: 'salary',
      keyVersion: 1,
      dekWrapped: await wrapLegacyGlobalDek('salary', 1),
      status: 'active',
      createdAt: 0,
      retiredAt: null,
    });

    const stored = await cipher.encryptColumn('salary', 'legacy-compatible', REF);
    expect(await cipher.decryptColumn('salary', stored, REF)).toBe('legacy-compatible');
  });

  it('tenant_data は型を迂回した呼出でも tenantId なしの DEK を作らない', async () => {
    const dynamicCipher = cipher as unknown as {
      ensureActiveDek(purpose: EncryptionPurpose, tenantId?: string): Promise<number>;
    };
    await expect(dynamicCipher.ensureActiveDek('tenant_data')).rejects.toThrow('tenantId が必要');
  });
});
