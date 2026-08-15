// ドメイン enum の宣言 (ADR §10 / requirements-baseline §7)。
//
// 「投入対象として意図した集合」をここに固定し、schema の実定義との一致は
// T2-2 が drizzle の実行時 API で突き合わせる。実装が schema から自動導出すると、
// schema に新しい enum が増えたときテストも黙って追随してしまい、
// 「投入し忘れ」を検知できなくなる。
//
// table/column は SQL 上の名前 (snake_case)。テストが sql.identifier で直接使う。

export interface DomainEnum {
  readonly table: string;
  readonly column: string;
  readonly values: readonly string[];
}

export const DOMAIN_ENUMS: readonly DomainEnum[] = [
  { table: 'ai_jobs', column: 'kind', values: ['sheet_generation', 'feedback_response', 'doc_draft'] },
  { table: 'ai_jobs', column: 'status', values: ['queued', 'processing', 'completed', 'failed', 'dead'] },
  { table: 'audit_events', column: 'actor_type', values: ['user', 'publisher_token', 'system'] },
  {
    table: 'build_stage_events',
    column: 'from_stage',
    values: ['hearing', 'requirements', 'design', 'build', 'test', 'review', 'publish'],
  },
  {
    table: 'build_stage_events',
    column: 'to_stage',
    values: ['hearing', 'requirements', 'design', 'build', 'test', 'review', 'publish'],
  },
  { table: 'builds', column: 'type', values: ['hearing', 'improvement', 'review', 'bug'] },
  {
    table: 'builds',
    column: 'stage',
    values: ['hearing', 'requirements', 'design', 'build', 'test', 'review', 'publish'],
  },
  { table: 'catalog_entries', column: 'visibility', values: ['private', 'workspace'] },
  { table: 'deployment_references', column: 'provider', values: ['cloudflare'] },
  { table: 'device_authorizations', column: 'status', values: ['pending', 'approved', 'denied', 'consumed'] },
  { table: 'display_code_counters', column: 'kind', values: ['HS', 'FR', 'DOC'] },
  { table: 'documents', column: 'scope', values: ['common', 'tenant'] },
  { table: 'documents', column: 'status', values: ['draft', 'published'] },
  { table: 'documents', column: 'thumbnail_source', values: ['auto', 'manual'] },
  { table: 'documents', column: 'excerpt_source', values: ['auto', 'manual'] },
  { table: 'encryption_keys', column: 'purpose', values: ['salary', 'idp_secret', 'tenant_data'] },
  { table: 'encryption_keys', column: 'status', values: ['active', 'retiring', 'retired'] },
  { table: 'feedbacks', column: 'type', values: ['improvement', 'review', 'bug'] },
  { table: 'feedbacks', column: 'priority', values: ['high', 'medium', 'low'] },
  { table: 'feedbacks', column: 'source', values: ['harness', 'manual'] },
  { table: 'feedbacks', column: 'status', values: ['open', 'in_progress', 'resolved'] },
  {
    table: 'hearing_share_tokens',
    column: 'audience',
    values: ['harness_creator', 'system_orchestrator'],
  },
  { table: 'hearing_sheets', column: 'status', values: ['received', 'generating', 'review', 'completed'] },
  { table: 'idp_connections', column: 'credential_mode', values: ['customer_google', 'shared_google'] },
  {
    table: 'idp_connections',
    column: 'credential_status',
    values: ['pending', 'tested', 'active', 'disabled'],
  },
  {
    table: 'idp_connections',
    column: 'pending_credential_mode',
    values: ['customer_google', 'shared_google'],
  },
  { table: 'metrics_rollups', column: 'period', values: ['daily', 'weekly'] },
  { table: 'metrics_rollups', column: 'dimension', values: ['tenant', 'harness', 'department', 'user'] },
  { table: 'notion_integrations', column: 'mode', values: ['url', 'api_key'] },
  { table: 'packages', column: 'kind', values: ['skills-package'] },
  { table: 'projects', column: 'status', values: ['active', 'suspended', 'archived'] },
  {
    table: 'publish_requests',
    column: 'status',
    values: [
      'draft',
      'validating',
      'needs_fix',
      'ready',
      'approval_pending',
      'approved',
      'publishing',
      'failed',
      'published',
    ],
  },
  { table: 'publish_requests', column: 'verdict', values: ['green', 'yellow', 'red'] },
  { table: 'releases', column: 'status', values: ['available', 'suspended', 'deprecated'] },
  {
    table: 'smoke_fixture_leases',
    column: 'kind',
    values: ['database', 'hearing', 'coverage', 'publish'],
  },
  { table: 'target_channels', column: 'target', values: ['skill', 'web_app'] },
  {
    table: 'tenant_data_objects',
    column: 'kind',
    values: ['knowledge_doc', 'run_input', 'run_output', 'hearing_screenshot'],
  },
  { table: 'tenants', column: 'status', values: ['active', 'suspended'] },
  { table: 'users', column: 'role', values: ['provider-admin', 'workspace-admin', 'member'] },
  { table: 'users', column: 'status', values: ['active', 'inactive'] },
];
