/**
 * 視覚回帰 (VRT) の比較機構 (HarnessHub-xaa3)。
 *
 * 画素比較は追加依存を入れずに **ブラウザの中で** 行う。理由は 2 つ。
 * (a) PNG の復号器を Node 側に持ち込むと依存が増え、その依存自体が検査対象外の可搬性リスクになる。
 * (b) 比較に使う復号器と、基準画像を作った復号器が同一 (どちらも Chromium) になるので、
 *     「ライブラリ差でだけ差分が出る」種類の偽陽性が原理的に起きない。
 *
 * 基準画像は **実行環境ごと** に分けて置く。フォントの実体もラスタライズ結果も OS で違うため、
 * macOS で撮った基準画像を Linux の CI に当てると、コードが同一でも必ず落ちるからである。
 * 環境ごとの基準が無い場合は暗黙 pass させず、初期化コマンドを示して失敗させる
 * (「基準が無いから比較しなかった」を「差分なし」と読み違えるのが VRT 最大の事故)。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import type { BrowserSession } from './browser-harness.js';

/** 差分と見なす画素の割合の上限。文字の縁の 1 画素差までは許し、面の変化は逃さない値。 */
export const VRT_MAX_DIFF_RATIO = 0.001;

/** 同じ色と見なすチャンネル差。アンチエイリアスの微差を吸収する。 */
const CHANNEL_TOLERANCE = 24;

/**
 * 基準画像の置き場。描画差が生じる OS ごとに分け、Node の CPU architecture では分けない。
 *
 * `process.arch` は Chromium の描画条件ではない。同じ macOS / 同じ Chromium でも、
 * Node を Rosetta で起動しただけで arm64 の基準を見失う不具合が実際に起きたため、
 * ラスタライズ結果を左右する `process.platform` だけを routing key にする。
 */
export function baselineDir(): string {
  return resolve(process.cwd(), 'tests/browser/__vrt__', process.platform);
}

/** 失敗時の実物と差分画像の置き場。CI では artifact として持ち帰る。 */
function outputDir(): string {
  return resolve(process.cwd(), 'artifacts/vrt');
}

/** 基準画像を作り直すモードか。`VRT_UPDATE=1 pnpm test:browser` で入る。 */
export function isUpdateMode(): boolean {
  return process.env.VRT_UPDATE === '1';
}

export interface VrtResult {
  key: string;
  /** 基準画像を書き出した (比較はしていない)。 */
  updated: boolean;
  /** 差分画素の割合。`updated` のときは 0。 */
  diffRatio: number;
}

function writePng(path: string, base64: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.from(base64, 'base64'));
}

/**
 * 現在の描画を基準画像と比べる。差分が上限を超えたら例外を投げる (= 非 0 終了)。
 *
 * `key` は `catalog-form-light` のような、そのまま画像ファイル名になる識別子。
 */
export async function expectMatchesBaseline(session: BrowserSession, key: string): Promise<VrtResult> {
  const actualBase64 = (await session.screenshot({ fullPage: true })).toString('base64');
  const baselinePath = resolve(baselineDir(), `${key}.png`);

  if (isUpdateMode()) {
    writePng(baselinePath, actualBase64);
    return { key, updated: true, diffRatio: 0 };
  }

  if (!existsSync(baselinePath)) {
    writePng(resolve(outputDir(), `${key}.actual.png`), actualBase64);
    throw new Error(
      [
        `基準画像がありません: ${baselinePath}`,
        '今回の描画は artifacts/vrt/ へ出しました。内容を目視で確認したうえで、',
        '`VRT_UPDATE=1 pnpm --filter @harness-hub/hub run test:browser` で基準として登録してください。',
        '基準が無い状態を pass にすると「検査していない」が「差分なし」と同じ結果になります。',
      ].join('\n'),
    );
  }

  const baselineBase64 = readFileSync(baselinePath).toString('base64');
  const comparison = await comparePngInBrowser(session, baselineBase64, actualBase64);

  if (comparison.sizeMismatch) {
    writePng(resolve(outputDir(), `${key}.actual.png`), actualBase64);
    throw new Error(
      `${key}: 画像の寸法が違います (基準 ${comparison.baselineWidth}x${comparison.baselineHeight} / 実際 ${comparison.actualWidth}x${comparison.actualHeight})。` +
        ' レイアウトの高さや幅が変わっています。artifacts/vrt/ の実物を確認してください。',
    );
  }

  if (comparison.diffRatio > VRT_MAX_DIFF_RATIO) {
    writePng(resolve(outputDir(), `${key}.actual.png`), actualBase64);
    writePng(resolve(outputDir(), `${key}.diff.png`), comparison.diffBase64);
    throw new Error(
      `${key}: 画素差分 ${(comparison.diffRatio * 100).toFixed(3)}% が上限 ${(VRT_MAX_DIFF_RATIO * 100).toFixed(3)}% を超えました。` +
        ' artifacts/vrt/ の diff 画像 (差分箇所が赤) を確認し、意図した変更なら VRT_UPDATE=1 で基準を更新してください。',
    );
  }

  return { key, updated: false, diffRatio: comparison.diffRatio };
}

interface PngComparison {
  sizeMismatch: boolean;
  baselineWidth: number;
  baselineHeight: number;
  actualWidth: number;
  actualHeight: number;
  diffRatio: number;
  /** 差分箇所を赤で塗った PNG (base64)。寸法違いのときは空文字。 */
  diffBase64: string;
}

/** 2 枚の PNG をブラウザ内で復号して画素比較する。 */
async function comparePngInBrowser(
  session: BrowserSession,
  baselineBase64: string,
  actualBase64: string,
): Promise<PngComparison> {
  return session.page.evaluate(
    async ({ baseline, actual, tolerance }) => {
      const decode = async (base64: string): Promise<ImageBitmap> => {
        const response = await fetch(`data:image/png;base64,${base64}`);
        return createImageBitmap(await response.blob());
      };
      const pixels = (bitmap: ImageBitmap): ImageData => {
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const context = canvas.getContext('2d');
        if (context === null) throw new Error('2d context を取得できない');
        context.drawImage(bitmap, 0, 0);
        return context.getImageData(0, 0, bitmap.width, bitmap.height);
      };

      const [baselineBitmap, actualBitmap] = await Promise.all([decode(baseline), decode(actual)]);
      if (baselineBitmap.width !== actualBitmap.width || baselineBitmap.height !== actualBitmap.height) {
        return {
          sizeMismatch: true,
          baselineWidth: baselineBitmap.width,
          baselineHeight: baselineBitmap.height,
          actualWidth: actualBitmap.width,
          actualHeight: actualBitmap.height,
          diffRatio: 1,
          diffBase64: '',
        };
      }

      const before = pixels(baselineBitmap);
      const after = pixels(actualBitmap);
      const diff = new ImageData(before.width, before.height);
      let differing = 0;
      for (let offset = 0; offset < before.data.length; offset += 4) {
        const changed =
          Math.abs((before.data[offset] ?? 0) - (after.data[offset] ?? 0)) > tolerance ||
          Math.abs((before.data[offset + 1] ?? 0) - (after.data[offset + 1] ?? 0)) > tolerance ||
          Math.abs((before.data[offset + 2] ?? 0) - (after.data[offset + 2] ?? 0)) > tolerance ||
          Math.abs((before.data[offset + 3] ?? 0) - (after.data[offset + 3] ?? 0)) > tolerance;
        if (changed) {
          differing += 1;
          // 差分は赤、一致部分は元画像を薄く残す。どこが変わったか一目で分かるようにする
          diff.data[offset] = 255;
          diff.data[offset + 1] = 0;
          diff.data[offset + 2] = 0;
          diff.data[offset + 3] = 255;
        } else {
          diff.data[offset] = after.data[offset] ?? 0;
          diff.data[offset + 1] = after.data[offset + 1] ?? 0;
          diff.data[offset + 2] = after.data[offset + 2] ?? 0;
          diff.data[offset + 3] = 40;
        }
      }

      const diffCanvas = new OffscreenCanvas(diff.width, diff.height);
      const diffContext = diffCanvas.getContext('2d');
      if (diffContext === null) throw new Error('2d context を取得できない');
      diffContext.putImageData(diff, 0, 0);
      const blob = await diffCanvas.convertToBlob({ type: 'image/png' });
      const dataUrl: string = await new Promise((resolveDataUrl) => {
        const reader = new FileReader();
        reader.onload = () => resolveDataUrl(String(reader.result));
        reader.readAsDataURL(blob);
      });

      return {
        sizeMismatch: false,
        baselineWidth: before.width,
        baselineHeight: before.height,
        actualWidth: after.width,
        actualHeight: after.height,
        diffRatio: differing / (before.width * before.height),
        diffBase64: dataUrl.slice(dataUrl.indexOf(',') + 1),
      };
    },
    { baseline: baselineBase64, actual: actualBase64, tolerance: CHANNEL_TOLERANCE },
  );
}
