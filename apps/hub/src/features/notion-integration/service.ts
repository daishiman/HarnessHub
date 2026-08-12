/**
 * feat-notion-integration のビジネスロジック層。route はこの service だけを呼び、
 * マスク処理・必須項目判定の手順をここへ閉じる (`user-org-admin/service.ts` と同じ責務分担)。
 */
import type { NotionIntegrationRepo, RepositoryContext } from '@harness-hub/db';
import type { NotionIntegrationResponse, UpsertNotionIntegrationRequest } from '@harness-hub/schemas';
import { checkNotionIntegrationRequirements, maskNotionApiKey } from './logic.js';

export interface NotionIntegrationServiceDeps {
  readonly repository: NotionIntegrationRepo;
}

export class NotionIntegrationValidationError extends Error {
  constructor(
    message: string,
    readonly field: 'page_url' | 'api_key',
  ) {
    super(message);
    this.name = 'NotionIntegrationValidationError';
  }
}

export interface NotionIntegrationService {
  get(context: RepositoryContext, workspaceId: string): Promise<NotionIntegrationResponse | null>;
  upsert(
    context: RepositoryContext,
    workspaceId: string,
    request: UpsertNotionIntegrationRequest,
  ): Promise<NotionIntegrationResponse>;
  deleteIntegration(context: RepositoryContext, workspaceId: string): Promise<void>;
}

export function createNotionIntegrationService(deps: NotionIntegrationServiceDeps): NotionIntegrationService {
  async function toResponse(
    context: RepositoryContext,
    row: NonNullable<Awaited<ReturnType<NotionIntegrationRepo['get']>>>,
  ): Promise<NotionIntegrationResponse> {
    let apiKeyMasked: string | null = null;
    if (row.apiKeyEnc !== null) {
      // マスク表示を作るためだけに一度復号する。復号した平文をこの関数の外へ持ち出さない
      // (呼び出し側・ログのどちらにも生の値を渡さないための境界)。
      const plain = await deps.repository.decryptApiKey(context, row);
      apiKeyMasked = maskNotionApiKey(plain);
    }
    return {
      workspace_id: row.workspaceId,
      mode: row.mode,
      page_url: row.pageUrl,
      api_key_masked: apiKeyMasked,
      updated_at: row.updatedAt,
    };
  }

  return {
    async get(context, workspaceId) {
      const row = await deps.repository.get(context, workspaceId);
      if (row === null) return null;
      return toResponse(context, row);
    },

    async upsert(context, workspaceId, request) {
      const existing = await deps.repository.get(context, workspaceId);
      const check = checkNotionIntegrationRequirements({
        mode: request.mode,
        pageUrl: request.page_url,
        hasApiKeyInput: request.api_key !== undefined,
        hasExistingApiKey: existing?.apiKeyEnc !== null && existing?.apiKeyEnc !== undefined,
      });
      if (!check.ok) throw new NotionIntegrationValidationError(check.message, check.field);

      const pageUrl = request.page_url?.trim();
      const row = await deps.repository.upsert(context, {
        workspaceId,
        mode: request.mode,
        // url 方式では上の判定で必須が保証済み。api_key 方式では未指定なら null (page_url 無しの登録)。
        pageUrl: pageUrl === undefined || pageUrl.length === 0 ? null : pageUrl,
        // mode が url に切り替わったら api_key を明示的に消す (`api_key_enc` を残さない)。
        // api_key 方式で入力が無ければ既存の暗号化値を維持する (undefined を渡す)。
        ...(request.mode === 'url'
          ? { apiKey: null }
          : request.api_key === undefined
            ? {}
            : { apiKey: request.api_key }),
      });
      return toResponse(context, row);
    },

    async deleteIntegration(context, workspaceId) {
      await deps.repository.deleteIntegration(context, workspaceId);
    },
  };
}
