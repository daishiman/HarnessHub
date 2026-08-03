/**
 * `feedback` サブコマンド (AD-6)。
 *
 * AD-4 の Device Flow 基盤 (Bearer token) を再利用して `POST /api/v1/feedback` を呼び出すだけの
 * 薄いクライアント。feedback のデータモデル・受理ロジック (状態遷移・ai_response 等) の owner は
 * feat-feedback-loop であり本 feature ではない (design-review-notes.md R-02)。よってここでは
 * その API 契約 (docs/backend-spec-api-state.md §4.7 の `project_id/type/priority/body`) を
 * 満たす最小の入力型だけを持ち、応答は不透明な JSON としてそのまま返す — feat-feedback-loop の
 * 応答スキーマを本 feature 側で再定義・再実装しない。
 */
import { scopesForCommand } from '../auth/index.js';
import type { HubApiClient, HubApiClientConfig } from './http-client.js';
import { obtainAccessToken, type SessionDeps } from './session.js';

export interface FeedbackCommandOptions {
  readonly tenantSlug: string;
  readonly projectId: string;
  readonly type: 'improvement' | 'review' | 'bug';
  readonly priority: 'high' | 'medium' | 'low';
  readonly body: string;
  readonly hubBaseUrl: string;
  readonly origin: string;
}

export interface FeedbackCommandDeps extends SessionDeps {
  readonly createHubApiClient: (config: HubApiClientConfig) => HubApiClient;
}

export async function runFeedbackCommand(options: FeedbackCommandOptions, deps: FeedbackCommandDeps): Promise<void> {
  const scope = scopesForCommand('feedback');
  const { accessToken, tenantId, workspaceId } = await obtainAccessToken(deps, options.tenantSlug, scope);
  const client = deps.createHubApiClient({
    baseUrl: options.hubBaseUrl,
    tenantId,
    workspaceId,
    accessToken,
    origin: options.origin,
  });

  await client.postJson('/api/v1/feedback', {
    project_id: options.projectId,
    type: options.type,
    priority: options.priority,
    body: options.body,
  });
}
