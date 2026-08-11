/**
 * production coverage smoke の利用契約と固定 fixture 値。
 * 実行手順から説明文・試験データを分離し、entrypoint を 500 行以内に保つ。
 */

export const COVERAGE_SMOKE_HELP = `Usage:
  pnpm --filter @harness-hub/hub run smoke:coverage-production

Required environment:
  HUB_PUBLIC_URL           production Hub origin (for example https://harness-hub.example.workers.dev)
  TURSO_DATABASE_URL       production libSQL URL
  TURSO_AUTH_TOKEN         production libSQL auth token

Optional environment:
  HUB_SMOKE_ORIGIN         Origin header value. default: origin of HUB_PUBLIC_URL.

The command creates two disposable tenants and checks, against production:
  S1-S8  post-signin scope denials (unauthenticated / missing_tenant_scope / ambiguous_scope /
         tenant_mismatch / workspace_not_member / credential_not_allowed / missing_scope)
         plus provider-admin cross-tenant route reachability and one matching audit event
  F1-F5  feedback loop (create -> queue -> AI writeback -> status transition)
  D1-D6  docs CMS (create -> draft queue -> body writeback -> cross-tenant invisibility)
Both tenants and every row they created are deleted before the process exits.
`;

export const FEEDBACK_BODY = 'P13 本番 smoke: 週次レポートの整形を自動化したい。手作業の転記が毎週発生している。';
export const AI_RESPONSE = 'P13 本番 smoke が書き戻した AI 応答。転記の自動化案を 3 つ提示する。';
export const DOC_TITLE = 'P13 本番 smoke の運用メモ';
export const DOC_BODY_INITIAL = '初期本文。AI 下書きで置き換わることを確認する。';
export const DOC_BODY_FROM_AI = '# AI 下書き\n\nP13 本番 smoke が書き戻した本文。';
