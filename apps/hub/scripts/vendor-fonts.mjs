#!/usr/bin/env node
/**
 * Web フォント実体をリポジトリへ同梱 (vendoring) し、同梱物の同一性を検証する。
 *
 * ## なぜ同梱するのか (2026-08-14 本番デプロイ停止の恒久対策)
 *
 * `next/font/google` は「実行時に Google へ取りに行かない」代わりに **ビルド時に取りに行く**。
 * ネットワーク依存を消したのではなく、リクエスト時からビルド時へ移しただけである。
 * その結果 `fonts.gstatic.com` の一時的な失敗が `next build` を落とし、
 * hub-ci の `wrangler deploy` job ごと停止した (実際の失敗ログ: "Failed to fetch font file from
 * https://fonts.gstatic.com/s/ibmplexsans/v23/... ." → "Failed to compile." → exit 1)。
 *
 * 対策として再試行を足すのは表面的である。再試行は「外部が落ちている間は本番へ出せない」
 * という構造を残す。ここでは **デプロイ経路から外部取得そのものを消す**:
 *   - フォント実体 (.woff2) を repository に置く
 *   - `src/app/fonts.ts` は `next/font/local` でその実体だけを読む
 *   - フォント取得経路は Google Fonts の可用性から独立する
 *
 * 取得は「ビルドのたびに暗黙に起きる副作用」から「人が明示的に走らせる保守作業」へ移る。
 * それがこのスクリプトである。
 *
 * ## 使い方
 *
 *   node apps/hub/scripts/vendor-fonts.mjs            # --check と同じ (既定)
 *   node apps/hub/scripts/vendor-fonts.mjs --check    # ネットワーク不使用。同梱物と台帳の一致だけ見る
 *   node apps/hub/scripts/vendor-fonts.mjs --update    # Google Fonts から再取得し台帳を書き直す
 *   node apps/hub/scripts/vendor-fonts.mjs --check --json artifacts/vendored-fonts.json
 *
 * `--check` は CI が走らせる。ネットワークを使わないので、CI が落ちる理由が
 * 「外部が不調」になることは無い。`--update` は人が意図して走らせ、差分を PR に載せる。
 *
 * ## 同梱物が 1 ファミリ 1 ファイルで足りる理由
 *
 * Google Fonts は IBM Plex Sans / JetBrains Mono を **可変フォント** (variable font =
 * 1 ファイルで太さを連続的に表現する形式) で配っており、subset が同じなら全ウェイトが
 * 同一 URL を返す。従って `latin` subset について家族あたり 1 ファイルでよい。
 * この前提は `--update` 時に検証し、崩れていれば止まる (下の assertSingleFilePerSubset)。
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HUB_ROOT = resolve(HERE, '..');
const FONT_DIR = resolve(HUB_ROOT, 'src', 'assets', 'fonts');
const MANIFEST_PATH = join(FONT_DIR, 'fonts.manifest.json');

/**
 * 同梱するフォントの正本宣言。`src/app/fonts.ts` が使う面と一対一で対応させる。
 *
 * `weights` は「この重みで CSS2 API へ問い合わせる」という意味であって、同梱ファイルが
 * その数だけ増えるという意味ではない (可変フォントなので 1 ファイルに収まる)。
 * ここを増減させたら `--update` を走らせ、`src/app/fonts.ts` の weight 範囲も合わせる。
 */
const FONT_SPEC = [
  {
    id: 'ibm-plex-sans-latin',
    family: 'IBM Plex Sans',
    weights: ['400', '500', '600', '700'],
    subset: 'latin',
    file: 'ibm-plex-sans-latin.woff2',
    license: {
      name: 'SIL Open Font License 1.1',
      file: 'LICENSE-ibm-plex.txt',
      url: 'https://raw.githubusercontent.com/IBM/plex/master/LICENSE.txt',
    },
  },
  {
    id: 'jetbrains-mono-latin',
    family: 'JetBrains Mono',
    weights: ['400', '500', '600'],
    subset: 'latin',
    file: 'jetbrains-mono-latin.woff2',
    license: {
      name: 'SIL Open Font License 1.1',
      file: 'LICENSE-jetbrains-mono.txt',
      url: 'https://raw.githubusercontent.com/JetBrains/JetBrainsMono/master/OFL.txt',
    },
  },
];

/**
 * Google Fonts の CSS2 API は User-Agent で配信形式を出し分ける。
 * 近代ブラウザを名乗らないと woff2 ではなく ttf が返り、同梱物が数倍に膨らむ。
 */
const MODERN_BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** woff2 の先頭 4 byte は必ず 'wOF2'。壊れた/別形式のファイルを同梱していないかの最小検査。 */
const WOFF2_SIGNATURE = 'wOF2';

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function parseArgs(argv) {
  const args = { mode: 'check', json: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--update') args.mode = 'update';
    else if (arg === '--check') args.mode = 'check';
    else if (arg === '--self-test-update-transaction') args.mode = 'self-test-update-transaction';
    else if (arg === '--json') {
      args.json = argv[i + 1];
      i += 1;
    } else throw new Error(`未知の引数: ${arg}`);
  }
  if (args.mode === 'update' && args.json)
    throw new Error('--update と --json は併用しない (台帳が出力先を兼ねるため)');
  return args;
}

/* ------------------------------------------------------------------ */
/* --update: Google Fonts から取得して同梱                              */
/* ------------------------------------------------------------------ */

async function fetchText(url, headers = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GET ${url} が ${res.status} ${res.statusText} を返した`);
  return await res.text();
}

async function fetchBinary(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} が ${res.status} ${res.statusText} を返した`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * CSS2 API の応答を `@font-face` 単位に切り出す。
 * subset 名は各ブロック直前の `/* latin *\/` 形式のコメントにしか現れないため、コメントを目印にする。
 */
function parseFontFaces(css) {
  const faces = [];
  const blockPattern = /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;
  for (const match of css.matchAll(blockPattern)) {
    const [, subset, body] = match;
    const pick = (prop) => body.match(new RegExp(`${prop}:\\s*([^;]+);`))?.[1]?.trim() ?? null;
    const url = body.match(/src:\s*url\(([^)]+)\)/)?.[1]?.trim() ?? null;
    faces.push({
      subset,
      family: pick('font-family')?.replace(/^'|'$/g, '') ?? null,
      weight: pick('font-weight'),
      style: pick('font-style'),
      unicodeRange: pick('unicode-range'),
      url,
    });
  }
  return faces;
}

/**
 * 「subset が同じなら全ウェイトが同一 URL」= 可変フォント、という前提を実測で確かめる。
 *
 * この前提が崩れる (Google が静的インスタンス配信へ戻す) と、1 ファイル同梱では
 * 400 以外の重みが欠ける。黙って劣化させず、ここで止めて人に気づかせる。
 */
function assertSingleFilePerSubset(spec, faces) {
  const urls = new Set(faces.map((f) => f.url));
  if (urls.size === 1 && !urls.has(null)) return;
  throw new Error(
    `${spec.family} (${spec.subset}) が weight ごとに別ファイルを返した (${urls.size} 種)。` +
      '可変フォント前提が崩れているので、FONT_SPEC と src/app/fonts.ts を weight 別ファイル構成へ作り直すこと。',
  );
}

/**
 * CSS Fonts が定める `font-weight: 400` / `font-weight: 100 700` だけを扱う。
 * woff2 バイナリの独自 parser は持たず、Google CSS2 の応答メタデータで
 * 要求 weight がすべてカバーされることを確かめる。
 */
function cssWeightCovers(cssWeight, requestedWeight) {
  const requested = Number(requestedWeight);
  const single = cssWeight?.match(/^(\d{1,4})$/);
  if (single) return Number(single[1]) === requested;
  const range = cssWeight?.match(/^(\d{1,4})\s+(\d{1,4})$/);
  if (!range) return false;
  return Number(range[1]) <= requested && requested <= Number(range[2]);
}

function assertCssMetadata(spec, faces) {
  const badFamily = faces.find((face) => face.family !== spec.family);
  if (badFamily) throw new Error(`${spec.family} の CSS 応答で family が不一致: ${badFamily.family ?? '未宣言'}`);

  const badStyle = faces.find((face) => face.style !== 'normal');
  if (badStyle) throw new Error(`${spec.family} の CSS 応答で style が normal でない: ${badStyle.style ?? '未宣言'}`);

  for (const weight of spec.weights) {
    if (!faces.some((face) => cssWeightCovers(face.weight, weight))) {
      throw new Error(`${spec.family} の CSS 応答が要求 weight ${weight} をカバーしていない`);
    }
  }

  const unicodeRanges = new Set(faces.map((face) => face.unicodeRange).filter(Boolean));
  if (unicodeRanges.size !== 1) {
    throw new Error(`${spec.family} (${spec.subset}) の unicode-range が一意でない (${unicodeRanges.size} 種)`);
  }
}

/**
 * 全ファイルを隔離ディレクトリへ書き、validateStage が成功した後だけ反映する。
 * 取得・形式検証の途中で既存資産を上書きしないための更新境界。
 */
function stageAndCommit({ destinationDir, files, manifest, validateStage }) {
  mkdirSync(dirname(destinationDir), { recursive: true });
  const stagingDir = mkdtempSync(join(dirname(destinationDir), '.vendored-fonts-stage-'));
  const manifestName = 'fonts.manifest.json';
  try {
    for (const [name, bytes] of files) writeFileSync(join(stagingDir, name), bytes);
    writeFileSync(join(stagingDir, manifestName), `${JSON.stringify(manifest, null, 2)}\n`);
    validateStage(stagingDir);

    mkdirSync(destinationDir, { recursive: true });
    for (const name of files.keys()) renameSync(join(stagingDir, name), join(destinationDir, name));
    // 台帳を最後に反映し、新台帳が未反映の実体を指す瞬間を作らない。
    renameSync(join(stagingDir, manifestName), join(destinationDir, manifestName));
  } finally {
    rmSync(stagingDir, { force: true, recursive: true });
  }
}

async function update() {
  const entries = [];
  const files = new Map();

  for (const spec of FONT_SPEC) {
    const familyQuery = `${spec.family.replace(/ /g, '+')}:wght@${spec.weights.join(';')}`;
    const cssUrl = `https://fonts.googleapis.com/css2?family=${familyQuery}&display=swap`;
    const css = await fetchText(cssUrl, { 'user-agent': MODERN_BROWSER_UA });

    const faces = parseFontFaces(css).filter((f) => f.subset === spec.subset);
    if (faces.length === 0) throw new Error(`${spec.family} の subset "${spec.subset}" が CSS 応答に無い`);
    assertCssMetadata(spec, faces);
    assertSingleFilePerSubset(spec, faces);

    const face = faces[0];
    const bytes = await fetchBinary(face.url);
    if (bytes.subarray(0, 4).toString('latin1') !== WOFF2_SIGNATURE) {
      throw new Error(`${spec.family} の取得結果が woff2 ではない (User-Agent の出し分けを疑う)`);
    }
    const licenseText = await fetchText(spec.license.url);
    const licenseBytes = Buffer.from(licenseText);
    files.set(spec.file, bytes);
    files.set(spec.license.file, licenseBytes);

    // フォント URL に含まれる `/v23/` などが Google 側の family 版数。差分レビューの手掛かりとして残す。
    const version = face.url.match(/\/s\/[^/]+\/(v\d+)\//)?.[1] ?? null;

    entries.push({
      id: spec.id,
      family: spec.family,
      subset: spec.subset,
      google_family_version: version,
      requested_weights: spec.weights,
      variable: true,
      style: face.style,
      unicode_range: face.unicodeRange,
      file: spec.file,
      bytes: bytes.length,
      sha256: sha256(bytes),
      source_css_url: cssUrl,
      source_font_url: face.url,
      license: {
        name: spec.license.name,
        file: spec.license.file,
        source_url: spec.license.url,
        bytes: licenseBytes.length,
        sha256: sha256(licenseBytes),
      },
    });
    console.log(`[vendor-fonts] 取得: ${spec.file} (${bytes.length} byte, ${version ?? 'version 不明'})`);
  }

  const manifest = {
    note: 'Google Fonts から取得したフォント実体の同梱台帳。編集は scripts/vendor-fonts.mjs --update 経由で行う',
    reason: 'フォント取得経路を Google Fonts の可用性から独立させるため (2026-08-14 デプロイ停止の恒久対策)',
    updated_by: 'apps/hub/scripts/vendor-fonts.mjs --update',
    fonts: entries,
  };

  stageAndCommit({
    destinationDir: FONT_DIR,
    files,
    manifest,
    validateStage: (stagingDir) => {
      const result = validateManifest(manifest, stagingDir);
      if (
        result.findings.length > 0 ||
        result.checkedFontFiles !== FONT_SPEC.length ||
        result.checkedLicenseFiles !== FONT_SPEC.length
      ) {
        throw new Error(`staging 検証に失敗: ${result.findings.map((finding) => finding.kind).join(', ')}`);
      }
    },
  });
  console.log(`[vendor-fonts] 台帳を更新: ${MANIFEST_PATH}`);
}

/* ------------------------------------------------------------------ */
/* --check: 同梱物と台帳の一致検証 (ネットワーク不使用)                 */
/* ------------------------------------------------------------------ */

function expectedCssUrl(spec) {
  const familyQuery = `${spec.family.replace(/ /g, '+')}:wght@${spec.weights.join(';')}`;
  return `https://fonts.googleapis.com/css2?family=${familyQuery}&display=swap`;
}

function isCanonicalAssetName(value) {
  return typeof value === 'string' && value.length > 0 && basename(value) === value;
}

function metadataEqual(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function validateManifest(manifest, fontDir) {
  const findings = [];
  const entries = Array.isArray(manifest?.fonts) ? manifest.fonts : [];
  if (!Array.isArray(manifest?.fonts)) {
    findings.push({ kind: 'manifest-invalid', detail: 'fonts が配列でない' });
  }

  const idCounts = new Map();
  for (const entry of entries) idCounts.set(entry?.id, (idCounts.get(entry?.id) ?? 0) + 1);
  for (const [id, count] of idCounts) {
    if (count > 1) {
      findings.push({ kind: 'entry-id-duplicate', id, detail: `同じ id が ${count} 件ある` });
    }
  }

  for (const [field, kind] of [
    ['file', 'font-path-duplicate'],
    ['license.file', 'license-path-duplicate'],
  ]) {
    const owners = new Map();
    for (const entry of entries) {
      const value = field === 'file' ? entry?.file : entry?.license?.file;
      if (typeof value !== 'string') continue;
      const prior = owners.get(value);
      if (prior && prior !== entry?.id) {
        findings.push({ kind, id: entry?.id, detail: `${value} を ${prior} と重複して参照している` });
      } else owners.set(value, entry?.id);
    }
  }

  const byId = new Map(entries.map((entry) => [entry?.id, entry]));

  // 宣言 (FONT_SPEC) と台帳の対応が崩れていないか。台帳にだけ残った孤児も違反にする。
  for (const spec of FONT_SPEC) {
    if (!byId.has(spec.id)) findings.push({ kind: 'entry-missing', id: spec.id, detail: '台帳に宣言分の項目が無い' });
  }
  for (const entry of entries) {
    if (!FONT_SPEC.some((spec) => spec.id === entry?.id)) {
      findings.push({ kind: 'entry-orphan', id: entry?.id, detail: 'FONT_SPEC に無い項目が台帳に残っている' });
    }
  }

  let checkedFontFiles = 0;
  let checkedLicenseFiles = 0;
  for (const spec of FONT_SPEC) {
    const entry = byId.get(spec.id);
    if (!entry) continue;

    const expectedMetadata = {
      family: spec.family,
      subset: spec.subset,
      requested_weights: spec.weights,
      variable: true,
      style: 'normal',
      file: spec.file,
      source_css_url: expectedCssUrl(spec),
      license: {
        name: spec.license.name,
        file: spec.license.file,
        source_url: spec.license.url,
      },
    };
    const actualMetadata = {
      family: entry.family,
      subset: entry.subset,
      requested_weights: entry.requested_weights,
      variable: entry.variable,
      style: entry.style,
      file: entry.file,
      source_css_url: entry.source_css_url,
      license: {
        name: entry.license?.name,
        file: entry.license?.file,
        source_url: entry.license?.source_url,
      },
    };
    if (!metadataEqual(actualMetadata, expectedMetadata)) {
      findings.push({ kind: 'metadata-mismatch', id: spec.id, detail: 'FONT_SPEC と台帳メタデータが一致しない' });
    }

    if (typeof entry.unicode_range !== 'string' || entry.unicode_range.length === 0) {
      findings.push({ kind: 'metadata-invalid', id: spec.id, detail: 'unicode_range が空または未宣言' });
    }
    if (typeof entry.source_font_url !== 'string' || !entry.source_font_url.endsWith('.woff2')) {
      findings.push({ kind: 'metadata-invalid', id: spec.id, detail: 'source_font_url が woff2 URL でない' });
    }

    const targets = [
      {
        name: entry.file,
        expectedName: spec.file,
        kind: 'font',
        expectedBytes: entry.bytes,
        expectedDigest: entry.sha256,
      },
      {
        name: entry.license?.file,
        expectedName: spec.license.file,
        kind: 'license',
        expectedBytes: entry.license?.bytes,
        expectedDigest: entry.license?.sha256,
      },
    ];

    for (const target of targets) {
      if (!isCanonicalAssetName(target.name)) {
        findings.push({
          kind: `${target.kind}-path-invalid`,
          id: spec.id,
          detail: 'ファイル名は font directory 直下の basename で宣言する',
        });
        continue;
      }
      if (target.name !== target.expectedName) continue;

      if (!Number.isInteger(target.expectedBytes) || target.expectedBytes < 0) {
        findings.push({ kind: `${target.kind}-metadata-invalid`, id: spec.id, detail: 'bytes が非負整数でない' });
        continue;
      }
      if (typeof target.expectedDigest !== 'string' || !/^[a-f0-9]{64}$/.test(target.expectedDigest)) {
        findings.push({
          kind: `${target.kind}-metadata-invalid`,
          id: spec.id,
          detail: 'sha256 が 64 文字の小文字 hex でない',
        });
        continue;
      }

      const path = join(fontDir, target.name);
      if (!existsSync(path)) {
        findings.push({ kind: `${target.kind}-file-missing`, id: spec.id, detail: `実体が無い: ${path}` });
        continue;
      }

      const bytes = readFileSync(path);
      if (target.kind === 'font') checkedFontFiles += 1;
      else checkedLicenseFiles += 1;

      if (target.kind === 'font' && bytes.subarray(0, 4).toString('latin1') !== WOFF2_SIGNATURE) {
        findings.push({ kind: 'font-not-woff2', id: spec.id, detail: `先頭 4 byte が ${WOFF2_SIGNATURE} でない` });
      }
      if (bytes.length !== target.expectedBytes) {
        findings.push({
          kind: `${target.kind}-size-mismatch`,
          id: spec.id,
          detail: `台帳 ${target.expectedBytes} byte / 実体 ${bytes.length} byte`,
        });
      }
      const digest = sha256(bytes);
      if (digest !== target.expectedDigest) {
        findings.push({
          kind: `${target.kind}-digest-mismatch`,
          id: spec.id,
          detail: `台帳 ${target.expectedDigest} / 実体 ${digest}`,
        });
      }
    }
  }

  return { findings, checkedFontFiles, checkedLicenseFiles };
}

function check(jsonPath) {
  if (!existsSync(MANIFEST_PATH)) {
    return report(
      {
        findings: [{ kind: 'manifest-missing', detail: `台帳が無い: ${MANIFEST_PATH}` }],
        checkedFontFiles: 0,
        checkedLicenseFiles: 0,
      },
      jsonPath,
    );
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  } catch (error) {
    return report(
      {
        findings: [{ kind: 'manifest-invalid', detail: `JSON を読めない: ${error.message}` }],
        checkedFontFiles: 0,
        checkedLicenseFiles: 0,
      },
      jsonPath,
    );
  }
  return report(validateManifest(manifest, FONT_DIR), jsonPath);
}

function report({ findings, checkedFontFiles, checkedLicenseFiles }, jsonPath) {
  const result = {
    check: 'vendored-fonts',
    declared: FONT_SPEC.length,
    checked_font_files: checkedFontFiles,
    checked_license_files: checkedLicenseFiles,
    violation_count: findings.length,
    findings,
  };
  if (jsonPath) {
    mkdirSync(dirname(jsonPath), { recursive: true });
    writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
  }

  // 「1 件も検査していないのに緑」を成立させない。0 件検査の緑は証拠ではない。
  if (findings.length === 0 && (checkedFontFiles !== FONT_SPEC.length || checkedLicenseFiles !== FONT_SPEC.length)) {
    console.error(
      `[vendor-fonts] NG: 宣言 ${FONT_SPEC.length} 件に対し font=${checkedFontFiles} / license=${checkedLicenseFiles} 件しか検査できなかった`,
    );
    return 1;
  }
  if (findings.length === 0) {
    console.log(
      `[vendor-fonts] OK: 同梱フォント ${checkedFontFiles} 件とライセンス ${checkedLicenseFiles} 件が台帳と一致`,
    );
    return 0;
  }
  console.error(`[vendor-fonts] NG: ${findings.length} 件の不一致`);
  for (const f of findings) console.error(`  - [${f.kind}] ${f.id ?? '-'}: ${f.detail}`);
  console.error('  再取得するなら: node apps/hub/scripts/vendor-fonts.mjs --update');
  return 1;
}

function selfTestUpdateTransaction() {
  const root = mkdtempSync(join(tmpdir(), 'vendored-fonts-transaction-'));
  const destinationDir = join(root, 'fonts');
  const existingName = 'existing.woff2';
  const existingPath = join(destinationDir, existingName);
  try {
    mkdirSync(destinationDir, { recursive: true });
    writeFileSync(existingPath, 'before');

    let rejected = false;
    try {
      stageAndCommit({
        destinationDir,
        files: new Map([[existingName, Buffer.from('after')]]),
        manifest: { fonts: [] },
        validateStage: () => {
          throw new Error('意図的な staging 検証失敗');
        },
      });
    } catch {
      rejected = true;
    }

    if (!rejected || readFileSync(existingPath, 'utf8') !== 'before') {
      throw new Error('staging 検証失敗時に既存資産が変更された');
    }
    console.log('[vendor-fonts] self-test OK: 検証成功前は既存資産を上書きしない');
    return 0;
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

/* ------------------------------------------------------------------ */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.mode === 'self-test-update-transaction') process.exit(selfTestUpdateTransaction());
  if (args.mode === 'update') {
    await update();
    process.exit(check(null));
  }
  process.exit(check(args.json));
}

await main();
