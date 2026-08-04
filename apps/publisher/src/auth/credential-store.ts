/**
 * OS 資格情報域 adapter (AD-4)。macOS は Keychain (`security` CLI)、
 * Windows は Credential Manager (`Windows.Security.Credentials.PasswordVault`) を使う。
 *
 * どちらもネイティブ addon (keytar 等) に依存せず、外部プロセスを起動して完結させる —
 * deploy/ が wrangler を子プロセスで叩くのと同じ設計に揃え、テストは `RunProcess` の fake で行う
 * (packages/inspection の設計原則: 乱数・時刻・I/O を module 内に持ち込まない)。
 * 他の module は本 file を直接 import せず `CredentialStoreAdapter` 型だけに依存する。
 */
import { publisherCredentialRecordSchema } from '@harness-hub/schemas';

import type { RunProcess } from '../shared/process.js';
import type { CredentialStoreAdapter } from './types.js';

const SERVICE_NAME = 'harness-hub-publisher';

function accountFor(tenantSlug: string): string {
  return `${SERVICE_NAME}:${tenantSlug}`;
}

export function createMacKeychainAdapter(runProcess: RunProcess): CredentialStoreAdapter {
  return {
    platform: 'darwin',
    async saveToken(record) {
      const serialized = JSON.stringify(publisherCredentialRecordSchema.parse(record));
      // -U: 既存エントリがあれば更新する。無いと 2 回目以降の保存 (token rotation) が重複エラーになる。
      const result = await runProcess('security', [
        'add-generic-password',
        '-a',
        accountFor(record.tenant_slug),
        '-s',
        SERVICE_NAME,
        '-w',
        serialized,
        '-U',
      ]);
      if (result.exitCode !== 0) {
        throw new Error(`Keychain への保存に失敗しました: ${result.stderr}`);
      }
    },
    async getToken(tenantSlug) {
      const result = await runProcess('security', [
        'find-generic-password',
        '-a',
        accountFor(tenantSlug),
        '-s',
        SERVICE_NAME,
        '-w',
      ]);
      if (result.exitCode !== 0) return null;
      return publisherCredentialRecordSchema.parse(JSON.parse(result.stdout.trim()));
    },
    async clearToken(tenantSlug) {
      // 既に存在しない場合の非 0 終了は「クリア済み」と等価なので無視する (冪等)。
      await runProcess('security', ['delete-generic-password', '-a', accountFor(tenantSlug), '-s', SERVICE_NAME]);
    },
  };
}

/** PasswordVault 操作の前処理。毎回同じ WinRT 型を有効化する。 */
const VAULT_BOOTSTRAP =
  'Add-Type -AssemblyName System.Runtime.WindowsRuntime; ' +
  '[Windows.Security.Credentials.PasswordVault,Windows.Security.Credentials,ContentType=WindowsRuntime] | Out-Null; ' +
  '$vault = New-Object Windows.Security.Credentials.PasswordVault;';

function escapeForPowerShellSingleQuoted(value: string): string {
  return value.replace(/'/g, "''");
}

export function createWindowsCredentialManagerAdapter(runProcess: RunProcess): CredentialStoreAdapter {
  return {
    platform: 'win32',
    async saveToken(record) {
      const serialized = escapeForPowerShellSingleQuoted(JSON.stringify(publisherCredentialRecordSchema.parse(record)));
      const resource = escapeForPowerShellSingleQuoted(accountFor(record.tenant_slug));
      const script =
        `${VAULT_BOOTSTRAP} ` +
        `try { $vault.Remove($vault.Retrieve('${SERVICE_NAME}', '${resource}')) } catch {}; ` +
        `$vault.Add((New-Object Windows.Security.Credentials.PasswordCredential('${SERVICE_NAME}', '${resource}', '${serialized}')));`;
      const result = await runProcess('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]);
      if (result.exitCode !== 0) {
        throw new Error(`Credential Manager への保存に失敗しました: ${result.stderr}`);
      }
    },
    async getToken(tenantSlug) {
      const resource = escapeForPowerShellSingleQuoted(accountFor(tenantSlug));
      const script =
        `${VAULT_BOOTSTRAP} ` +
        `try { $cred = $vault.Retrieve('${SERVICE_NAME}', '${resource}'); $cred.RetrievePassword(); Write-Output $cred.Password } catch { exit 1 }`;
      const result = await runProcess('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]);
      if (result.exitCode !== 0) return null;
      return publisherCredentialRecordSchema.parse(JSON.parse(result.stdout.trim()));
    },
    async clearToken(tenantSlug) {
      const resource = escapeForPowerShellSingleQuoted(accountFor(tenantSlug));
      const script =
        `${VAULT_BOOTSTRAP} ` + `try { $vault.Remove($vault.Retrieve('${SERVICE_NAME}', '${resource}')) } catch {}`;
      await runProcess('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]);
    },
  };
}

export function createCredentialStoreAdapter(
  runProcess: RunProcess,
  platform: NodeJS.Platform = process.platform,
): CredentialStoreAdapter {
  if (platform === 'darwin') return createMacKeychainAdapter(runProcess);
  if (platform === 'win32') return createWindowsCredentialManagerAdapter(runProcess);
  throw new Error(`サポート対象外の OS です (platform=${platform})。macOS / Windows のみサポートします`);
}
