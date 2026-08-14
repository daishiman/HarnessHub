/**
 * 同梱フォント (vendored fonts) の契約テスト。
 *
 * ## 何を守っているか
 *
 * 2026-08-14、`next/font/google` がビルド時に fonts.gstatic.com を叩く仕組みだったため、
 * Google 側の一時的な不調で `next build` が落ち、hub-ci の `wrangler deploy` が停止した。
 * 恒久対策としてフォント実体を repository へ同梱し、`next/font/local` から読むよう変えた。
 *
 * この変更は「実体・台帳・参照コード」の 3 つが揃って初めて成立する。どれか 1 つが黙ってずれると
 *   - 実体が欠ける → build が落ちる (気づける)
 *   - 台帳とずれる → 由来不明のバイナリが残る (気づけない)
 *   - 参照コードが google へ戻る → 元の障害が再発する (外部が不調な日にだけ気づく)
 * となり、危険なのは後ろ 2 つである。ここで 3 者の整合を固定する。
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const HUB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FONT_DIR = join(HUB_ROOT, 'src', 'assets', 'fonts');
const FONTS_TS = join(HUB_ROOT, 'src', 'app', 'fonts.ts');

type FontEntry = {
  id: string;
  family: string;
  subset: string;
  requested_weights: string[];
  variable: boolean;
  style: string;
  file: string;
  unicode_range: string;
  sha256: string;
  bytes: number;
  license: { name: string; file: string; source_url: string; sha256: string; bytes: number };
};

const manifest = JSON.parse(readFileSync(join(FONT_DIR, 'fonts.manifest.json'), 'utf8')) as { fonts: FontEntry[] };
const fontsSource = readFileSync(FONTS_TS, 'utf8');
const vendorScript = join(HUB_ROOT, 'scripts', 'vendor-fonts.mjs');

const fixtureRoots: string[] = [];

afterEach(() => {
  for (const root of fixtureRoots.splice(0)) rmSync(root, { force: true, recursive: true });
});

function sha256(path: string) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function createCheckerFixture() {
  const root = mkdtempSync(join(tmpdir(), 'vendored-fonts-check-'));
  fixtureRoots.push(root);
  const scriptsDir = join(root, 'scripts');
  const fontDir = join(root, 'src', 'assets', 'fonts');
  mkdirSync(scriptsDir, { recursive: true });
  mkdirSync(fontDir, { recursive: true });
  copyFileSync(vendorScript, join(scriptsDir, 'vendor-fonts.mjs'));

  const fixtureManifest = structuredClone(manifest);
  for (const font of fixtureManifest.fonts) {
    copyFileSync(join(FONT_DIR, font.file), join(fontDir, font.file));
    copyFileSync(join(FONT_DIR, font.license.file), join(fontDir, font.license.file));
    const licensePath = join(fontDir, font.license.file);
    font.license.bytes = readFileSync(licensePath).length;
    font.license.sha256 = sha256(licensePath);
  }

  const manifestPath = join(fontDir, 'fonts.manifest.json');
  const save = () => writeFileSync(manifestPath, `${JSON.stringify(fixtureManifest, null, 2)}\n`);
  const run = () =>
    spawnSync(process.execPath, [join(scriptsDir, 'vendor-fonts.mjs'), '--check'], { encoding: 'utf8' });
  save();
  return { root, fontDir, fixtureManifest, save, run };
}

function expectCheckerViolation(result: ReturnType<typeof spawnSync>, kind: string) {
  expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(1);
  expect(result.stderr).toContain(`[${kind}]`);
}

function fixtureFont(fixture: ReturnType<typeof createCheckerFixture>, index = 0) {
  const font = fixture.fixtureManifest.fonts[index];
  if (!font) throw new Error(`fixture font ${index} がありません`);
  return font;
}

/** 検査対象が消えても緑になる事故を避けるため、まず母数そのものを固定する。 */
describe('同梱フォントの台帳', () => {
  it('sans / mono の 2 系統を宣言している', () => {
    expect(manifest.fonts.map((f) => f.id).sort()).toEqual(['ibm-plex-sans-latin', 'jetbrains-mono-latin']);
  });

  it('実体と licence 本文が repository に存在する', () => {
    for (const font of manifest.fonts) {
      expect(existsSync(join(FONT_DIR, font.file)), `${font.file} が無い`).toBe(true);
      expect(existsSync(join(FONT_DIR, font.license.file)), `${font.license.file} が無い`).toBe(true);
    }
  });

  it('vendor-fonts.mjs --check が台帳と実体の一致を確認できる (ネットワーク不使用)', () => {
    expect(() => execFileSync(process.execPath, [vendorScript, '--check'], { stdio: 'pipe' })).not.toThrow();
  });

  it('ライセンス本文の byte 数と sha256 もフォントと同様に検証する', () => {
    const fixture = createCheckerFixture();
    writeFileSync(join(fixture.fontDir, fixtureFont(fixture).license.file), 'tampered license\n');

    expectCheckerViolation(fixture.run(), 'license-size-mismatch');
  });

  it('ライセンス本文が同じ byte 数で改ざんされても sha256 で検出する', () => {
    const fixture = createCheckerFixture();
    const licensePath = join(fixture.fontDir, fixtureFont(fixture).license.file);
    const bytes = readFileSync(licensePath);
    if (bytes.length === 0) throw new Error('fixture license が空です');
    bytes[0] = (bytes[0] ?? 0) ^ 1;
    writeFileSync(licensePath, bytes);

    expectCheckerViolation(fixture.run(), 'license-digest-mismatch');
  });

  it('重複 ID を Map で上書きせず拒否する', () => {
    const fixture = createCheckerFixture();
    fixture.fixtureManifest.fonts.push(structuredClone(fixtureFont(fixture)));
    fixture.save();

    expectCheckerViolation(fixture.run(), 'entry-id-duplicate');
  });

  it('異なる ID が同じフォント実体を指す重複経路を拒否する', () => {
    const fixture = createCheckerFixture();
    const first = fixtureFont(fixture);
    const second = fixtureFont(fixture, 1);
    second.file = first.file;
    second.bytes = first.bytes;
    second.sha256 = first.sha256;
    fixture.save();

    expectCheckerViolation(fixture.run(), 'font-path-duplicate');
  });

  it('台帳が font directory 外のファイルを指す経路逸脱を拒否する', () => {
    const fixture = createCheckerFixture();
    const font = fixtureFont(fixture);
    copyFileSync(join(fixture.fontDir, font.file), join(fixture.root, 'src', 'assets', 'outside-font.woff2'));
    font.file = '../outside-font.woff2';
    fixture.save();

    expectCheckerViolation(fixture.run(), 'font-path-invalid');
  });

  it.each([
    ['family', (entry: FontEntry) => (entry.family = 'Unexpected Family')],
    ['subset', (entry: FontEntry) => (entry.subset = 'cyrillic')],
    ['requested_weights', (entry: FontEntry) => (entry.requested_weights = ['400', '900'])],
    ['variable', (entry: FontEntry) => (entry.variable = false)],
    ['style', (entry: FontEntry) => (entry.style = 'italic')],
    ['license.name', (entry: FontEntry) => (entry.license.name = 'Unknown license')],
    ['license.file', (entry: FontEntry) => (entry.license.file = '../LICENSE-ibm-plex.txt')],
    ['license.source_url', (entry: FontEntry) => (entry.license.source_url = 'https://example.invalid/license')],
  ])('台帳の %s が FONT_SPEC とずれたら拒否する', (_field, mutate) => {
    const fixture = createCheckerFixture();
    mutate(fixtureFont(fixture));
    fixture.save();

    expectCheckerViolation(fixture.run(), 'metadata-mismatch');
  });

  it('--update は全取得・検証完了前に既存資産を上書きしない', () => {
    expect(() =>
      execFileSync(process.execPath, [vendorScript, '--self-test-update-transaction'], { stdio: 'pipe' }),
    ).not.toThrow();
  });
});

describe('fonts.ts と台帳の結線', () => {
  it('next/font/local から読み、next/font/google へ戻っていない', () => {
    expect(fontsSource).toContain("from 'next/font/local'");
    // 「なぜ google をやめたか」の説明はコメントとして残っているので、import 文の形だけを見る。
    // コメント内の言及を除外する判定は check-google-font-build-fetch.mjs 側が担う (下の describe)。
    expect(fontsSource).not.toMatch(/from\s+['"]next\/font\/google['"]/);
  });

  it('src path が台帳のファイル名を指している', () => {
    for (const font of manifest.fonts) {
      expect(fontsSource, `${font.file} を参照していない`).toContain(`../assets/fonts/${font.file}`);
    }
  });

  /**
   * next/font のローダは「オプションは書き下したリテラル」しか受け付けないため、fonts.ts は
   * unicode-range を定数に括り出せず 2 箇所へ直書きしている (詳細は fonts.ts のコメント)。
   * 言語機構で守れない分をここで守る。同梱フォント数と宣言数が食い違う場合も落とす。
   */
  it('unicode-range が台帳の値と一致する (latin subset の収録範囲)', () => {
    const declared = [...fontsSource.matchAll(/prop:\s*'unicode-range',\s*\n?\s*value:\s*\n?\s*'([^']+)'/g)].map(
      (m) => m[1],
    );
    expect(declared, 'fonts.ts の宣言数が同梱フォント数と一致しない').toHaveLength(manifest.fonts.length);
    for (const [index, font] of manifest.fonts.entries()) {
      expect(declared[index], `${font.id} の unicode_range と不一致`).toBe(font.unicode_range);
    }
  });
});

describe('Google Fonts の build 時 fetch 禁止ゲート', () => {
  const gate = join(HUB_ROOT, 'scripts', 'check-google-font-build-fetch.mjs');

  // 「違反 0 件」が緑なのは、検出器が生きているときだけである。
  // 走査対象を全部消しても 0 件になるので、まず検出器が発火することを確かめる。
  it('検出器が意図的な違反を検出できる (--self-test)', () => {
    expect(() => execFileSync(process.execPath, [gate, '--self-test'], { stdio: 'pipe' })).not.toThrow();
  });

  it('現状のソースに違反が無い', () => {
    expect(() => execFileSync(process.execPath, [gate], { stdio: 'pipe' })).not.toThrow();
  });
});
