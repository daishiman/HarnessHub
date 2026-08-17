// 投入データの論理キー・長文パターン・大量パターンの宣言 (ADR §5.2 / §6.2)。
//
// 論理キーは seedId() の入力であり、行の同一性を決める唯一の根拠である。
// ここを単一の出所にしておくことで、seed.ts と対応表が同じ行を指していることを機械検査できる。

import { seriesKey } from './seed-id';

/**
 * 全レコードの時刻列の基準 (2026-01-05T00:00:00Z)。
 *
 * Date.now() を使うと実行のたびに値が変わり、T3-5 の「実行時刻に依存しない」を満たせない。
 * 各行は BASE_TIME からの固定オフセットで時刻を決める。
 */
export const BASE_TIME = 1_767_571_200_000;

/** 名前付きの論理キー。seed.ts と coverage-matrix.ts が同じ行を指すための共有辞書。 */
export const KEYS = {
  tenantMain: 'tenant/main/0001',
  tenantSuspended: 'tenant/suspended/0001',
  tenantEmpty: 'tenant/empty/0001',
  tenantSecondary: 'tenant/secondary/0001',

  workspaceMain: 'workspace/main/0001',
  workspaceSuspended: 'workspace/suspended/0001',

  userProviderAdmin: 'user/provider-admin/0001',
  userWorkspaceAdmin: 'user/workspace-admin/0001',
  userMember: 'user/member/0001',
  userInactive: 'user/inactive/0001',

  idpPending: 'idp-connection/pending/0001',
  idpTested: 'idp-connection/tested/0001',
  idpActive: 'idp-connection/active/0001',
  idpDisabled: 'idp-connection/disabled/0001',

  projectActive: 'project/active/0001',
  projectSuspended: 'project/suspended/0001',
  projectArchived: 'project/archived/0001',

  releaseAvailable: 'release/available/0001',
  releaseSuspended: 'release/suspended/0001',
  releaseDeprecated: 'release/deprecated/0001',

  packageSkills: 'package/skills/0001',
  deploymentReference: 'deployment-reference/cloudflare/0001',

  catalogEntryPrivate: 'catalog-entry/private/0001',
  catalogEntryWorkspace: 'catalog-entry/workspace/0001',

  publisherToken: 'publisher-token/main/0001',
  idempotencyLedger: 'idempotency-ledger/main/0001',
  sessionRevocation: 'session-revocation/suspended/0001',

  encryptionSalaryActive: 'encryption-key/salary-active/0001',
  encryptionSalaryRetiring: 'encryption-key/salary-retiring/0001',
  encryptionSalaryRetired: 'encryption-key/salary-retired/0001',
  encryptionIdpSecret: 'encryption-key/idp-secret/0001',
  encryptionTenantData: 'encryption-key/tenant-data/0001',

  tenantDataKnowledgeDoc: 'tenant-data-object/knowledge-doc/0001',
  tenantDataRunInput: 'tenant-data-object/run-input/0001',
  tenantDataRunOutput: 'tenant-data-object/run-output/0001',
  tenantDataScreenshot: 'tenant-data-object/hearing-screenshot/0001',
  tenantDataTombstone: 'tenant-data-tombstone/main/0001',

  hearingScreenshot: 'hearing-screenshot/main/0001',
  shareTokenCreator: 'hearing-share-token/harness-creator/0001',
  shareTokenOrchestrator: 'hearing-share-token/system-orchestrator/0001',
  tenantCoefficient: 'tenant-coefficient/main/0001',

  notionUrl: 'notion-integration/url/0001',
  notionApiKey: 'notion-integration/api-key/0001',

  documentCommonPublished: 'document/common-published/0001',
  documentCommonDraft: 'document/common-draft/0001',
  documentTenantPublished: 'document/tenant-published/0001',
  documentTenantDraft: 'document/tenant-draft/0001',

  feedbackOpen: 'feedback/open/0001',
  feedbackInProgress: 'feedback/in-progress/0001',
  feedbackResolved: 'feedback/resolved/0001',

  metricsEventBase: 'metrics-event/base/0001',
  metricsEventIdempotent: 'metrics-event/idempotent/0001',
} as const;

/** 列挙値ごとに 1 行ずつ作る系列。値の順序が行の識別に効くため配列で持つ。 */
export const ENUM_SERIES = {
  /** target_channels: project 3 件 × target 2 値。publish_requests の非終端 6 値を別 channel に散らすため。 */
  targetChannels: [
    'target-channel/skill/0001',
    'target-channel/web-app/0001',
    'target-channel/skill/0002',
    'target-channel/web-app/0002',
    'target-channel/skill/0003',
    'target-channel/web-app/0003',
  ],
  publishRequests: [
    'publish-request/draft/0001',
    'publish-request/validating/0001',
    'publish-request/needs-fix/0001',
    'publish-request/ready/0001',
    'publish-request/approval-pending/0001',
    'publish-request/approved/0001',
    'publish-request/publishing/0001',
    'publish-request/failed/0001',
    'publish-request/published/0001',
  ],
  deviceAuthorizations: [
    'device-authorization/pending/0001',
    'device-authorization/approved/0001',
    'device-authorization/denied/0001',
    'device-authorization/consumed/0001',
  ],
  auditEvents: ['audit-event/user/0001', 'audit-event/publisher-token/0001', 'audit-event/system/0001'],
  smokeLeases: [
    'smoke-lease/database/0001',
    'smoke-lease/hearing/0001',
    'smoke-lease/coverage/0001',
    'smoke-lease/publish/0001',
  ],
  hearingSheets: [
    'hearing-sheet/received/0001',
    'hearing-sheet/generating/0001',
    'hearing-sheet/review/0001',
    'hearing-sheet/completed/0001',
  ],
  aiJobs: [
    'ai-job/sheet-queued/0001',
    'ai-job/feedback-processing/0001',
    'ai-job/doc-completed/0001',
    'ai-job/sheet-failed/0001',
    'ai-job/feedback-dead/0001',
  ],
  displayCodeCounters: [
    'display-code-counter/hs/0001',
    'display-code-counter/fr/0001',
    'display-code-counter/doc/0001',
  ],
  builds: [
    'build/hearing/0001',
    'build/requirements/0001',
    'build/design/0001',
    'build/build/0001',
    'build/test/0001',
    'build/review/0001',
    'build/publish/0001',
  ],
  buildStageEvents: [
    'build-stage-event/initial/0001',
    'build-stage-event/hearing/0001',
    'build-stage-event/requirements/0001',
    'build-stage-event/design/0001',
    'build-stage-event/build/0001',
    'build-stage-event/test/0001',
    'build-stage-event/review/0001',
    'build-stage-event/publish/0001',
  ],
  metricsRollups: [
    'metrics-rollup/tenant-daily/0001',
    'metrics-rollup/tenant-weekly/0001',
    'metrics-rollup/harness-daily/0001',
    'metrics-rollup/harness-weekly/0001',
    'metrics-rollup/department-daily/0001',
    'metrics-rollup/department-weekly/0001',
    'metrics-rollup/user-daily/0001',
    'metrics-rollup/user-weekly/0001',
  ],
} as const;

/** 名前付きの派生行。主行と 1 対 1 で付く従属レコード。 */
export const DERIVED_SERIES = {
  userWorkspaces: [
    'user-workspace/provider-admin/0001',
    'user-workspace/workspace-admin/0001',
    'user-workspace/member/0001',
    'user-workspace/inactive/0001',
  ],
  userSettings: [
    'user-setting/provider-admin/0001',
    'user-setting/workspace-admin/0001',
    'user-setting/member/0001',
    'user-setting/inactive/0001',
  ],
} as const;

export interface BulkSeries {
  /** BULK_COUNTS の key と対応する。 */
  readonly key: string;
  readonly prefix: string;
  readonly count: number;
}

export interface BulkCount {
  readonly key: string;
  /** SQL 上のテーブル名。 */
  readonly table: string;
  readonly count: number;
  /** DISPLAY_BOUNDARIES のキー。表示区切りを持たない一覧は null。 */
  readonly boundary: string | null;
}

/**
 * 大量パターンの件数 (ADR §5.2)。
 *
 * 区切りを持つ一覧は「区切りをちょうど超える」件数にする。区切りちょうどでは
 * 2 ページ目が現れず、ページ送りの表示崩れを踏めない。
 */
export const BULK_COUNTS: readonly BulkCount[] = [
  { key: 'builds/board', table: 'builds', count: 101, boundary: 'buildsPage' },
  { key: 'metrics/ranking', table: 'metrics_rollups', count: 60, boundary: 'metricsRanking' },
  { key: 'catalog/projects', table: 'projects', count: 60, boundary: null },
  { key: 'docs/list', table: 'documents', count: 60, boundary: null },
  { key: 'feedback/list', table: 'feedbacks', count: 60, boundary: null },
  { key: 'sheets/list', table: 'hearing_sheets', count: 60, boundary: null },
  { key: 'users/list', table: 'users', count: 55, boundary: null },
  { key: 'audit/events', table: 'audit_events', count: 60, boundary: null },
];

/** 大量パターンの論理キー系列。BULK_COUNTS と 1 対 1 で対応する。 */
export const BULK_SERIES: readonly BulkSeries[] = [
  { key: 'builds/board', prefix: 'build/bulk', count: 101 },
  { key: 'metrics/ranking', prefix: 'metrics-rollup/bulk', count: 60 },
  { key: 'catalog/projects', prefix: 'project/bulk', count: 60 },
  { key: 'docs/list', prefix: 'document/bulk', count: 60 },
  { key: 'feedback/list', prefix: 'feedback/bulk', count: 60 },
  { key: 'sheets/list', prefix: 'hearing-sheet/bulk', count: 60 },
  { key: 'users/list', prefix: 'user/bulk', count: 55 },
  { key: 'audit/events', prefix: 'audit-event/bulk', count: 60 },
];

/** 大量パターンの論理キーを展開する。 */
export function bulkKeys(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => seriesKey(prefix, index + 1));
}

/**
 * 長文パターン (ADR §6.2)。
 *
 * 折返しを禁じるのではなく、意図した位置で折れるかを見るためのデータなので、
 * 句読点・中黒・全角括弧といった実運用の折返し候補を必ず含める。
 * 同じ文字の繰り返しで字数を埋めると「長いだけで折返しが起きない」文面になるため、
 * 最頻文字の比率も T5-4 が検査する。
 */
export const LONG_TEXT: Record<'heading' | 'body' | 'tagName' | 'personName', readonly string[]> = {
  heading: [
    '利用状況ダッシュボードの表示崩れ（折返し位置の不整合）に関する調査と改善方針の整理',
    '改善要望の受付から反映までの流れ、担当者・期限・優先度の見直し案について整理した検討資料',
  ],
  body: [
    'この画面では、テナント配下の利用状況と削減効果を一覧で確認できます。集計は日次と週次の二種類があり、対象期間・部署・担当者の三つの軸で絞り込めます。表示件数が上限を超える場合は、続きを読み込むための操作が末尾に現れます。数値の根拠となる実行記録は、個別の詳細画面から辿れるようになっています。集計処理が遅れている間は暫定値が表示され、確定後に自動で置き換わります（置換の履歴は監査記録へ残ります）。表示の単位は設定画面から変更できます。',
    '改善要望を登録すると、担当者への割り当てと優先度の判定が自動で行われます。判定の根拠は、過去に登録された同種の要望・対象となる案件の規模・利用部署からの申告内容を組み合わせて求めます。差し戻しが必要な場合は、理由を添えて登録者へ返却してください（返却の回数に上限はありません）。完了した要望は月次で集計され、削減効果の試算へ反映されます。試算の前提となる係数は、テナントごとに設定画面から調整できます。調整の履歴は監査記録へ残るため、後から根拠を辿れます。',
  ],
  tagName: ['業務改善提案書式標準化推進検討委員会資料区分', '顧客向け提案資料作成支援ナレッジ蓄積運用方針'],
  personName: [
    '経営企画本部業務改革推進室デジタル基盤整備担当山田太郎',
    '情報システム部門共通基盤運用保守グループ主任佐藤花子',
  ],
};

function collectNamedKeys(): string[] {
  return [
    ...Object.values(KEYS),
    ...Object.values(ENUM_SERIES).flatMap((series) => [...series]),
    ...Object.values(DERIVED_SERIES).flatMap((series) => [...series]),
  ];
}

/** seed が作る全行の論理キー。重複と ID 衝突は T3-4 が検査する。 */
export const LOGICAL_KEYS: readonly string[] = [
  ...collectNamedKeys(),
  ...BULK_SERIES.flatMap((series) => bulkKeys(series.prefix, series.count)),
];
