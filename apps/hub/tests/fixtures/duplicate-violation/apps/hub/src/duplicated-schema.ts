// HF-A4-DUP-002 用の意図的違反。**このファイルを直すのは誤り** (detector が検出できることの証明用)
// 違反 1: owner package (packages/schemas) の公開 API と同名の export を owner 外に置いている
// 違反 2: package 名ではなく deep import で共通層を参照している
import { healthResponseSchema } from '@harness-hub/schemas/src/health.js';

export const duplicatedContractSchema = { kind: 'duplicated-implementation', healthResponseSchema } as const;
