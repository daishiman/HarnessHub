/**
 * `src/tokens/tokens.css` を再生成する (HarnessHub-2fo1)。
 *
 * 生成物を git 管理下に置くのは、Next の webpack が build 開始時点で実ファイルを要求するため。
 * 「build 前に生成する」構成にすると、生成を挟まない経路 (IDE の型解決・vitest・部分ビルド) で
 * ファイルが無い状態が生まれ、原因の分かりにくい失敗になる。
 *
 * 内容の正本は `buildTokenCssArtifact()`。このスクリプトは書き出すだけで、
 * 文字列の組み立てには一切関与しない。
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildTokenCssArtifact } from '../src/tokens/css-artifact.js';

const here = dirname(fileURLToPath(import.meta.url));
const outputPath = join(here, '..', 'src', 'tokens', 'tokens.css');

writeFileSync(outputPath, buildTokenCssArtifact(), 'utf8');

process.stdout.write(`generated: ${outputPath}\n`);
