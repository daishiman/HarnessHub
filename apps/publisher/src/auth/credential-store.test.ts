import type { PublisherCredentialRecord } from '@harness-hub/schemas';
import { describe, expect, it, vi } from 'vitest';

import type { ProcessResult, RunProcess } from '../shared/process.js';
import {
  createCredentialStoreAdapter,
  createMacKeychainAdapter,
  createWindowsCredentialManagerAdapter,
} from './credential-store.js';

const RECORD: PublisherCredentialRecord = {
  tenant_slug: 'acme',
  workspace_id: 'ws-1',
  refresh_token: 'a'.repeat(32),
  scope: ['publish:write'],
  issued_at: 1_000,
};

function fakeRunProcess(result: ProcessResult): RunProcess {
  return vi.fn(async () => result);
}

describe('createMacKeychainAdapter', () => {
  it('getToken は security コマンドが成功したら保存済み record を返す', async () => {
    const runProcess = fakeRunProcess({ exitCode: 0, stdout: `${JSON.stringify(RECORD)}\n`, stderr: '' });
    const adapter = createMacKeychainAdapter(runProcess);

    await expect(adapter.getToken('acme')).resolves.toEqual(RECORD);
  });

  it('getToken は security コマンドが非 0 終了したら null を返す (未保存扱い)', async () => {
    const runProcess = fakeRunProcess({ exitCode: 44, stdout: '', stderr: 'not found' });
    const adapter = createMacKeychainAdapter(runProcess);

    await expect(adapter.getToken('acme')).resolves.toBeNull();
  });

  it('saveToken は security コマンドが非 0 終了したらエラーを投げる', async () => {
    const runProcess = fakeRunProcess({ exitCode: 1, stdout: '', stderr: 'keychain locked' });
    const adapter = createMacKeychainAdapter(runProcess);

    await expect(adapter.saveToken(RECORD)).rejects.toThrow(/keychain locked/);
  });

  it('clearToken は security delete-generic-password を呼ぶ (非 0 終了でも例外にしない、冪等)', async () => {
    const runProcess = fakeRunProcess({ exitCode: 44, stdout: '', stderr: 'not found' });
    const adapter = createMacKeychainAdapter(runProcess);

    await expect(adapter.clearToken('acme')).resolves.toBeUndefined();
    expect(runProcess).toHaveBeenCalledWith('security', expect.arrayContaining(['delete-generic-password']));
  });
});

describe('createWindowsCredentialManagerAdapter', () => {
  it('getToken は PowerShell が成功したら保存済み record を返す', async () => {
    const runProcess = fakeRunProcess({ exitCode: 0, stdout: `${JSON.stringify(RECORD)}\n`, stderr: '' });
    const adapter = createWindowsCredentialManagerAdapter(runProcess);

    await expect(adapter.getToken('acme')).resolves.toEqual(RECORD);
  });

  it('getToken は PowerShell が非 0 終了したら null を返す (未保存扱い)', async () => {
    const runProcess = fakeRunProcess({ exitCode: 1, stdout: '', stderr: '' });
    const adapter = createWindowsCredentialManagerAdapter(runProcess);

    await expect(adapter.getToken('acme')).resolves.toBeNull();
  });

  it('saveToken は PowerShell が非 0 終了したらエラーを投げる', async () => {
    const runProcess = fakeRunProcess({ exitCode: 1, stdout: '', stderr: 'vault error' });
    const adapter = createWindowsCredentialManagerAdapter(runProcess);

    await expect(adapter.saveToken(RECORD)).rejects.toThrow(/vault error/);
  });

  it('clearToken は powershell.exe を呼ぶ (結果は無視する、冪等)', async () => {
    const runProcess = fakeRunProcess({ exitCode: 1, stdout: '', stderr: '' });
    const adapter = createWindowsCredentialManagerAdapter(runProcess);

    await expect(adapter.clearToken('acme')).resolves.toBeUndefined();
    expect(runProcess).toHaveBeenCalledWith('powershell.exe', expect.arrayContaining(['-NoProfile']));
  });

  it("refresh_token 中の ' はシングルクォート二重化でエスケープする (PowerShell 文字列注入対策)", async () => {
    const runProcess = fakeRunProcess({ exitCode: 0, stdout: '', stderr: '' });
    const adapter = createWindowsCredentialManagerAdapter(runProcess);
    // refresh_token は tenant_slug と違い文字集合の制約が無いため、' を混入させても schema を通る。
    const record: PublisherCredentialRecord = { ...RECORD, refresh_token: `it's-${'a'.repeat(32)}` };

    await adapter.saveToken(record);

    const [, args] = (runProcess as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string[]];
    const script = args[args.length - 1] as string;
    expect(script).toContain("it''s-");
    expect(script).not.toMatch(/it's-/);
  });
});

describe('createCredentialStoreAdapter', () => {
  it('darwin では Mac Keychain adapter を返す', () => {
    const adapter = createCredentialStoreAdapter(fakeRunProcess({ exitCode: 0, stdout: '', stderr: '' }), 'darwin');
    expect(adapter.platform).toBe('darwin');
  });

  it('win32 では Windows Credential Manager adapter を返す', () => {
    const adapter = createCredentialStoreAdapter(fakeRunProcess({ exitCode: 0, stdout: '', stderr: '' }), 'win32');
    expect(adapter.platform).toBe('win32');
  });

  it('darwin/win32 以外の platform は非対応としてエラーを投げる', () => {
    expect(() =>
      createCredentialStoreAdapter(fakeRunProcess({ exitCode: 0, stdout: '', stderr: '' }), 'linux'),
    ).toThrow(/サポート対象外/);
  });
});
