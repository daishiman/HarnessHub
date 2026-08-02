import { describe, expect, it } from 'vitest';

import { createNodeProcessRunner } from './process.js';

describe('createNodeProcessRunner', () => {
  it('子プロセスの stdout/exitCode を収集する', async () => {
    const runProcess = createNodeProcessRunner();
    const result = await runProcess('node', ['-e', 'process.stdout.write("ok"); process.exit(0)']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('ok');
  });

  it('非 0 終了時は stderr と exitCode をそのまま返す', async () => {
    const runProcess = createNodeProcessRunner();
    const result = await runProcess('node', ['-e', 'process.stderr.write("ng"); process.exit(3)']);

    expect(result.exitCode).toBe(3);
    expect(result.stderr).toBe('ng');
  });

  it('シェルを介さず (shell: false) 実行するため、シェル構文はそのまま引数として渡る', async () => {
    const runProcess = createNodeProcessRunner();
    // shell: true だと `&&` はコマンド区切りとして解釈されてしまうが、shell:false ならただの文字列引数になる。
    const result = await runProcess('node', [
      '-e',
      'process.stdout.write(process.argv.slice(1).join("|"))',
      '--',
      'a && b',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('a && b');
  });
});
