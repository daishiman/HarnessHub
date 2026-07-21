// HF-A4-DUP-002 用 fixture: 意図的な違反 2「境界迂回参照 (deep import)」。
// 公開 contract 規約 (ADR §11.3-2) は package 名での import のみを許可する。
import { internalHelper } from '@harness-hub/ui/src/components/internal';

export const useInternal = () => internalHelper();
