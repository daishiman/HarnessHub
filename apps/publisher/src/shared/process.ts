/**
 * 子プロセス実行の依存性注入契約 (packages/inspection package-rules.ts 冒頭コメントの設計原則を CLI 側にも揃える)。
 *
 * auth/ (OS credential adapter) と deploy/ (wrangler 実行) はどちらも子プロセスを起動する。
 * 乱数・時刻・ファイル I/O を module 内に持ち込まず呼び出し側から渡す純関数にする原則を守るため、
 * 本番用の実行実装をこの 1 箇所へ集約し、テストでは fake な `RunProcess` を注入する。
 */
import { spawn } from 'node:child_process';

export interface ProcessResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export type RunProcess = (command: string, args: readonly string[]) => Promise<ProcessResult>;

export function createNodeProcessRunner(): RunProcess {
  return (command, args) =>
    new Promise((resolvePromise, reject) => {
      const child = spawn(command, [...args], { shell: false });
      let stdout = '';
      let stderr = '';
      child.stdout?.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf-8');
      });
      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf-8');
      });
      child.on('error', reject);
      child.on('close', (exitCode) => {
        resolvePromise({ exitCode: exitCode ?? 1, stdout, stderr });
      });
    });
}
