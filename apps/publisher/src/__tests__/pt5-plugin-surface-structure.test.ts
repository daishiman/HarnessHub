/**
 * PT5: plugin 面の構造 (desktop GUI を作らない, qa-007)。
 * 対応: docs/features/feat-publisher-plugin/test-design.md §PT5, AD-2。
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const PLUGIN_DIR = join(REPO_ROOT, 'plugins', 'harness-hub-publisher');
const DESKTOP_GUI_FRAMEWORKS = ['electron', 'tauri', '@tauri-apps/api', '@tauri-apps/cli'];

describe('PT5-A plugin manifest/slash command/skill/scripts の実体確認', () => {
  it('plugins/harness-hub-publisher/.claude-plugin/plugin.json が存在する', () => {
    expect(existsSync(join(PLUGIN_DIR, '.claude-plugin', 'plugin.json'))).toBe(true);
  });

  it('plugins/harness-hub-publisher/commands/publish.md (slash command定義) が存在する', () => {
    expect(existsSync(join(PLUGIN_DIR, 'commands', 'publish.md'))).toBe(true);
  });

  it('plugins/harness-hub-publisher/skills/run-publisher-publish/ が存在する', () => {
    const skillDir = join(PLUGIN_DIR, 'skills', 'run-publisher-publish');
    expect(existsSync(skillDir) && statSync(skillDir).isDirectory()).toBe(true);
    expect(existsSync(join(skillDir, 'SKILL.md'))).toBe(true);
    expect(existsSync(join(skillDir, 'scripts', 'run-publisher-publish.sh'))).toBe(true);
  });

  it('package.json 依存に Electron/Tauri 等の desktop GUI フレームワークが含まれない', () => {
    const publisherPackageJson = JSON.parse(readFileSync(join(REPO_ROOT, 'apps/publisher/package.json'), 'utf-8'));
    const allDeps = { ...publisherPackageJson.dependencies, ...publisherPackageJson.devDependencies };
    for (const framework of DESKTOP_GUI_FRAMEWORKS) {
      expect(Object.keys(allDeps)).not.toContain(framework);
    }
    // plugin 側は npm package を持たない (Claude Code plugin は script/skill/command のみで構成される)
    expect(existsSync(join(PLUGIN_DIR, 'package.json'))).toBe(false);
  });
});

describe('PT5-B apps/publisher への単一接続 (二重実装なし)', () => {
  const scriptSource = readFileSync(
    join(PLUGIN_DIR, 'skills', 'run-publisher-publish', 'scripts', 'run-publisher-publish.sh'),
    'utf-8',
  );

  it('plugin 側 script が apps/publisher/src/cli/ の呼び出しのみを行う', () => {
    expect(scriptSource).toMatch(/apps\/publisher\/bin\/harness-publisher\.mjs/);
    // publish サブコマンドを渡して呼ぶだけで、他に業務処理を挟まない (exec による単一呼び出し)
    expect(scriptSource.match(/^exec /m)).not.toBeNull();
  });

  it('plugin 側に package 収集・Device Flow・wrangler 実行の業務ロジックが複製されていない', () => {
    // コメントで「実装しない」と言及すること自体は許容し、実際に wrangler/device flow を
    // 呼び出す・実装するコードが無いことだけを検査する (コメント行は除いて検査する)
    const codeLines = scriptSource
      .split('\n')
      .filter((line) => !line.trim().startsWith('#'))
      .join('\n');
    expect(codeLines).not.toMatch(/wrangler/i);
    expect(codeLines).not.toMatch(/device_code|device\/token|authorization_pending/i);
    expect(codeLines).not.toMatch(/add-generic-password|PasswordVault/);
  });
});
