/**
 * wrangler deploy の結果を Hub へ登録する (`POST /api/v1/projects/:id/deployment`, AD-5)。
 * exit_code が非 0 でも登録リクエスト自体は送る — Hub 側が orphan_candidate として扱う設計になっており
 * (registerDeploymentSchema のコメント参照)、失敗を記録しないと実際に公開された deployment が
 * Hub から見えなくなる「孤児化」を CLI 側で先回りして起こしてしまう。
 */
import { type DeploymentReferenceView, registerDeploymentSchema } from '@harness-hub/schemas';

import type { HubApiClient } from '../cli/http-client.js';

export interface DeploymentRegistration {
  readonly projectId: string;
  readonly channelId: string;
  readonly releaseId: string;
  /** wrangler が出力した URL。呼び出し側は URL を確定できた場合のみここへ渡すこと (孤児化防止の対象は
   * 「exit_code は非 0 だが URL は判明している」ケースであり、URL 自体が無いケースは登録しようがない)。 */
  readonly url: string;
  readonly exitCode: number;
}

export async function registerWranglerDeployment(
  client: HubApiClient,
  registration: DeploymentRegistration,
): Promise<DeploymentReferenceView> {
  const body = registerDeploymentSchema.parse({
    channel_id: registration.channelId,
    release_id: registration.releaseId,
    url: registration.url,
    provider: 'cloudflare',
    exit_code: registration.exitCode,
  });
  return client.postJson<DeploymentReferenceView>(`/api/v1/projects/${registration.projectId}/deployment`, body);
}
