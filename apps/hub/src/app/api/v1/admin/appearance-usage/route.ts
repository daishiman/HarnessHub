/**
 * `GET /api/v1/admin/appearance-usage` — 配色 (palette) とテーマの採用状況。
 *
 * provider-admin 限定 (`ACTION_RULES` の `appearance.usage_read`)。
 *
 * 数えるのは「切り替えボタンが押された回数」ではなく、**利用者ごとの現在設定 1 行**。
 * 押した回数を数えると、試し押しや選び直しが重複票になり「実際に使っている人が多い配色」が
 * 分からなくなる。`user_settings` は userId が主キーなので、1 人 = 1 票が構造的に保証される。
 *
 * レスポンスに含まれるのは人数・構成比・計測率だけで、userId もメールも返さない
 * (集計は `groupBy(palette, theme, resolved_theme)` の高々 30 行で、個人へ戻せない)。
 * 利用者の同定はセッション由来の principal だけで行い、クライアント申告の ID は使わない。
 */

import { userOrgAdminRuntime } from '../../../../../features/user-org-admin/runtime.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../lib/authz/index.js';

export const GET = withAuthz(
  {
    action: 'appearance.usage_read',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => requestScopedResource(request, { type: 'appearance_usage', workspaceId: null }),
  },
  async () => {
    const result = await userOrgAdminRuntime().service.getAppearanceUsage();
    return Response.json(result);
  },
);
