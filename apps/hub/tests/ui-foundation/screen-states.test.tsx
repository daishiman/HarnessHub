/**
 * @vitest-environment jsdom
 *
 * 画面状態の標準化に対する回帰検査。
 *
 * 押さえるのは 3 点。
 * 1. 共通実装が支援技術から正しく読める形になっていること (読込中の告知・権限不足の区別)
 * 2. 検出ゲートが実 route 構成で緑になること
 * 3. 検出ゲートが「欠落」と「独自実装への差し替え」の両方で赤になること
 *    — ここを確かめないと、常に exit 0 を返すゲートでも 2 だけは通ってしまう
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { UiProvider } from '@harness-hub/ui';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ErrorScreen, forbiddenError, isForbiddenError } from '../../src/components/error-screen.js';
import { ForbiddenScreen, LoadingScreen, NotFoundScreen } from '../../src/components/screen-states.js';

// jsdom 環境では import.meta.url が file: スキームにならないため、vitest の root (apps/hub) を使う
const hubRoot = process.cwd();
const appDir = join(hubRoot, 'src', 'app');
const scriptPath = join(hubRoot, 'scripts', 'check-screen-states.mjs');

const workDirs: string[] = [];

afterEach(() => {
  for (const dir of workDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

/** 検出ゲートを走らせて終了コードを返す。 */
function runCheck(targetAppDir: string): { code: number; output: string } {
  try {
    const output = execFileSync(process.execPath, [scriptPath, '--app-dir', targetAppDir], { encoding: 'utf8' });
    return { code: 0, output };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string };
    return { code: failure.status ?? -1, output: `${failure.stdout ?? ''}${failure.stderr ?? ''}` };
  }
}

/** 実 app ディレクトリを複製した作業領域を作る (本物を壊さずに欠落を再現するため)。 */
function copyAppDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'screen-states-'));
  workDirs.push(dir);
  const copy = join(dir, 'app');
  cpSync(appDir, copy, { recursive: true });
  return copy;
}

describe('画面状態の共通実装', () => {
  it('読込中は読み上げ用の告知を持つ (Skeleton は装飾なので単独では伝わらない)', () => {
    render(
      <UiProvider>
        <LoadingScreen label="ドキュメントを読み込み中です" />
      </UiProvider>,
    );

    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.textContent).toContain('ドキュメントを読み込み中です');
  });

  it('見つからない画面は戻り先の導線を持つ', () => {
    render(
      <UiProvider>
        <NotFoundScreen />
      </UiProvider>,
    );

    expect(screen.getByRole('link', { name: 'トップへ戻る' })).toBeDefined();
  });

  /** 403 を汎用エラーと同じ文面にすると、利用者は再試行を繰り返して同じ所で止まる。 */
  it('権限不足は汎用エラーと別の文面になり、再試行ボタンを出さない', () => {
    const { unmount } = render(
      <UiProvider>
        <ForbiddenScreen />
      </UiProvider>,
    );
    expect(screen.getByText('この画面を開く権限がありません')).toBeDefined();
    expect(screen.queryByRole('button', { name: '再試行する' })).toBeNull();
    unmount();

    render(
      <UiProvider>
        <ErrorScreen error={new Error('boom')} reset={() => undefined} />
      </UiProvider>,
    );
    expect(screen.getByText('表示できませんでした')).toBeDefined();
    expect(screen.getByRole('button', { name: '再試行する' })).toBeDefined();
  });

  it('ErrorScreen は digest から権限不足を見分ける', () => {
    expect(isForbiddenError(forbiddenError())).toBe(true);
    expect(isForbiddenError(new Error('boom'))).toBe(false);

    render(
      <UiProvider>
        <ErrorScreen error={forbiddenError()} reset={() => undefined} />
      </UiProvider>,
    );

    expect(screen.getByText('この画面を開く権限がありません')).toBeDefined();
  });

  /** 例外の message をそのまま出すと、開発時の内部情報が画面へ漏れる経路が残る。 */
  it('例外の message を画面へ出さない', () => {
    render(
      <UiProvider>
        <ErrorScreen error={new Error('D1_ERROR: no such table users')} reset={() => undefined} />
      </UiProvider>,
    );

    expect(document.body.textContent).not.toContain('no such table');
  });
});

describe('画面状態の敷き漏れ検出ゲート', () => {
  it('実際の route 構成で緑になり、route group を全て対象に含む', () => {
    const result = runCheck(appDir);

    expect(result.code).toBe(0);
    expect(result.output).toContain('src/app/(dashboard)');
    expect(result.output).toContain('src/app/(workspace)');
  });

  it.each(['loading.tsx', 'error.tsx', 'not-found.tsx'])('%s が欠けた route group を非 0 で落とす', (stateFile) => {
    const copy = copyAppDir();
    rmSync(join(copy, '(dashboard)', stateFile));

    const result = runCheck(copy);

    expect(result.code).toBe(1);
    expect(result.output).toContain(`${stateFile} が無い`);
  });

  it('ファイルはあるが共通実装を使っていない場合も落とす', () => {
    const copy = copyAppDir();
    writeFileSync(
      join(copy, '(workspace)', 'loading.tsx'),
      'export default function Loading() { return <p>読込中</p>; }\n',
      'utf8',
    );

    const result = runCheck(copy);

    expect(result.code).toBe(1);
    expect(result.output).toContain('共通実装');
  });
});
