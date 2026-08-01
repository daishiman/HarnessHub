/**
 * アップロードされた ZIP を検査する手順の組み立て (test-design.md T8 / security-spec §6.3)。
 *
 * 順序が仕様である:
 *   1. **展開せずに** 目録 (central directory) を検査する — `inspectArchiveHeader`
 *   2. 合格したものだけを展開する。展開しながら**実サイズを数え直す**
 *   3. 展開結果へ内容ルール (`createPackageInspectionRules`) を当てる
 *
 * 2 で数え直すのは、目録のサイズ欄が**書き換え可能**だから。
 * 「50 MiB 以内」と申告して 5 GiB 展開される細工は、目録だけ見ていると通ってしまう。
 *
 * 展開は I/O ではないが `DecompressionStream` という実行環境の能力に依存するため、
 * 純関数を要求される `packages/inspection` ではなくこちら (Hub 側) に置く。
 * 判定ロジック自体は 1 と 3 が持っており、ここは順序と実測だけを担う。
 */

import {
  ARCHIVE_LIMITS,
  type ArchiveEntry,
  createPublishInspectionRules,
  type Finding,
  type InspectionFile,
  inspectArchiveHeader,
  runInspection,
} from '@harness-hub/inspection';
import type { PublishFinding, PublishVerdict } from '@harness-hub/schemas';

import { summarizeInspection } from './verdict.js';

/** ZIP の compression method。0 = 無圧縮、8 = deflate。それ以外は扱わない。 */
const METHOD_STORED = 0;
const METHOD_DEFLATE = 8;

const LOCAL_HEADER_SIGNATURE = 0x04034b50;
const LOCAL_HEADER_FIXED_SIZE = 30;

export interface PackageInspectionOutcome {
  readonly verdict: PublishVerdict;
  readonly findings: readonly PublishFinding[];
  /**
   * 展開できたファイル。header 検査で落ちた場合は `null`。
   * 空配列 (= 展開したが 1 件も無い) と区別するため undefined ではなく null を使う。
   */
  readonly files: readonly InspectionFile[] | null;
}

/** header 由来の findings を検査結果の形へ寄せる。verdict 写像を `verdict.ts` へ一本化するため。 */
function rejectedByHeader(findings: readonly Finding[]): PackageInspectionOutcome {
  const summary = summarizeInspection({
    // header 違反はすべて error なので fail 固定。ここで verdict を計算し直さないのは、
    // 「header を通らなかった」という事実が severity の集計より強い判断だから
    verdict: 'fail',
    findings,
    evaluatedRuleIds: [...new Set(findings.map((finding) => finding.ruleId))].sort(),
  });
  return { verdict: summary.verdict, findings: summary.findings, files: null };
}

/** local file header を読み飛ばして本体バイト列の開始位置を返す。 */
function dataOffsetOf(bytes: Uint8Array, entry: ArchiveEntry): number | null {
  const offset = entry.localHeaderOffset;
  if (offset + LOCAL_HEADER_FIXED_SIZE > bytes.byteLength) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(offset, true) !== LOCAL_HEADER_SIGNATURE) return null;
  // 目録側の extra field 長と local header 側の長さは一致しないことがある (仕様上許される)。
  // ここでは必ず local header 側を読む
  const nameLength = view.getUint16(offset + 26, true);
  const extraLength = view.getUint16(offset + 28, true);
  return offset + LOCAL_HEADER_FIXED_SIZE + nameLength + extraLength;
}

async function inflateRaw(chunk: Uint8Array): Promise<Uint8Array> {
  // Blob 経由にしないのは、`Uint8Array<ArrayBufferLike>` が `BlobPart` に代入できないため
  // (SharedArrayBuffer を裏に持つ可能性を型が捨てない)。ReadableStream へ直接載せれば型が通り、
  // 実行時の挙動も同じ 1 チャンク投入になる
  // `subarray` の戻り値は `Uint8Array<ArrayBufferLike>` で、SharedArrayBuffer 由来の可能性を
  // 型が捨てないため BufferSource へ渡せない。実害の無い 1 回のコピーで確実に ArrayBuffer 裏付けにする
  const owned = new Uint8Array(chunk.byteLength);
  owned.set(chunk);

  // 要素型を BufferSource にするのは DecompressionStream.writable の受け口がそれだから
  const source = new ReadableStream<BufferSource>({
    start(controller) {
      controller.enqueue(owned);
      controller.close();
    },
  });
  const inflated = source.pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(inflated).arrayBuffer());
}

/**
 * 目録の検査を通ったアーカイブを展開する。
 *
 * 展開の失敗 (壊れた deflate ストリーム・未対応 method・実サイズ超過) は例外ではなく
 * finding として返す。利用者から見ればどれも「このパッケージは受け取れない」であり、
 * 500 として扱うと原因が伝わらないまま再送を促すことになる。
 */
async function extractEntries(
  bytes: Uint8Array,
  entries: readonly ArchiveEntry[],
): Promise<{ files: InspectionFile[]; findings: Finding[] }> {
  const files: InspectionFile[] = [];
  const findings: Finding[] = [];
  const decoder = new TextDecoder('utf-8');
  let extractedBytes = 0;

  for (const entry of entries) {
    if (entry.isDirectory || entry.isSymlink) continue;

    const start = dataOffsetOf(bytes, entry);
    if (start === null) {
      findings.push({
        ruleId: 'ARCHIVE-FORMAT',
        stage: 'static-validation',
        severity: 'error',
        message: 'local file header を解析できません',
        location: { path: entry.path },
      });
      continue;
    }

    const raw = bytes.subarray(start, start + entry.compressedSize);
    let content: Uint8Array;
    if (entry.compressionMethod === METHOD_STORED) {
      content = raw;
    } else if (entry.compressionMethod === METHOD_DEFLATE) {
      try {
        content = await inflateRaw(raw);
      } catch {
        findings.push({
          ruleId: 'ARCHIVE-FORMAT',
          stage: 'static-validation',
          severity: 'error',
          message: '展開できない圧縮データです',
          location: { path: entry.path },
        });
        continue;
      }
    } else {
      findings.push({
        ruleId: 'ARCHIVE-ENTRY-TYPE',
        stage: 'static-validation',
        severity: 'error',
        message: `未対応の圧縮方式です (method=${entry.compressionMethod})`,
        location: { path: entry.path },
      });
      continue;
    }

    // 実測。目録の申告値ではなく展開後の実バイト数で上限を判定する
    extractedBytes += content.byteLength;
    if (extractedBytes > ARCHIVE_LIMITS.maxUncompressedBytes) {
      findings.push({
        ruleId: 'ARCHIVE-MAX-UNCOMPRESSED',
        stage: 'static-validation',
        severity: 'error',
        message: `展開実サイズが上限を超えました (> ${ARCHIVE_LIMITS.maxUncompressedBytes} bytes)`,
        location: { path: entry.path },
      });
      // 上限を超えた時点で以降の展開を止める。続けると上限の意味が無くなる
      return { files, findings };
    }

    files.push({ path: entry.path, content: decoder.decode(content) });
  }

  return { files, findings };
}

/**
 * ZIP を検査し、公開判定と findings を返す。
 *
 * この関数が「検査の唯一の入口」になるよう、header 検査・展開・内容ルールを 1 本にまとめている。
 * 呼び出し側 (route / service) が順序を組み替えられる形にすると、
 * 「展開してから header を見る」経路が事故で生まれうる。
 */
export async function inspectPackageArchive(bytes: Uint8Array): Promise<PackageInspectionOutcome> {
  const header = inspectArchiveHeader(bytes);
  if (!header.ok) return rejectedByHeader(header.findings);

  const extracted = await extractEntries(bytes, header.entries);
  if (extracted.findings.length > 0) return rejectedByHeader(extracted.findings);

  // 構造ルールだけを渡さない。`createPublishInspectionRules` は static validation + secret scan + policy を
  // 束ねた**唯一の合成**で、ここで束ね直すと secret scan を落とした pipeline を作れてしまう (I2 違反)。
  // check-publish-inspection-gate.mjs がこの呼び出しを静的に固定している
  const result = runInspection(createPublishInspectionRules(), { files: extracted.files, metadata: {} });
  const summary = summarizeInspection(result);
  return { verdict: summary.verdict, findings: summary.findings, files: extracted.files };
}
